from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from db import get_collection
from serializers import serialize_message, serialize_channel
from extensions import socketio
from utils import check_auth, generate_snowflake

bp = Blueprint('channels', __name__, url_prefix='/api/channels')
bp.before_request(check_auth)

channels = get_collection('channels')
messages = get_collection('messages')
members  = get_collection('server_members')
BATCH = 50

@bp.route('/<cid>', methods=['PATCH'])
def update_channel(cid):
    ch = channels.find_one(id=cid)
    if not ch: return jsonify({'error': 'Channel not found'}), 404
    m = members.find_one(userId=g.user_id, serverId=ch['serverId'])
    if not m or m['role'] == 'GUEST': return jsonify({'error': 'Not authorized'}), 403
    data = request.get_json(silent=True) or {}; upd = {}
    if data.get('name'): upd['name'] = data['name'].strip().lower().replace(' ', '-')
    if data.get('type') in ('TEXT', 'VOICE', 'VIDEO'): upd['type'] = data['type']
    if upd: channels.update({'id': cid}, upd)
    return jsonify(serialize_channel(channels.find_one(id=cid)))

@bp.route('/<cid>', methods=['DELETE'])
def delete_channel(cid):
    ch = channels.find_one(id=cid)
    if not ch: return jsonify({'error': 'Channel not found'}), 404
    if ch['name'] == 'general': return jsonify({'error': 'Cannot delete the general channel'}), 400
    m = members.find_one(userId=g.user_id, serverId=ch['serverId'])
    if not m or m['role'] == 'GUEST': return jsonify({'error': 'Not authorized'}), 403
    messages.delete_many(channelId=cid); channels.delete_one(id=cid)
    return jsonify({'message': 'Channel deleted'})

@bp.route('/<cid>/messages')
def get_messages(cid):
    ch = channels.find_one(id=cid)
    if not ch: return jsonify({'error': 'Channel not found'}), 404
    if not members.find_one(userId=g.user_id, serverId=ch['serverId']): return jsonify({'error': 'Not a member'}), 403
    cursor = request.args.get('cursor')
    msgs = messages.find(channelId=cid)
    if cursor: msgs = [m for m in msgs if m['id'] < cursor]
    msgs.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
    page = msgs[:BATCH]
    return jsonify({'messages': [serialize_message(m) for m in page],
                    'nextCursor': page[-1]['id'] if len(page) == BATCH else None})

@bp.route('/<cid>/messages', methods=['POST'])
def send_message(cid):
    ch = channels.find_one(id=cid)
    if not ch: return jsonify({'error': 'Channel not found'}), 404
    m = members.find_one(userId=g.user_id, serverId=ch['serverId'])
    if not m: return jsonify({'error': 'Not a member'}), 403
    data = request.get_json(silent=True) or {}
    content = (data.get('content') or '').strip()
    if not content: return jsonify({'error': 'Content required'}), 400
    now = datetime.now(timezone.utc).isoformat()
    msg = {'id': generate_snowflake(), 'content': content, 'fileUrl': data.get('fileUrl'),
           'deleted': False, 'pinned': False, 'reactions': [], 'replyToId': data.get('replyToId'),
           'createdAt': now, 'updatedAt': now, 'channelId': cid, 'memberId': m['id']}
    messages.insert(msg)
    # Parse @mentions and notify
    import re
    mentioned = set(re.findall(r'@(\w+)', content))
    if mentioned:
        users_col = get_collection('users')
        for uname in mentioned:
            u = users_col.find_one(username=uname)
            if u:
                socketio.emit('mention', {'channelId': cid, 'messageId': msg['id'], 'by': g.user_id}, to=f'user:{u["id"]}')
    payload = serialize_message(msg)
    socketio.emit('message:created', payload, to=f'channel:{cid}')
    return jsonify(payload), 201

@bp.route('/<cid>/messages/<mid>', methods=['PATCH'])
def update_message(cid, mid):
    msg = messages.find_one(id=mid)
    if not msg: return jsonify({'error': 'Message not found'}), 404
    mem = members.find_one(id=msg['memberId'])
    if not mem or mem['userId'] != g.user_id: return jsonify({'error': 'Not authorized'}), 403
    content = ((request.get_json(silent=True) or {}).get('content') or '').strip()
    if not content: return jsonify({'error': 'Content required'}), 400
    messages.update({'id': mid}, {'content': content, 'updatedAt': datetime.now(timezone.utc).isoformat()})
    payload = serialize_message(messages.find_one(id=mid))
    socketio.emit('message:updated', payload, to=f'channel:{msg["channelId"]}')
    return jsonify(payload)

@bp.route('/<cid>/messages/<mid>', methods=['DELETE'])
def delete_message(cid, mid):
    msg = messages.find_one(id=mid)
    if not msg: return jsonify({'error': 'Message not found'}), 404
    mem = members.find_one(id=msg['memberId'])
    ch = channels.find_one(id=msg['channelId'])
    cur = members.find_one(userId=g.user_id, serverId=ch['serverId']) if ch else None
    if not (mem and mem['userId'] == g.user_id) and not (cur and cur['role'] in ('ADMIN', 'MODERATOR')):
        return jsonify({'error': 'Not authorized'}), 403
    messages.update({'id': mid}, {'content': 'This message has been deleted.', 'fileUrl': None,
                                  'deleted': True, 'updatedAt': datetime.now(timezone.utc).isoformat()})
    payload = serialize_message(messages.find_one(id=mid))
    socketio.emit('message:deleted', payload, to=f'channel:{msg["channelId"]}')
    return jsonify(payload)


