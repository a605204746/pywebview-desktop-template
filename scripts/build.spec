# -*- mode: python ; coding: utf-8 -*-
"""onedir 打包配置（推荐，启动快）。用法：python scripts/build.py"""
import sys
from pathlib import Path
from PyInstaller.utils.hooks import collect_all

ROOT        = Path(SPEC).parent.parent
FRONT       = ROOT / "frontend" / "dist"
ASSETS      = ROOT / "config" / "assets"
OBF_BACKEND = ROOT / "output" / "obf_backend"   # PyArmor 混淆后的 backend

if not OBF_BACKEND.exists():
    raise RuntimeError(
        f"混淆目录不存在: {OBF_BACKEND}\n"
        "请通过 python scripts/build.py 完整构建，不要单独运行 PyInstaller。"
    )

# ╔══════════════════════════════════════════════════════════════╗
# ║                       用户配置区                              ║
# ╠══════════════════════════════════════════════════════════════╣

# 需要打包的 Python 包（collect_all 自动收录子模块 + 数据文件）
PACKAGES = [
    'webview',        # pywebview
    'pythonnet',      # 导入名是 clr，pip 包名是 pythonnet
    'clr_loader',     # pythonnet 3.x 运行时加载器
    'pystray',
    'PIL',            # pillow
    'cryptography',   # secret/ 模块依赖，PyArmor 混淆后静态分析不到
]

# 静态分析找不到的隐式导入
# 只需填写"源文件里没有显式 import 语句"的特殊模块；
# 其余依赖由下方自动扫描填充，无需手动维护。
HIDDEN_IMPORTS = [
    'webview.platforms.winforms',  # platform 选择在 pywebview 内部动态加载
    'clr',                         # pythonnet 顶层别名，动态加载
    'app_config',                  # config/app_config.py 打包为顶层模块
    'secret',                      # config/secret/ 混淆后作为顶层包
    'secret.fingerprint',
    'secret.kdf',
    'secret.cipher',
    'secret.license',
]

# ── 自动扫描源文件，补全 PyArmor 混淆后 PyInstaller 无法静态分析的 import ──
# 解析 backend/ 和 config/secret/ 原始 .py 文件，提取所有绝对 import，
# 这样新增第三方/stdlib 依赖时无需手动修改本文件。
import ast as _ast

def _scan_source_imports(dirs: list) -> list[str]:
    found: set[str] = set()
    for d in dirs:
        d = Path(d)
        if not d.exists():
            continue
        for f in d.rglob("*.py"):
            try:
                tree = _ast.parse(f.read_text(encoding="utf-8"))
            except Exception as e:
                print(f"[auto-imports] 跳过 {f.name}: {e}")
                continue
            for node in _ast.walk(tree):
                if isinstance(node, _ast.Import):
                    for alias in node.names:
                        found.add(alias.name)
                elif isinstance(node, _ast.ImportFrom):
                    if node.level == 0 and node.module:  # 只收绝对导入，跳过相对导入
                        found.add(node.module)
    return sorted(found)

_scanned = _scan_source_imports([ROOT / "backend", ROOT / "config" / "secret"])
HIDDEN_IMPORTS = list(dict.fromkeys(HIDDEN_IMPORTS + _scanned))  # 合并去重，保留顺序
print(f"[auto-imports] 自动扫描到 {len(_scanned)} 个模块，合并后共 {len(HIDDEN_IMPORTS)} 个")

# 额外数据文件：(本机路径, 包内目标目录)
EXTRA_DATAS = [
    # (str(ROOT / "my_config.json"), "."),
]

# 排除不需要的标准库，减小包体积
EXCLUDES = [
    'tkinter', '_tkinter',
    'test', 'unittest', 'doctest',
    'pdb', 'profile', 'pstats',
]

# ╚══════════════════════════════════════════════════════════════╝

# ── 图标（从 app_config.py 读取，与运行时保持同一来源）──────────
import importlib.util as _ilu
_cfg_spec = _ilu.spec_from_file_location("app_config", ROOT / "config" / "app_config.py")
_cfg_mod  = _ilu.module_from_spec(_cfg_spec)
_cfg_spec.loader.exec_module(_cfg_mod)
ICON = ASSETS / getattr(_cfg_mod, "ICON", "icon.ico")
if ICON.exists() and ICON.suffix.lower() != ".ico":
    from PIL import Image
    _tmp = ASSETS / "_build_icon.ico"
    Image.open(ICON).resize((256, 256)).save(str(_tmp), format="ICO")
    EXE_ICON = str(_tmp)
elif ICON.exists():
    EXE_ICON = str(ICON)
else:
    EXE_ICON = None

# ── 收集包 ─────────────────────────────────────────────────────
_datas, _bins, _hidden = list(EXTRA_DATAS), [], list(HIDDEN_IMPORTS)
for _pkg in PACKAGES:
    try:
        d, b, h = collect_all(_pkg)
        _datas += d; _bins += b; _hidden += h
        print(f"[pkg] collected: {_pkg}")
    except Exception as _e:
        print(f"[pkg] skipped {_pkg!r}: {_e}")

# ── PyArmor 运行时收集 ─────────────────────────────────────────
# 混淆后的 backend 目录里有 pyarmor_runtime_XXXXXXXX 包，
# 需加入 sys.path 才能让 collect_all 找到它。
sys.path.insert(0, str(OBF_BACKEND))
_rt_dirs = list(OBF_BACKEND.glob("pyarmor_runtime_*"))
if not _rt_dirs:
    raise RuntimeError("PyArmor runtime 目录未找到，请重新运行完整构建。")
