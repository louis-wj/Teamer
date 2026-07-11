from flask import Blueprint, request, jsonify, g
from db import get_collection
from serializers import serialize_message
from utils import check_auth

bp = Blueprint('search', __name__, url_prefix='/api/search')
bp.before_request(check_auth)

messages_col = get_collection('messages')
channels_col = get_collection('channels')
members_col = get_collection('server_members')


@bp.route('')
def search():
    q = (request.args.get('q') or '').strip().lower()
    t = request.args.get('type', 'messages')
    sid = request.args.get('serverId')
    if not q or len(q) < 2:
        return jsonify({'error': 'Query must be at least 2 characters'}), 400

    if t == 'messages':
        # Get channels in this server if sid provided
        chan_ids = {ch['id'] for ch in channels_col.find(serverId=sid)} if sid else None
        results = []
        for msg in messages_col.find_all():
            if msg.get('deleted'): continue
            if chan_ids and msg.get('channelId') not in chan_ids: continue
            if q in msg.get('content', '').lower():
                results.append(serialize_message(msg))
                if len(results) >= 50: break
        return jsonify(results)

    if t == 'members':
        users_col = get_collection('users')
        # If sid, only search members of that server
        if sid:
            mems = members_col.find(serverId=sid)
            uids = {m['userId'] for m in mems}
            res = users_col.find(fn=lambda u: u['id'] in uids and (q in u['username'].lower() or q in u['displayName'].lower()))
        else:
            res = users_col.find(fn=lambda u: q in u['username'].lower() or q in u['displayName'].lower())
        from serializers import serialize_user
        return jsonify([serialize_user(u) for u in res[:20]])

    if t == 'channels':
        # If sid, only search channels in that server
        if sid:
            chs = channels_col.find(serverId=sid, fn=lambda c: q in c['name'].lower())
        else:
            # Only search channels in servers the user is in
            my_mems = members_col.find(userId=g.user_id)
            my_sids = {m['serverId'] for m in my_mems}
            chs = channels_col.find(fn=lambda c: c['serverId'] in my_sids and q in c['name'].lower())
        from serializers import serialize_channel
        return jsonify([serialize_channel(c) for c in chs[:20]])

    return jsonify([])
