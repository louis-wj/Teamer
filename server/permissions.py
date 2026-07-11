"""
TEAMER Permission System
Bitmask-based permissions with role hierarchy and channel overrides.
"""
from db import get_collection

# ── Permission flags ─────────────────────────────────────────────────────────
VIEW_CHANNELS    = 1 << 0    # 1
SEND_MESSAGES    = 1 << 1    # 2
MANAGE_MESSAGES  = 1 << 2    # 4
MANAGE_CHANNELS  = 1 << 3    # 8
MANAGE_SERVER    = 1 << 4    # 16
KICK_MEMBERS     = 1 << 5    # 32
BAN_MEMBERS      = 1 << 6    # 64
MANAGE_ROLES     = 1 << 7    # 128
ADMINISTRATOR    = 1 << 8    # 256

ALL_PERMISSIONS = (1 << 9) - 1  # 511
DEFAULT_EVERYONE = VIEW_CHANNELS | SEND_MESSAGES  # 3

PERMISSION_NAMES = {
    'VIEW_CHANNELS': VIEW_CHANNELS, 'SEND_MESSAGES': SEND_MESSAGES,
    'MANAGE_MESSAGES': MANAGE_MESSAGES, 'MANAGE_CHANNELS': MANAGE_CHANNELS,
    'MANAGE_SERVER': MANAGE_SERVER, 'KICK_MEMBERS': KICK_MEMBERS,
    'BAN_MEMBERS': BAN_MEMBERS, 'MANAGE_ROLES': MANAGE_ROLES,
    'ADMINISTRATOR': ADMINISTRATOR,
}


def get_member_roles(member, server_id):
    """Get all Role dicts for a member (including @everyone)."""
    roles_col = get_collection('roles')
    all_roles = roles_col.find(serverId=server_id)
    everyone = next((r for r in all_roles if r.get('isDefault')), None)

    member_role_ids = set(member.get('roleIds') or [])
    member_roles = [r for r in all_roles if r['id'] in member_role_ids]

    if everyone and everyone['id'] not in member_role_ids:
        member_roles.insert(0, everyone)
    return member_roles


def compute_base_permissions(member, server_id):
    """Combine all of a member's role permissions via OR."""
    server = get_collection('servers').find_one(id=server_id)
    if server and server.get('ownerId') == member.get('userId'):
        return ALL_PERMISSIONS  # owner has all perms

    perms = 0
    for role in get_member_roles(member, server_id):
        perms |= role.get('permissions', 0)
    if perms & ADMINISTRATOR:
        return ALL_PERMISSIONS
    return perms


def compute_channel_permissions(member, server_id, channel_id):
    """Resolve permissions for a specific channel, including overrides."""
    base = compute_base_permissions(member, server_id)
    if base & ADMINISTRATOR:
        return ALL_PERMISSIONS

    overrides_col = get_collection('permission_overrides')
    channel = get_collection('channels').find_one(id=channel_id)
    if not channel:
        return base

    role_ids = set(r['id'] for r in get_member_roles(member, server_id))
    allow = 0
    deny = 0

    # Category overrides first
    if channel.get('categoryId'):
        cat_overrides = overrides_col.find(targetId=channel['categoryId'], targetType='category')
        for ov in cat_overrides:
            if ov['roleId'] in role_ids:
                allow |= ov.get('allow', 0)
                deny |= ov.get('deny', 0)

    # Channel overrides (take priority)
    ch_overrides = overrides_col.find(targetId=channel_id, targetType='channel')
    for ov in ch_overrides:
        if ov['roleId'] in role_ids:
            allow |= ov.get('allow', 0)
            deny |= ov.get('deny', 0)

    return (base & ~deny) | allow


def has_permission(member, server_id, perm, channel_id=None):
    """Check if a member has a specific permission."""
    if channel_id:
        resolved = compute_channel_permissions(member, server_id, channel_id)
    else:
        resolved = compute_base_permissions(member, server_id)
    return bool(resolved & perm)


def get_visible_channels(member, server_id):
    """Return list of channel IDs this member can see."""
    channels = get_collection('channels').find(serverId=server_id)
    return [ch['id'] for ch in channels
            if has_permission(member, server_id, VIEW_CHANNELS, ch['id'])]
