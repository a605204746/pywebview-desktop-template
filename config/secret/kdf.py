"""密钥派生 — 用硬件指纹 + PBKDF2 生成 Fernet 兼容的 32 字节密钥。

PBKDF2 参数：
  - 哈希：SHA-256
  - 迭代：200 000 次（NIST SP 800-132 推荐下限）
  - Salt：应用级固定盐（防彩虹表；若需用户级隔离可改为 per-user salt）
"""
from __future__ import annotations

import base64
import hashlib

from .fingerprint import get_fingerprint

# 应用级固定盐：修改后所有已加密数据将无法解密，请勿随意变更
_SALT = b"pywebview-desktop-app-kdf-v1"
_ITERATIONS = 200_000


def derive_key(salt: bytes = _SALT, iterations: int = _ITERATIONS) -> bytes:
    """从硬件指纹派生 URL-safe Base64 编码的 32 字节密钥（Fernet 格式）。"""
    fingerprint = get_fingerprint()
    dk = hashlib.pbkdf2_hmac("sha256", fingerprint, salt, iterations)
    return base64.urlsafe_b64encode(dk)
