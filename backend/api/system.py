"""系统信息与开机自启"""
from __future__ import annotations

import sys


class SystemMixin:

    def get_app_info(self) -> dict:
        import platform
        from config import APP_NAME, APP_VERSION
        return {
            "success": True,
            "data": {
                "name":    APP_NAME,
                "version": APP_VERSION,
                "system":  platform.system(),
                "release": platform.release(),
                "machine": platform.machine(),
                "python":  platform.python_version(),
            },
        }

    def get_autostart(self) -> dict:
        """查询是否已设置开机自启。"""
        if sys.platform != "win32":
            return {"success": True, "data": False, "message": "仅 Windows 支持"}
        try:
            import winreg
            from config import APP_NAME
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                r"Software\Microsoft\Windows\CurrentVersion\Run",
                0, winreg.KEY_QUERY_VALUE,
            )
            winreg.QueryValueEx(key, APP_NAME)
            winreg.CloseKey(key)
            return {"success": True, "data": True}
        except FileNotFoundError:
            return {"success": True, "data": False}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def set_autostart(self, enabled: bool) -> dict:
        """启用或禁用开机自启（仅打包后的 exe 版本生效）。"""
        if sys.platform != "win32":
            return {"success": False, "message": "仅 Windows 支持"}
        if not getattr(sys, "frozen", False):
            return {"success": False, "message": "仅打包版本支持开机自启，当前为开发模式"}
        try:
            import winreg
            from config import APP_NAME
            from logger import log
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                r"Software\Microsoft\Windows\CurrentVersion\Run",
                0, winreg.KEY_SET_VALUE,
            )
            if enabled:
                winreg.SetValueEx(key, APP_NAME, 0, winreg.REG_SZ, sys.executable)
            else:
                try:
                    winreg.DeleteValue(key, APP_NAME)
                except FileNotFoundError:
                    pass
            winreg.CloseKey(key)
            log.info(f"开机自启已{'启用' if enabled else '禁用'}")
            return {"success": True}
        except Exception as e:
            from logger import log
            log.error("set_autostart 失败", exc_info=True)
            return {"success": False, "message": str(e)}
