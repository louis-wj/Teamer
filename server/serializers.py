"""
Turn raw JSON-DB dicts into API-ready responses.
All serializers output camelCase to match the React client.
"""
from db import get_collection


def serialize_user(user: dict, include_email=False) -> dict:
    d = {
        'id': user['id'], 'username': user['username'],
        'displayName': user['displayName'], 'avatarUrl': user.get('avatarUrl'),
        'status': user.get('status', 'OFFLINE'),
        'bio': user.get('bio', ''),
        'customStatus': user.get('customStatus'),
        'createdAt': user.get('createdAt'),
    }
    if include_email:
        d['email'] = user['email']
    return d


def serialize_member(member: dict) -> dict:
    user = get_collection('users').find_one(id=member['userId'])
    roles_col = get_collection('roles')
    role_ids = member.get('roleIds') or []
    roles = [serialize_role(r) for r in roles_col.find(fn=lambda r: r['id'] in role_ids)] if role_ids else []
    return {
        'id': member['id'], 'role': member.get('role', 'GUEST'),
        'joinedAt': member.get('joinedAt'),
        'userId': member.get('userId', ''), 'serverId': member.get('serverId', ''),
        'roleIds': role_ids, 'roles': roles,
        'user': serialize_user(user) if user else None,
    }


def serialize_role(role: dict) -> dict:
    return {
        'id': role['id'], 'name': role['name'], 'color': role.get('color', '#99AAB5'),
        'permissions': role.get('permissions', 0), 'position': role.get('position', 0),
        'isDefault': role.get('isDefault', False), 'serverId': role.get('serverId'),
    }


def serialize_category(cat: dict) -> dict:
    return {
        'id': cat['id'], 'name': cat['name'], 'serverId': cat['serverId'],
        'position': cat.get('position', 0), 'createdAt': cat.get('createdAt'),
    }


def serialize_channel(channel: dict) -> dict:
    return {
        'id': channel['id'], 'name': channel['name'], 'type': channel.get('type', 'TEXT'),
        'serverId': channel['serverId'], 'categoryId': channel.get('categoryId'),
        'position': channel.get('position', 0), 'slowmode': channel.get('slowmode', 0),
        'parentMessageId': channel.get('parentMessageId'),
        'createdAt': channel.get('createdAt'),
    }


def serialize_server(server: dict) -> dict:
    chs = get_collection('channels').find(serverId=server['id'])
    mems = get_collection('server_members').find(serverId=server['id'])
    cats = get_collection('categories').find(serverId=server['id'])
    roles = get_collection('roles').find(serverId=server['id'])
    chs.sort(key=lambda c: (c.get('position', 0), c.get('createdAt', '')))
    cats.sort(key=lambda c: c.get('position', 0))
    roles.sort(key=lambda r: r.get('position', 0))
    return {
        'id': server['id'], 'name': server['name'],
        'imageUrl': server.get('imageUrl'), 'inviteCode': server['inviteCode'],
        'ownerId': server['ownerId'], 'isPublic': server.get('isPublic', False),
        'createdAt': server.get('createdAt'),
        'channels': [serialize_channel(c) for c in chs],
        'categories': [serialize_category(c) for c in cats],
        'roles': [serialize_role(r) for r in roles],
        'members': [serialize_member(m) for m in mems],
        '_count': {'members': len(mems)},
    }


def serialize_message(message: dict) -> dict:
    member = get_collection('server_members').find_one(id=message.get('memberId'))
    reply_to = None
    if message.get('replyToId'):
        parent = get_collection('messages').find_one(id=message['replyToId'])
        if parent:
            p_member = get_collection('server_members').find_one(id=parent.get('memberId'))
            reply_to = {'id': parent['id'], 'content': parent['content'][:100],
                'member': serialize_member(p_member) if p_member else None}
    return {
        'id': message['id'], 'content': message['content'],
        'fileUrl': message.get('fileUrl'), 'deleted': message.get('deleted', False),
        'pinned': message.get('pinned', False),
        'reactions': message.get('reactions', []),
        'replyToId': message.get('replyToId'),
        'replyTo': reply_to,
        'threadChannelId': message.get('threadChannelId'),
        'createdAt': message.get('createdAt'), 'updatedAt': message.get('updatedAt'),
        'channelId': message.get('channelId'), 'memberId': message.get('memberId'),
        'member': serialize_member(member) if member else None,
    }
