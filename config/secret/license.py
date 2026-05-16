"""授权码验证 — RSA-PSS 非对称签名 + 硬件指纹绑定 + NTP/离线双轨校时。

验证流程：
  联网时：NTP 校时 → 更新 HMAC 签名的本地时间戳文件
  离线时：读取本地时间戳文件 → 验证 HMAC（防篡改）→ 验证本地时间

安全特性：
  - RSA-2048 PSS 签名，无私钥无法伪造授权码
  - 授权码绑定硬件指纹，复制到其他机器无效
  - NTP 联网校时，修改系统时钟无效
  - 本地时间戳文件以 HMAC-SHA256(硬件指纹) 签名，篡改即拒绝
  - 首次使用必须联网；之后最多可离线 MAX_OFFLINE_HOURS 小时
  - 时钟回拨检测（允许 120 秒容差）
"""
from __future__ import annotations

import base64
import dataclasses
import json
import socket
import struct
import sys
from datetime import datetime, timezone
from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

from .fingerprint import get_fingerprint

# 最长允许离线时长（小时）
MAX_OFFLINE_HOURS = 72

# ── NTP 校时 ─────────────────────────────────────────────────────

_NTP_DELTA   = 2208988800          # 1900-01-01 → 1970-01-01 秒差
_NTP_SERVERS = [
    "ntp.aliyun.com",
    "time.windows.com",
    "pool.ntp.org",
]


def _ntp_now() -> datetime:
    """查询 NTP 获取 UTC 时间；全部服务器不可达时抛出 Exception（非 LicenseError）。"""
    request  = b"\x1b" + b"\x00" * 47
    last_err: Exception | None = None
    for host in _NTP_SERVERS:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(4)
            sock.sendto(request, (host, 123))
            data, _ = sock.recvfrom(1024)
            sock.close()
            seconds = struct.unpack("!12I", data)[10]
            return datetime.fromtimestamp(seconds - _NTP_DELTA, tz=timezone.utc)
        except Exception as e:
            last_err = e
    raise OSError(f"NTP 不可达: {last_err}")


# ── 本地时间戳文件（.lv）────────────────────────────────────────

def _lv_path() -> Path:
    base = Path(sys.executable).parent if getattr(sys, "frozen", False) \
           else Path(__file__).parent.parent.parent
    return base / "data" / ".lv"


def _save_lv(ts: float, exp: float) -> None:
    """将时间戳以 Fernet 加密后写入 .lv 文件。
    密钥由硬件指纹派生，文件在其他机器上无法解密，任何字节篡改均导致解密失败。
    """
    from .cipher import encrypt_str
    payload = json.dumps({"ts": round(ts, 3), "exp": round(exp, 3)})
    path    = _lv_path()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(encrypt_str(payload))
    except Exception:
        pass   # 写失败不影响主流程，下次联网时会重写


def _load_lv(exp_ts: float) -> float | None:
    """解密 .lv 文件，返回上次联网验证的 Unix 时间戳。
    文件不存在、被篡改、跨机复制或与当前授权码不符时均返回 None。
    """
    from .cipher import decrypt_str
    try:
        ciphertext = _lv_path().read_bytes()
        data       = json.loads(decrypt_str(ciphertext))
        ts         = float(data["ts"])
        stored_exp = float(data["exp"])
    except Exception:
        return None

    # 确认 .lv 属于当前授权码（exp 必须一致）
    if abs(stored_exp - exp_ts) > 1:
        return None

    return ts


# ── 公钥 ─────────────────────────────────────────────────────────
_PUBLIC_KEY_PEM = b"""\
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtn0/I2rZaRSZOpqM1+Cc
9qwdpRv1WrlDfgjTHjAuI1Jpl06f1FVEcQEXrBqTfMDWuEHOgTxAEvESwCuOWWS0
ELB69mxpZ5ulVAx9bluBcd5aih1axHadxYfbAFIhtaH2oB9oy7+lYw5glNGBVX2J
VGdtbjj4y//Mrii/e2gYy/JgE3Y7zIJlYEXoYbj1QViRixLOXEXPJUVQqQCb6p2O
YifL8/SIkZDye97oQGGQL8DeKkb2pD/Gy94g+xYtouSGVvm1+WHMstpSKpg/Xeds
EbAe4Hqfb53+GCEfjpqd32b/aanJnnKgOMTh+5g+8QsYRfrk5xzaedFSt/UovrYL
FwIDAQAB
-----END PUBLIC KEY-----
"""


