import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Upload, ShieldX, Palette, User, Shield, Image as ImageIcon } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';

const STATUSES = [
  { value: 'ONLINE', label: 'Online', color: 'bg-[#23a55a]' },
  { value: 'IDLE', label: 'Idle', color: 'bg-[#f0b232]' },
  { value: 'DND', label: 'Do Not Disturb', color: 'bg-[#f23f43]' },
  { value: 'OFFLINE', label: 'Invisible', color: 'bg-[#80848e]' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const removeBlockedId = useAuthStore((s) => s.removeBlockedId);
  
  const { activeThemeId, setTheme, addCustomTheme, customThemes } = useThemeStore();
  
  const [tab, setTab] = useState<'account' | 'blocking' | 'appearance'>('account');
  
  // Profile state
  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [status, setStatus] = useState(user?.status || 'ONLINE');
  const [curPw, setCurPw] = useState(''); const [newPw, setNewPw] = useState(''); const [confPw, setConfPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [saving, setSaving] = useState(false);

  // New Theme State
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeBg, setNewThemeBg] = useState('');

  const { data: blocked = [] } = useQuery({
    queryKey: ['blocked'],
    queryFn: async () => (await api.get('/auth/blocked')).data,
    enabled: tab === 'blocking'
  });

  const inp = 'w-full px-4 py-3 rounded-md bg-[#1E1F22] border-none text-[#DBDEE1] placeholder:text-[#949BA4] focus:outline-none transition-all text-sm';
  const lbl = 'block text-xs font-bold text-[#B5BAC1] uppercase tracking-wider mb-2';

  const saveProfile = async () => {
    setSaving(true); setErr(''); setMsg('');
    try { const res = await api.patch('/auth/profile', { username, displayName, email, avatarUrl: avatarUrl || null, bio }); updateUser(res.data); setMsg('Saved profile changes!'); }
    catch (e: any) { setErr(e.response?.data?.error || 'Failed to update profile'); }
    setSaving(false); setTimeout(() => { setMsg(''); setErr(''); }, 3000);
  };

  const createTheme = () => {
    if (!newThemeName.trim()) return;
    addCustomTheme({
      id: Math.random().toString(36).substr(2, 9),
      name: newThemeName,
      backgroundImage: newThemeBg || undefined,
      backgroundOpacity: 0.4,
      backgroundBlur: 10,
      colors: {
        primary: '#5865F2',
        bgMain: '#313338',
        bgSidebar: '#2B2D31',
        bgServerList: '#1E1F22',
        textNormal: '#DBDEE1',
        textMuted: '#949BA4',
      }
    });
    setNewThemeName('');
    setNewThemeBg('');
    setMsg('Custom theme created!');
  };

  const changeStatus = async (s: string) => {
    setStatus(s);
    try { await api.patch('/auth/status', { status: s }); updateUser({ status: s }); } catch {}
  };

  const sidebarTab = (id: typeof tab, label: string, Icon: any) => (
    <button onClick={() => setTab(id)} className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[16px] transition-colors ${tab === id ? 'bg-[#3F4147] text-white font-medium' : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]'}`}>
      <Icon size={20} />
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#313338] flex overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-[218px] bg-[#2B2D31] flex flex-col items-end pr-1.5 pt-15 flex-shrink-0">
        <nav className="w-full pl-5 pt-16 pr-2 space-y-0.5">
          <p className="text-[12px] font-bold text-[#949BA4] uppercase tracking-tight px-2 mb-2">User Settings</p>
          {sidebarTab('account', 'My Account', User)}
          {sidebarTab('blocking', 'Blocking', Shield)}
          
          <div className="h-[1px] bg-[#3F4147] mx-2 my-2" />
          
          <p className="text-[12px] font-bold text-[#949BA4] uppercase tracking-tight px-2 mb-2">App Settings</p>
          {sidebarTab('appearance', 'Appearance', Palette)}
        </nav>
        
        <div className="mt-auto mb-10 text-[10px] text-[#949BA4] px-10 w-full">
          <p className="font-bold opacity-50">TEAMER v1.0.0</p>
          <p className="opacity-30">Discord Style Overhaul</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-[#313338] relative overflow-y-auto px-10 pt-16 pb-20">
        <button onClick={() => navigate(-1)}
          className="fixed top-11 right-20 w-10 h-10 rounded-full border-2 border-[#B5BAC1] flex flex-col items-center justify-center text-[#B5BAC1] hover:bg-[#3F4147] hover:text-white transition-all group z-50">
          <X size={24} />
          <span className="text-[12px] font-bold mt-1 absolute -bottom-6 group-hover:block transition-all">ESC</span>
        </button>

        <div className="max-w-[740px]">
          {(msg || err) && <div className={`mb-8 p-4 rounded-md text-sm font-bold border ${err ? 'bg-destructive/10 text-[#f23f43] border-[#f23f43]/20' : 'bg-[#23a55a]/10 text-[#23a55a] border-[#23a55a]/20'}`}>{err || msg}</div>}

          <AnimatePresence mode="wait">
            {tab === 'account' && (
              <motion.div key="account" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <h2 className="text-[20px] font-bold text-white mb-6">My Account</h2>
                
                <section className="bg-[#1E1F22] rounded-lg p-4 mb-6">
                  {/* Banner placeholder */}
                  <div className="h-24 bg-discord-blurple rounded-t-lg -mx-4 -mt-4 mb-16 relative">
                    <div className="absolute -bottom-10 left-4 w-20 h-20 rounded-full bg-[#1E1F22] p-1.5 overflow-hidden">
                      <div className="w-full h-full rounded-full bg-discord-dark-1 overflow-hidden">
                        {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">{displayName?.charAt(0).toUpperCase()}</div>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-[20px] font-bold text-white leading-tight">{displayName}</h3>
                      <p className="text-[#B5BAC1] text-sm">{username}</p>
                    </div>
                    <button className="bg-discord-blurple hover:bg-[#4752C4] text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors">Edit User Profile</button>
                  </div>

                  <div className="bg-[#2B2D31] rounded-md p-4 space-y-4">
                    <div className="flex justify-between items-center group">
                      <div><label className={lbl}>Display Name</label><p className="text-white">{displayName}</p></div>
                      <button className="text-[#00A8FC] text-sm hover:underline" onClick={() => setDisplayName(prompt('New Display Name', displayName) || displayName)}>Edit</button>
                    </div>
                    <div className="flex justify-between items-center group">
                      <div><label className={lbl}>Username</label><p className="text-white">{username}</p></div>
                      <button className="text-[#00A8FC] text-sm hover:underline">Edit</button>
                    </div>
                    <div className="flex justify-between items-center group">
                      <div><label className={lbl}>Email</label><p className="text-white">{email.replace(/(.{3}).*(@.*)/, '$1***$2')}</p></div>
                      <button className="text-[#00A8FC] text-sm hover:underline">Edit</button>
                    </div>
                  </div>
                </section>

                <h3 className={lbl}>User Status</h3>
                <div className="flex gap-2 flex-wrap mb-8">
                  {STATUSES.map(s => (
                    <button key={s.value} onClick={() => changeStatus(s.value)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border ${status === s.value ? 'bg-[#3F4147] text-white border-transparent' : 'bg-[#1E1F22] text-[#B5BAC1] border-transparent hover:bg-[#35373C]'}`}>
                      <div className={`w-3 h-3 rounded-full ${s.color}`} />{s.label}
                    </button>
                  ))}
                </div>
                
                <button onClick={saveProfile} className="bg-discord-blurple hover:bg-[#4752C4] text-white px-8 py-2.5 rounded-md font-medium transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </motion.div>
            )}

            {tab === 'appearance' && (
              <motion.div key="appearance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <h2 className="text-[20px] font-bold text-white mb-6">Appearance</h2>
                
                <section className="mb-8">
                  <h3 className={lbl}>Theme</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setTheme('dark')} className={`flex flex-col gap-3 p-4 rounded-md border-2 transition-all ${activeThemeId === 'dark' ? 'border-discord-blurple bg-[#1E1F22]' : 'border-transparent bg-[#1E1F22] hover:bg-[#2B2D31]'}`}>
                      <div className="h-20 bg-[#313338] rounded-md flex">
                        <div className="w-8 bg-[#1E1F22] rounded-l-md" />
                        <div className="w-12 bg-[#2B2D31]" />
                      </div>
                      <div className="flex items-center gap-2 text-white font-medium">
                        <div className={`w-5 h-5 rounded-full border-2 ${activeThemeId === 'dark' ? 'border-discord-blurple bg-discord-blurple' : 'border-[#B5BAC1]'}`} />
                        Dark
                      </div>
                    </button>
                    <button onClick={() => setTheme('light')} className={`flex flex-col gap-3 p-4 rounded-md border-2 transition-all ${activeThemeId === 'light' ? 'border-discord-blurple bg-white shadow-lg' : 'border-transparent bg-white/10 hover:bg-white/20'}`}>
                      <div className="h-20 bg-white rounded-md flex border border-gray-100">
                        <div className="w-8 bg-[#E3E5E8] rounded-l-md" />
                        <div className="w-12 bg-[#F2F3F5]" />
                      </div>
                      <div className="flex items-center gap-2 text-white font-medium">
                        <div className={`w-5 h-5 rounded-full border-2 ${activeThemeId === 'light' ? 'border-discord-blurple bg-discord-blurple' : 'border-[#B5BAC1]'}`} />
                        Light
                      </div>
                    </button>
                  </div>
                </section>

                <section className="bg-[#2B2D31] rounded-lg p-6 border border-[#3F4147]">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2 italic">
                    <ImageIcon size={18} className="text-discord-blurple" /> Create Custom Theme
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className={lbl}>Theme Name</label>
                      <input value={newThemeName} onChange={e => setNewThemeName(e.target.value)} placeholder="Neon Nights, Ocean Breeze..." className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Background Image URL</label>
                      <input value={newThemeBg} onChange={e => setNewThemeBg(e.target.value)} placeholder="https://unsplash.com/..." className={inp} />
                    </div>
                    <button onClick={createTheme} className="w-full bg-[#23a55a] hover:bg-[#1a7a42] text-white py-2.5 rounded-md font-bold transition-colors">
                      Unleash Custom Theme
                    </button>
                  </div>
                </section>
                
                {customThemes.length > 0 && (
                  <div className="mt-8 grid grid-cols-3 gap-4">
                    {customThemes.map(t => (
                      <button key={t.id} onClick={() => setTheme(t.id)} className={`h-24 rounded-lg bg-cover bg-center border-2 transition-all relative overflow-hidden ${activeThemeId === t.id ? 'border-discord-blurple scale-105' : 'border-transparent hover:scale-105'}`} style={{ backgroundImage: t.backgroundImage ? `url(${t.backgroundImage})` : 'none', backgroundColor: t.colors.bgMain }}>
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white font-bold text-xs">{t.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {tab === 'blocking' && (
              <motion.div key="blocking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <h2 className="text-[20px] font-bold text-white mb-2">Blocked Users</h2>
                <p className="text-[#B5BAC1] text-sm mb-8">You can block people to stop them from messaging you or seeing your pulse.</p>

                <div className="space-y-2">
                  {blocked.length === 0 && (
                    <div className="text-center py-20 opacity-20">
                      <ShieldX size={80} className="mx-auto mb-4" />
                      <p className="font-bold">No blocked users.</p>
                    </div>
                  )}
                  {blocked.map((b: any) => (
                    <div key={b.id} className="p-3 bg-[#2B2D31] rounded-md flex items-center justify-between border border-[#3F4147]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-discord-dark-1 overflow-hidden">
                          {b.avatarUrl ? <img src={b.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold">{b.displayName.charAt(0).toUpperCase()}</div>}
                        </div>
                        <div>
                          <p className="text-white font-bold">{b.displayName}</p>
                          <p className="text-[#949BA4] text-[12px]">@{b.username}</p>
                        </div>
                      </div>
                      <button className="text-[#ED4245] border border-[#ED4245] hover:bg-[#ED4245] hover:text-white px-3 py-1 rounded-sm text-xs font-medium transition-all">Unblock</button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
