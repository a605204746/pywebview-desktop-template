"""构建脚本：PyArmor 混淆 → npm build → PyInstaller 打包。

用法：
  python scripts/build.py              # onedir 模式（推荐，启动快）
  python scripts/build.py --onefile    # 单文件模式（便于分发）
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT     = Path(__file__).parent.parent
FRONTEND = ROOT / "frontend"
SPEC_DIR = ROOT / "scripts"
OUT_DIR  = ROOT / "output"


def clean() -> None:
    for path in [OUT_DIR / "build", OUT_DIR / "dist" / "desktop-app", OUT_DIR / "obf_backend"]:
        if path.exists():
            shutil.rmtree(path)
            print(f"[clean] 已删除 {path.relative_to(ROOT)}")


def obfuscate_backend() -> None:
    print("[1/3] PyArmor 混淆后端代码…")
    subprocess.run(
        [sys.executable, str(SPEC_DIR / "obfuscate.py")],
        cwd=ROOT,
        check=True,
    )
    print("[1/3] 混淆完成\n")


def build_frontend() -> None:
    print("[2/3] 构建前端静态文件（npm run build）…")
    subprocess.run(
        ["npm", "run", "build"],
        cwd=FRONTEND,
        check=True,
        shell=(sys.platform == "win32"),
    )
    print("[2/3] 前端构建完成\n")


def build_backend(onefile: bool) -> None:
    spec = "build_onefile.spec" if onefile else "build.spec"
    mode = "单文件" if onefile else "onedir"
    print(f"[3/3] PyInstaller 打包（{mode} 模式，spec: {spec}）…")
    subprocess.run(
        [
            sys.executable, "-m", "PyInstaller", str(SPEC_DIR / spec),
            "--noconfirm", "--clean",
            "--workpath", str(OUT_DIR / "build"),
            "--distpath", str(OUT_DIR / "dist"),
        ],
        cwd=ROOT,
        check=True,
    )
    print("[3/3] 打包完成\n")


def cleanup() -> None:
    tmp_ico = ROOT / "config" / "assets" / "_build_icon.ico"
    if tmp_ico.exists():
        tmp_ico.unlink()


def main() -> None:
    parser = argparse.ArgumentParser(description="桌面应用构建脚本")
    parser.add_argument("--onefile", action="store_true", help="打包为单文件 exe")
    args = parser.parse_args()

    clean()
    obfuscate_backend()
    build_frontend()
    build_backend(args.onefile)
    cleanup()

    out = OUT_DIR / "dist" / "desktop-app"
    print(f"完成！输出目录：{out}")


if __name__ == "__main__":
    main()
