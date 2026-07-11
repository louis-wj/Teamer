import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageCircle, UserPlus, Check, X, Search, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import AppLayout from '@/components/layout/AppLayout';

type Tab = 'friends' | 'online' | 'pending' | 'dms';

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('online');
  const [addUsername, setAddUsername] = useState('');
  const [addMsg, setAddMsg] = useState('');

  const { data: friends = [] } = useQuery({ queryKey: ['friends'], queryFn: async () => (await api.get('/friends')).data });
  const { data: pending = [] } = useQuery({ queryKey: ['friends-pending'], queryFn: async () => (await api.get('/friends/pending')).data });
  const { data: convos = [] } = useQuery({ queryKey: ['conversations'], queryFn: async () => (await api.get('/conversations')).data });

  const onlineFriends = friends.filter((f: any) => f.status !== 'OFFLINE');

  const sendRequest = async () => {
    if (!addUsername.trim()) return;
    try { await api.post('/friends/request', { username: addUsername.trim() }); setAddMsg('Request sent!'); setAddUsername(''); }
    catch (e: any) { setAddMsg(e.response?.data?.error || 'Failed'); }
    setTimeout(() => setAddMsg(''), 3000);
  };

  const accept = async (id: string) => { await api.post(`/friends/accept/${id}`); };
  const decline = async (id: string) => { await api.post(`/friends/decline/${id}`); };

  const startDM = async (userId: string) => {
    const res = await api.post('/conversations', { userId });
    navigate(`/dm/${res.data.id}`);
  };

  const STATUS_COLORS: Record<string, string> = { 
    ONLINE: 'bg-[#23a55a]', 
    IDLE: 'bg-[#f0b232]', 
    DND: 'bg-[#f23f43]', 
    OFFLINE: 'bg-[#80848e]' 
  };

  const renderUser = (u: any, actions?: React.ReactNode) => (
    <motion.div 
      key={u.id || u.friendId} 
      initial={{ opacity: 0, x: -10 }} 
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 5 }}
      className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.04] rounded-[20px] transition-all cursor-pointer group relative overflow-hidden"
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center rounded-full" />
      
      <div className="relative">
        <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-primary/80 to-blue-600/80 flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-lg selection:bg-transparent">
          {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : u.displayName?.charAt(0).toUpperCase()}
        </div>
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-[#0A0A0A] ${STATUS_COLORS[u.status] || 'bg-gray-500'}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-foreground tracking-tight">{u.displayName}</p>
        <p className="text-xs text-muted-foreground/60 font-medium truncate">{u.customStatus?.text || u.status}</p>
      </div>

      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
        {actions || (
          <motion.button 
            whileHover={{ scale: 1.1 }} 
            whileTap={{ scale: 0.9 }}
            onClick={() => startDM(u.id)} 
            className="p-2.5 rounded-2xl bg-white/[0.05] hover:bg-primary hover:text-white transition-all text-muted-foreground"
          >
            <MessageCircle size={18} />
          </motion.button>
        )}
      </div>
    </motion.div>
  );

  const tabs = [
    { id: 'online' as Tab, label: 'Online', count: onlineFriends.length },
    { id: 'friends' as Tab, label: 'All', count: friends.length },
    { id: 'pending' as Tab, label: 'Pending', count: pending.length },
    { id: 'dms' as Tab, label: 'Messages', count: convos.length },
  ];

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col glass-light rounded-tl-[40px] border-t border-l border-white/5 overflow-hidden">
        {/* Header */}
        <div className="h-16 flex items-center px-8 border-b border-white/5 gap-8 flex-shrink-0 bg-white/[0.01]">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles size={18} className="animate-pulse" />
            <span className="font-extrabold text-lg tracking-tight">The Pulse</span>
          </div>
          
          <div className="h-4 w-px bg-white/10" />

          <div className="flex gap-2 relative">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all relative z-10 ${tab === t.id ? 'text-white' : 'text-muted-foreground/60 hover:text-foreground'}`}>
                {t.label}
                {t.count > 0 && <span className="ml-2 px-1.5 py-0.5 rounded-lg bg-white/10 text-[10px] font-black">{t.count}</span>}
                {tab === t.id && (
                  <motion.div 
                    layoutId="activeTab" 
                    className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-[0_0_20px_rgba(78,114,250,0.4)]" 
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            {/* Add friend bar */}
            <div className="mb-8 p-6 rounded-[24px] bg-white/[0.02] border border-white/5 group">
              <h3 className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <UserPlus size={12} /> Add Connection
              </h3>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input value={addUsername} onChange={e => setAddUsername(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendRequest()}
                    className="w-full px-6 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-[15px] text-foreground placeholder:text-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    placeholder="Enter pulse username..." />
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02, y: -2 }} 
                  whileTap={{ scale: 0.98, y: 0 }}
                  onClick={sendRequest}
                  className="px-8 rounded-2xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                >
                  Connect
                </motion.button>
              </div>
              {addMsg && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }}
                  className={`text-xs mt-3 px-2 font-bold ${addMsg.includes('sent') ? 'text-green-400' : 'text-destructive'}`}
                >
                  {addMsg}
                </motion.p>
              )}
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {tab === 'online' && (onlineFriends.length === 0
                  ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-muted-foreground/20 italic font-bold">No connections pulsing online</motion.div>
                  : onlineFriends.map((f: any) => renderUser(f)))}

                {tab === 'friends' && (friends.length === 0
                  ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-muted-foreground/20 space-y-4">
                      <Users size={64} className="opacity-10 stroke-[1]" />
                      <p className="font-bold italic">Start your network</p>
                    </motion.div>
                  : friends.map((f: any) => renderUser(f)))}

                {tab === 'pending' && pending.map((p: any) => renderUser(p.user, (
                  <div className="flex gap-2">
                    <button onClick={() => accept(p.id)} className="p-3 rounded-2xl bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white transition-all"><Check size={18} /></button>
                    <button onClick={() => decline(p.id)} className="p-3 rounded-2xl bg-destructive/10 hover:bg-destructive text-destructive hover:text-white transition-all"><X size={18} /></button>
                  </div>
                )))}

                {tab === 'dms' && convos.map((c: any) => (
                  <motion.div key={c.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    onClick={() => navigate(`/dm/${c.id}`)}
                    className="flex items-center gap-4 px-4 py-4 hover:bg-white/[0.04] rounded-[24px] transition-all cursor-pointer border border-transparent hover:border-white/5 mb-2"
                  >
                    <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-primary/80 to-blue-600/80 flex items-center justify-center text-white font-black text-xl overflow-hidden shadow-xl">
                      {c.user?.avatarUrl ? <img src={c.user.avatarUrl} className="w-full h-full object-cover" /> : c.user?.displayName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-foreground tracking-tight">{c.user?.displayName}</p>
                      <p className="text-sm text-muted-foreground/40 font-medium truncate">{c.lastMessage?.content || 'Initial connection established.'}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

