import { useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';

export default function InviteModal({ server, onClose }: { server: any; onClose: () => void }) {
  const [code, setCode] = useState(server.inviteCode);
  const [copied, setCopied] = useState(false);
  const [regen, setRegen] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerate = async () => {
    setRegen(true);
    try {
      const r = await api.post(`/servers/${server.id}/invite`);
      setCode(r.data.inviteCode);
    } catch {}
    setRegen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#313338] rounded-lg w-full max-w-[440px] shadow-2xl relative overflow-hidden flex flex-col pt-4" 
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 pb-4">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-white text-base font-bold uppercase leading-tight">Invite friends to {server.name}</h2>
            <button onClick={onClose} className="text-[#B5BAC1] hover:text-[#DBDEE1]">
              <X size={20} />
            </button>
          </div>
          
          <p className="text-[#B5BAC1] text-[15px] mb-4"># {server.channels?.[0]?.name || 'general'}</p>

          <label className="text-[12px] font-bold text-[#B5BAC1] uppercase mb-2 block">Send a server invite link to a friend</label>
          <div className="bg-[#1E1F22] rounded-md p-1 flex items-center gap-2 mb-2">
            <input 
              value={code} 
              readOnly 
              className="bg-transparent flex-1 px-2 py-1.5 text-white text-[15px] focus:outline-none" 
            />
            <button 
              onClick={copy} 
              className={`px-4 py-1.5 min-w-[72px] rounded-[3px] text-white text-[14px] font-medium transition-colors ${copied ? 'bg-[#23a55a]' : 'bg-discord-blurple hover:bg-[#4752c4]'}`}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <button 
            onClick={regenerate} 
            disabled={regen} 
            className="text-[12px] text-discord-blurple hover:underline flex items-center gap-1 mt-1 mb-2 font-medium"
          >
            {regen ? 'Generating...' : 'Edit invite link'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
