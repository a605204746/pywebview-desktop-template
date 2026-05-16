"""Runtime hook: 在 pythonnet 初始化前设置运行时为 .NET Framework（netfx）。
pywebview WinForms 后端依赖 .NET Framework，必须在 import clr 之前生效。
"""
import os
os.environ.setdefault("PYTHONNET_RUNTIME", "netfx")
