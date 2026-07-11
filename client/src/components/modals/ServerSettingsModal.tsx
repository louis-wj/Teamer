import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Crown, Trash2, Plus, Shield, Upload, Tag, UserX, Settings, Users, Ban, Link, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

const TABS = [
  { id: 'overview', label: 'Overview', icon: <Settings size={16} /> },
  { id: 'members', label: 'Members', icon: <Users size={16} /> },
  { id: 'roles', label: 'Roles', icon: <Shield size={16} /> },
  { id: 'invites', label: 'Invites', icon: <Link size={16} /> },
  { id: 'bans', label: 'Bans', icon: <Ban size={16} /> },
  { id: 'audit', label: 'Audit Log', icon: <Activity size={16} /> }
] as const;

type Tab = typeof TABS[number]['id'];

const PERMISSIONS = [
  { bit: 1 << 0, name: 'VIEW_CHANNELS', label: 'View Channels', desc: 'Allows members to view channels by default.' },
  { bit: 1 << 1, name: 'SEND_MESSAGES', label: 'Send Messages', desc: 'Allows members to send messages in channels.' },
  { bit: 1 << 2, name: 'MANAGE_MESSAGES', label: 'Manage Messages', desc: 'Allows members to delete messages by others.' },
  { bit: 1 << 3, name: 'MANAGE_CHANNELS', label: 'Manage Channels', desc: 'Allows members to create, edit, or delete channels.' },
  { bit: 1 << 4, name: 'MANAGE_SERVER', label: 'Manage Server', desc: 'Allows members to change the server\'s name or icon.' },
  { bit: 1 << 5, name: 'KICK_MEMBERS', label: 'Kick Members', desc: 'Allows members to remove other members from the server.' },
  { bit: 1 << 6, name: 'BAN_MEMBERS', label: 'Ban Members', desc: 'Allows members to permanently ban other members.' },
  { bit: 1 << 7, name: 'MANAGE_ROLES', label: 'Manage Roles', desc: 'Allows members to create new roles and edit existing ones.' },
  { bit: 1 << 8, name: 'ADMINISTRATOR', label: 'Administrator', desc: 'Members with this permission have every permission and also bypass channel-specific overrides.' },
];

