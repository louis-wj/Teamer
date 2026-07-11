from datetime import datetime, timezone
from flask import Blueprint, jsonify, g
from db import get_collection
from serializers import serialize_server, serialize_message
from extensions import socketio
from utils import check_auth, new_id, generate_snowflake

bp = Blueprint('invites', __name__, url_prefix='/api/invite')
bp.before_request(check_auth)

servers = get_collection('servers')
members = get_collection('server_members')
bans    = get_collection('bans')

@bp.route('/<code>', methods=['POST'])
def join_server(code):
    srv = servers.find_one(inviteCode=code)
    if not srv: return jsonify({'error': 'Invalid invite code'}), 404
    if members.find_one(userId=g.user_id, serverId=srv['id']):
        return jsonify({'error': 'Already a member', 'serverId': srv['id']}), 400
    if bans.find_one(userId=g.user_id, serverId=srv['id']):
        return jsonify({'error': 'You are banned from this server'}), 403
    member = {'id': new_id(), 'role': 'GUEST',
              'joinedAt': datetime.now(timezone.utc).isoformat(),
              'userId': g.user_id, 'serverId': srv['id'], 'roleIds': []}
    members.insert(member)

    # Send system welcome message to #general
    user = get_collection('users').find_one(id=g.user_id)
    channels = get_collection('channels')
    messages = get_collection('messages')
    general = channels.find_one(serverId=srv['id'], name='general')
    if general and user:
        now = datetime.now(timezone.utc).isoformat()
        sys_msg = {
            'id': generate_snowflake(), 'content': f"👋 **{user['displayName']}** joined **{srv['name']}**. Welcome!",
            'fileUrl': None, 'deleted': False, 'pinned': False, 'reactions': [],
            'replyToId': None, 'system': True,
            'createdAt': now, 'updatedAt': now,
            'channelId': general['id'], 'memberId': member['id'],
        }
        messages.insert(sys_msg)
        socketio.emit('message:created', serialize_message(sys_msg), to=f'channel:{general["id"]}')

    return jsonify(serialize_server(srv))
