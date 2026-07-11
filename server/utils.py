import os, time, hashlib, uuid, re
from functools import wraps
from datetime import datetime, timezone, timedelta
import jwt as pyjwt
from flask import request, jsonify, g

ACCESS_SECRET = os.getenv('JWT_ACCESS_SECRET', 'teamer-access-secret-change-me')
REFRESH_SECRET = os.getenv('JWT_REFRESH_SECRET', 'teamer-refresh-secret-change-me')


# ── JWT ──────────────────────────────────────────────────────────────────────

def generate_access_token(user_id: str, username: str) -> str:
    return pyjwt.encode(
        {'userId': user_id, 'username': username,
         'exp': datetime.now(timezone.utc) + timedelta(minutes=15)},
        ACCESS_SECRET, algorithm='HS256')

def generate_refresh_token(user_id: str, username: str) -> str:
    return pyjwt.encode(
        {'userId': user_id, 'username': username,
         'exp': datetime.now(timezone.utc) + timedelta(days=7)},
        REFRESH_SECRET, algorithm='HS256')

def verify_access_token(token: str) -> dict:
    return pyjwt.decode(token, ACCESS_SECRET, algorithms=['HS256'])

def verify_refresh_token(token: str) -> dict:
    return pyjwt.decode(token, REFRESH_SECRET, algorithms=['HS256'])

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# ── Auth decorator ───────────────────────────────────────────────────────────

def check_auth():
    """Standalone auth check for bp.before_request(check_auth)."""
    if request.method == 'OPTIONS':
        return None  # let CORS handle preflight
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'error': 'No token provided'}), 401
    try:
        payload = verify_access_token(auth_header.split(' ')[1])
        g.user_id = payload['userId']
        g.username = payload['username']
    except pyjwt.ExpiredSignatureError:
        return jsonify({'error': 'Token expired'}), 401
    except pyjwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401


def auth_required(f):
    """Decorator for individual routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        result = check_auth()
        if result is not None:
            return result
        return f(*args, **kwargs)
    return decorated


# ── Snowflake ID ─────────────────────────────────────────────────────────────

_EPOCH = 1735689600000          # 2026-01-01 UTC
_WORKER = int(os.getenv('WORKER_ID', '1'))
_seq = 0
_last_ts = -1

def generate_snowflake() -> str:
    global _seq, _last_ts
    ts = int(time.time() * 1000) - _EPOCH
    if ts == _last_ts:
        _seq = (_seq + 1) & 0xFFF
        if _seq == 0:
            while ts <= _last_ts:
                ts = int(time.time() * 1000) - _EPOCH
    else:
        _seq = 0
    _last_ts = ts
    return str((ts << 22) | (_WORKER << 12) | _seq)


# ── Helpers ──────────────────────────────────────────────────────────────────

def new_id() -> str:
    return uuid.uuid4().hex[:25]

def new_invite_code() -> str:
    return uuid.uuid4().hex[:12]

def validate_email(email: str) -> bool:
    return bool(re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email))
