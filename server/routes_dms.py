from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from db import get_collection
from serializers import serialize_user
from extensions import socketio
from utils import check_auth, new_id, generate_snowflake

bp = Blueprint('dms', __name__, url_prefix='/api/conversations')
bp.before_request(check_auth)

convos = get_collection('conversations')
dms = get_collection('direct_messages')
users_col = get_collection('users')
blocked = get_collection('blocked_users')

BATCH = 50


def _serialize_convo(c):
    other_id = c['receiverId'] if c['initiatorId'] == g.user_id else c['initiatorId']
    other = users_col.find_one(id=other_id)
    last = dms.find(conversationId=c['id'])
    last.sort(key=lambda m: m.get('createdAt', ''), reverse=True)
    return {
        'id': c['id'], 'createdAt': c.get('createdAt'),
        'user': serialize_user(other) if other else None,
        'lastMessage': last[0] if last else None,
    }


def _serialize_dm(m):
    sender = users_col.find_one(id=m['senderId'])
    return {
        'id': m['id'], 'content': m['content'], 'fileUrl': m.get('fileUrl'),
        'deleted': m.get('deleted', False),
        'createdAt': m.get('createdAt'), 'updatedAt': m.get('updatedAt'),
        'conversationId': m['conversationId'], 'senderId': m['senderId'],
        'sender': serialize_user(sender) if sender else None,
    }


@bp.route('', methods=['POST'])
def start_conversation():
    target_id = (request.get_json(silent=True) or {}).get('userId')
    if not target_id or target_id == g.user_id:
        return jsonify({'error': 'Invalid user'}), 400
    if not users_col.find_one(id=target_id):
        return jsonify({'error': 'User not found'}), 404
    if blocked.find_one(userId=target_id, blockedId=g.user_id):
        return jsonify({'error': 'Cannot message this user'}), 403

    existing = convos.find_one(fn=lambda c:
        (c['initiatorId'] == g.user_id and c['receiverId'] == target_id) or
        (c['initiatorId'] == target_id and c['receiverId'] == g.user_id))
    if existing:
        return jsonify(_serialize_convo(existing))

    now = datetime.now(timezone.utc).isoformat()
    c = {'id': new_id(), 'initiatorId': g.user_id, 'receiverId': target_id, 'createdAt': now}
    convos.insert(c)
    return jsonify(_serialize_convo(c)), 201


@bp.route('')
def list_conversations():
    mine = convos.find(fn=lambda c: c['initiatorId'] == g.user_id or c['receiverId'] == g.user_id)
    result = [_serialize_convo(c) for c in mine]
    result.sort(key=lambda c: (c['lastMessage'] or {}).get('createdAt', ''), reverse=True)
    return jsonify(result)


@bp.route('/<cid>/messages')
def get_dm_messages(cid):
    c = convos.find_one(id=cid)
    if not c or (c['initiatorId'] != g.user_id and c['receiverId'] != g.user_id):
        return jsonify({'error': 'Not found'}), 404
    cursor = request.args.get('cursor')
    msgs = dms.find(conversationId=cid)
    if cursor:
        msgs = [m for m in msgs if m['id'] < cursor]
    msgs.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
    page = msgs[:BATCH]
    return jsonify({'messages': [_serialize_dm(m) for m in page],
                    'nextCursor': page[-1]['id'] if len(page) == BATCH else None})


@bp.route('/<cid>/messages', methods=['POST'])
def send_dm(cid):
    c = convos.find_one(id=cid)
    if not c or (c['initiatorId'] != g.user_id and c['receiverId'] != g.user_id):
        return jsonify({'error': 'Not found'}), 404
    data = request.get_json(silent=True) or {}
    content = (data.get('content') or '').strip()
    if not content: return jsonify({'error': 'Content required'}), 400

    other_id = c['receiverId'] if c['initiatorId'] == g.user_id else c['initiatorId']
    if blocked.find_one(userId=other_id, blockedId=g.user_id):
        return jsonify({'error': 'Cannot message this user'}), 403

    now = datetime.now(timezone.utc).isoformat()
    msg = {'id': generate_snowflake(), 'content': content, 'fileUrl': data.get('fileUrl'),
           'deleted': False, 'createdAt': now, 'updatedAt': now,
           'conversationId': cid, 'senderId': g.user_id}
    dms.insert(msg)
    payload = _serialize_dm(msg)
    socketio.emit('dm:created', payload, to=f'user:{other_id}')
    socketio.emit('dm:created', payload, to=f'user:{g.user_id}')
    return jsonify(payload), 201


@bp.route('/<cid>/messages/<mid>', methods=['PATCH'])
def edit_dm(cid, mid):
    msg = dms.find_one(id=mid, conversationId=cid)
    if not msg or msg['senderId'] != g.user_id:
        return jsonify({'error': 'Not authorized'}), 403
    content = ((request.get_json(silent=True) or {}).get('content') or '').strip()
    if not content: return jsonify({'error': 'Content required'}), 400
    dms.update({'id': mid}, {'content': content, 'updatedAt': datetime.now(timezone.utc).isoformat()})
    c = convos.find_one(id=cid)
    other_id = c['receiverId'] if c['initiatorId'] == g.user_id else c['initiatorId']
    payload = _serialize_dm(dms.find_one(id=mid))
    socketio.emit('dm:updated', payload, to=f'user:{other_id}')
    return jsonify(payload)


@bp.route('/<cid>/messages/<mid>', methods=['DELETE'])
def delete_dm(cid, mid):
    msg = dms.find_one(id=mid, conversationId=cid)
    if not msg or msg['senderId'] != g.user_id:
        return jsonify({'error': 'Not authorized'}), 403
    now = datetime.now(timezone.utc).isoformat()
    dms.update({'id': mid}, {'content': 'This message has been deleted.', 'fileUrl': None, 'deleted': True, 'updatedAt': now})
    c = convos.find_one(id=cid)
    other_id = c['receiverId'] if c['initiatorId'] == g.user_id else c['initiatorId']
    payload = _serialize_dm(dms.find_one(id=mid))
    socketio.emit('dm:deleted', payload, to=f'user:{other_id}')
    return jsonify(payload)
