import { X, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

const ST: Record<string, { label: string; color: string }> = {
  ONLINE: { label: 'Online', color: 'bg-[#23a55a]' }, 
  IDLE: { label: 'Idle', color: 'bg-[#f0b232]' },
  DND: { label: 'Do Not Disturb', color: 'bg-[#f23f43]' }, 
  OFFLINE: { label: 'Offline', color: 'bg-[#80848e]' },
};

export default function UserProfileModal({ user, role, onClose }: { user: any; role?: string; onClose: () => void }) {
  const navigate = useNavigate();
  if (!user) return null;
  const s = ST[user.status] || ST.OFFLINE;

  const startDM = async () => {
    const res = await api.post('/conversations', { userId: user.id });
    onClose(); navigate(`/dm/${res.data.id}`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#111214] rounded-lg w-full max-w-[340px] shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
        {/* Banner */}
        <div className="h-24 bg-discord-blurple relative" />
        
        {/* Close button */}
        <button onClick={onClose} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white/70 hover:text-white transition-colors z-20">
          <X size={18} />
        </button>

        <div className="px-4 pb-4 relative">
          {/* Avatar Area */}
          <div className="relative -mt-[46px] mb-3">
            <div className="w-[94px] h-[94px] rounded-full bg-[#111214] p-[6px]">
              <div className="w-full h-full rounded-full bg-discord-blurple flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : user.displayName?.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className={`absolute bottom-2 right-1 w-6 h-6 rounded-full border-[6px] border-[#111214] ${s.color}`} />
          </div>

          <div className="bg-[#1E1F22] rounded-lg p-4 mb-4">
            <h3 className="text-xl font-bold text-white leading-tight">{user.displayName}</h3>
            <p className="text-sm text-[#B5BAC1] font-medium mb-2">@{user.username}</p>
            
            {user.customStatus?.text && (
              <div className="text-[14px] text-white my-3 flex items-center gap-1.5 font-medium">
                {user.customStatus.emoji} {user.customStatus.text}
              </div>
            )}

            <div className="h-[1px] bg-[#3F4147] w-full my-4" />

            <div className="space-y-4">
              {user.bio && (
                <div>
                  <p className="text-[11px] font-bold text-white uppercase mb-1">About Me</p>
                  <p className="text-[14px] text-[#DBDEE1] whitespace-pre-wrap">{user.bio}</p>
                </div>
              )}
              
              {role && role !== 'GUEST' && (
                <div>
                  <p className="text-[11px] font-bold text-white uppercase mb-1">Roles</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 rounded-sm bg-[#35373C] text-[12px] text-white flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-discord-blurple" />
                      {role}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <input 
              placeholder={`Message @${user.displayName}`} 
              className="w-full bg-[#111214] text-[14px] px-3 py-2.5 rounded-md border-none text-[#DBDEE1] focus:outline-none placeholder:text-[#949BA4]"
              onKeyDown={e => e.key === 'Enter' && startDM()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
