from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from db import get_collection
from serializers import serialize_server, serialize_channel, serialize_member, serialize_category
from utils import check_auth, new_id, new_invite_code
from permissions import DEFAULT_EVERYONE

bp = Blueprint('servers', __name__, url_prefix='/api/servers')
bp.before_request(check_auth)

servers    = get_collection('servers')
members    = get_collection('server_members')
channels   = get_collection('channels')
messages   = get_collection('messages')
bans       = get_collection('bans')
categories = get_collection('categories')
roles_col  = get_collection('roles')
audit_col  = get_collection('audit_logs')

def _audit(sid, action, target_type='', target_id='', details=''):
    audit_col.insert({'id': new_id(), 'serverId': sid, 'userId': g.user_id,
        'action': action, 'targetType': target_type, 'targetId': target_id,
        'details': details, 'createdAt': datetime.now(timezone.utc).isoformat()})

def _me(sid): return members.find_one(userId=g.user_id, serverId=sid)

@bp.route('/', methods=['POST'])
def create_server():
    name = (request.get_json(silent=True) or {}).get('name', '').strip()
    if not name: return jsonify({'error': 'Server name required'}), 400
    now = datetime.now(timezone.utc).isoformat()
    srv = {'id': new_id(), 'name': name, 'imageUrl': (request.get_json(silent=True) or {}).get('imageUrl'),
           'inviteCode': new_invite_code(), 'ownerId': g.user_id, 'createdAt': now}
    servers.insert(srv)
    channels.insert({'id': new_id(), 'name': 'general', 'type': 'TEXT', 'serverId': srv['id'], 'createdAt': now, 'categoryId': None, 'position': 0})
    members.insert({'id': new_id(), 'role': 'ADMIN', 'joinedAt': now, 'userId': g.user_id, 'serverId': srv['id'], 'roleIds': []})
    # Create default @everyone role
    roles_col.insert({'id': new_id(), 'name': '@everyone', 'color': '#99AAB5', 'serverId': srv['id'],
        'permissions': DEFAULT_EVERYONE, 'position': 0, 'isDefault': True, 'createdAt': now})
    return jsonify(serialize_server(srv)), 201

@bp.route('/')
def list_servers():
    ids = {m['serverId'] for m in members.find(userId=g.user_id)}
    out = servers.find(fn=lambda s: s['id'] in ids)
    out.sort(key=lambda s: s.get('createdAt', ''))
    return jsonify([serialize_server(s) for s in out])

@bp.route('/<sid>')
def get_server(sid):
    srv = servers.find_one(id=sid)
    if not srv or not _me(sid): return jsonify({'error': 'Server not found'}), 404
    return jsonify(serialize_server(srv))

@bp.route('/<sid>', methods=['PATCH'])
def update_server(sid):
    m = _me(sid)
    if not m or m['role'] != 'ADMIN': return jsonify({'error': 'Not authorized'}), 403
    data = request.get_json(silent=True) or {}
    upd = {}
    if data.get('name'): upd['name'] = data['name'].strip()
    if 'imageUrl' in data: upd['imageUrl'] = data['imageUrl']
    if upd: servers.update({'id': sid}, upd)
    return jsonify(serialize_server(servers.find_one(id=sid)))

@bp.route('/<sid>', methods=['DELETE'])
def delete_server(sid):
    srv = servers.find_one(id=sid)
    if not srv or srv['ownerId'] != g.user_id: return jsonify({'error': 'Only the owner can delete'}), 403
    for ch in channels.find(serverId=sid): messages.delete_many(channelId=ch['id'])
    channels.delete_many(serverId=sid); members.delete_many(serverId=sid)
    bans.delete_many(serverId=sid); categories.delete_many(serverId=sid)
    roles_col.delete_many(serverId=sid); get_collection('permission_overrides').delete_many(fn=lambda o: o.get('serverId') == sid)
    servers.delete_one(id=sid)
    return jsonify({'message': 'Server deleted'})

@bp.route('/<sid>/leave', methods=['POST'])
def leave_server(sid):
    srv = servers.find_one(id=sid)
    if not srv: return jsonify({'error': 'Server not found'}), 404
    if srv['ownerId'] == g.user_id: return jsonify({'error': 'Owner cannot leave.'}), 400
    m = _me(sid)
    if m: members.delete_one(id=m['id'])
    return jsonify({'message': 'Left server'})

@bp.route('/<sid>/invite', methods=['POST'])
def gen_invite(sid):
    if not _me(sid): return jsonify({'error': 'Not a member'}), 403
    code = new_invite_code(); servers.update({'id': sid}, {'inviteCode': code})
    return jsonify({'inviteCode': code})

# ── Channels ─────────────────────────────────────────────────────────────────

