import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth.store';
import { renderMarkdown } from '@/lib/markdown';
import AppLayout from '@/components/layout/AppLayout';

export default function DMPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: convos = [] } = useQuery({ queryKey: ['conversations'], queryFn: async () => (await api.get('/conversations')).data });
  const convo = convos.find((c: any) => c.id === conversationId);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['dm-messages', conversationId],
    queryFn: async ({ pageParam }) => (await api.get(`/conversations/${conversationId}/messages${pageParam ? `?cursor=${pageParam}` : ''}`)).data,
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!conversationId,
  });

  const messages = data?.pages.flatMap((p) => p.messages).reverse() || [];

  useEffect(() => {
    const socket = getSocket(); if (!socket) return;
    const onDm = (msg: any) => {
      if (msg.conversationId !== conversationId) return;
      qc.setQueryData(['dm-messages', conversationId], (old: any) => {
        if (!old) return old;
        const pages = [...old.pages]; pages[0] = { ...pages[0], messages: [msg, ...pages[0].messages] };
        return { ...old, pages };
      });
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };
    socket.on('dm:created', onDm); socket.on('dm:updated', onDm); socket.on('dm:deleted', onDm);
    return () => { socket.off('dm:created', onDm); socket.off('dm:updated', onDm); socket.off('dm:deleted', onDm); };
  }, [conversationId, qc]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversationId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    await api.post(`/conversations/${conversationId}/messages`, { content: message.trim() });
    setMessage('');
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el && el.scrollTop < 100 && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col">
        <div className="h-12 flex items-center px-4 border-b border-border/30 gap-3 flex-shrink-0">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={18} /></button>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teamer-400 to-teamer-600 flex items-center justify-center text-white text-xs font-medium overflow-hidden">
            {convo?.user?.avatarUrl ? <img src={convo.user.avatarUrl} className="w-full h-full object-cover" /> : convo?.user?.displayName?.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-foreground text-[15px]">{convo?.user?.displayName || 'Direct Message'}</span>
        </div>

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-2">
          {isFetchingNextPage && <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-teamer-500/30 border-t-teamer-500 rounded-full animate-spin" /></div>}
          {messages.map((msg: any) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 py-1.5 ${msg.senderId === user?.id ? '' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teamer-400 to-teamer-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0 overflow-hidden">
                {msg.sender?.avatarUrl ? <img src={msg.sender.avatarUrl} className="w-full h-full object-cover" /> : msg.sender?.displayName?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-[13px] text-foreground">{msg.sender?.displayName}</span>
                  <span className="text-[11px] text-muted-foreground/60">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-[14px] text-foreground/90 markdown-content leading-relaxed">
                  {msg.deleted ? <em className="text-muted-foreground">{msg.content}</em> : renderMarkdown(msg.content)}
                </div>
              </div>
            </motion.div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="px-4 pb-4 pt-1">
          <form onSubmit={handleSend}
            className="flex items-center gap-2 bg-secondary/60 border border-border/30 rounded-xl px-4 py-2.5 focus-within:border-teamer-500/30 transition-all">
            <input value={message} onChange={e => setMessage(e.target.value)}
              placeholder={`Message ${convo?.user?.displayName || ''}`}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none text-sm" />
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="submit" disabled={!message.trim()}
              className="text-teamer-500 hover:text-teamer-400 disabled:text-muted-foreground/30 transition-colors"><Send size={18} /></motion.button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
