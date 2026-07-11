import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import ChannelSidebar from '@/components/server/ChannelSidebar';
import ChatArea from '@/components/chat/ChatArea';
import MemberSidebar from '@/components/server/MemberSidebar';

export default function ChannelPage() {
  const { serverId, channelId } = useParams<{ serverId: string; channelId: string }>();
  const { data: server } = useQuery({
    queryKey: ['server', serverId],
    queryFn: async () => (await api.get(`/servers/${serverId}`)).data,
    enabled: !!serverId,
  });
  const ch = server?.channels?.find((c: any) => c.id === channelId);

  return (
    <AppLayout serverContent={server && <ChannelSidebar server={server} activeChannelId={channelId} />}>
      {ch ? (
        <div className="flex flex-1 overflow-hidden">
          <ChatArea channel={ch} serverId={serverId!} />
          <MemberSidebar members={server?.members || []} server={server} />
        </div>
      ) : <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground text-sm">Channel not found</p></div>}
    </AppLayout>
  );
}
