import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Hash, Volume2, Video, Plus, Settings, ChevronDown, Mic, Headphones, UserPlus, FolderPlus, LogOut, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import CreateChannelModal from '@/components/modals/CreateChannelModal';
import InviteModal from '@/components/modals/InviteModal';
import ServerSettingsModal from '@/components/modals/ServerSettingsModal';
import EditChannelModal from '@/components/modals/EditChannelModal';

const ICONS: Record<string, any> = { TEXT: Hash, VOICE: Volume2, VIDEO: Video };

interface Props { server: any; activeChannelId?: string; }

export default function ChannelSidebar({ server, activeChannelId }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [createForCategory, setCreateForCategory] = useState<string | null | undefined>(undefined);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showMenu, setShowMenu] = useState(false);

  const isAdmin = server.members?.some((m: any) => m.userId === user?.id && (m.role === 'ADMIN' || server.ownerId === user?.id));
  const isOwner = server.ownerId === user?.id;
  
  const categories: any[] = (server.categories || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
  const channels: any[] = (server.channels || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
  const uncategorized = channels.filter((ch: any) => !ch.categoryId && !ch.parentMessageId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLeave = async () => {
    if (confirm('Are you sure you want to leave this server?')) {
      await api.post(`/servers/${server.id}/leave`); navigate('/'); qc.invalidateQueries({ queryKey: ['servers'] });
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to DELETE this server? This cannot be undone.')) {
      await api.delete(`/servers/${server.id}`); navigate('/'); qc.invalidateQueries({ queryKey: ['servers'] });
    }
  };

  const renderChannel = (ch: any) => {
    const Icon = ICONS[ch.type] || Hash;
    const active = activeChannelId === ch.id;
    
    return (
      <div key={ch.id} className="group relative">
        <button
          className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors mb-[2px] ${active ? 'bg-[#3F4147] text-white' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]'}`}
          onClick={() => navigate(`/servers/${server.id}/channels/${ch.id}`)}>
          <Icon size={20} className="opacity-70 group-hover:opacity-100" />
          <span className="truncate flex-1 text-left">{ch.name}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <UserPlus size={14} className="hover:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowInvite(true); }} />
            {isAdmin && <Settings size={14} className="hover:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); setEditingChannel(ch); }} />}
          </div>
        </button>
      </div>
    );
  };

  const renderCategory = (cat: any) => {
    const catChannels = channels.filter((ch: any) => ch.categoryId === cat.id && !ch.parentMessageId);
    const isCollapsed = collapsed[cat.id];
    
    return (
      <div key={cat.id} className="mt-4">
        <div className="flex items-center gap-1 px-1 py-1 cursor-pointer select-none group"
          onClick={() => setCollapsed(p => ({ ...p, [cat.id]: !p[cat.id] }))}>
          <ChevronDown size={12} className={`text-[#949BA4] transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
          <span className="text-[12px] font-bold text-[#949BA4] uppercase tracking-tight flex-1 group-hover:text-[#DBDEE1]">{cat.name}</span>
          {isAdmin && (
            <Plus 
              size={14} 
              className="text-[#949BA4] hover:text-[#DBDEE1] transition-colors" 
              onClick={(e) => { e.stopPropagation(); setCreateForCategory(cat.id); }} 
            />
          )}
        </div>
        <div className="mt-0.5">
          {!isCollapsed && catChannels.map(renderChannel)}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full bg-discord-dark-2 w-[240px] flex-shrink-0 relative">
        {/* Server header */}
        <button 
          className={`h-12 px-4 flex items-center justify-between border-b border-[#1E1F22] shadow-sm transition-colors flex-shrink-0 ${showMenu ? 'bg-[#3F4147]' : 'hover:bg-[#35373C]'}`}
          onClick={() => setShowMenu(!showMenu)}
        >
          <h1 className="font-bold text-white truncate text-[15px]">{server?.name || 'Server'}</h1>
          <ChevronDown size={18} className={`text-[#DBDEE1] transition-transform ${showMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* Header Dropdown Menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div 
              ref={dropdownRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-[52px] left-2 right-2 bg-[#111214] rounded-md shadow-2xl z-[100] p-2 border border-black/20"
            >
              <button 
                onClick={() => { setShowMenu(false); setShowInvite(true); }}
                className="w-full flex items-center justify-between px-2 py-2 rounded-sm text-[#949BA4] hover:bg-discord-blurple hover:text-white transition-colors text-[14px] font-medium group"
              >
                Invite People <UserPlus size={16} className="text-discord-blurple group-hover:text-white" />
              </button>
              
              {isAdmin && (
                <>
                  <button 
                    onClick={() => { setShowMenu(false); setShowSettings(true); }}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-sm text-[#949BA4] hover:bg-discord-blurple hover:text-white transition-colors text-[14px] font-medium group"
                  >
                    Server Settings <Settings size={16} />
                  </button>
                  <button 
                    onClick={() => { setShowMenu(false); setCreateForCategory(null); }}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-sm text-[#949BA4] hover:bg-discord-blurple hover:text-white transition-colors text-[14px] font-medium group"
                  >
                    Create Channel <Plus size={16} />
                  </button>
                  <button 
                    className="w-full flex items-center justify-between px-2 py-2 rounded-sm text-[#949BA4] hover:bg-discord-blurple hover:text-white transition-colors text-[14px] font-medium group"
                  >
                    Create Category <FolderPlus size={16} />
                  </button>
                </>
              )}
              
              <div className="h-[1px] bg-[#3F4147] my-1" />
              
              {isOwner ? (
                <button 
                  onClick={() => { setShowMenu(false); handleDelete(); }}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-sm text-[#f23f43] hover:bg-[#f23f43] hover:text-white transition-colors text-[14px] font-medium group"
                >
                  Delete Server <Trash2 size={16} />
                </button>
              ) : (
                <button 
                  onClick={() => { setShowMenu(false); handleLeave(); }}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-sm text-[#f23f43] hover:bg-[#f23f43] hover:text-white transition-colors text-[14px] font-medium group"
                >
                  Leave Server <LogOut size={16} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-3 px-2">
          {uncategorized.length > 0 && (
            <div className="space-y-0.5">
              {uncategorized.map(renderChannel)}
            </div>
          )}
          
          <div className="space-y-1">
            {categories.map(renderCategory)}
          </div>
        </div>

        {/* User Panel */}
        <div className="px-2 h-14 bg-discord-dark-4 flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 hover:bg-[#3F4147] p-1 pr-2 rounded-md cursor-pointer flex-1 min-w-0 group"
            onClick={() => navigate('/settings')}
          >
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-discord-blurple overflow-hidden shadow-sm">
                {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">{user?.displayName?.charAt(0).toUpperCase()}</div>}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[3px] border-discord-dark-4 ${user?.status === 'DND' ? 'bg-[#f23f43]' : user?.status === 'IDLE' ? 'bg-[#f0b232]' : 'bg-[#23a55a]'}`} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-white text-[13px] font-bold truncate leading-tight">{user?.displayName}</span>
              <span className="text-[#949BA4] text-[11px] truncate leading-tight group-hover:text-[#DBDEE1]">
                {user?.status === 'DND' ? 'Do Not Disturb' : user?.status === 'IDLE' ? 'Idle' : 'Online'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#3F4147] text-[#DBDEE1] transition-colors" title="Mute"><Mic size={18} /></button>
            <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#3F4147] text-[#DBDEE1] transition-colors" title="Deafen"><Headphones size={18} /></button>
            <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#3F4147] text-[#DBDEE1] transition-colors" onClick={() => navigate('/settings')} title="User Settings"><Settings size={18} /></button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {createForCategory !== undefined && (
          <CreateChannelModal serverId={server.id} categoryId={createForCategory} onClose={() => setCreateForCategory(undefined)} />
        )}
        {showInvite && <InviteModal server={server} onClose={() => setShowInvite(false)} />}
        {showSettings && <ServerSettingsModal server={server} onClose={() => setShowSettings(false)} />}
        {editingChannel && <EditChannelModal channel={editingChannel} serverId={server.id} onClose={() => setEditingChannel(null)} />}
      </AnimatePresence>
    </>
  );
}