def _public_key():
    if b"TODO" in _PUBLIC_KEY_PEM:
        raise LicenseError("授权系统未初始化：请先运行 python scripts/gen_keypair.py 生成密钥对")
    return serialization.load_pem_public_key(_PUBLIC_KEY_PEM)


# ── 数据结构 ─────────────────────────────────────────────────────

@dataclasses.dataclass(frozen=True)
class LicenseInfo:
    fingerprint  : str
    expires_at   : datetime
    license_type : str
    user         : str

    @property
    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) > self.expires_at

    @property
    def days_remaining(self) -> int:
        return max(0, (self.expires_at - datetime.now(timezone.utc)).days)


class LicenseError(Exception):
    """授权验证失败时抛出。"""


# ── 核心验证 ─────────────────────────────────────────────────────

def verify(license_key: str) -> LicenseInfo:
    """验证授权码，返回 LicenseInfo；失败时抛出 LicenseError。"""

    # 1. 拆分
    parts = license_key.strip().split(".")
    if len(parts) != 2:
        raise LicenseError("授权码格式错误")
    payload_b64, sig_b64 = parts

    # 2. Base64 解码
    try:
        payload_bytes = base64.urlsafe_b64decode(payload_b64 + "==")
        signature     = base64.urlsafe_b64decode(sig_b64     + "==")
    except Exception:
        raise LicenseError("授权码解码失败")

    # 3. RSA-PSS 签名验证
    try:
        _public_key().verify(
            signature, payload_bytes,
            padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
            hashes.SHA256(),
        )
    except InvalidSignature:
        raise LicenseError("授权码签名无效，可能已被篡改")
    except Exception as e:
        raise LicenseError(f"签名验证异常: {e}")

    # 4. 解析 payload
    try:
        payload = json.loads(payload_bytes.decode())
    except Exception:
        raise LicenseError("授权码数据损坏")

    # 5. 验证硬件指纹
    if payload.get("fp") != get_fingerprint().hex():
        raise LicenseError("授权码与当前机器不匹配")

    exp_ts     = payload.get("exp", 0)
    expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc)

    # 6. 尝试 NTP 联网校时
    try:
        now = _ntp_now()
        if now > expires_at:
            raise LicenseError(f"授权码已于 {expires_at.strftime('%Y-%m-%d')} UTC 过期")
        # 联网成功：更新签名时间戳文件
        _save_lv(now.timestamp(), exp_ts)

    except LicenseError:
        raise   # 过期错误直接上抛，不走离线分支

    except Exception:
        # ── 离线分支：NTP 不可达，改用签名时间戳文件 ──────────────
        last_ts = _load_lv(exp_ts)

        if last_ts is None:
            raise LicenseError(
                "无法连接网络校时，且无本地验证记录\n首次使用必须联网激活"
            )

        now_local = datetime.now(timezone.utc)
        now_ts    = now_local.timestamp()

        # 时钟回拨检测（容差 120 秒）
        if now_ts < last_ts - 120:
            raise LicenseError("检测到系统时间异常（时钟回拨），授权验证失败")

        # 离线时长检测
        offline_secs = now_ts - last_ts
        if offline_secs > MAX_OFFLINE_HOURS * 3600:
            raise LicenseError(
                f"已离线超过 {MAX_OFFLINE_HOURS} 小时，请联网重新验证"
            )

        # 以本地时间判断是否过期
        if now_local > expires_at:
            raise LicenseError(f"授权码已于 {expires_at.strftime('%Y-%m-%d')} UTC 过期")

    return LicenseInfo(
        fingerprint  = payload["fp"],
        expires_at   = expires_at,
        license_type = payload.get("type", ""),
        user         = payload.get("user", ""),
    )


def is_authorized(license_key: str) -> bool:
    """验证授权码是否有效（不抛异常）。"""
    try:
        verify(license_key)
        return True
    except LicenseError:
        return False
