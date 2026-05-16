"""本地持久化键值存储"""
from __future__ import annotations


class StorageMixin:

    def get_setting(self, key: str, default=None) -> dict:
        """读取持久化键值。"""
        from db import kv_get
        return {"success": True, "data": kv_get(key, default)}

    def set_setting(self, key: str, value) -> dict:
        """写入持久化键值。"""
        from db import kv_set
        from logger import log
        try:
            kv_set(key, value)
            return {"success": True}
        except Exception as e:
            log.error(f"set_setting 失败: key={key}", exc_info=True)
            return {"success": False, "message": str(e)}

    def delete_setting(self, key: str) -> dict:
        from db import kv_delete
        kv_delete(key)
        return {"success": True}
