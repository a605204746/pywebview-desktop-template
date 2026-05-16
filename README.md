# pywebview Desktop Template

基于 **pywebview + React + Vite** 的 PC 桌面应用模板。
前端可替换为任意框架（Vue、Svelte、原生 JS……），Python 后端和桥接层保持不变。

## 快速开始

```bash
git clone <本仓库>
cd pywebview-desktop-template

# 安装 Python 依赖（uv 自动创建 .venv）
uv sync

# 安装前端依赖
cd frontend && npm install && cd ..

# 启动开发模式
uv run python scripts/dev.py
```

> 没有 uv？先安装：`pip install uv` 或参考 https://docs.astral.sh/uv/

## 目录结构

```
├── pyproject.toml       # Python 依赖（uv 管理）
├── assets/
│   └── icon.ico         # 应用图标（自行放置，见 assets/README.md）
│
├── backend/
│   ├── config.py        # ★ 统一配置（应用名、窗口尺寸、路径等）
│   ├── main.py          # pywebview 入口
│   ├── api.py           # Python ↔ JS 桥接 API（在此添加业务方法）
│   ├── logger.py        # 日志模块
│   ├── db.py            # 本地持久化（SQLite + settings.json）
│   ├── tray.py          # 系统托盘
│   ├── build.spec       # PyInstaller onedir 打包配置
│   └── build_onefile.spec  # PyInstaller 单文件打包配置
│
├── frontend/            # React + Vite（可整体替换为 Vue / Svelte 等）
│   ├── src/
│   │   ├── bridge.js          # ★ JS→Python 通用桥接（换框架无需修改）
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── ErrorBoundary.jsx  # 页面错误捕获
│   │   │   └── Toast.jsx          # 消息通知组件
│   │   ├── context/
│   │   │   └── ToastContext.jsx   # useToast() Hook
│   │   ├── pages/
│   │   └── styles/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── scripts/
│   ├── dev.py           # 开发启动（Vite + pywebview）
│   └── build.py         # 构建发布包
└── .gitignore
```

## 常用命令

```bash
# 添加 Python 依赖
uv add <package>

# 移除依赖
uv remove <package>

# 同步依赖（克隆后 / pyproject.toml 变更后执行）
uv sync

# 启动开发模式
uv run python scripts/dev.py

# 构建 onedir 发布包（推荐，启动快）
uv run python scripts/build.py

# 构建单文件 exe（便于分发）
uv run python scripts/build.py --onefile
```

## 自定义图标

将 `icon.ico` 放入 `assets/` 目录，框架自动识别并应用到 exe 和系统托盘。
详见 `assets/README.md`。

## 添加 Python 功能

在 `backend/api.py` 中增加 public 方法，前端无需任何配置即可调用：

```python
# backend/api.py
from logger import log

class Api:
    def my_task(self, input: str) -> dict:
        log.info(f"my_task: {input}")
        return {"success": True, "data": f"result: {input}"}
```

```js
// frontend/src/任意文件.js
import { call } from './bridge'
const { success, data } = await call('my_task', '参数')
```

## 切换前端框架

1. 删除 `frontend/` 目录，用新框架初始化（如 `npm create vue@latest frontend`）
2. 将 `src/bridge.js` 复制到新前端的 `src/` 下
3. `vite.config.js` 中保留 `base: './'`
4. Python 端（`main.py`、`api.py`）**无需改动**
