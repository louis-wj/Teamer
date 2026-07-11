import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';

export default function CreateServerModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!name.trim()) return; setLoading(true); setError('');
    try {
      await api.post('/servers', { name: name.trim(), isPublic: true });
      await qc.invalidateQueries({ queryKey: ['servers'] });
      onClose();
    } catch (err: any) { setError(err.response?.data?.error || 'Failed to create server'); } setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg w-full max-w-[440px] shadow-2xl relative overflow-hidden flex flex-col pt-6" 
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[#4E5058] hover:text-[#2E3338]">
          <X size={24} />
        </button>

        <div className="px-6 pb-6 flex flex-col items-center text-center">
          <h2 className="text-[#060607] text-2xl font-bold mb-2">Customize your server</h2>
          <p className="text-[#4E5058] text-[15px] mb-6 leading-tight">Give your new server a personality with a name and an icon. You can always change it later.</p>

          <form onSubmit={handleCreate} className="w-full text-left">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#4E5058]/30 flex flex-col items-center justify-center text-[#4E5058] cursor-pointer hover:border-discord-blurple hover:text-discord-blurple transition-colors relative group">
                <Camera size={24} />
                <span className="text-[10px] font-bold uppercase mt-1">Upload</span>
                <div className="absolute -top-1 -right-1 bg-discord-blurple text-white rounded-full p-1 opacity-100">
                  <Plus size={16} />
                </div>
              </div>
            </div>

            <label className="text-xs font-bold text-[#4E5058] uppercase mb-2 block">Server Name</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full h-10 px-3 rounded-sm bg-[#E3E5E8] text-[#060607] focus:outline-none mb-2 border-none font-medium" 
              placeholder={`${name ? '' : "User"}'s server`}
              autoFocus 
            />
            {error && <p className="text-[#f23f43] text-xs font-medium mb-4">{error}</p>}

            <p className="text-[#4E5058] text-[12px] leading-tight mt-2 italic">
              By creating a server, you agree to the Community Guidelines.
            </p>
          </form>
        </div>

        <div className="flex justify-between items-center bg-[#F2F3F5] p-4 px-6 mt-4">
          <button 
            type="button" 
            onClick={onClose} 
            className="text-[#060607] text-[14px] font-medium hover:underline"
          >
            Back
          </button>
          <button 
            onClick={handleCreate}
            disabled={loading || !name.trim()} 
            className="bg-discord-blurple hover:bg-[#4752c4] text-white px-7 py-2.5 rounded-[3px] text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const Plus = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
