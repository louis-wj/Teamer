import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, X, MessageSquare, User, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

export default function SearchModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab ] = useState<'messages' | 'members' | 'channels'>('messages');

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', query, activeTab],
    queryFn: async () => query.length > 1 ? (await api.get(`/search?q=${query}&type=${activeTab}`)).data : null,
    enabled: query.length > 1,
    staleTime: 500,
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 pt-[10vh] px-4" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="bg-[#313338] w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[70vh]" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 bg-[#1E1F22]">
          <div className="relative">
            <input 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              className="w-full pl-4 pr-10 py-3 bg-[#111214] text-white rounded-md focus:outline-none" 
              placeholder="Search..." 
              autoFocus 
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#949BA4]">
              {query ? <X size={20} className="cursor-pointer" onClick={() => setQuery('')} /> : <Search size={20} />}
            </div>
          </div>
        </div>

        <div className="flex px-4 py-2 gap-4 border-b border-[#1E1F22]">
          {[
            { id: 'messages', icon: <MessageSquare size={16} />, label: 'Messages' },
            { id: 'members', icon: <User size={16} />, label: 'Members' },
            { id: 'channels', icon: <Hash size={16} />, label: 'Channels' }
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} 
              className={`flex items-center gap-1.5 px-2 py-1 text-sm font-medium transition-colors ${activeTab === t.id ? 'text-white border-b-2 border-white' : 'text-[#949BA4] hover:text-[#DBDEE1]'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          {!query && <div className="py-20 text-center text-[#949BA4] text-sm">Find what you're looking for...</div>}
          {query && isLoading && <div className="py-20 text-center text-[#949BA4] text-sm animate-pulse">Searching the archives...</div>}
          
          <AnimatePresence mode="popLayout">
            {results && results.length > 0 ? (
              <div className="space-y-2">
                {results.map((r: any) => (
                  <div key={r.id}
                    onClick={() => {
                      if (activeTab === 'messages') navigate(`/servers/${r.channel.serverId}/channels/${r.channelId}`);
                      if (activeTab === 'channels') navigate(`/servers/${r.serverId}/channels/${r.id}`);
                      if (activeTab === 'members') navigate(`/settings`);
                      onClose();
                    }}
                    className="p-3 rounded-md bg-[#2B2D31] hover:bg-[#35373C] transition-colors cursor-pointer group">
                    {activeTab === 'messages' && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center flex-shrink-0">
                          {r.member?.user?.avatarUrl ? <img src={r.member.user.avatarUrl} className="w-full h-full object-cover rounded-full" /> : <User size={16} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white leading-tight">{r.member?.user?.displayName}</span>
                            <span className="text-[11px] text-[#949BA4]">{new Date(r.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-[#DBDEE1] line-clamp-1">{r.content}</p>
                          <p className="text-[11px] text-discord-blurple font-bold mt-1"># {r.channel?.name}</p>
                        </div>
                      </div>
                    )}
                    {activeTab === 'members' && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center">
                          {r.avatarUrl ? <img src={r.avatarUrl} className="w-full h-full object-cover rounded-full" /> : <User size={16} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white leading-tight">{r.displayName}</p>
                          <p className="text-xs text-[#949BA4]">@{r.username}</p>
                        </div>
                      </div>
                    )}
                    {activeTab === 'channels' && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Hash size={18} className="text-[#949BA4]" />
                          <span className="text-sm font-bold text-white">{r.name}</span>
                        </div>
                        <span className="text-xs text-[#949BA4]">{r.server?.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : query.length > 1 && !isLoading && (
              <div className="py-20 text-center text-[#949BA4] text-sm font-medium">No results found for "{query}"</div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
