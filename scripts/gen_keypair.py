"""一次性生成 RSA-2048 密钥对。

用法：
  python scripts/gen_keypair.py

输出：
  - scripts/private.pem  私钥（本地保存，严禁提交 git）
  - 终端打印公钥         复制粘贴到 config/secret/license.py
"""
from __future__ import annotations

from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

PRIVATE_KEY_PATH = Path(__file__).parent / "private.pem"


def main() -> None:
    if PRIVATE_KEY_PATH.exists():
        answer = input(f"[keygen] {PRIVATE_KEY_PATH} 已存在，覆盖？[y/N] ").strip().lower()
        if answer != "y":
            print("[keygen] 已取消")
            return

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    # 保存私钥
    PRIVATE_KEY_PATH.write_bytes(
        private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    print(f"[keygen] 私钥已保存: {PRIVATE_KEY_PATH}")
    print("[keygen] ⚠ 请勿将 private.pem 提交到版本控制！")

    # 输出公钥
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()

    print("\n[keygen] 将以下公钥粘贴到 config/secret/license.py 的 _PUBLIC_KEY_PEM：")
    print("=" * 64)
    print(public_pem)
    print("=" * 64)


if __name__ == "__main__":
    main()