@bp.route('/<sid>/channels', methods=['POST'])
def create_channel(sid):
    m = _me(sid)
    if not m or m['role'] == 'GUEST': return jsonify({'error': 'Not authorized'}), 403
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip().lower().replace(' ', '-')
    if not name: return jsonify({'error': 'Channel name required'}), 400
    highest = max((c.get('position', 0) for c in channels.find(serverId=sid)), default=-1)
    ch = {'id': new_id(), 'name': name, 'type': data.get('type', 'TEXT'),
          'serverId': sid, 'categoryId': data.get('categoryId'), 'position': highest + 1,
          'slowmode': 0, 'createdAt': datetime.now(timezone.utc).isoformat()}
    channels.insert(ch)
    _audit(sid, 'CHANNEL_CREATE', 'channel', ch['id'], name)
    return jsonify(serialize_channel(ch)), 201

@bp.route('/<sid>/channels')
def list_channels(sid):
    if not _me(sid): return jsonify({'error': 'Not a member'}), 403
    chs = channels.find(serverId=sid); chs.sort(key=lambda c: c.get('createdAt', ''))
    return jsonify([serialize_channel(c) for c in chs])

# ── Members ──────────────────────────────────────────────────────────────────

@bp.route('/<sid>/members')
def list_members(sid):
    if not _me(sid): return jsonify({'error': 'Not a member'}), 403
    return jsonify([serialize_member(m) for m in members.find(serverId=sid)])

@bp.route('/<sid>/members/<mid>', methods=['PATCH'])
def update_role(sid, mid):
    req = _me(sid)
    if not req or req['role'] != 'ADMIN': return jsonify({'error': 'Only admins can change roles'}), 403
    t = members.find_one(id=mid)
    if not t or t['serverId'] != sid: return jsonify({'error': 'Member not found'}), 404
    srv = servers.find_one(id=sid)
    if srv and srv['ownerId'] == t['userId']: return jsonify({'error': "Cannot change owner's role"}), 400
    role = (request.get_json(silent=True) or {}).get('role')
    if role in ('ADMIN', 'MODERATOR', 'GUEST'): members.update({'id': mid}, {'role': role})
    return jsonify(serialize_member(members.find_one(id=mid)))

@bp.route('/<sid>/members/<mid>', methods=['DELETE'])
def kick(sid, mid):
    req = _me(sid)
    if not req or req['role'] == 'GUEST': return jsonify({'error': 'Not authorized'}), 403
    t = members.find_one(id=mid)
    if not t or t['serverId'] != sid: return jsonify({'error': 'Member not found'}), 404
    srv = servers.find_one(id=sid)
    if srv and srv['ownerId'] == t['userId']: return jsonify({'error': 'Cannot kick the owner'}), 400
    if req['role'] == 'MODERATOR' and t['role'] == 'ADMIN': return jsonify({'error': 'Moderators cannot kick admins'}), 403
    _audit(sid, 'MEMBER_KICK', 'member', mid, t.get('userId', ''))
    members.delete_one(id=mid)
    return jsonify({'message': 'Member kicked'})


# ── Categories ───────────────────────────────────────────────────────────────

@bp.route('/<sid>/categories', methods=['POST'])
def create_category(sid):
    m = _me(sid)
    if not m or m['role'] == 'GUEST': return jsonify({'error': 'Not authorized'}), 403
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    if not name: return jsonify({'error': 'Category name required'}), 400
    highest = max((c.get('position', 0) for c in categories.find(serverId=sid)), default=-1)
    cat = {'id': new_id(), 'name': name, 'serverId': sid, 'position': highest + 1,
           'createdAt': datetime.now(timezone.utc).isoformat()}
    categories.insert(cat)
    return jsonify(serialize_category(cat)), 201

@bp.route('/<sid>/categories')
def list_categories(sid):
    if not _me(sid): return jsonify({'error': 'Not a member'}), 403
    cats = categories.find(serverId=sid)
    cats.sort(key=lambda c: c.get('position', 0))
    return jsonify([serialize_category(c) for c in cats])

@bp.route('/<sid>/categories/<cid>', methods=['PATCH'])
def update_category(sid, cid):
    m = _me(sid)
    if not m or m['role'] == 'GUEST': return jsonify({'error': 'Not authorized'}), 403
    cat = categories.find_one(id=cid, serverId=sid)
    if not cat: return jsonify({'error': 'Category not found'}), 404
    data = request.get_json(silent=True) or {}
    upd = {}
    if 'name' in data: upd['name'] = data['name'].strip()
    if 'position' in data: upd['position'] = int(data['position'])
    if upd: categories.update({'id': cid}, upd)
    return jsonify(serialize_category(categories.find_one(id=cid)))

