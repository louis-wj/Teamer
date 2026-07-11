import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '@/lib/api';

export default function JoinServerModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault(); if (!code.trim()) return; setLoading(true); setError('');
    try {
      const res = await api.post(`/invite/${code.trim()}`);
      await qc.invalidateQueries({ queryKey: ['servers'] });
      onClose();
      navigate(`/servers/${res.data.id}`);
    } catch (err: any) { setError(err.response?.data?.error || 'Invalid invite link'); } setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="bg-[#313338] rounded-lg w-full max-w-[440px] shadow-2xl relative overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 flex flex-col items-center text-center">
          <h2 className="text-white text-2xl font-bold mb-2">Join a Server</h2>
          <p className="text-[#B5BAC1] text-[15px] mb-6">Enter an invite below to join an existing server.</p>
          
          <form onSubmit={handleJoin} className="w-full text-left">
            <label className="text-xs font-bold text-[#B5BAC1] uppercase mb-2 block">Invite Link *</label>
            <input 
              value={code} 
              onChange={e => setCode(e.target.value)} 
              className="w-full h-10 px-3 rounded-sm bg-[#1E1F22] text-white focus:outline-none mb-2 border-none" 
              placeholder="h782G9S" 
              autoFocus 
            />
            {error && <p className="text-[#f23f43] text-xs font-medium mb-4">{error}</p>}
            
            <p className="text-[#B5BAC1] text-xs font-bold uppercase mt-4 mb-2">Invites should look like</p>
            <p className="text-[#949BA4] text-xs mb-8 font-medium">h782G9S</p>
          </form>
        </div>

        <div className="flex justify-between items-center bg-[#2B2D31] p-4 px-6">
          <button 
            type="button" 
            onClick={onClose} 
            className="text-white text-[14px] hover:underline"
          >
            Back
          </button>
          <button 
            onClick={handleJoin}
            disabled={loading || !code.trim()} 
            className="bg-discord-blurple hover:bg-[#4752c4] text-white px-7 py-2.5 rounded-[3px] text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join Server'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
