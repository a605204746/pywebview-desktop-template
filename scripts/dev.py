"""开发模式启动：先启动 Vite，再用 venv Python 打开 pywebview 窗口。

用法:
  uv run python scripts/dev.py
  或直接: python scripts/dev.py
"""
from __future__ import annotations

import importlib.util
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT     = Path(__file__).parent.parent
FRONTEND = ROOT / "frontend"
BACKEND  = ROOT / "backend"

# 优先使用项目 venv 的 Python，保证依赖正确
_venv_py = ROOT / ".venv" / ("Scripts" if sys.platform == "win32" else "bin") / (
    "python.exe" if sys.platform == "win32" else "python"
)
PYTHON = str(_venv_py) if _venv_py.exists() else sys.executable

# 从 config/app_config.py 读取配置，避免把 backend/ 加入 sys.path
_spec = importlib.util.spec_from_file_location("app_config", ROOT / "config" / "app_config.py")
_mod  = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

DEV_PORT  : int   = getattr(_mod, "DEV_PORT",  5173)
VITE_WAIT : float = getattr(_mod, "VITE_WAIT", 2.5)


def main() -> None:
    print(f"[dev] 使用 Python: {PYTHON}")
    print(f"[dev] 启动 Vite 开发服务器（port={DEV_PORT}）…")
    vite = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=FRONTEND,
        shell=(sys.platform == "win32"),
        env={**os.environ, "VITE_PORT": str(DEV_PORT)},
    )
    print(f"[dev] 等待 {VITE_WAIT}s 后启动窗口…")
    time.sleep(VITE_WAIT)
    try:
        subprocess.run([PYTHON, "main.py"], cwd=BACKEND)
    except KeyboardInterrupt:
        print("\n[dev] 收到中断信号")
    finally:
        vite.terminate()
        print("[dev] Vite 已停止")


if __name__ == "__main__":
    main()
