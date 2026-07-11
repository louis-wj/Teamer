import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Hash, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';

interface Props { serverId: string; categoryId?: string | null; onClose: () => void; }

export default function CreateChannelModal({ serverId, categoryId, onClose }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState('TEXT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!name.trim()) return; setLoading(true); setError('');
    try {
      await api.post(`/servers/${serverId}/channels`, { name: name.trim(), type, categoryId: categoryId || null });
      await qc.invalidateQueries({ queryKey: ['server', serverId] });
      await qc.invalidateQueries({ queryKey: ['servers'] });
      onClose();
    } catch (err: any) { setError(err.response?.data?.error || 'Failed to create channel'); } setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#313338] rounded-lg w-full max-w-[440px] shadow-2xl relative overflow-hidden flex flex-col pt-6" 
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[#B5BAC1] hover:text-[#DBDEE1]">
          <X size={24} />
        </button>

        <div className="px-6 pb-2">
          <h2 className="text-white text-2xl font-bold mb-2">Create Channel</h2>
          {categoryId && <p className="text-[#B5BAC1] text-xs font-medium mb-4 italic">in Text Channels</p>}
          
          <form onSubmit={handleCreate} className="w-full text-left">
            <label className="text-xs font-bold text-[#B5BAC1] uppercase mb-2 block">Channel Type</label>
            <div className="space-y-2 mb-6">
              {[
                { id: 'TEXT', label: 'Text', desc: 'Send messages, images, GIFS, emoji, and opinions.', icon: <Hash size={24} /> },
                { id: 'VOICE', label: 'Voice', desc: 'Hang out with voice, video, and screen share.', icon: <Volume2 size={24} /> }
              ].map(t => (
                <button 
                  key={t.id} 
                  type="button" 
                  onClick={() => setType(t.id)} 
                  className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors ${type === t.id ? 'bg-[#3F4147] text-white' : 'bg-[#2B2D31] text-[#B5BAC1] hover:bg-[#35373C]'}`}
                >
                  <div className="text-[#B5BAC1]">{t.icon}</div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm tracking-tight">{t.label}</p>
                    <p className="text-xs text-[#949BA4] font-medium leading-tight">{t.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 border-[#949BA4] flex items-center justify-center ${type === t.id ? 'bg-discord-blurple border-discord-blurple shadow-sm' : ''}`}>
                    {type === t.id && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
            </div>

            <label className="text-xs font-bold text-[#B5BAC1] uppercase mb-2 block">Channel Name</label>
            <div className="relative mb-6">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-[#949BA4]" size={16} />
              <input 
                value={name} 
                onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
                className="w-full h-10 pl-9 pr-3 rounded-sm bg-[#1E1F22] text-white focus:outline-none border-none font-medium" 
                placeholder="new-channel" 
                autoFocus 
              />
            </div>
            {error && <p className="text-[#f23f43] text-xs font-medium mb-4">{error}</p>}
          </form>
        </div>

        <div className="flex justify-between items-center bg-[#2B2D31] p-4 px-6 mt-2">
          <button 
            type="button" 
            onClick={onClose} 
            className="text-white text-[14px] font-medium hover:underline"
          >
            Cancel
          </button>
          <button 
            onClick={handleCreate}
            disabled={loading || !name.trim()} 
            className="bg-discord-blurple hover:bg-[#4752c4] text-white px-7 py-2.5 rounded-[3px] text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Channel'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
