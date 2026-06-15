from contextlib import contextmanager
from pathlib import Path

from psycopg2 import pool
from psycopg2.extras import RealDictCursor

from .config import get_settings


_pool = None


def init_pool() -> None:
    global _pool
    if _pool is None:
        settings = get_settings()
        _pool = pool.SimpleConnectionPool(1, 10, dsn=settings.database_dsn)


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None


@contextmanager
def get_connection():
    if _pool is None:
        init_pool()
    conn = _pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


@contextmanager
def get_cursor():
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            yield cursor


def initialize_schema() -> None:
    schema_path = Path(__file__).resolve().parents[1] / "schema.sql"
    with open(schema_path, "r", encoding="utf-8") as schema_file:
        schema = schema_file.read()
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(schema)