@bp.route('/<sid>/categories/<cid>', methods=['DELETE'])
def delete_category(sid, cid):
    m = _me(sid)
    if not m or m['role'] == 'GUEST': return jsonify({'error': 'Not authorized'}), 403
    cat = categories.find_one(id=cid, serverId=sid)
    if not cat: return jsonify({'error': 'Category not found'}), 404
    # Move channels to uncategorized
    for ch in channels.find(serverId=sid, categoryId=cid):
        channels.update({'id': ch['id']}, {'categoryId': None})
    categories.delete_one(id=cid)
    return jsonify({'message': 'Category deleted'})

@bp.route('/<sid>/reorder', methods=['PATCH'])
def reorder(sid):
    m = _me(sid)
    if not m or m['role'] == 'GUEST': return jsonify({'error': 'Not authorized'}), 403
    data = request.get_json(silent=True) or {}
    for cat_data in data.get('categories', []):
        categories.update({'id': cat_data['id']}, {'position': cat_data.get('position', 0)})
        for ch_data in cat_data.get('channels', []):
            channels.update({'id': ch_data['id']}, {'position': ch_data.get('position', 0), 'categoryId': cat_data['id']})
    for ch_data in data.get('uncategorized', []):
        channels.update({'id': ch_data['id']}, {'position': ch_data.get('position', 0), 'categoryId': None})
    return jsonify({'message': 'Reordered'})


# ── Bans ─────────────────────────────────────────────────────────────────────

@bp.route('/<sid>/bans')
def list_bans(sid):
    m = _me(sid)
    if not m or m['role'] == 'GUEST': return jsonify({'error': 'Not authorized'}), 403
    ban_list = bans.find(serverId=sid)
    users_col = get_collection('users')
    result = []
    for b in ban_list:
        u = users_col.find_one(id=b['userId'])
        result.append({'id': b['id'], 'reason': b.get('reason'), 'createdAt': b.get('createdAt'),
                       'user': serialize_member({'id': '', 'role': '', 'userId': b['userId'], 'serverId': sid}) if u else None})
    return jsonify(result)

@bp.route('/<sid>/bans', methods=['POST'])
def ban_user(sid):
    m = _me(sid)
    if not m or m['role'] == 'GUEST': return jsonify({'error': 'Not authorized'}), 403
    data = request.get_json(silent=True) or {}
    target_id = data.get('userId')
    if not target_id: return jsonify({'error': 'userId required'}), 400
    srv = servers.find_one(id=sid)
    if srv and srv['ownerId'] == target_id: return jsonify({'error': 'Cannot ban the owner'}), 400
    if bans.find_one(userId=target_id, serverId=sid): return jsonify({'error': 'Already banned'}), 400
    # Remove from server
    mem = members.find_one(userId=target_id, serverId=sid)
    if mem: members.delete_one(id=mem['id'])
    bans.insert({'id': new_id(), 'userId': target_id, 'serverId': sid,
        'reason': data.get('reason', ''), 'createdAt': datetime.now(timezone.utc).isoformat()})
    _audit(sid, 'MEMBER_BAN', 'user', target_id, data.get('reason', ''))
    return jsonify({'message': 'User banned'})

@bp.route('/<sid>/bans/<bid>', methods=['DELETE'])
def unban_user(sid, bid):
    m = _me(sid)
    if not m or m['role'] == 'GUEST': return jsonify({'error': 'Not authorized'}), 403
    ban = bans.find_one(id=bid, serverId=sid)
    if not ban: return jsonify({'error': 'Ban not found'}), 404
    _audit(sid, 'MEMBER_UNBAN', 'user', ban['userId'])
    bans.delete_one(id=bid)
    return jsonify({'message': 'User unbanned'})


# ── Audit Log ────────────────────────────────────────────────────────────────

@bp.route('/<sid>/audit-log')
def get_audit_log(sid):
    m = _me(sid)
    if not m or m['role'] == 'GUEST': return jsonify({'error': 'Not authorized'}), 403
    logs = audit_col.find(serverId=sid)
    logs.sort(key=lambda l: l.get('createdAt', ''), reverse=True)
    users_col = get_collection('users')
    result = []
    for l in logs[:100]:
        u = users_col.find_one(id=l['userId'])
        result.append({**l, 'user': serialize_member({'id':'','role':'','userId':l['userId'],'serverId':sid}) if u else None})
    return jsonify(result)


# ── Discovery ────────────────────────────────────────────────────────────────

@bp.route('/discover')
def discover():
    public = servers.find(fn=lambda s: s.get('isPublic'))
    return jsonify([{'id': s['id'], 'name': s['name'], 'imageUrl': s.get('imageUrl'),
        '_count': {'members': len(members.find(serverId=s['id']))}} for s in public])
