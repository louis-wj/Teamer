from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, g
import bcrypt
from db import get_collection
from serializers import serialize_user
from utils import (generate_access_token, generate_refresh_token,
                   verify_refresh_token, hash_token, auth_required, validate_email, new_id)

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

users = get_collection('users')
tokens = get_collection('refresh_tokens')


def _issue_tokens(user):
    access = generate_access_token(user['id'], user['username'])
    refresh = generate_refresh_token(user['id'], user['username'])
    tokens.insert({
        'id': new_id(), 'token': hash_token(refresh), 'userId': user['id'],
        'expiresAt': (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    })
    return access, refresh


@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    username = (data.get('username') or '').strip()
    display_name = (data.get('displayName') or username).strip()
    password = data.get('password') or ''

    if not validate_email(email):
        return jsonify({'error': 'Invalid email'}), 400
    if len(username) < 3 or len(username) > 32:
        return jsonify({'error': 'Username must be 3-32 characters'}), 400
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    if users.find_one(email=email):
        return jsonify({'error': 'Email already in use'}), 409
    if users.find_one(username=username):
        return jsonify({'error': 'Username already taken'}), 409

    user = {
        'id': new_id(), 'email': email, 'username': username,
        'displayName': display_name, 'avatarUrl': None,
        'passwordHash': bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode(),
        'status': 'OFFLINE', 'createdAt': datetime.now(timezone.utc).isoformat(),
    }
    users.insert(user)
    access, refresh = _issue_tokens(user)
    return jsonify({'user': serialize_user(user, include_email=True),
                    'accessToken': access, 'refreshToken': refresh}), 201


@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    user = users.find_one(email=(data.get('email') or '').strip().lower())
    pw = data.get('password') or ''
    if not user or not bcrypt.checkpw(pw.encode(), user['passwordHash'].encode()):
        return jsonify({'error': 'Invalid email or password'}), 401

    users.update({'id': user['id']}, {'status': 'ONLINE'})
    user['status'] = 'ONLINE'
    access, refresh = _issue_tokens(user)
    return jsonify({'user': serialize_user(user, include_email=True),
                    'accessToken': access, 'refreshToken': refresh})


@bp.route('/refresh', methods=['POST'])
def refresh():
    token = (request.get_json(silent=True) or {}).get('refreshToken')
    if not token:
        return jsonify({'error': 'Refresh token required'}), 400
    try:
        payload = verify_refresh_token(token)
    except Exception:
        return jsonify({'error': 'Invalid refresh token'}), 401

    stored = tokens.find_one(token=hash_token(token))
    if not stored or datetime.fromisoformat(stored['expiresAt']) < datetime.now(timezone.utc):
        return jsonify({'error': 'Invalid or expired refresh token'}), 401

    tokens.delete_one(id=stored['id'])
    new_access = generate_access_token(payload['userId'], payload['username'])
    new_refresh = generate_refresh_token(payload['userId'], payload['username'])
    tokens.insert({
        'id': new_id(), 'token': hash_token(new_refresh), 'userId': payload['userId'],
        'expiresAt': (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    })
    return jsonify({'accessToken': new_access, 'refreshToken': new_refresh})


@bp.route('/me')
@auth_required
def me():
    user = users.find_one(id=g.user_id)
    return jsonify(serialize_user(user, include_email=True)) if user else (jsonify({'error': 'User not found'}), 404)


@bp.route('/logout', methods=['POST'])
@auth_required
def logout():
    token = (request.get_json(silent=True) or {}).get('refreshToken')
    if token:
        tokens.delete_one(token=hash_token(token))
    users.update({'id': g.user_id}, {'status': 'OFFLINE'})
    return jsonify({'message': 'Logged out'})


@bp.route('/profile', methods=['PATCH'])
@auth_required
def update_profile():
    data = request.get_json(silent=True) or {}
    user = users.find_one(id=g.user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    updates = {}
    if 'username' in data and data['username'] != user['username']:
        u = data['username'].strip()
        if len(u) < 3 or len(u) > 32:
            return jsonify({'error': 'Username must be 3-32 characters'}), 400
        if users.find_one(username=u):
            return jsonify({'error': 'Username already taken'}), 409
        updates['username'] = u
    if 'email' in data and data['email'] != user.get('email'):
        e = data['email'].strip().lower()
        if not validate_email(e):
            return jsonify({'error': 'Invalid email'}), 400
        if users.find_one(email=e):
            return jsonify({'error': 'Email already in use'}), 409
        updates['email'] = e
    if 'displayName' in data:
        updates['displayName'] = (data['displayName'] or '').strip()[:64] or user['displayName']
    if 'avatarUrl' in data:
        updates['avatarUrl'] = data['avatarUrl']
    if 'bio' in data:
        updates['bio'] = (data['bio'] or '')[:500]
    if updates:
        users.update({'id': g.user_id}, updates)
    return jsonify(serialize_user(users.find_one(id=g.user_id), include_email=True))


@bp.route('/change-password', methods=['POST'])
@auth_required
def change_password():
    data = request.get_json(silent=True) or {}
    current_pw = data.get('currentPassword', '')
    new_pw = data.get('newPassword', '')
    if len(new_pw) < 8:
        return jsonify({'error': 'New password must be at least 8 characters'}), 400
    user = users.find_one(id=g.user_id)
    if not user or not bcrypt.checkpw(current_pw.encode(), user['passwordHash'].encode()):
        return jsonify({'error': 'Current password is incorrect'}), 401
    users.update({'id': g.user_id}, {
        'passwordHash': bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt(12)).decode()
    })
    return jsonify({'message': 'Password changed successfully'})


@bp.route('/status', methods=['PATCH'])
@auth_required
def update_status():
    data = request.get_json(silent=True) or {}
    status = data.get('status')
    if status and status not in ('ONLINE', 'IDLE', 'DND', 'OFFLINE'):
        return jsonify({'error': 'Invalid status'}), 400
    
    updates = {}
    if status:
        updates['status'] = status
    
    custom = data.get('customStatus')  # {text, emoji}
    if custom is not None:
        updates['customStatus'] = custom
        
    if updates:
        users.update({'id': g.user_id}, updates)
        
    from extensions import socketio
    for m in get_collection('server_members').find(userId=g.user_id):
        socketio.emit('presence:update', {'userId': g.user_id, **updates},
                      to=f'server:{m["serverId"]}')
    return jsonify(updates)


# ── Blocking ─────────────────────────────────────────────────────────────────

@bp.route('/block', methods=['POST'])
@auth_required
def block_user():
    target_id = (request.get_json(silent=True) or {}).get('userId')
    if not target_id or target_id == g.user_id:
        return jsonify({'error': 'Invalid user'}), 400
    blocked = get_collection('blocked_users')
    if blocked.find_one(userId=g.user_id, blockedId=target_id):
        return jsonify({'error': 'Already blocked'}), 400
    blocked.insert({'id': new_id(), 'userId': g.user_id, 'blockedId': target_id})
    return jsonify({'message': 'User blocked'})

@bp.route('/unblock/<uid>', methods=['DELETE'])
@auth_required
def unblock_user(uid):
    blocked = get_collection('blocked_users')
    blocked.delete_one(userId=g.user_id, blockedId=uid)
    return jsonify({'message': 'User unblocked'})

@bp.route('/blocked')
@auth_required
def list_blocked():
    blocked = get_collection('blocked_users')
    result = []
    for b in blocked.find(userId=g.user_id):
        u = users.find_one(id=b['blockedId'])
        if u: result.append(serialize_user(u))
    return jsonify(result)
