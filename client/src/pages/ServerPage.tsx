import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import ChannelSidebar from '@/components/server/ChannelSidebar';

export default function ServerPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const { data: server } = useQuery({
    queryKey: ['server', serverId],
    queryFn: async () => (await api.get(`/servers/${serverId}`)).data,
    enabled: !!serverId,
  });

  useEffect(() => {
    if (server) {
      const gen = server.channels?.find((c: any) => c.name === 'general');
      if (gen) navigate(`/servers/${serverId}/channels/${gen.id}`, { replace: true });
    }
  }, [server, serverId, navigate]);

  return (
    <AppLayout serverContent={server && <ChannelSidebar server={server} />}>
      <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground text-sm">Select a channel</p></div>
    </AppLayout>
  );
}
