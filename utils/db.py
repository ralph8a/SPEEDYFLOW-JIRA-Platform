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
    metadata TEXT,
    user_id TEXT
);
"""

SCHEMA_MIGRATION_V2 = """
ALTER TABLE notifications ADD COLUMN issue_key TEXT;
ALTER TABLE notifications ADD COLUMN user TEXT;
ALTER TABLE notifications ADD COLUMN action TEXT;
ALTER TABLE notifications ADD COLUMN metadata TEXT;
"""

SCHEMA_USERS = """
CREATE TABLE IF NOT EXISTS users (
    account_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email_address TEXT,
    avatar_url TEXT,
    username TEXT,
    source TEXT,
    active INTEGER DEFAULT 1,
    last_updated TEXT NOT NULL,
    service_desk_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);
CREATE INDEX IF NOT EXISTS idx_users_service_desk ON users(service_desk_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
"""

SCHEMA_SLAS = """
-- DEPRECATED: SLA table no longer used - ticket-specific SLA data should not be stored in DB
-- Only SLA templates/definitions should be stored (TODO: create sla_templates table)
-- This schema kept for backwards compatibility but table creation is disabled
-- CREATE TABLE IF NOT EXISTS slas (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     issue_key TEXT NOT NULL,
--     sla_name TEXT NOT NULL,
--     field_id TEXT,
--     goal_duration TEXT,
--     goal_minutes INTEGER,
--     elapsed_time TEXT,
--     remaining_time TEXT,
--     breached INTEGER DEFAULT 0,
--     paused INTEGER DEFAULT 0,
--     status TEXT,
--     is_secondary INTEGER DEFAULT 0,
--     source TEXT DEFAULT 'jira_live',
--     last_updated TEXT NOT NULL,
--     expires_at TEXT NOT NULL,
--     UNIQUE(issue_key, field_id)
-- );
-- CREATE INDEX IF NOT EXISTS idx_slas_issue_key ON slas(issue_key);
-- CREATE INDEX IF NOT EXISTS idx_slas_expires ON slas(expires_at);
-- CREATE INDEX IF NOT EXISTS idx_slas_breached ON slas(breached);
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
        # Create users table
        for statement in SCHEMA_USERS.split(';'):
            if statement.strip():
                conn.execute(statement)
        # SLAs table creation DISABLED - see SCHEMA_SLAS comment above
        # Ticket-specific SLA data should not be stored in database
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
            if 'user_id' not in columns:
                conn.execute("ALTER TABLE notifications ADD COLUMN user_id TEXT")
            
            conn.commit()
        except Exception as e:
            # Columns might already exist, that's OK
            pass

def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    """Convert sqlite3.Row to dict. Generic version for any table."""
    return dict(row)

def create_notification(
    ntype: str, 
    message: str, 
    severity: str = 'info',
    issue_key: str = None,
    user: str = None,
    action: str = None,
    metadata: str = None,
    user_id: str = None
) -> Dict[str, Any]:
    """Create notification. user_id=None means global (all users)."""
    # Use timezone-aware UTC timestamp (avoids utcnow deprecation warnings)
    ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db()
    with _DB_LOCK:
        cur = conn.execute(
            """INSERT INTO notifications(
                type, message, severity, created_at, issue_key, user, action, metadata, user_id
            ) VALUES(?,?,?,?,?,?,?,?,?)""",
            (ntype, message, severity, ts, issue_key, user, action, metadata, user_id)
        )
        conn.commit()
        nid = cur.lastrowid
        row = conn.execute("SELECT * FROM notifications WHERE id=?", (nid,)).fetchone()
    return _row_to_dict(row)

def list_notifications() -> List[Dict[str, Any]]:
    """List all notifications (admin view)."""
    conn = get_db()
    with _DB_LOCK:
        rows = conn.execute("SELECT * FROM notifications ORDER BY id DESC").fetchall()
    return [_row_to_dict(r) for r in rows]

def list_notifications_for_user(user_id: str = None) -> List[Dict[str, Any]]:
    """List notifications for specific user + global notifications (user_id IS NULL)."""
    conn = get_db()
    with _DB_LOCK:
        if user_id:
            # User-specific + global notifications
            rows = conn.execute(
                """SELECT * FROM notifications 
                   WHERE user_id = ? OR user_id IS NULL 
                   ORDER BY id DESC""",
                (user_id,)
            ).fetchall()
        else:
            # Only global notifications
            rows = conn.execute(
                "SELECT * FROM notifications WHERE user_id IS NULL ORDER BY id DESC"
            ).fetchall()
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

# ============================================================================
# Users Management
# ============================================================================

def upsert_users(users: List[Dict[str, Any]], service_desk_id: str = None) -> int:
    """
    Insert or update users in the database.
    Returns the number of users affected.
    """
    conn = get_db()
    now = datetime.datetime.now().isoformat()
    count = 0
    
    with _DB_LOCK:
        for user in users:
            account_id = user.get('accountId')
            if not account_id:
                continue
            
            conn.execute("""
                INSERT INTO users (
                    account_id, display_name, email_address, avatar_url, 
                    username, source, active, last_updated, service_desk_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(account_id) DO UPDATE SET
                    display_name = excluded.display_name,
                    email_address = excluded.email_address,
                    avatar_url = excluded.avatar_url,
                    username = excluded.username,
                    source = excluded.source,
                    last_updated = excluded.last_updated,
                    service_desk_id = excluded.service_desk_id
            """, (
                account_id,
                user.get('displayName', ''),
                user.get('emailAddress', ''),
                user.get('avatarUrl', ''),
                user.get('username', ''),
                user.get('source', 'platform'),
                1,  # active
                now,
                service_desk_id
            ))
            count += 1
        
        conn.commit()
    
    return count

def get_users_from_db(service_desk_id: str = None, query: str = None, max_age_hours: int = 24) -> List[Dict[str, Any]]:
    """
    Get users from database.
    
    Args:
        service_desk_id: Optional filter by service desk
        query: Optional search query for name/email
        max_age_hours: Maximum age of cached data (default: 24 hours)
    
    Returns:
        List of user dictionaries with camelCase keys
    """
    conn = get_db()
    cutoff = (datetime.datetime.now() - datetime.timedelta(hours=max_age_hours)).isoformat()
    
    with _DB_LOCK:
        sql = """
            SELECT account_id, display_name, email_address, avatar_url, 
                   username, source, last_updated, service_desk_id
            FROM users 
            WHERE active = 1 AND last_updated > ?
        """
        params = [cutoff]
        
        if service_desk_id:
            sql += " AND (service_desk_id = ? OR service_desk_id IS NULL)"
            params.append(service_desk_id)
        
        if query:
            sql += " AND (display_name LIKE ? OR email_address LIKE ? OR username LIKE ?)"
            query_pattern = f"%{query}%"
            params.extend([query_pattern, query_pattern, query_pattern])
        
        sql += " ORDER BY display_name"
        
        rows = conn.execute(sql, params).fetchall()
    
    # Convert to camelCase for API compatibility
    users = []
    for row in rows:
        users.append({
            'accountId': row['account_id'],
            'displayName': row['display_name'],
            'emailAddress': row['email_address'] or '',
            'avatarUrl': row['avatar_url'] or '',
            'username': row['username'] or '',
            'source': row['source'] or 'platform'
        })
    
    return users

def clear_old_users(days: int = 30) -> int:
    """Delete users older than specified days."""
    conn = get_db()
    cutoff = (datetime.datetime.now() - datetime.timedelta(days=days)).isoformat()
    
    with _DB_LOCK:
        cur = conn.execute("DELETE FROM users WHERE last_updated < ?", (cutoff,))
        conn.commit()
    
    return cur.rowcount

# ============================================================================
# SLA Database Functions
# ============================================================================

def upsert_sla(issue_key: str, sla_data: Dict[str, Any], ttl_minutes: int = 60) -> bool:
    """
    DEPRECATED: No longer used. Ticket-specific SLA data should not be stored in database.
    
    Insert or update SLA data for an issue.
    
    Args:
        issue_key: JIRA issue key
        sla_data: SLA data dictionary with keys:
            - sla_name: Name of the SLA
            - field_id: JIRA custom field ID
            - goal_duration: Human-readable goal (e.g., "24 h")
            - goal_minutes: Goal in minutes
            - elapsed_time: Elapsed time string
            - remaining_time: Remaining time string
            - breached: Boolean breach status
            - paused: Boolean paused status
            - status: 'ongoing', 'breached', 'paused'
            - is_secondary: Boolean (Cierre Ticket flag)
            - source: 'jira_live' or 'speedyflow_cache'
        ttl_minutes: Cache expiration time in minutes (default: 60)
    
    Returns:
        True if successful, False otherwise
    """
    import logging
    logger = logging.getLogger(__name__)
    
    conn = get_db()
    now = datetime.datetime.now().isoformat()
    expires_at = (datetime.datetime.now() + datetime.timedelta(minutes=ttl_minutes)).isoformat()
    
    try:
        with _DB_LOCK:
            conn.execute("""
                INSERT INTO slas (
                    issue_key, sla_name, field_id, goal_duration, goal_minutes,
                    elapsed_time, remaining_time, breached, paused, status,
                    is_secondary, source, last_updated, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(issue_key, field_id) DO UPDATE SET
                    sla_name = excluded.sla_name,
                    goal_duration = excluded.goal_duration,
                    goal_minutes = excluded.goal_minutes,
                    elapsed_time = excluded.elapsed_time,
                    remaining_time = excluded.remaining_time,
                    breached = excluded.breached,
                    paused = excluded.paused,
                    status = excluded.status,
                    is_secondary = excluded.is_secondary,
                    source = excluded.source,
                    last_updated = excluded.last_updated,
                    expires_at = excluded.expires_at
            """, (
                issue_key,
                sla_data.get('sla_name', 'Unknown SLA'),
                sla_data.get('field_id', ''),
                sla_data.get('goal_duration', 'N/A'),
                sla_data.get('goal_minutes', 0),
                sla_data.get('elapsed_time', '0 m'),
                sla_data.get('remaining_time', 'N/A'),
                1 if sla_data.get('breached', False) else 0,
                1 if sla_data.get('paused', False) else 0,
                sla_data.get('status', 'ongoing'),
                1 if sla_data.get('is_secondary', False) else 0,
                sla_data.get('source', 'jira_live'),
                now,
                expires_at
            ))
            conn.commit()
        return True
    except Exception as e:
        logger.error(f"Failed to upsert SLA for {issue_key}: {e}")
        return False

def get_sla_from_db(issue_key: str) -> Optional[List[Dict[str, Any]]]:
    """
    DEPRECATED: No longer used. Always returns None.
    Database SLA caching has been disabled - ticket-specific SLA state should not be stored.
    
    Get cached SLA data for an issue.
    
    Args:
        issue_key: JIRA issue key
    
    Returns:
        None (function disabled)
    """
    # Always return None - database SLA caching disabled
    return None

def clear_expired_slas() -> int:
    """
    DEPRECATED: No longer used. Always returns 0.
    Delete expired SLA cache entries.
    """
    # Database SLA caching disabled - nothing to clear
    return 0

def get_breached_slas(service_desk_id: str = None) -> List[Dict[str, Any]]:
    """
    DEPRECATED: No longer used. Always returns empty list.
    Database SLA caching has been disabled.
    
    Get all breached SLAs (not expired).
    
    Args:
        service_desk_id: Optional filter by service desk
    
    Returns:
        Empty list (function disabled)
    """
    # Database SLA caching disabled - return empty list
    return []
