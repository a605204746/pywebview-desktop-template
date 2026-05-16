"""应用全局配置 — 从 config/ 目录读取。
开发时：config/app_config.py（明文）
打包后：app_config.py 随 PyArmor 混淆目录打包。
"""
from __future__ import annotations

import sys
from pathlib import Path


def _is_frozen() -> bool:
    return getattr(sys, "frozen", False)


# 开发模式：把项目根的 config/ 加入 sys.path，让 import 找到两个配置模块
if not _is_frozen():
    _config_dir = str(Path(__file__).parent.parent / "config")
    if _config_dir not in sys.path:
        sys.path.insert(0, _config_dir)

import app_config as _app


# ── 应用信息 ──────────────────────────────────────────────────────
APP_NAME    : str = _app.NAME
APP_VERSION : str = _app.VERSION

# ── 窗口 ──────────────────────────────────────────────────────────
WINDOW_WIDTH     : int            = _app.WINDOW_WIDTH
WINDOW_HEIGHT    : int            = _app.WINDOW_HEIGHT
WINDOW_MIN_SIZE  : tuple[int,int] = (_app.WINDOW_MIN_WIDTH, _app.WINDOW_MIN_HEIGHT)
WINDOW_RESIZABLE : bool           = _app.WINDOW_RESIZABLE
CLOSE_TO_TRAY    : bool           = _app.CLOSE_TO_TRAY

# ── 开发服务器 ────────────────────────────────────────────────────
DEV_PORT : int   = _app.DEV_PORT
DEV_URL  : str   = f"http://localhost:{_app.DEV_PORT}"
VITE_WAIT: float = _app.VITE_WAIT

# ── 日志 ─────────────────────────────────────────────────────────
LOG_LEVEL        : str = _app.LOG_LEVEL.upper()
LOG_MAX_SIZE_MB  : int = _app.LOG_MAX_SIZE_MB
LOG_BACKUP_COUNT : int = _app.LOG_BACKUP_COUNT


# ── 路径（自动区分开发 / 打包两种环境）────────────────────────────

def _runtime_dir() -> Path:
    base = Path(sys.executable).parent if _is_frozen() else Path(__file__).parent.parent
    return base / "data"


def _assets_dir() -> Path:
    if _is_frozen():
        return Path(sys._MEIPASS) / "assets"  # type: ignore[attr-defined]
    return Path(__file__).parent.parent / "config" / "assets"


RUNTIME_DIR   = _runtime_dir()
ASSETS_DIR    = _assets_dir()
ICON_PATH     = ASSETS_DIR / _app.ICON
LOG_DIR       = RUNTIME_DIR / "logs"
DB_PATH       = RUNTIME_DIR / "app.db"
SETTINGS_FILE = RUNTIME_DIR / "settings.json"