export default function ServerSettingsModal({ server, onClose }: { server: any; onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const isOwner = server.ownerId === userId;
  const [tab, setTab] = useState<Tab>('overview');
  const [name, setName] = useState(server.name);
  const [imageUrl, setImageUrl] = useState(server.imageUrl || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#5865F2');

  const { data: bans = [] } = useQuery({ queryKey: ['bans', server.id], queryFn: async () => (await api.get(`/servers/${server.id}/bans`)).data, enabled: tab === 'bans' });
  const { data: invites = [] } = useQuery({ queryKey: ['invites', server.id], queryFn: async () => (await api.get(`/servers/${server.id}/invites`)).data, enabled: tab === 'invites' });
  const { data: auditLog = [] } = useQuery({ queryKey: ['audit', server.id], queryFn: async () => (await api.get(`/servers/${server.id}/audit-log`)).data, enabled: tab === 'audit' });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['server', server.id] }); qc.invalidateQueries({ queryKey: ['servers'] }); };

  const save = async () => { setSaving(true); try { await api.patch(`/servers/${server.id}`, { name: name.trim(), imageUrl: imageUrl || null }); refresh(); onClose(); } catch (e: any) { setErr(e.response?.data?.error || 'Failed to save'); } setSaving(false); };
  const deleteServer = async () => { if (confirmDelete !== server.name) return; await api.delete(`/servers/${server.id}`); refresh(); onClose(); navigate('/'); };
  const createRole = async () => { if (!newRoleName.trim()) return; await api.post(`/servers/${server.id}/roles`, { name: newRoleName.trim(), color: newRoleColor }); refresh(); setNewRoleName(''); };
  const deleteRole = async (rid: string) => { await api.delete(`/servers/${server.id}/roles/${rid}`); refresh(); };
  const changeRole = async (mid: string, role: string) => { await api.patch(`/servers/${server.id}/members/${mid}`, { role }); refresh(); };
  const kick = async (mid: string) => { await api.delete(`/servers/${server.id}/members/${mid}`); refresh(); };
  const ban = async (uid: string) => { await api.post(`/servers/${server.id}/bans`, { userId: uid }); refresh(); qc.invalidateQueries({ queryKey: ['bans', server.id] }); };
  const unban = async (bid: string) => { await api.delete(`/servers/${server.id}/bans/${bid}`); qc.invalidateQueries({ queryKey: ['bans', server.id] }); };
  const deleteInvite = async (code: string) => { await api.delete(`/invites/${code}`); qc.invalidateQueries({ queryKey: ['invites', server.id] }); };
  const updateRolePerms = async (rid: string, perms: number) => { await api.patch(`/servers/${server.id}/roles/${rid}`, { permissions: perms }); refresh(); };
  const assignRole = async (memberId: string, roleId: string) => { await api.post(`/servers/${server.id}/members/${memberId}/roles/${roleId}`); refresh(); };
  const removeRole = async (memberId: string, roleId: string) => { await api.delete(`/servers/${server.id}/members/${memberId}/roles/${roleId}`); refresh(); };

  const serverRoles = (server.roles || []).filter((r: any) => !r.isDefault);

  return (
    <div className="fixed inset-0 bg-[#313338] z-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-[218px] bg-[#2B2D31] flex flex-col pt-[60px] pb-5 items-end flex-shrink-0">
        <div className="w-full px-1.5 space-y-[2px]">
          <div className="px-2.5 mb-2 text-[12px] font-bold text-[#949BA4] uppercase leading-tight tracking-tight">Server Settings</div>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} 
              className={`w-[190px] text-left px-2.5 py-1.5 rounded-sm text-[16px] font-medium transition-colors ${tab === t.id ? 'bg-[#3F4147] text-white' : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]'}`}>
              {t.label}
            </button>
          ))}
          <div className="h-[1px] bg-[#3F4147] mx-2.5 my-2" />
          {isOwner && (
            <button 
              onClick={() => { if(confirm(`Delete ${server.name}?`)) deleteServer(); }}
              className="w-[190px] text-left px-2.5 py-1.5 rounded-sm text-[16px] font-medium text-[#f23f43] hover:bg-[#f23f43] hover:text-white transition-colors flex items-center justify-between group"
            >
              Delete Server <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-[#313338] flex justify-center relative overflow-y-auto no-scrollbar pt-[60px] pb-[80px]">
        <button onClick={onClose} className="fixed right-[40px] top-[60px] flex flex-col items-center gap-1 group">
          <div className="w-9 h-9 rounded-full border-2 border-[#B5BAC1] flex items-center justify-center text-[#B5BAC1] group-hover:bg-[#3F4147] group-hover:text-white transition-all">
            <X size={18} />
          </div>
          <span className="text-[13px] font-bold text-[#B5BAC1] uppercase">Esc</span>
        </button>

        <div className="w-full max-w-[740px] px-10">
          {err && <div className="mb-6 p-4 rounded bg-[#f23f43]/10 border border-[#f23f43]/20 text-[#f23f43] text-sm font-medium">{err}</div>}

          {tab === 'overview' && (
            <div className="space-y-10">
              <h2 className="text-white text-xl font-bold">Server Overview</h2>
              <div className="flex gap-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-[100px] h-[100px] rounded-full bg-[#3F4147] flex items-center justify-center text-white text-2xl font-bold relative group overflow-hidden">
                    {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : server.name.charAt(0)}
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Upload size={24} />
                      <span className="text-[10px] uppercase font-bold mt-1">Change Icon</span>
                    </div>
                  </div>
                  <button className="text-[#B5BAC1] text-xs hover:underline">Remove</button>
                </div>
                <div className="flex-1 space-y-6">
                  <div>
                    <label className="text-xs font-bold text-[#B5BAC1] uppercase mb-2 block">Server Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#1E1F22] text-white rounded-sm h-10 px-3 focus:outline-none" />
                  </div>
                  <div className="pt-4 flex gap-4">
                    <button onClick={save} disabled={saving} className="bg-discord-blurple hover:bg-[#4752c4] text-white px-7 py-2.5 rounded-[3px] text-sm font-medium transition-colors disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button onClick={() => { setName(server.name); setImageUrl(server.imageUrl || ''); }} className="text-white text-sm hover:underline">Reset</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'members' && (
            <div className="space-y-6">
              <h2 className="text-white text-xl font-bold">Server Members</h2>
              <div className="space-y-[1px]">
                {server.members?.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded hover:bg-[#35373C] transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {m.user?.avatarUrl ? <img src={m.user.avatarUrl} className="w-full h-full object-cover rounded-full" /> : m.user?.displayName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{m.user?.displayName}</span>
                        {m.userId === server.ownerId && <Crown size={14} className="text-[#f0b232]" />}
                      </div>
                      <span className="text-xs text-[#949BA4] truncate">@{m.user?.username}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => kick(m.id)} className="w-8 h-8 flex items-center justify-center text-[#B5BAC1] hover:text-[#f23f43] transition-colors opacity-0 group-hover:opacity-100"><UserX size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other tabs follow same pattern ... */}
          {tab === 'roles' && (
            <div className="space-y-6">
              <h2 className="text-white text-xl font-bold">Server Roles</h2>
              <button onClick={createRole} className="bg-discord-blurple hover:bg-[#4752c4] text-white px-4 py-2 rounded-[3px] text-sm font-medium transition-colors flex items-center gap-2">
                <Plus size={16} /> Create Role
              </button>
              <div className="grid grid-cols-1 gap-4 mt-6">
                {server.roles?.map((r: any) => (
                  <div key={r.id} className="bg-[#2B2D31] p-4 rounded-md border border-transparent hover:border-[#3F4147] transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: r.color }} />
                        <span className="text-sm font-medium text-white">{r.name}</span>
                      </div>
                      {!r.isDefault && <button onClick={() => deleteRole(r.id)} className="text-[#B5BAC1] hover:text-[#f23f43]"><Trash2 size={16} /></button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'invites' && (
            <div className="space-y-6">
              <h2 className="text-white text-xl font-bold">Active Invites</h2>
              <div className="space-y-2">
                {invites.map((inv: any) => (
                  <div key={inv.code} className="bg-[#2B2D31] p-4 rounded-md flex justify-between items-center group">
                    <div>
                      <p className="text-discord-blurple font-bold text-sm tracking-tight">{inv.code}</p>
                      <p className="text-xs text-[#949BA4]">Used {inv.uses || 0} times</p>
                    </div>
                    <button onClick={() => deleteInvite(inv.code)} className="text-[#f23f43] opacity-0 group-hover:opacity-100 hover:scale-110 transition-all"><X size={20} /></button>
                  </div>
                ))}
                {invites.length === 0 && <p className="text-[#949BA4] text-sm italic">No active invite links.</p>}
              </div>
            </div>
          )}

          {tab === 'bans' && (
            <div className="space-y-6">
              <h2 className="text-white text-xl font-bold">Server Bans</h2>
              <div className="space-y-2">
                {bans.map((b: any) => (
                  <div key={b.id} className="bg-[#2B2D31] p-4 rounded-md flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#f23f43]/10 flex items-center justify-center text-[#f23f43] font-bold">!</div>
                      <span className="text-white text-sm font-medium">{b.user?.user?.displayName}</span>
                    </div>
                    <button onClick={() => unban(b.id)} className="text-xs font-bold text-discord-blurple hover:underline">Revoke Ban</button>
                  </div>
                ))}
                {bans.length === 0 && <p className="text-[#949BA4] text-sm italic">No banned members.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
