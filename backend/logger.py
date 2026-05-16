"""日志模块 — 轮转文件 + 控制台双输出，参数从 app_config.py 读取。

日志文件位置：
  开发时 → <项目根>/logs/app.log
  打包后 → <exe目录>/logs/app.log
"""
from __future__ import annotations

import logging
import logging.handlers

from config import APP_NAME, LOG_DIR, LOG_LEVEL, LOG_MAX_SIZE_MB, LOG_BACKUP_COUNT

LOG_DIR.mkdir(parents=True, exist_ok=True)
_LOG_FILE = LOG_DIR / "app.log"

_FILE_LEVEL    = getattr(logging, LOG_LEVEL, logging.INFO)
_MAX_BYTES     = LOG_MAX_SIZE_MB * 1024 * 1024


def _build() -> logging.Logger:
    logger = logging.getLogger(APP_NAME)
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)

    fh = logging.handlers.RotatingFileHandler(
        _LOG_FILE, maxBytes=_MAX_BYTES, backupCount=LOG_BACKUP_COUNT, encoding="utf-8"
    )
    fh.setLevel(_FILE_LEVEL)
    fh.setFormatter(logging.Formatter(
        "%(asctime)s [%(levelname)-5s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))

    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
    ch.setFormatter(logging.Formatter("[%(levelname)s] %(message)s"))

    logger.addHandler(fh)
    logger.addHandler(ch)
    return logger


log = _build()
