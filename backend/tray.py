"""系统托盘管理。

功能：
  - 在系统托盘显示应用图标
  - 双击 / 菜单「显示窗口」恢复主窗口
  - 菜单「退出」彻底结束进程
  - 若 pystray 未安装，静默跳过，不影响主流程

依赖（可选）：pystray >= 0.19.5、Pillow >= 10.0.0
"""
from __future__ import annotations

import os
import sys
import threading
from pathlib import Path


def _load_icon(icon_path: Path):
    """加载 icon.png；找不到则用粉色方块占位。"""
    from PIL import Image

    if icon_path.exists():
        return Image.open(icon_path).convert("RGBA").resize((64, 64))

    img = Image.new("RGBA", (64, 64), "#ff85c0")
    return img


class TrayManager:
    """托盘图标生命周期管理器。"""

    def __init__(self, app_name: str, icon_path: Path, window) -> None:
        self._name      = app_name
        self._icon_path = icon_path
        self._window    = window
        self._icon      = None
        self._active    = False   # pystray 是否成功启动

    # ── 公共接口 ──────────────────────────────────────────────────

    def start(self) -> None:
        """在后台线程启动托盘，不阻塞主线程。"""
        t = threading.Thread(target=self._run, daemon=True, name="tray")
        t.start()

    def stop(self) -> None:
        if self._icon:
            self._icon.stop()

    @property
    def active(self) -> bool:
        """pystray 是否正在运行（用于决定关闭窗口时是否隐藏）。"""
        return self._active

    # ── 内部实现 ──────────────────────────────────────────────────

    def _run(self) -> None:
        try:
            import pystray
        except ImportError:
            return  # 未安装 pystray，静默跳过

        image = _load_icon(self._icon_path)
        menu = pystray.Menu(
            pystray.MenuItem("显示窗口", self._show, default=True),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("退出",     self._quit),
        )
        self._icon   = pystray.Icon(self._name, image, self._name, menu)
        self._active = True
        self._icon.run()
        self._active = False

    def _show(self, *_) -> None:
        self._window.show()

    def _quit(self, *_) -> None:
        self._active = False
        if self._icon:
            self._icon.stop()
        os._exit(0)
