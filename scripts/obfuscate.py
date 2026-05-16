"""PyArmor 混淆脚本：backend/ + config/secret/ → output/obf_backend/

混淆步骤：
  1. 将 config/secret/ 临时复制到 backend/（让 PyArmor 一并加密）
  2. 对整个 backend/ 目录运行 PyArmor gen -r
  3. 无论成功与否，删除 backend/ 中的临时副本

注意：PyArmor 8 免费版限制每个项目 10 个脚本，商业项目需购买授权。
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT    = Path(__file__).parent.parent
OBF_DIR = ROOT / "output" / "obf_backend"

# 需要临时复制进 backend/ 再由 PyArmor 加密的文件 / 目录
_COPIES: list[tuple[Path, Path]] = [
    (ROOT / "config" / "secret", ROOT / "backend" / "secret"),
]


def _copy_in() -> None:
    for src, dst in _COPIES:
        if src.is_dir():
            shutil.copytree(src, dst, dirs_exist_ok=True)
        else:
            shutil.copy(src, dst)
        print(f"[obfuscate] 已复制 {src.relative_to(ROOT)} → backend/（临时）")


def _clean_up() -> None:
    for _, dst in _COPIES:
        if dst.is_dir():
            shutil.rmtree(dst, ignore_errors=True)
        else:
            dst.unlink(missing_ok=True)
        print(f"[obfuscate] 已删除临时副本 {dst.relative_to(ROOT)}")


def main() -> None:
    if OBF_DIR.exists():
        shutil.rmtree(OBF_DIR)
    OBF_DIR.mkdir(parents=True, exist_ok=True)

    _copy_in()

    try:
        subprocess.run(
            [
                sys.executable, "-m", "pyarmor.cli", "gen",
                "--output", str(OBF_DIR),
                "-r",
                str(ROOT / "backend"),
            ],
            cwd=ROOT,
            check=True,
        )
    finally:
        _clean_up()

    rt_dirs = list(OBF_DIR.glob("pyarmor_runtime_*"))
    if not rt_dirs:
        raise RuntimeError("PyArmor runtime 目录未生成，请检查 pyarmor 安装")
    print(f"[obfuscate] 完成，运行时: {rt_dirs[0].name}")
    print(f"[obfuscate] 输出目录: {OBF_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
