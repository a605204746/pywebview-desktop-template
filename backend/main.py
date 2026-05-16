"""桌面应用入口"""
from __future__ import annotations

import sys
import threading

import webview

# 模块级持有互斥体句柄，防止被 GC 回收导致锁提前释放
_single_instance_mutex = None


def _ensure_single_instance(app_name: str) -> None:
    """检测是否已有实例运行（Windows 命名互斥体）。
    若已有实例，弹出原生提示框后退出当前进程。
    """
    global _single_instance_mutex
    if sys.platform != "win32":
        return

    import ctypes
    mutex_name = f"Global\\{app_name.replace(' ', '_')}_SingleInstance"
    _single_instance_mutex = ctypes.windll.kernel32.CreateMutexW(None, False, mutex_name)

    if ctypes.windll.kernel32.GetLastError() == 183:  # ERROR_ALREADY_EXISTS
        ctypes.windll.user32.MessageBoxW(
            0,
            f"{app_name} 已经在运行中。\n\n请检查系统托盘或任务栏。",
            "重复启动",
            0x30 | 0x1000,  # MB_ICONWARNING | MB_SETFOREGROUND
        )
        sys.exit(0)

from config import (
    APP_NAME, APP_VERSION,
    WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_MIN_SIZE, WINDOW_RESIZABLE,
    CLOSE_TO_TRAY, ICON_PATH, DEV_URL,
)
from logger import log
from db import init_db
from api import Api


def _set_window_icon(icon_path) -> None:
    """在 Windows 给本进程所有可见顶层窗口设置图标。
    用 Pillow 加载，支持 PNG / ICO 等格式，再转临时 ICO 交给 LoadImageW。
    """
    if sys.platform != "win32" or not icon_path.exists():
        return
    try:
        import ctypes
        import ctypes.wintypes as wt
        import os
        import tempfile
        from PIL import Image

        # 用 Pillow 统一加载，转换为临时 ICO（LoadImageW 只认 .ico）
        img = Image.open(icon_path).convert("RGBA").resize((256, 256), Image.LANCZOS)
        tmp = tempfile.NamedTemporaryFile(suffix=".ico", delete=False)
        tmp.close()
        try:
            img.save(tmp.name, format="ICO")
            user32 = ctypes.windll.user32
            hIcon = user32.LoadImageW(0, tmp.name, 1, 0, 0, 0x0010)  # IMAGE_ICON | LR_LOADFROMFILE
        finally:
            os.unlink(tmp.name)

        if not hIcon:
            log.warning("LoadImageW 返回 NULL，图标未设置")
            return

        pid = os.getpid()
        hwnds: list[int] = []

        @ctypes.WINFUNCTYPE(ctypes.c_bool, wt.HWND, wt.LPARAM)
        def _cb(hwnd, _):
            lp_pid = wt.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(lp_pid))
            if lp_pid.value == pid and user32.IsWindowVisible(hwnd):
                hwnds.append(hwnd)
            return True

        user32.EnumWindows(_cb, 0)

        for hwnd in hwnds:
            user32.SendMessageW(hwnd, 0x0080, 0, hIcon)  # WM_SETICON ICON_SMALL
            user32.SendMessageW(hwnd, 0x0080, 1, hIcon)  # WM_SETICON ICON_BIG

        log.info(f"窗口图标已设置（{len(hwnds)} 个窗口）")
    except Exception:
        log.exception("设置窗口图标失败")


def _url() -> str:
    if getattr(sys, "frozen", False):
        from pathlib import Path
        # PyInstaller 6.x onedir: 数据文件在 _internal/（即 sys._MEIPASS），不在 exe 旁边
        dist = Path(sys._MEIPASS) / "frontend" / "dist" / "index.html"  # type: ignore[attr-defined]
        return dist.as_uri()
    return DEV_URL


def _setup_exception_hooks() -> None:
    """将所有未捕获异常（主线程 + 子线程）写入日志文件。"""

    def _hook(exc_type, exc_value, exc_tb):
        if issubclass(exc_type, KeyboardInterrupt):
            sys.__excepthook__(exc_type, exc_value, exc_tb)
            return
        log.critical("未捕获的全局异常", exc_info=(exc_type, exc_value, exc_tb))

    def _thread_hook(args):
        log.critical(
            f"线程 [{getattr(args.thread, 'name', '?')}] 未捕获异常",
            exc_info=(args.exc_type, args.exc_value, args.exc_traceback),
        )

    sys.excepthook    = _hook
    threading.excepthook = _thread_hook


def main() -> None:
    _ensure_single_instance(APP_NAME)
    _setup_exception_hooks()
    init_db()
    log.info(f"启动 {APP_NAME} v{APP_VERSION}")

    api    = Api()
    window = webview.create_window(
        title=APP_NAME,
        url=_url(),
        js_api=api,
        width=WINDOW_WIDTH,
        height=WINDOW_HEIGHT,
        min_size=WINDOW_MIN_SIZE,
        resizable=WINDOW_RESIZABLE,
    )

    from tray import TrayManager
    tray = TrayManager(APP_NAME, ICON_PATH, window)

    def on_loaded():
        log.info("窗口加载完成")
        tray.start()
        _set_window_icon(ICON_PATH)

    def on_closing():
        # 若托盘正在运行且配置了关闭到托盘，则隐藏窗口而非退出
        if CLOSE_TO_TRAY and tray.active:
            window.hide()
            return False   # 返回 False 阻止窗口真正关闭

    window.events.loaded  += on_loaded
    window.events.closing += on_closing

    webview.start(debug=not getattr(sys, "frozen", False))
    log.info(f"{APP_NAME} 已退出")


if __name__ == "__main__":
    main()
