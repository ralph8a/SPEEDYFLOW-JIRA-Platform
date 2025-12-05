"""Lightweight SQLite persistence utilities (notifications)."""
from __future__ import annotations
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional
import threading
import datetime

_DB_DIR = Path("data")
_DB_PATH = _DB_DIR / "app.db"
_DB_LOCK = threading.Lock()
_connection: Optional[sqlite3.Connection] = None

SCHEMA_NOTIFICATIONS = """
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info',
    created_at TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    issue_key TEXT,
    user TEXT,
    action TEXT,
    metadata TEXT
);
"""

SCHEMA_MIGRATION_V2 = """
ALTER TABLE notifications ADD COLUMN issue_key TEXT;
ALTER TABLE notifications ADD COLUMN user TEXT;
ALTER TABLE notifications ADD COLUMN action TEXT;
ALTER TABLE notifications ADD COLUMN metadata TEXT;
"""

def get_db() -> sqlite3.Connection:
    global _connection
    if _connection is None:
        _DB_DIR.mkdir(parents=True, exist_ok=True)
        _connection = sqlite3.connect(_DB_PATH, check_same_thread=False)
        _connection.row_factory = sqlite3.Row
    return _connection


def init_db() -> None:
    conn = get_db()
    with _DB_LOCK:
        conn.execute(SCHEMA_NOTIFICATIONS)
        conn.commit()
        
        # Try to migrate existing tables (add new columns if they don't exist)
        try:
            cursor = conn.execute("PRAGMA table_info(notifications)")
            columns = [row[1] for row in cursor.fetchall()]
            
            if 'issue_key' not in columns:
                conn.execute("ALTER TABLE notifications ADD COLUMN issue_key TEXT")
            if 'user' not in columns:
                conn.execute("ALTER TABLE notifications ADD COLUMN user TEXT")
            if 'action' not in columns:
                conn.execute("ALTER TABLE notifications ADD COLUMN action TEXT")
            if 'metadata' not in columns:
                conn.execute("ALTER TABLE notifications ADD COLUMN metadata TEXT")
            
            conn.commit()
        except Exception as e:
            # Columns might already exist, that's OK
            pass


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        'id': row['id'],
        'type': row['type'],
        'message': row['message'],
        'severity': row['severity'],
        'created_at': row['created_at'],
        'read': bool(row['read']),
        'issue_key': row.get('issue_key'),
        'user': row.get('user'),
        'action': row.get('action'),
        'metadata': row.get('metadata'),
    }


def create_notification(
    ntype: str, 
    message: str, 
    severity: str = 'info',
    issue_key: str = None,
    user: str = None,
    action: str = None,
    metadata: str = None
) -> Dict[str, Any]:
    # Use timezone-aware UTC timestamp (avoids utcnow deprecation warnings)
    ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db()
    with _DB_LOCK:
        cur = conn.execute(
            """INSERT INTO notifications(
                type, message, severity, created_at, issue_key, user, action, metadata
            ) VALUES(?,?,?,?,?,?,?,?)""",
            (ntype, message, severity, ts, issue_key, user, action, metadata)
        )
        conn.commit()
        nid = cur.lastrowid
        row = conn.execute("SELECT * FROM notifications WHERE id=?", (nid,)).fetchone()
    return _row_to_dict(row)


def list_notifications() -> List[Dict[str, Any]]:
    conn = get_db()
    with _DB_LOCK:
        rows = conn.execute("SELECT * FROM notifications ORDER BY id DESC").fetchall()
    return [_row_to_dict(r) for r in rows]


def mark_notification_read(nid: int) -> Optional[Dict[str, Any]]:
    conn = get_db()
    with _DB_LOCK:
        conn.execute("UPDATE notifications SET read=1 WHERE id=?", (nid,))
        conn.commit()
        row = conn.execute("SELECT * FROM notifications WHERE id=?", (nid,)).fetchone()
    return _row_to_dict(row) if row else None


def delete_notification(nid: int) -> bool:
    conn = get_db()
    with _DB_LOCK:
        cur = conn.execute("DELETE FROM notifications WHERE id=?", (nid,))
        conn.commit()
    return cur.rowcount > 0
