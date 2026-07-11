import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Hash, Volume2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';

const SLOWMODE_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '2m', value: 120 },
  { label: '5m', value: 300 },
  { label: '10m', value: 600 },
  { label: '15m', value: 900 },
  { label: '30m', value: 1800 },
  { label: '1h', value: 3600 },
  { label: '2h', value: 7200 },
  { label: '6h', value: 21600 }
];

export default function EditChannelModal({ channel, serverId, onClose }: { channel: any; serverId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(channel.name);
  const [type, setType] = useState(channel.type);
  const [slowmode, setSlowmode] = useState(channel.slowmode || 0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!name.trim()) return; setLoading(true); setErr('');
    try {
      await api.patch(`/channels/${channel.id}`, { name: name.trim(), type, slowmode });
      await qc.invalidateQueries({ queryKey: ['server', serverId] });
      await qc.invalidateQueries({ queryKey: ['servers'] });
      onClose();
    } catch (e: any) { setErr(e.response?.data?.error || 'Failed to save channel'); } setLoading(false);
  };

  const del = async () => {
    if (!confirm(`Are you sure you want to delete #${channel.name}?`)) return;
    try {
      await api.delete(`/channels/${channel.id}`);
      await qc.invalidateQueries({ queryKey: ['server', serverId] });
      onClose();
    } catch (e: any) { setErr(e.response?.data?.error || 'Cannot delete channel'); }
  };

  return (
    <div className="fixed inset-0 bg-[#313338] z-50 flex overflow-hidden">
      {/* Sidebar - Placeholder to match ServerSettings style */}
      <div className="w-[218px] bg-[#2B2D31] flex flex-col pt-[60px] pb-5 items-end flex-shrink-0">
        <div className="w-full px-1.5 space-y-[2px]">
          <div className="px-2.5 mb-2 text-[12px] font-bold text-[#949BA4] uppercase leading-tight tracking-tight truncate">#{channel.name}</div>
          <button className="w-[190px] text-left px-2.5 py-1.5 rounded-sm bg-[#3F4147] text-white text-[16px] font-medium">Overview</button>
          <div className="h-[1px] bg-[#3F4147] mx-2.5 my-2" />
          {channel.name !== 'general' && (
            <button 
              onClick={del}
              className="w-[190px] text-left px-2.5 py-1.5 rounded-sm text-[16px] font-medium text-[#f23f43] hover:bg-[#f23f43] hover:text-white transition-colors flex items-center justify-between group"
            >
              Delete Channel <Trash2 size={16} />
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
          <h2 className="text-white text-xl font-bold mb-6 uppercase">Overview</h2>
          {err && <div className="mb-6 p-4 rounded bg-[#f23f43]/10 border border-[#f23f43]/20 text-[#f23f43] text-sm font-medium">{err}</div>}

          <form onSubmit={save} className="space-y-8">
            <div>
              <label className="text-xs font-bold text-[#B5BAC1] uppercase mb-2 block">Channel Name</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-[#949BA4]" size={16} />
                <input 
                  value={name} 
                  onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
                  className="w-full h-10 pl-9 pr-3 bg-[#1E1F22] text-white rounded-sm focus:outline-none border-none font-medium" 
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#3F4147]">
              <label className="text-xs font-bold text-[#B5BAC1] uppercase mb-4 block">Slowmode</label>
              <input 
                type="range" 
                min="0" 
                max="13" 
                step="1" 
                value={SLOWMODE_OPTIONS.findIndex(o => o.value === slowmode)} 
                onChange={e => setSlowmode(SLOWMODE_OPTIONS[parseInt(e.target.value)].value)} 
                className="w-full h-2 bg-[#4E5058] rounded-full appearance-none cursor-pointer accent-[#5865F2]" 
              />
              <div className="flex justify-between mt-2 text-[12px] text-[#949BA4] font-medium">
                <span>Off</span>
                <span>{SLOWMODE_OPTIONS.find(o => o.value === slowmode)?.label}</span>
                <span>6h</span>
              </div>
              <p className="mt-2 text-[#949BA4] text-sm font-medium">Members will be restricted to sending one message every time interval.</p>
            </div>

            <div className="pt-8 flex gap-4">
              <button 
                type="submit" 
                disabled={loading} 
                className="bg-discord-blurple hover:bg-[#4752c4] text-white px-7 py-2.5 rounded-[3px] text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                type="button"
                onClick={() => { setName(channel.name); setSlowmode(channel.slowmode || 0); }} 
                className="text-white text-sm hover:underline"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
