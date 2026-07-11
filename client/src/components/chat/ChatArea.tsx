import { useEffect, useRef, useState, useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, Bell, Pin, Users, Search, Inbox, HelpCircle, PlusCircle, Gift, Sticker, Smile, Send } from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth.store';
import ChatMessage from './ChatMessage';
import FileUpload from './FileUpload';

interface Props { channel: any; serverId: string; }

export default function ChatArea({ channel, serverId }: Props) {
  const [message, setMessage] = useState('');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout>>();
  const qc = useQueryClient();
  
  const loggedInUser = useAuthStore((s) => s.user);
  const blockedIds = new Set(loggedInUser?.blockedIds || []);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['messages', channel.id],
    queryFn: async ({ pageParam }) => (await api.get(`/channels/${channel.id}/messages${pageParam ? `?cursor=${pageParam}` : ''}`)).data,
    getNextPageParam: (last) => last.nextCursor,
    initialPageParam: undefined as string | undefined,
  });

  const messages = (data?.pages.flatMap((p) => p.messages).reverse() || [])
    .filter(msg => !blockedIds.has(msg.member?.user?.id));

  useEffect(() => {
    const socket = getSocket(); if (!socket) return;
    socket.emit('channel:join', channel.id);
    const onMsg = (msg: any) => {
      qc.setQueryData(['messages', channel.id], (old: any) => {
        if (!old) return old;
        const pages = [...old.pages]; pages[0] = { ...pages[0], messages: [msg, ...pages[0].messages] };
        return { ...old, pages };
      });
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };
    const onUpdate = (msg: any) => {
      qc.setQueryData(['messages', channel.id], (old: any) => {
        if (!old) return old;
        return { ...old, pages: old.pages.map((p: any) => ({ ...p, messages: p.messages.map((m: any) => m.id === msg.id ? msg : m) })) };
      });
    };
    const onTyping = ({ userId: tid, username }: any) => {
      if (tid === loggedInUser?.id) return;
      setTypingUsers(p => p.includes(username) ? p : [...p, username]);
      setTimeout(() => setTypingUsers(p => p.filter(u => u !== username)), 3000);
    };
    socket.on('message:created', onMsg); socket.on('message:updated', onUpdate);
    socket.on('message:deleted', onUpdate); socket.on('user:typing', onTyping);
    return () => { socket.emit('channel:leave', channel.id); socket.off('message:created', onMsg);
      socket.off('message:updated', onUpdate); socket.off('message:deleted', onUpdate);
      socket.off('user:typing', onTyping); };
  }, [channel.id, qc, loggedInUser?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'auto' }); }, [channel.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !fileUrl) return;

    try {
      await api.post(`/channels/${channel.id}/messages`, { content: message.trim() || '📎', fileUrl, replyToId: replyTo?.id });
      setMessage(''); setFileUrl(null); setReplyTo(null);
    } catch (err: any) {}
  };

  const handleTyping = () => {
    const socket = getSocket(); if (!socket) return;
    if (!typingRef.current) socket.emit('typing:start', channel.id);
    clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => { typingRef.current = undefined; }, 2000);
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el && el.scrollTop < 100 && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-discord-dark-3 h-full">
      {/* Channel header */}
      <div className="h-12 flex items-center px-4 shadow-sm z-10 flex-shrink-0 gap-2 border-b border-discord-dark-1">
        <Hash size={24} className="text-[#80848E]" />
        <h3 className="font-bold text-white text-[16px] truncate">{channel.name}</h3>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-4 text-[#B5BAC1]">
          <Bell size={20} className="hover:text-[#DBDEE1] cursor-pointer" />
          <Pin size={20} className="hover:text-[#DBDEE1] cursor-pointer" />
          <Users size={20} className="hover:text-[#DBDEE1] cursor-pointer" />
          <div className="relative">
            <input 
              placeholder="Search" 
              className="bg-discord-dark-1 text-sm px-2 py-0.5 rounded-sm w-36 focus:w-60 transition-all outline-none placeholder:text-[#949BA4]" 
            />
            <Search size={14} className="absolute right-2 top-1.5" />
          </div>
          <Inbox size={20} className="hover:text-[#DBDEE1] cursor-pointer" />
          <HelpCircle size={20} className="hover:text-[#DBDEE1] cursor-pointer" />
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto no-scrollbar pt-4">
        {isFetchingNextPage && <div className="flex justify-center py-4 text-[#949BA4]">Loading more messages...</div>}
        
        <div className="flex flex-col justify-end min-h-full">
          {/* Welcome section */}
          <div className="px-4 mb-4">
            <div className="w-16 h-16 bg-[#41434A] rounded-full flex items-center justify-center mb-4">
              <Hash size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to #{channel.name}!</h1>
            <p className="text-[#B5BAC1]">This is the start of the #{channel.name} channel.</p>
            <div className="h-[1px] bg-[#3F4147] w-full mt-6" />
          </div>

          <div className="pb-4">
            {messages.map((msg: any) => (
              <ChatMessage 
                key={msg.id} 
                message={msg} 
                channelId={channel.id}
                onReply={() => setReplyTo(msg)} 
              />
            ))}
          </div>
          <div ref={endRef} />
        </div>
      </div>

      {/* Message input */}
      <div className="px-4 pb-6">
        <form onSubmit={handleSend} className="bg-[#383A40] rounded-lg px-4 py-2.5">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#41434A] text-sm text-[#B5BAC1]">
              <span className="truncate">Replying to <span className="font-bold">{replyTo.member?.user?.displayName}</span></span>
              <button onClick={() => setReplyTo(null)} className="ml-auto hover:text-white">Close</button>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <PlusCircle size={24} className="text-[#B5BAC1] hover:text-[#DBDEE1] cursor-pointer" />
            <input 
              value={message} 
              onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
              placeholder={`Message #${channel.name}`}
              className="flex-1 bg-transparent text-[#DBDEE1] placeholder:text-[#949BA4] focus:outline-none text-[16px]" 
            />
            <div className="flex items-center gap-3 text-[#B5BAC1]">
              <Gift size={24} className="hover:text-[#DBDEE1] cursor-pointer" />
              <Sticker size={24} className="hover:text-[#DBDEE1] cursor-pointer" />
              <Smile size={24} className="hover:text-[#DBDEE1] cursor-pointer" />
              {message.trim() && (
                <button type="submit" className="text-discord-blurple">
                  <Send size={24} />
                </button>
              )}
            </div>
          </div>
        </form>
        
        <div className="h-5 mt-1">
          {typingUsers.length > 0 && (
            <span className="text-[12px] text-white font-bold ml-1 italic">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
