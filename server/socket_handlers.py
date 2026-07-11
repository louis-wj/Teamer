from flask import request as flask_request
from flask_socketio import emit, join_room, leave_room
from extensions import socketio
from db import get_collection
from utils import verify_access_token
import jwt as pyjwt

def register_handlers():
    users   = get_collection('users')
    members = get_collection('server_members')

    @socketio.on('connect')
    def on_connect(auth=None):
        token = (auth or {}).get('token') if auth else None
        if not token: return False
        try:
            payload = verify_access_token(token)
        except (pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError):
            return False
        uid = payload['userId']
        flask_request.sid_user = {'userId': uid, 'username': payload['username']}
        join_room(f'user:{uid}')
        users.update({'id': uid}, {'status': 'ONLINE'})
        for m in members.find(userId=uid):
            join_room(f'server:{m["serverId"]}')
            emit('presence:update', {'userId': uid, 'status': 'ONLINE'}, to=f'server:{m["serverId"]}')

    @socketio.on('disconnect')
    def on_disconnect():
        info = getattr(flask_request, 'sid_user', None)
        if not info: return
        uid = info['userId']
        users.update({'id': uid}, {'status': 'OFFLINE'})
        for m in members.find(userId=uid):
            emit('presence:update', {'userId': uid, 'status': 'OFFLINE'}, to=f'server:{m["serverId"]}')

    @socketio.on('channel:join')
    def on_channel_join(cid): join_room(f'channel:{cid}')

    @socketio.on('channel:leave')
    def on_channel_leave(cid): leave_room(f'channel:{cid}')

    @socketio.on('typing:start')
    def on_typing(cid):
        info = getattr(flask_request, 'sid_user', None)
        if info:
            emit('user:typing', {'userId': info['userId'], 'channelId': cid, 'username': info['username']},
                 to=f'channel:{cid}', include_self=False)
