"""文件读写操作（对话框由前端 <input type="file"> 实现）"""
from __future__ import annotations


class FileMixin:

    def read_text_file(self, path: str) -> dict:
        """按路径读取文本文件内容（供前端拿到路径后调用）。"""
        from pathlib import Path
        from logger import log
        try:
            text = Path(path).read_text(encoding="utf-8")
            return {"success": True, "data": text}
        except Exception as e:
            log.error(f"read_text_file 失败: {path}", exc_info=True)
            return {"success": False, "message": str(e)}