# ── Reactions ────────────────────────────────────────────────────────────────

@bp.route('/<cid>/messages/<mid>/reactions/<emoji>', methods=['PUT'])
def toggle_reaction(cid, mid, emoji):
    msg = messages.find_one(id=mid)
    if not msg: return jsonify({'error': 'Message not found'}), 404
    reactions = msg.get('reactions') or []
    existing = next((r for r in reactions if r['emoji'] == emoji), None)
    if existing:
        if g.user_id in existing['userIds']:
            existing['userIds'].remove(g.user_id)
            if not existing['userIds']: reactions.remove(existing)
        else:
            existing['userIds'].append(g.user_id)
    else:
        reactions.append({'emoji': emoji, 'userIds': [g.user_id]})
    messages.update({'id': mid}, {'reactions': reactions})
    payload = serialize_message(messages.find_one(id=mid))
    socketio.emit('message:updated', payload, to=f'channel:{cid}')
    return jsonify(payload)


# ── Pinning ──────────────────────────────────────────────────────────────────

@bp.route('/<cid>/messages/<mid>/pin', methods=['POST'])
def toggle_pin(cid, mid):
    msg = messages.find_one(id=mid)
    if not msg: return jsonify({'error': 'Message not found'}), 404
    ch = channels.find_one(id=cid)
    m = members.find_one(userId=g.user_id, serverId=ch['serverId']) if ch else None
    if not m or m['role'] == 'GUEST': return jsonify({'error': 'Not authorized'}), 403
    messages.update({'id': mid}, {'pinned': not msg.get('pinned', False)})
    payload = serialize_message(messages.find_one(id=mid))
    socketio.emit('message:updated', payload, to=f'channel:{cid}')
    return jsonify(payload)

@bp.route('/<cid>/pins')
def get_pins(cid):
    ch = channels.find_one(id=cid)
    if not ch: return jsonify({'error': 'Channel not found'}), 404
    if not members.find_one(userId=g.user_id, serverId=ch['serverId']): return jsonify({'error': 'Not a member'}), 403
    pins = messages.find(channelId=cid, pinned=True)
    pins.sort(key=lambda m: m.get('createdAt', ''), reverse=True)
    return jsonify([serialize_message(m) for m in pins])


# ── Permission overrides ─────────────────────────────────────────────────────

@bp.route('/<cid>/permissions/<rid>', methods=['PUT'])
def set_permission_override(cid, rid):
    ch = channels.find_one(id=cid)
    if not ch: return jsonify({'error': 'Channel not found'}), 404
    m = members.find_one(userId=g.user_id, serverId=ch['serverId'])
    if not m or m['role'] == 'GUEST': return jsonify({'error': 'Not authorized'}), 403
    data = request.get_json(silent=True) or {}
    overrides = get_collection('permission_overrides')
    existing = overrides.find_one(targetId=cid, targetType='channel', roleId=rid)
    if existing:
        overrides.update({'id': existing['id']}, {'allow': data.get('allow', 0), 'deny': data.get('deny', 0)})
    else:
        from utils import new_id
        overrides.insert({'id': new_id(), 'targetId': cid, 'targetType': 'channel',
            'roleId': rid, 'allow': data.get('allow', 0), 'deny': data.get('deny', 0)})
    return jsonify({'message': 'Permissions updated'})

@bp.route('/<cid>/permissions/<rid>', methods=['DELETE'])
def delete_permission_override(cid, rid):
    ch = channels.find_one(id=cid)
    if not ch: return jsonify({'error': 'Channel not found'}), 404
    m = members.find_one(userId=g.user_id, serverId=ch['serverId'])
    if not m or m['role'] == 'GUEST': return jsonify({'error': 'Not authorized'}), 403
    get_collection('permission_overrides').delete_one(targetId=cid, targetType='channel', roleId=rid)
    return jsonify({'message': 'Override removed'})


# ── Threads ──────────────────────────────────────────────────────────────────

@bp.route('/<cid>/messages/<mid>/threads', methods=['POST'])
def create_thread(cid, mid):
    msg = messages.find_one(id=mid)
    if not msg: return jsonify({'error': 'Message not found'}), 404
    ch = channels.find_one(id=cid)
    if not ch: return jsonify({'error': 'Channel not found'}), 404
    m = members.find_one(userId=g.user_id, serverId=ch['serverId'])
    if not m: return jsonify({'error': 'Not a member'}), 403
    if msg.get('threadChannelId'):
        return jsonify({'threadChannelId': msg['threadChannelId']})
    from utils import new_id
    data = request.get_json(silent=True) or {}
    now = datetime.now(timezone.utc).isoformat()
    thread_ch = {'id': new_id(), 'name': (data.get('name') or msg['content'][:30]).strip().lower().replace(' ', '-'),
        'type': 'TEXT', 'serverId': ch['serverId'], 'categoryId': ch.get('categoryId'),
        'position': 0, 'slowmode': 0, 'parentMessageId': mid, 'createdAt': now}
    channels.insert(thread_ch)
    messages.update({'id': mid}, {'threadChannelId': thread_ch['id']})
    return jsonify(serialize_channel(thread_ch)), 201
