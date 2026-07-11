from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from db import get_collection
from serializers import serialize_user
from utils import check_auth, new_id

bp = Blueprint('friends', __name__, url_prefix='/api/friends')
bp.before_request(check_auth)

friends_col = get_collection('friend_requests')
users_col = get_collection('users')


@bp.route('/request', methods=['POST'])
def send_request():
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    target = users_col.find_one(username=username) if username else users_col.find_one(id=data.get('userId'))
    if not target: return jsonify({'error': 'User not found'}), 404
    if target['id'] == g.user_id: return jsonify({'error': 'Cannot friend yourself'}), 400

    existing = friends_col.find_one(fn=lambda f:
        (f['senderId'] == g.user_id and f['receiverId'] == target['id']) or
        (f['senderId'] == target['id'] and f['receiverId'] == g.user_id))
    if existing:
        if existing['status'] == 'ACCEPTED': return jsonify({'error': 'Already friends'}), 400
        if existing['status'] == 'PENDING': return jsonify({'error': 'Request already pending'}), 400
        if existing['status'] == 'DECLINED':
            friends_col.update({'id': existing['id']}, {'status': 'PENDING', 'senderId': g.user_id, 'receiverId': target['id']})
            return jsonify({'message': 'Friend request sent'})

    now = datetime.now(timezone.utc).isoformat()
    friends_col.insert({'id': new_id(), 'senderId': g.user_id, 'receiverId': target['id'], 'status': 'PENDING', 'createdAt': now})
    from extensions import socketio
    socketio.emit('friend:request', {'fromUser': serialize_user(users_col.find_one(id=g.user_id))}, to=f'user:{target["id"]}')
    return jsonify({'message': 'Friend request sent'}), 201


@bp.route('/accept/<fid>', methods=['POST'])
def accept_request(fid):
    fr = friends_col.find_one(id=fid)
    if not fr or fr['receiverId'] != g.user_id or fr['status'] != 'PENDING':
        return jsonify({'error': 'Invalid request'}), 400
    friends_col.update({'id': fid}, {'status': 'ACCEPTED'})
    return jsonify({'message': 'Friend request accepted'})


@bp.route('/decline/<fid>', methods=['POST'])
def decline_request(fid):
    fr = friends_col.find_one(id=fid)
    if not fr or fr['receiverId'] != g.user_id or fr['status'] != 'PENDING':
        return jsonify({'error': 'Invalid request'}), 400
    friends_col.update({'id': fid}, {'status': 'DECLINED'})
    return jsonify({'message': 'Friend request declined'})


@bp.route('/<uid>', methods=['DELETE'])
def remove_friend(uid):
    fr = friends_col.find_one(fn=lambda f: f['status'] == 'ACCEPTED' and
        ((f['senderId'] == g.user_id and f['receiverId'] == uid) or
         (f['senderId'] == uid and f['receiverId'] == g.user_id)))
    if not fr: return jsonify({'error': 'Not friends'}), 404
    friends_col.delete_one(id=fr['id'])
    return jsonify({'message': 'Friend removed'})


@bp.route('')
def list_friends():
    accepted = friends_col.find(fn=lambda f: f['status'] == 'ACCEPTED' and
        (f['senderId'] == g.user_id or f['receiverId'] == g.user_id))
    result = []
    for fr in accepted:
        other_id = fr['receiverId'] if fr['senderId'] == g.user_id else fr['senderId']
        u = users_col.find_one(id=other_id)
        if u: result.append({**serialize_user(u), 'friendId': fr['id']})
    return jsonify(result)


@bp.route('/pending')
def pending_requests():
    pending = friends_col.find(receiverId=g.user_id, status='PENDING')
    result = []
    for fr in pending:
        u = users_col.find_one(id=fr['senderId'])
        if u: result.append({'id': fr['id'], 'user': serialize_user(u), 'createdAt': fr.get('createdAt')})
    return jsonify(result)


@bp.route('/outgoing')
def outgoing_requests():
    out = friends_col.find(senderId=g.user_id, status='PENDING')
    result = []
    for fr in out:
        u = users_col.find_one(id=fr['receiverId'])
        if u: result.append({'id': fr['id'], 'user': serialize_user(u), 'createdAt': fr.get('createdAt')})
    return jsonify(result)
