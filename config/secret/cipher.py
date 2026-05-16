"""对称加密工具 — 基于 Fernet（AES-128-CBC + HMAC-SHA256）。

密钥由硬件指纹派生，密文绑定当前机器，移植到其他设备后无法解密。

典型用法：
    from secret import encrypt_str, decrypt_str

    token = encrypt_str("my-api-key")   # 返回 bytes，可持久化存储
    key   = decrypt_str(token)           # 返回原始字符串
"""
from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from .kdf import derive_key


def _fernet() -> Fernet:
    return Fernet(derive_key())


# ── bytes 级接口 ──────────────────────────────────────────────────

def encrypt(plaintext: bytes) -> bytes:
    """加密原始字节，返回 Fernet 密文（bytes）。"""
    return _fernet().encrypt(plaintext)


def decrypt(ciphertext: bytes) -> bytes:
    """解密 Fernet 密文，返回原始字节。密文被篡改时抛出 InvalidToken。"""
    return _fernet().decrypt(ciphertext)


# ── str 级接口（UTF-8）────────────────────────────────────────────

def encrypt_str(plaintext: str) -> bytes:
    """加密字符串（UTF-8），返回 Fernet 密文。"""
    return encrypt(plaintext.encode("utf-8"))


def decrypt_str(ciphertext: bytes) -> str:
    """解密 Fernet 密文，返回字符串。"""
    return decrypt(ciphertext).decode("utf-8")


# ── 安全比较（防时序攻击）────────────────────────────────────────

def safe_decrypt_str(ciphertext: bytes, default: str = "") -> str:
    """解密失败时返回 default 而非抛出异常，适合非关键路径。"""
    try:
        return decrypt_str(ciphertext)
    except (InvalidToken, Exception):
        return default
