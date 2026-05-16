"""授权码签发工具（在开发者机器上运行，需要 scripts/private.pem）。

用法：
  python scripts/gen_license.py
"""
from __future__ import annotations

import base64
import json
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

ROOT             = Path(__file__).parent.parent
PRIVATE_KEY_PATH = Path(__file__).parent / "private.pem"

DAYS         = 365   # 默认有效天数
LICENSE_TYPE = "pro" # 授权类型


def _load_private_key():
    if not PRIVATE_KEY_PATH.exists():
        raise FileNotFoundError(
            f"私钥不存在: {PRIVATE_KEY_PATH}\n"
            "请先运行: python scripts/gen_keypair.py"
        )
    return serialization.load_pem_private_key(
        PRIVATE_KEY_PATH.read_bytes(), password=None
    )


def sign_license(fingerprint_hex: str, days: int = DAYS) -> str:
    private_key = _load_private_key()

    payload = {
        "fp"  : fingerprint_hex,
        "exp" : int(time.time()) + days * 86400,
        "type": LICENSE_TYPE,
    }
    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    payload_b64   = base64.urlsafe_b64encode(payload_bytes).decode().rstrip("=")

    signature = private_key.sign(
        payload_bytes,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH,
        ),
        hashes.SHA256(),
    )
    sig_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")

    return f"{payload_b64}.{sig_b64}"


def main() -> None:
    fingerprint_hex = input("请输入指纹码：").strip()
    if not fingerprint_hex:
        print("错误：指纹码不能为空")
        sys.exit(1)

    days_input = input(f"有效天数（直接回车默认 {DAYS} 天）：").strip()
    days = int(days_input) if days_input.isdigit() else DAYS

    license_key = sign_license(fingerprint_hex, days)
    expires     = (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%d")

    print(f"\n授权码（到期：{expires} UTC）：")
    print(license_key)


if __name__ == "__main__":
    main()
