"""本地持久化：SQLite 键值表 + settings.json 应用设置。

用法：
    # 键值存储（适合缓存、状态）
    from db import kv_get, kv_set, kv_delete
    kv_set("last_path", "/some/path")
    path = kv_get("last_path", default="")

    # 应用设置（适合用户配置项）
    from db import load_settings, save_settings
    cfg = load_settings()
    cfg["theme"] = "dark"
    save_settings(cfg)
"""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from typing import Any

from config import DB_PATH, SETTINGS_FILE


# ── SQLite 键值存储 ───────────────────────────────────────────────

@contextmanager
def _conn():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()


def init_db() -> None:
    """初始化数据库，应用启动时调用一次。"""
    with _conn() as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS kv (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
        con.execute("""
            CREATE TABLE IF NOT EXISTS demo_records (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                name    TEXT NOT NULL,
                role    TEXT NOT NULL,
                api_key TEXT NOT NULL,
                secret  TEXT NOT NULL
            )
        """)


def kv_get(key: str, default: Any = None) -> Any:
    with _conn() as con:
        row = con.execute("SELECT value FROM kv WHERE key=?", (key,)).fetchone()
    return json.loads(row["value"]) if row else default


def kv_set(key: str, value: Any) -> None:
    with _conn() as con:
        con.execute(
            "INSERT INTO kv(key,value) VALUES(?,?)"
            " ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, json.dumps(value, ensure_ascii=False)),
        )


def kv_delete(key: str) -> None:
    with _conn() as con:
        con.execute("DELETE FROM kv WHERE key=?", (key,))


# ── 应用设置（JSON 文件）─────────────────────────────────────────

def load_settings() -> dict:
    if SETTINGS_FILE.exists():
        try:
            return json.loads(SETTINGS_FILE.read_text("utf-8"))
        except Exception:
            pass
    return {}


def save_settings(data: dict) -> None:
    SETTINGS_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# ── 演示记录（demo_records）─────────────────────────────────────────

def record_count() -> int:
    with _conn() as con:
        row = con.execute("SELECT COUNT(*) FROM demo_records").fetchone()
    return row[0]


def record_list() -> list[dict]:
    with _conn() as con:
        rows = con.execute("SELECT * FROM demo_records ORDER BY id").fetchall()
    return [dict(r) for r in rows]


def record_get(record_id: int) -> dict | None:
    with _conn() as con:
        row = con.execute("SELECT * FROM demo_records WHERE id=?", (record_id,)).fetchone()
    return dict(row) if row else None


def record_create(name: str, role: str, api_key: str, secret: str) -> int:
    with _conn() as con:
        cur = con.execute(
            "INSERT INTO demo_records(name, role, api_key, secret) VALUES(?,?,?,?)",
            (name, role, api_key, secret),
        )
    return cur.lastrowid


def record_update(record_id: int, name: str, role: str, api_key: str, secret: str) -> bool:
    with _conn() as con:
        cur = con.execute(
            "UPDATE demo_records SET name=?, role=?, api_key=?, secret=? WHERE id=?",
            (name, role, api_key, secret, record_id),
        )
    return cur.rowcount > 0


def record_delete(record_id: int) -> bool:
    with _conn() as con:
        cur = con.execute("DELETE FROM demo_records WHERE id=?", (record_id,))
    return cur.rowcount > 0
