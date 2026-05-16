"""硬件指纹采集 — 组合多个机器特征，生成绑定当前设备的唯一标识。

采集优先级：MAC 地址 → 主机名 → CPU 架构 → 磁盘序列号（Windows）
任意一项采集失败均静默跳过，不影响整体可用性。
"""
from __future__ import annotations

import hashlib
import platform
import subprocess
import uuid


def _disk_serial() -> str:
    """通过 wmic 获取第一块磁盘序列号（仅 Windows）。"""
    try:
        result = subprocess.run(
            ["wmic", "diskdrive", "get", "SerialNumber"],
            capture_output=True, text=True, timeout=3,
        )
        lines = [l.strip() for l in result.stdout.splitlines() if l.strip()]
        # 第 0 行是表头 "SerialNumber"，第 1 行起是值
        return lines[1] if len(lines) > 1 else ""
    except Exception:
        return ""


def get_fingerprint() -> bytes:
    """返回当前机器的 32 字节硬件指纹（SHA-256）。"""
    factors: list[str] = [
        str(uuid.getnode()),  # MAC 地址（网卡物理地址，换网卡才会变）
        platform.machine(),   # CPU 架构（x86_64 / ARM64，基本不变）
    ]

    # 磁盘序列号：比 MAC 地址更难伪造，换硬盘才会变
    serial = _disk_serial()
    if serial:
        factors.append(serial)

    combined = "|".join(factors).encode("utf-8")
    return hashlib.sha256(combined).digest()
