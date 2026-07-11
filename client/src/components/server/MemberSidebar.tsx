import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { User, MessageCircle, Shield, UserX, Tag, ShieldAlert } from 'lucide-react';
import UserProfileModal from '@/components/modals/UserProfileModal';
import ContextMenu from '@/components/ui/ContextMenu';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';

const STATUS_DOT: Record<string, string> = { 
  ONLINE: 'bg-[#23a55a]', 
  IDLE: 'bg-[#f0b232]', 
  DND: 'bg-[#f23f43]', 
  OFFLINE: 'bg-[#80848e]' 
};

interface Props { members: any[]; server?: any; }

export default function MemberSidebar({ members, server }: Props) {
  const [target, setTarget] = useState<{ user: any; role: string } | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const auth = useAuthStore();
  const userId = auth.user?.id;
  const blockedIds = new Set(auth.user?.blockedIds || []);

  const online = members.filter((m) => ['ONLINE', 'IDLE', 'DND'].includes(m.user?.status));
  const offline = members.filter((m) => m.user?.status === 'OFFLINE');

  const myMember = members.find((m) => m.userId === userId);
  const amAdmin = myMember?.role === 'ADMIN' || server?.ownerId === userId;
  const serverRoles = (server?.roles || []).filter((r: any) => !r.isDefault);

  const refresh = () => {
    if (server) {
      qc.invalidateQueries({ queryKey: ['server', server.id] });
      qc.invalidateQueries({ queryKey: ['servers'] });
    }
  };

  const startDM = async (uid: string) => {
    const res = await api.post('/conversations', { userId: uid });
    navigate(`/dm/${res.data.id}`);
  };

  const block = async (uid: string) => {
    await api.post('/auth/block', { userId: uid });
    auth.addBlockedId(uid);
    refresh();
  };

  const kick = async (mid: string) => {
    if (!server) return;
    await api.delete(`/servers/${server.id}/members/${mid}`);
    refresh();
  };

  const ban = async (uid: string) => {
    if (!server) return;
    await api.post(`/servers/${server.id}/bans`, { userId: uid });
    refresh();
  };

  const toggleRole = async (memberId: string, roleId: string, has: boolean) => {
    if (!server) return;
    if (has) await api.delete(`/servers/${server.id}/members/${memberId}/roles/${roleId}`);
    else await api.post(`/servers/${server.id}/members/${memberId}/roles/${roleId}`);
    refresh();
  };

  const getTopRole = (m: any) => (m.roles && m.roles.length > 0) ? m.roles.sort((a: any, b: any) => b.position - a.position)[0] : null;

  const renderMember = (m: any) => {
    const topRole = getTopRole(m);
    const isOwner = m.userId === server?.ownerId;
    const canManage = amAdmin && !isOwner && m.userId !== userId;
    const memberRoleIds = new Set(m.roleIds || []);
    const isBlocked = blockedIds.has(m.userId);

    const menuItems = [
      { label: 'View Profile', icon: <User size={14} />, onClick: () => setTarget({ user: m.user, role: m.role }) },
      { label: 'Message', icon: <MessageCircle size={14} />, onClick: () => startDM(m.user?.id) },
      ...serverRoles.map((r: any) => ({
        label: `${memberRoleIds.has(r.id) ? '✓ ' : ''}${r.name}`,
        icon: <Tag size={14} style={{ color: r.color }} />,
        onClick: () => toggleRole(m.id, r.id, memberRoleIds.has(r.id)),
      })),
      ...(m.userId !== userId && !isBlocked ? [{ label: 'Block', icon: <ShieldAlert size={14} />, danger: true, onClick: () => block(m.userId) }] : []),
      ...(canManage ? [{ label: 'Kick', icon: <UserX size={14} />, danger: true, onClick: () => kick(m.id) }] : []),
      ...(canManage ? [{ label: 'Ban', icon: <Shield size={14} />, danger: true, onClick: () => ban(m.user?.id) }] : []),
    ];

    return (
      <ContextMenu key={m.id} items={menuItems}>
        <div 
          onClick={() => setTarget({ user: m.user, role: m.role })}
          className={`flex items-center gap-3 px-2 py-1.5 mx-2 cursor-pointer rounded-md transition-colors group mb-1
            ${isBlocked ? 'opacity-20 grayscale' : 'hover:bg-[#35373C]'}`}>
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center text-white text-xs font-bold overflow-hidden">
              {m.user?.avatarUrl ? <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" /> : m.user?.displayName?.charAt(0).toUpperCase()}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[3px] border-discord-dark-2 ${STATUS_DOT[m.user?.status] || 'bg-gray-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[14px] font-medium truncate transition-colors ${m.user?.status === 'OFFLINE' ? 'text-[#949BA4]' : 'text-[#DBDEE1] group-hover:text-white'}`}
              style={topRole?.color && topRole.color !== '#99AAB5' ? { color: topRole.color } : undefined}>
              {m.user?.displayName}
            </p>
            {m.user?.customStatus?.text && (
              <p className="text-[11px] text-[#949BA4] truncate">{m.user.customStatus.emoji || ''} {m.user.customStatus.text}</p>
            )}
          </div>
        </div>
      </ContextMenu>
    );
  };

  const renderGroup = (title: string, list: any[]) => list.length === 0 ? null : (
    <div className="mb-4">
      <h4 className="text-[12px] font-bold text-[#949BA4] uppercase tracking-tight px-4 mb-2">{title} — {list.length}</h4>
      {list.map((m) => renderMember(m))}
    </div>
  );

  return (
    <>
      <div className="w-[240px] bg-discord-dark-2 flex-shrink-0 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto no-scrollbar py-6">
          {renderGroup('Online', online)}
          {renderGroup('Offline', offline)}
        </div>
      </div>
      {target && <UserProfileModal user={target.user} role={target.role} onClose={() => setTarget(null)} />}
    </>
  );
}
