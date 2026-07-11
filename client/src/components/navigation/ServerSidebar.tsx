import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Compass, Search, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import CreateServerModal from '@/components/modals/CreateServerModal';
import JoinServerModal from '@/components/modals/JoinServerModal';
import SearchModal from '@/components/modals/SearchModal';

export default function ServerSidebar() {
  const navigate = useNavigate();
  const { serverId } = useParams();
  const user = useAuthStore((s) => s.user);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { data: servers = [] } = useQuery({
    queryKey: ['servers'],
    queryFn: async () => (await api.get('/servers')).data,
  });

  const ServerButton = ({ id, name, imageUrl, active, onClick, icon: Icon, isAction }: any) => (
    <div className="relative flex items-center justify-center w-full group mb-2"
      onMouseEnter={() => setHoveredId(id)} onMouseLeave={() => setHoveredId(null)}>
      
      {/* Indicator Pill */}
      {!isAction && (
        <div className="absolute left-0 flex items-center h-full">
          <motion.div 
            className="w-1 bg-white rounded-r-full"
            initial={false}
            animate={{ 
              height: active ? 40 : hoveredId === id ? 20 : 0,
              scaleY: active || hoveredId === id ? 1 : 0
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
        </div>
      )}

      <motion.button 
        onClick={onClick}
        className={`
          relative flex items-center justify-center w-12 h-12 transition-all duration-200 overflow-hidden
          ${active ? 'rounded-[16px] bg-discord-blurple text-white' : 
            isAction ? 'rounded-[24px] bg-discord-dark-3 text-discord-green hover:rounded-[16px] hover:bg-discord-green hover:text-white' :
            'rounded-[24px] bg-discord-dark-3 text-foreground hover:rounded-[16px] hover:bg-discord-blurple hover:text-white'}
        `}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : Icon ? (
          <Icon size={24} />
        ) : (
          <span className="font-medium text-base">{name?.charAt(0).toUpperCase()}</span>
        )}
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredId === id && (
          <motion.div 
            initial={{ opacity: 0, x: 10, scale: 0.9 }} 
            animate={{ opacity: 1, x: 20, scale: 1 }} 
            exit={{ opacity: 0, x: 10, scale: 0.9 }}
            className="absolute left-full px-3 py-1.5 rounded-md bg-black text-white text-[14px] font-bold shadow-xl whitespace-nowrap z-50 pointer-events-none"
          >
            {name}
            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-black rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      <div className="w-[72px] bg-discord-dark-1 flex flex-col items-center py-3 flex-shrink-0 h-full overflow-y-auto no-scrollbar">
        {/* Home Button */}
        <ServerButton 
          id="home" 
          name="Direct Messages" 
          active={!serverId} 
          onClick={() => navigate('/')} 
          icon={MessageSquare} 
        />

        <div className="w-8 h-[2px] bg-discord-dark-3 rounded-full mx-auto my-1" />

        {/* Servers */}
        {servers.map((s: any) => (
          <ServerButton 
            key={s.id}
            id={s.id}
            name={s.name}
            imageUrl={s.imageUrl}
            active={serverId === s.id}
            onClick={() => {
              const gen = s.channels?.find((c: any) => c.name === 'general');
              navigate(gen ? `/servers/${s.id}/channels/${gen.id}` : `/servers/${s.id}`);
            }}
          />
        ))}

        {/* Actions */}
        <ServerButton 
          id="add-server" 
          name="Add a Server" 
          isAction 
          onClick={() => setShowCreate(true)} 
          icon={Plus} 
        />
        <ServerButton 
          id="discover" 
          name="Explore Discoverable Servers" 
          isAction 
          onClick={() => setShowJoin(true)} 
          icon={Compass} 
        />

        <div className="mt-auto pt-2">
          <ServerButton 
            id="search" 
            name="Search" 
            isAction 
            onClick={() => setShowSearch(true)} 
            icon={Search} 
          />
        </div>
      </div>

      <AnimatePresence>
        {showCreate && <CreateServerModal onClose={() => setShowCreate(false)} />}
        {showJoin && <JoinServerModal onClose={() => setShowJoin(false)} />}
        {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      </AnimatePresence>
    </>
  );
}

