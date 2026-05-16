"""Shell / 系统交互操作"""
from __future__ import annotations

import sys


class ShellMixin:

    def open_log_dir(self) -> dict:
        """在文件管理器中打开日志目录。"""
        import subprocess
        from config import LOG_DIR
        try:
            LOG_DIR.mkdir(parents=True, exist_ok=True)
            if sys.platform == "win32":
                subprocess.Popen(["explorer", str(LOG_DIR)])
            elif sys.platform == "darwin":
                subprocess.Popen(["open", str(LOG_DIR)])
            else:
                subprocess.Popen(["xdg-open", str(LOG_DIR)])
            return {"success": True}
        except Exception as e:
            return {"success": False, "message": str(e)}