_pyarmor_rt_name = _rt_dirs[0].name
try:
    d, b, h = collect_all(_pyarmor_rt_name)
    _datas += d; _bins += b; _hidden += h
    print(f"[pyarmor] collected: {_pyarmor_rt_name}")
except Exception as _e:
    print(f"[pyarmor] collect_all fallback: {_e}")
    for _f in _rt_dirs[0].iterdir():
        if _f.suffix in ('.pyd', '.so'):
            _bins.append((str(_f), _pyarmor_rt_name))
        elif _f.suffix == '.py':
            _datas.append((str(_f), _pyarmor_rt_name))

# ── 后端模块隐式导入 ───────────────────────────────────────────
# PyArmor 混淆后 PyInstaller 无法从代码静态分析导入关系，
# 自动发现 backend 下所有模块名并加入 hidden imports。
for _f in (ROOT / "backend").rglob("*.py"):
    if _f.stem == "__init__":
        # 子包：取相对于 backend 的包名
        _pkg_path = _f.parent.relative_to(ROOT / "backend")
        _hidden.append(str(_pkg_path).replace("\\", ".").replace("/", "."))
    elif not _f.stem.startswith("_"):
        _rel = _f.relative_to(ROOT / "backend")
        _mod = str(_rel.with_suffix("")).replace("\\", ".").replace("/", ".")
        _hidden.append(_mod)
print(f"[backend] hidden imports: {[h for h in _hidden if not h.startswith('webview')]}")

# ── Windows DLL 补全 ───────────────────────────────────────────
import ssl as _ssl_mod, _ctypes as _ctypes_ext

_dll_dirs = [
    Path(_ssl_mod._ssl.__file__).parent,
    Path(_ctypes_ext.__file__).parent,
    Path(sys.executable).parent,
    Path(sys.base_prefix),
    Path(sys.base_prefix) / "DLLs",
    Path(sys.base_prefix) / "Library" / "bin",
]
_seen: set = set()


def _find_dlls(names: list, dirs: list) -> list:
    result = []
    for name in names:
        for d in dirs:
            p = d / name
            if p.exists() and p not in _seen:
                _seen.add(p); result.append((str(p), ".")); break
        else:
            for p in Path(sys.base_prefix).rglob(name):
                if p not in _seen:
                    _seen.add(p); result.append((str(p), ".")); break
    return result


# SSL DLL
try:
    import pefile as _pef
    _pe = _pef.PE(_ssl_mod._ssl.__file__)
    _ssl_names = [e.dll.decode() for e in getattr(_pe, 'DIRECTORY_ENTRY_IMPORT', [])
                  if any(k in e.dll.lower() for k in (b'ssl', b'crypto'))]
    _pe.close()
    if not _ssl_names:
        raise ValueError("no ssl/crypto in PE imports")
except Exception as _e:
    print(f"[ssl] pefile fallback: {_e}")
    _ssl_names = ['libssl-3-x64.dll', 'libcrypto-3-x64.dll']

_found = _find_dlls(_ssl_names, _dll_dirs)
_bins += _found
print(f"[ssl] {[b[0] for b in _found]}")

# ctypes DLL（python3.dll + libffi）
_found = _find_dlls(
    ['python3.dll', 'ffi.dll', 'libffi-8.dll', 'libffi-7.dll', 'libffi.dll'],
    _dll_dirs,
)
_bins += _found
print(f"[ctypes] {[b[0] for b in _found]}")

# Python.Runtime.dll（pythonnet 必需）
try:
    import pythonnet as _pn_mod
    for _rt in Path(_pn_mod.__file__).parent.rglob('Python.Runtime.dll'):
        _bins.append((str(_rt), '.')); print(f"[clr] {_rt}"); break
    else:
        raise FileNotFoundError("not in pythonnet package")
except Exception as _e:
    print(f"[clr] fallback: {_e}")
    for _sp in sys.path:
        if not _sp:
            continue
        for _rt in Path(_sp).rglob('Python.Runtime.dll'):
            _bins.append((str(_rt), '.')); print(f"[clr] {_rt}"); break
        else:
            continue
        break
    else:
        print("[clr] WARNING: Python.Runtime.dll not found")

# ── Analysis ───────────────────────────────────────────────────
a = Analysis(
    [str(OBF_BACKEND / "backend" / "main.py")],   # 使用混淆后的入口
    pathex=[str(OBF_BACKEND), str(OBF_BACKEND / "backend")],  # 混淆后的模块路径
    binaries=_bins,
    datas=[
        (str(FRONT),  "frontend/dist"),
        (str(ASSETS), "assets"),
        (str(ROOT / "config" / "app_config.py"), "."),  # 明文配置，直接打包
        *_datas,
    ],
    hiddenimports=_hidden,
    hookspath=[],
    runtime_hooks=[str(Path(SPEC).parent / "hook_pythonnet.py")],
    excludes=EXCLUDES,
    noarchive=False,
)

pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, [], exclude_binaries=True,
          name="desktop-app", debug=False, strip=False, upx=True,
          console=False, icon=EXE_ICON)
coll = COLLECT(exe, a.binaries, a.zipfiles, a.datas,
               strip=False, upx=True, name="desktop-app")
