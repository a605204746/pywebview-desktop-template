# pywebview Desktop Template

[English](./README_EN.md) | **中文**

基于 **pywebview + React + Vite** 的 PC 桌面应用模板，适合快速搭建带原生窗口、系统托盘、本地持久化的桌面工具。

前端可整体替换为 Vue、Svelte 等任意框架——Python 后端和桥接层保持不变。

---

## 环境要求

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| Python | 3.11+ | 项目 `pyproject.toml` 指定了 `>=3.11` |
| Node.js | 18+ | Vite 5 + React 18 需要 |
| uv | 最新版 | Python 包管理器，替代 pip+venv，[安装方式](https://docs.astral.sh/uv/getting-started/installation/) |
| npm | 9+ | 随 Node.js 安装 |

> **没有 uv？** 运行 `pip install uv` 或参考 [uv 官方文档](https://docs.astral.sh/uv/)。uv 会自动创建 `.venv` 并管理依赖，比手动 pip + venv 简便得多。

---

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/yourname/pywebview-desktop-template.git
cd pywebview-desktop-template

# 2. 安装 Python 依赖（uv 自动创建 .venv）
uv sync

# 3. 安装前端依赖
cd frontend && npm install && cd ..

# 4. 启动开发模式
uv run python scripts/dev.py
```

启动后会出现一个原生桌面窗口，左侧是导航菜单，右侧是功能页面。开发模式下 Vite 提供热更新，前端改动即时生效。

---

## 目录结构

```
pywebview-desktop-template/
├── pyproject.toml            # Python 项目配置 & 依赖（uv 管理）
├── uv.lock                   # uv 锁文件（类似 package-lock.json）
├── .gitignore
├── .gitattributes
│
├── backend/                  # Python 后端
│   ├── main.py               # ★ pywebview 入口（创建窗口、挂载 API、托盘）
│   ├── config.py             # ★ 统一配置中心（读取 config/app_config.py）
│   ├── logger.py             # 日志模块（轮转文件 + 控制台双输出）
│   ├── db.py                 # 本地持久化（SQLite KV + settings.json）
│   ├── tray.py               # 系统托盘（pystray + Pillow）
│   ├── api/                  # JS ↔ Python 桥接 API（Mixin 模式）
│   │   ├── __init__.py       # ★ Api 类定义，组合所有 Mixin
│   │   ├── system.py         # 系统信息 / 开机自启
│   │   ├── file.py           # 文件读取
│   │   ├── storage.py        # 键值存储读写
│   │   ├── shell.py          # Shell / 打开目录
│   │   └── license.py        # 授权码验证 & 演示记录 CRUD
│   ├── build.spec            # PyInstaller onedir 打包配置
│   └── build_onefile.spec    # PyInstaller 单文件打包配置
│
├── config/                   # 配置 & 安全模块
│   ├── app_config.py         # ★ 应用配置（名称、版本、窗口尺寸、端口等）
│   ├── assets/               # 图标等静态资源
│   │   └── icon.png          # 应用图标（支持 PNG / ICO）
│   └── secret/               # 加密 & 授权（打包时由 PyArmor 加密保护）
│       ├── __init__.py        # 导出 encrypt/decrypt/verify 等
│       ├── cipher.py          # Fernet 对称加密（密钥由硬件指纹派生）
│       ├── kdf.py             # 密钥派生函数
│       ├── fingerprint.py     # 硬件指纹采集（MAC + CPU + 磁盘序列号）
│       └── license.py         # RSA-PSS 授权码验证 + NTP 校时 + 离线容忍
│
├── frontend/                 # React + Vite 前端（可整体替换）
│   ├── src/
│   │   ├── main.tsx          # 入口（挂载 Provider + Antd 配置）
│   │   ├── App.tsx           # 主布局（Sider + Content）
│   │   ├── bridge.ts         # ★ JS → Python 通用桥接（换框架无需修改）
│   │   ├── theme.ts          # 主题色定义
│   │   ├── components/       # 通用组件（ErrorBoundary, Toast）
│   │   ├── contexts/         # React Context（ThemeContext, LicenseContext）
│   │   ├── hooks/            # 自定义 Hook
│   │   ├── pages/            # 功能页面（系统信息、便签、JSON工具 等）
│   │   └── styles/           # CSS
│   ├── scripts/dev.js        # Vite 开发启动辅助
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts         # ★ base: './' 确保打包后 file:// 可加载
│   └── tsconfig.json
│
├── scripts/                  # 构建 & 工具脚本
│   ├── dev.py                # ★ 开发启动（Vite dev server + pywebview）
│   ├── build.py              # ★ 构建发布包（PyArmor → npm build → PyInstaller）
│   ├── obfuscate.py          # PyArmor 混淆脚本
│   ├── build.spec            # onedir 打包 spec
│   ├── build_onefile.spec    # 单文件打包 spec
│   ├── gen_keypair.py        # RSA 密钥对生成
│   ├── gen_license.py        # 授权码签发
│   └── hook_pythonnet.py     # PyInstaller hook
│
└── data/                     # 运行时数据（git 已忽略）
    ├── app.db                # SQLite 数据库
    ├── settings.json         # 应用设置
    └── logs/                 # 日志文件
```

---

## 核心架构说明

### Python ↔ JS 桥接机制

这是整个项目的核心设计，理解它就能灵活扩展功能。

**后端侧（Python）：**

`backend/api/__init__.py` 中的 `Api` 类是 pywebview 挂载到 `window.pywebview.api` 的对象。它的每个 **public 方法**（不以 `_` 开头）都会自动暴露给 JS。

Api 采用 **Mixin 组合模式**——每个功能模块是独立的 Mixin 类，放在 `backend/api/` 下的单独文件中：

```python
# backend/api/__init__.py
from .system import SystemMixin
from .file import FileMixin
from .storage import StorageMixin
from .shell import ShellMixin
from .license import LicenseMixin

class Api(SystemMixin, FileMixin, StorageMixin, ShellMixin, LicenseMixin):
    """pywebview js_api 挂载点"""
```

**前端侧（JS/TS）：**

`frontend/src/bridge.ts` 提供统一的 `call()` 函数，内置超时保护和 mock 降级：

```typescript
import { call } from './bridge'

// 调用 Python 方法
const { success, data } = await call('get_app_info')
if (success) {
  console.log(data) // { name: "Desktop App", version: "1.0.0", ... }
}
```

**添加新功能只需两步：**

1. 在 `backend/api/` 下新建 Mixin 文件，添加 public 方法
2. 在前端任意 TS/JS 文件中用 `call('方法名', 参数)` 调用

不需要注册、不需要配置、不需要改 `__init__.py`（只需把新 Mixin 加到基类列表）。

### 统一返回格式

所有 API 方法统一返回 `{"success": bool, "data": any, "message": str}` 格式：

```python
def my_method(self) -> dict:
    try:
        result = do_something()
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "message": str(e)}
```

前端可以根据 `success` 字段统一判断，`message` 用于错误提示。

### 配置体系

配置分两层：

| 文件 | 用途 | 说明 |
|------|------|------|
| `config/app_config.py` | 日常配置 | 应用名称、版本、窗口尺寸、端口、日志级别等 |
| `backend/config.py` | 运行配置 | 读取 `app_config.py`，并计算路径（自动区分开发/打包环境） |

修改窗口大小、端口、应用名等只需改 `config/app_config.py`，不需要动其他文件。

路径方面，`config.py` 会根据 `sys.frozen` 自动切换：
- 开发时：数据目录 = `<项目根>/data/`
- 打包后：数据目录 = `<exe目录>/data/`

### 安全模块（授权 + 加密）

项目内置了一套完整的授权和加密体系：

**授权码系统：**

- RSA-2048 PSS 非对称签名，无私钥无法伪造授权码
- 授权码绑定硬件指纹（MAC + CPU + 磁盘序列号），复制到其他机器无效
- NTP 联网校时防止修改系统时钟绕过过期检查
- 离线容忍：首次必须联网激活，之后可离线最多 72 小时

**对称加密：**

- Fernet（AES-128-CBC + HMAC-SHA256）加密敏感字段
- 密钥由硬件指纹派生，密文绑定当前机器，移植后无法解密

**工具脚本：**

```bash
# 生成 RSA 密钥对（私钥保存在 scripts/private.pem，严禁提交 git）
uv run python scripts/gen_keypair.py

# 签发授权码（需要私钥 + 用户提供的指纹码）
uv run python scripts/gen_license.py
```

运行 `gen_keypair.py` 后会打印公钥 PEM，需要手动粘贴到 `config/secret/license.py` 的 `_PUBLIC_KEY_PEM` 常量中。

---

## 常用命令

```bash
# ── 依赖管理 ──
uv sync                        # 同步 Python 依赖（克隆后必须执行）
uv add <package>               # 添加 Python 依赖
uv remove <package>            # 移除 Python 依赖
cd frontend && npm install     # 安装前端依赖

# ── 开发 ──
uv run python scripts/dev.py   # 启动开发模式（Vite 热更新 + pywebview 窗口）

# ── 构建 ──
uv run python scripts/build.py              # 构建 onedir 版本（推荐，启动快）
uv run python scripts/build.py --onefile    # 构建单文件 exe（便于分发）

# ── 授权工具 ──
uv run python scripts/gen_keypair.py        # 生成 RSA 密钥对
uv run python scripts/gen_license.py        # 签发授权码
```

---

## 自定义应用信息

编辑 `config/app_config.py`：

```python
NAME    = "My App"        # 窗口标题 & 托盘提示
VERSION = "1.0.0"
ICON    = "icon.png"      # config/assets/ 下的图标文件名

WINDOW_WIDTH      = 1280  # 窗口初始宽度
WINDOW_HEIGHT     = 800   # 窗口初始高度
WINDOW_MIN_WIDTH  = 800   # 最小宽度
WINDOW_MIN_HEIGHT = 600   # 最小高度
WINDOW_RESIZABLE  = True  # 是否可调整大小
CLOSE_TO_TRAY     = True  # 关闭按钮隐藏到托盘（False = 直接退出）

DEV_PORT  = 5174          # Vite 开发端口
VITE_WAIT = 2.5           # 等待 Vite 就绪的秒数

LOG_LEVEL        = "INFO" # 日志级别
LOG_MAX_SIZE_MB  = 5      # 单个日志文件最大 MB
LOG_BACKUP_COUNT = 3      # 保留历史日志份数
```

---

## 自定义图标

将图标文件放入 `config/assets/` 目录（支持 PNG、ICO 格式），然后在 `config/app_config.py` 的 `ICON` 字段中填写文件名即可。

框架会自动将图标应用到窗口标题栏和系统托盘。打包构建时也会自动处理。

---

## 添加新功能

### 后端：新增 API 方法

1. 在 `backend/api/` 下创建新文件，如 `backend/api/weather.py`：

```python
from __future__ import annotations

class WeatherMixin:
    def get_weather(self, city: str) -> dict:
        """获取天气信息"""
        try:
            # 你的业务逻辑
            return {"success": True, "data": {"city": city, "temp": 25}}
        except Exception as e:
            return {"success": False, "message": str(e)}
```

2. 将新 Mixin 加入 `backend/api/__init__.py`：

```python
from .weather import WeatherMixin

class Api(WeatherMixin, SystemMixin, FileMixin, StorageMixin, ShellMixin, LicenseMixin):
    pass
```

3. 前端调用：

```typescript
import { call } from './bridge'
const { success, data } = await call('get_weather', '北京')
```

### 前端：新增页面

1. 在 `frontend/src/pages/` 下创建新页面组件，如 `Weather.tsx`
2. 在 `frontend/src/App.tsx` 中添加菜单项和页面映射

---

## 切换前端框架

后端完全不变，只需替换前端：

1. 删除 `frontend/` 目录
2. 用新框架初始化：如 `npm create vue@latest frontend` 或 `npm create svelte@latest frontend`
3. 将原 `frontend/src/bridge.ts` 复制到新前端的 `src/` 目录下（如果新框架用 JS，可以将 `.ts` 改为 `.js`，去掉类型声明即可）
4. 在新框架的 `vite.config` 中设置 `base: './'`（关键！打包后 pywebview 用 `file://` 加载，相对路径才能正确找到资源）
5. 运行 `uv run python scripts/dev.py` 验证

---

## 本地持久化

项目提供两种持久化方式：

| 方式 | 文件 | 适用场景 | 使用方法 |
|------|------|---------|---------|
| SQLite KV | `data/app.db` | 缓存、状态、临时数据 | `from db import kv_get, kv_set, kv_delete` |
| JSON 设置 | `data/settings.json` | 用户配置项 | `from db import load_settings, save_settings` |

前端也可以通过 API 操作：

```typescript
await call('set_setting', 'theme', 'dark')
const { data } = await call('get_setting', 'theme', 'light')
```

---

## 系统托盘

应用支持系统托盘，配置在 `config/app_config.py`：

- `CLOSE_TO_TRAY = True`：关闭窗口时隐藏到托盘，双击托盘图标恢复
- `CLOSE_TO_TRAY = False`：关闭窗口时直接退出进程

托盘菜单包含「显示窗口」和「退出」两个选项。

---

## 构建打包

构建流程分三步：PyArmor 混淆 → Vite 构建 → PyInstaller 打包。

```bash
# onedir 模式（推荐，启动快，输出目录：output/dist/desktop-app/）
uv run python scripts/build.py

# 单文件模式（便于分发，输出：output/dist/desktop-app.exe）
uv run python scripts/build.py --onefile
```

**注意：** PyArmor 8 免费版限制每个项目 10 个脚本，超过需购买授权。如果不需要混淆保护，可以在 `scripts/build.py` 中注释掉 `obfuscate_backend()` 步骤。

---

## 开发提示

- **前端独立调试**：`bridge.ts` 内置 mock 降级——在浏览器中直接打开前端页面时，所有 `call()` 会返回 `{success: false, message: 'pywebview 未就绪'}`，不会阻塞 UI 开发
- **热更新**：开发模式下 Vite 提供前端热更新，Python 侧改动需要重启（Ctrl+C 后重新运行 `dev.py`）
- **日志**：开发时日志同时输出到控制台和 `data/logs/app.log`；打包后只写文件
- **单实例**：应用启动时检测是否已有实例运行（Windows 命名互斥体），重复启动会弹出提示并退出

---

## 技术栈一览

| 层 | 技术 |
|----|------|
| 桌面框架 | pywebview 4.4+ |
| 前端框架 | React 18 + Vite 5 |
| UI 组件库 | Ant Design 6 |
| 语言 | TypeScript + Python 3.11+ |
| 包管理 | uv (Python) + npm (Node) |
| 本地存储 | SQLite + JSON |
| 加密 | cryptography (Fernet + RSA) |
| 托盘 | pystray + Pillow |
| 混淆 | PyArmor 8 |
| 打包 | PyInstaller 6 |

---

## License

MIT