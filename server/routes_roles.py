from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from db import get_collection
from serializers import serialize_role
from utils import check_auth, new_id
from permissions import DEFAULT_EVERYONE, PERMISSION_NAMES

bp = Blueprint('roles', __name__, url_prefix='/api/servers')
bp.before_request(check_auth)

roles_col = get_collection('roles')
members_col = get_collection('server_members')
servers_col = get_collection('servers')


def _require_admin(sid):
    m = members_col.find_one(userId=g.user_id, serverId=sid)
    if not m:
        return None, (jsonify({'error': 'Not a member'}), 403)
    from permissions import has_permission, MANAGE_ROLES, ADMINISTRATOR
    if not has_permission(m, sid, MANAGE_ROLES) and not has_permission(m, sid, ADMINISTRATOR):
        s = servers_col.find_one(id=sid)
        if not s or s['ownerId'] != g.user_id:
            return m, (jsonify({'error': 'Not authorized'}), 403)
    return m, None


@bp.route('/<sid>/roles', methods=['POST'])
def create_role(sid):
    _, err = _require_admin(sid)
    if err: return err
    data = request.get_json(silent=True) or {}
    now = datetime.now(timezone.utc).isoformat()
    highest = max((r.get('position', 0) for r in roles_col.find(serverId=sid)), default=0)
    role = {
        'id': new_id(), 'name': data.get('name', 'new role').strip()[:64],
        'color': data.get('color', '#99AAB5'), 'serverId': sid,
        'permissions': data.get('permissions', 0), 'position': highest + 1,
        'isDefault': False, 'createdAt': now,
    }
    roles_col.insert(role)
    return jsonify(serialize_role(role)), 201


@bp.route('/<sid>/roles')
def list_roles(sid):
    m = members_col.find_one(userId=g.user_id, serverId=sid)
    if not m: return jsonify({'error': 'Not a member'}), 403
    roles = roles_col.find(serverId=sid)
    roles.sort(key=lambda r: r.get('position', 0))
    return jsonify([serialize_role(r) for r in roles])


@bp.route('/<sid>/roles/<rid>', methods=['PATCH'])
def update_role(sid, rid):
    _, err = _require_admin(sid)
    if err: return err
    role = roles_col.find_one(id=rid, serverId=sid)
    if not role: return jsonify({'error': 'Role not found'}), 404
    data = request.get_json(silent=True) or {}
    upd = {}
    if 'name' in data and not role.get('isDefault'):
        upd['name'] = data['name'].strip()[:64]
    if 'color' in data: upd['color'] = data['color']
    if 'permissions' in data: upd['permissions'] = int(data['permissions'])
    if 'position' in data: upd['position'] = int(data['position'])
    if upd: roles_col.update({'id': rid}, upd)
    return jsonify(serialize_role(roles_col.find_one(id=rid)))


@bp.route('/<sid>/roles/<rid>', methods=['DELETE'])
def delete_role(sid, rid):
    _, err = _require_admin(sid)
    if err: return err
    role = roles_col.find_one(id=rid, serverId=sid)
    if not role: return jsonify({'error': 'Role not found'}), 404
    if role.get('isDefault'): return jsonify({'error': 'Cannot delete @everyone role'}), 400
    # Remove role from all members
    for m in members_col.find(serverId=sid):
        ids = m.get('roleIds') or []
        if rid in ids:
            ids.remove(rid)
            members_col.update({'id': m['id']}, {'roleIds': ids})
    roles_col.delete_one(id=rid)
    return jsonify({'message': 'Role deleted'})


@bp.route('/<sid>/members/<mid>/roles/<rid>', methods=['POST'])
def assign_role(sid, mid, rid):
    _, err = _require_admin(sid)
    if err: return err
    role = roles_col.find_one(id=rid, serverId=sid)
    if not role: return jsonify({'error': 'Role not found'}), 404
    member = members_col.find_one(id=mid, serverId=sid)
    if not member: return jsonify({'error': 'Member not found'}), 404
    ids = member.get('roleIds') or []
    if rid not in ids:
        ids.append(rid)
        members_col.update({'id': mid}, {'roleIds': ids})
    return jsonify({'message': 'Role assigned'})


@bp.route('/<sid>/members/<mid>/roles/<rid>', methods=['DELETE'])
def remove_role(sid, mid, rid):
    _, err = _require_admin(sid)
    if err: return err
    member = members_col.find_one(id=mid, serverId=sid)
    if not member: return jsonify({'error': 'Member not found'}), 404
    ids = member.get('roleIds') or []
    if rid in ids:
        ids.remove(rid)
        members_col.update({'id': mid}, {'roleIds': ids})
    return jsonify({'message': 'Role removed'})
