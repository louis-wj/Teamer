import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Globe, Users, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { data: servers = [], isLoading } = useQuery({
    queryKey: ['discovery'],
    queryFn: async () => (await api.get('/servers/discover')).data,
  });

  const join = async (serverId: string) => {
    try {
      await api.post(`/invites/join`, { serverId });
      navigate(`/servers/${serverId}`);
    } catch {}
  };

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col glass-light rounded-tl-[40px] border-t border-l border-white/5 overflow-hidden">
        {/* Header */}
        <div className="h-16 flex items-center px-8 border-b border-white/5 gap-8 flex-shrink-0 bg-white/[0.01]">
          <div className="flex items-center gap-2 text-primary">
            <Globe size={18} className="animate-spin-slow" />
            <span className="font-extrabold text-lg tracking-tight">Public Discovery</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex-1 flex items-center gap-3">
            <Search size={16} className="text-muted-foreground/40" />
            <input className="bg-transparent border-none text-sm text-foreground placeholder:text-muted-foreground/20 focus:outline-none w-full" placeholder="Search the pulse..." />
          </div>
        </div>

        {/* Hero Section */}
        <div className="px-8 pt-10 pb-16 flex flex-col items-center text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-16 h-16 rounded-3xl bg-primary/20 flex items-center justify-center mb-6 shadow-2xl glow-primary">
            <Sparkles size={32} className="text-primary" />
          </motion.div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-4">Find your community on Teamer.</h1>
          <p className="text-muted-foreground text-lg max-w-xl">From gaming to hanging out, there's a place for you here. Explore public servers and join the conversation.</p>
        </div>

        {/* Server Grid */}
        <div className="flex-1 overflow-y-auto px-10 pb-20 custom-scrollbar">
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse" />)}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servers.map((s: any, i: number) => (
              <motion.div 
                key={s.id} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.05 }}
                className="group relative h-72 rounded-3xl overflow-hidden bg-black/40 border border-white/5 hover:border-primary/40 transition-all duration-500"
              >
                {/* Banner Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80 z-10" />
                {s.imageUrl ? (
                  <img src={s.imageUrl} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-40" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-600/20 group-hover:scale-110 transition-transform duration-700" />
                )}

                {/* Content */}
                <div className="absolute inset-x-0 bottom-0 p-6 z-20 flex flex-col">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 mb-4 flex items-center justify-center text-white font-black text-xl shadow-2xl group-hover:glow-primary group-hover:bg-primary transition-all duration-500">
                    {s.imageUrl ? <img src={s.imageUrl} className="w-full h-full object-cover rounded-2xl" /> : s.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight mb-1">{s.name}</h3>
                  <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground/60 mb-6">
                    <span className="flex items-center gap-1.5"><Users size={14} /> {s._count?.members || 0} members</span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span>Public Pulse</span>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05, x: 5 }} 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => join(s.id)}
                    className="w-full py-3 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl hover:bg-primary hover:text-white transition-all duration-300"
                  >
                    Join Pulse <ArrowRight size={14} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>

          {!isLoading && servers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/20 italic">
              <Globe size={64} className="mb-4 opacity-5" />
              <p className="font-bold text-xl">No public servers pulsing right now.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
