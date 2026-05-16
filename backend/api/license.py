"""授权码验证 API。

前端调用：
    call('get_license_status')                               → 当前授权状态（含本机指纹）
    call('verify_license', key)                              → 验证并保存授权码
    call('clear_license')                                    → 清除授权码
    call('get_demo_records')                                 → 获取演示表格
    call('create_demo_record', name, role, api_key, secret)  → 新增记录（敏感字段自动加密存储）
    call('update_demo_record', id, name, role, api_key, secret) → 编辑记录
    call('delete_demo_record', id)                           → 删除记录
"""
from __future__ import annotations

from config import RUNTIME_DIR
from logger import log

_LICENSE_FILE = RUNTIME_DIR / "license.lic"


def _read_license_key() -> str | None:
    try:
        return _LICENSE_FILE.read_text("utf-8").strip() or None
    except FileNotFoundError:
        return None


def _write_license_key(key: str) -> None:
    _LICENSE_FILE.parent.mkdir(parents=True, exist_ok=True)
    _LICENSE_FILE.write_text(key, "utf-8")


def _delete_license_key() -> None:
    try:
        _LICENSE_FILE.unlink()
    except FileNotFoundError:
        pass

_VALID_ROLES = {'管理员', '开发者', '运维', '只读'}


def _check_authorized() -> bool:
    saved_key = _read_license_key()
    if not saved_key:
        return False
    try:
        from secret.license import verify
        verify(saved_key)
        return True
    except Exception:
        # 验证失败（含过期）时清除凭证文件，与 get_license_status 行为一致
        _delete_license_key()
        return False


class LicenseMixin:

    def get_license_status(self) -> dict:
        """返回当前授权状态和本机硬件指纹。"""
        from secret.fingerprint import get_fingerprint
        fingerprint = get_fingerprint().hex()

        saved_key = _read_license_key()
        if not saved_key:
            return {"success": True, "data": {
                "authorized":  False,
                "fingerprint": fingerprint,
                "message":     "未激活",
            }}

        try:
            from secret.license import verify
            info = verify(saved_key)
            return {"success": True, "data": {
                "authorized":   True,
                "fingerprint":  fingerprint,
                "expires_at":   info.expires_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "license_type": info.license_type,
                "user":         info.user,
            }}
        except Exception as e:
            log.warning(f"[license] 已保存的授权码验证失败: {e}")
            _delete_license_key()
            return {"success": True, "data": {
                "authorized":  False,
                "fingerprint": fingerprint,
                "message":     str(e),
            }}

    def verify_license(self, license_key: str) -> dict:
        """验证授权码，验证通过后持久化保存。"""
        if not license_key or not license_key.strip():
            return {"success": False, "message": "授权码不能为空"}

        try:
            from secret.license import verify
            info = verify(license_key.strip())
            _write_license_key(license_key.strip())
            log.info(f"[license] 激活成功，类型: {info.license_type}，到期: {info.expires_at.date()}")
            return {"success": True, "data": {
                "authorized":   True,
                "expires_at":   info.expires_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "license_type": info.license_type,
                "user":         info.user,
            }}
        except Exception as e:
            log.warning(f"[license] 激活失败: {e}")
            return {"success": False, "message": str(e)}

    def clear_license(self) -> dict:
        """清除已保存的授权凭证。"""
        _delete_license_key()
        log.info("[license] 授权凭证已清除")
        return {"success": True}

    # ── 演示记录 CRUD ─────────────────────────────────────────────

    def get_demo_records(self) -> dict:
        """返回演示表格。
        - 已授权：解密 api_key / secret 后返回明文
        - 未授权：api_key / secret 返回空字符串，前端统一显示占位提示
        """
        from db import record_list
        from secret.cipher import safe_decrypt_str

        is_authorized = _check_authorized()
        rows = []
        for r in record_list():
            row: dict = {"id": r["id"], "name": r["name"], "role": r["role"]}
            if is_authorized:
                row["api_key"] = safe_decrypt_str(r["api_key"].encode(), default="[解密失败]")
                row["secret"]  = safe_decrypt_str(r["secret"].encode(),  default="[解密失败]")
            else:
                row["api_key"] = ""
                row["secret"]  = ""
            rows.append(row)

        return {"success": True, "data": {"records": rows, "authorized": is_authorized}}

    def create_demo_record(self, name: str, role: str, api_key: str, secret: str) -> dict:
        """新增演示记录；敏感字段加密后入库。"""
        name    = (name    or "").strip()
        role    = (role    or "").strip()
        api_key = (api_key or "").strip()
        secret  = (secret  or "").strip()

        if not name or not role or not api_key or not secret:
            return {"success": False, "message": "所有字段均为必填"}
        if role not in _VALID_ROLES:
            return {"success": False, "message": f"角色必须是: {', '.join(_VALID_ROLES)}"}

        from db import record_create
        from secret.cipher import encrypt_str
        enc_key    = encrypt_str(api_key).decode()
        enc_secret = encrypt_str(secret).decode()
        new_id = record_create(name, role, enc_key, enc_secret)
        log.info(f"[license] 新增记录 id={new_id}，name={name}")
        return {"success": True, "data": {"id": new_id}}

    def update_demo_record(self, id: int, name: str, role: str, api_key: str, secret: str) -> dict:
        """编辑演示记录；敏感字段加密后更新；若留空则保留原加密值。"""
        name    = (name    or "").strip()
        role    = (role    or "").strip()
        api_key = (api_key or "").strip()
        secret  = (secret  or "").strip()

        if not name or not role:
            return {"success": False, "message": "姓名和角色为必填"}
        if role not in _VALID_ROLES:
            return {"success": False, "message": f"角色必须是: {', '.join(_VALID_ROLES)}"}

        from db import record_get, record_update
        from secret.cipher import encrypt_str

        existing = record_get(int(id))
        if not existing:
            return {"success": False, "message": "记录不存在"}

        # 有新值就重新加密，否则保留数据库中的旧加密值
        enc_key    = encrypt_str(api_key).decode() if api_key else existing["api_key"]
        enc_secret = encrypt_str(secret).decode()  if secret  else existing["secret"]

        record_update(int(id), name, role, enc_key, enc_secret)
        log.info(f"[license] 更新记录 id={id}，name={name}")
        return {"success": True}

    def delete_demo_record(self, id: int) -> dict:
        """删除演示记录。"""
        from db import record_delete
        ok = record_delete(int(id))
        if not ok:
            return {"success": False, "message": "记录不存在"}
        log.info(f"[license] 删除记录 id={id}")
        return {"success": True}
