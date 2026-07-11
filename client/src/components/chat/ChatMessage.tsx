import { useState } from 'react';
import { Pencil, Trash2, Pin, Reply, SmilePlus, Copy } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { renderMarkdown } from '@/lib/markdown';
import api from '@/lib/api';
import ContextMenu from '@/components/ui/ContextMenu';

interface Props { message: any; channelId: string; onReply?: () => void; }

export default function ChatMessage({ message, channelId, onReply }: Props) {
  const user = useAuthStore((s) => s.user);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const isAuthor = message.member?.user?.id === user?.id;
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isEdited = message.createdAt !== message.updatedAt && !message.deleted;
  const reactions = message.reactions || [];

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) { setEditing(false); return; }
    await api.patch(`/channels/${channelId}/messages/${message.id}`, { content: editContent.trim() });
    setEditing(false);
  };
  const handleDelete = () => api.delete(`/channels/${channelId}/messages/${message.id}`);
  const handlePin = () => api.post(`/channels/${channelId}/messages/${message.id}/pin`);
  const toggleReaction = (emoji: string) => api.put(`/channels/${channelId}/messages/${message.id}/reactions/${emoji}`);

  const contextItems = [
    ...(onReply ? [{ label: 'Reply', icon: <Reply size={14} />, onClick: onReply }] : []),
    { label: 'Copy Text', icon: <Copy size={14} />, onClick: () => navigator.clipboard.writeText(message.content) },
    { label: message.pinned ? 'Unpin' : 'Pin Message', icon: <Pin size={14} />, onClick: handlePin },
    ...(isAuthor ? [{ label: 'Edit Message', icon: <Pencil size={14} />, onClick: () => setEditing(true) }] : []),
    ...(isAuthor ? [{ label: 'Delete Message', icon: <Trash2 size={14} />, danger: true, onClick: handleDelete }] : []),
  ];

  return (
    <ContextMenu items={!message.deleted ? contextItems : []}>
      <div className={`group relative flex flex-col pt-[2px] pb-[2px] mt-[1.0625rem] px-4 hover:bg-[#2E3035] transition-colors leading-[1.375rem]`}>
        {/* Reply Indicator */}
        {message.replyTo && (
          <div className="flex items-center gap-1 mb-1 ml-10 h-4 relative">
            <div className="absolute -left-6 top-[10px] w-6 h-[11px] border-l-2 border-t-2 border-[#4E5058] rounded-tl-md" />
            <img src={message.replyTo.member?.user?.avatarUrl} className="w-4 h-4 rounded-full" alt="" />
            <span className="text-[14px] font-bold text-[#B5BAC1] hover:underline cursor-pointer">@{message.replyTo.member?.user?.displayName}</span>
            <span className="text-[14px] text-[#B5BAC1] truncate opacity-80">{message.replyTo.content}</span>
          </div>
        )}

        <div className="flex gap-4">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-discord-blurple flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-0.5 overflow-hidden">
            {message.member?.user?.avatarUrl ? <img src={message.member.user.avatarUrl} alt="" className="w-full h-full object-cover" /> :
              (message.member?.user?.displayName?.charAt(0).toUpperCase() || '?')}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-[16px] text-white hover:underline cursor-pointer"
                style={message.member?.roles?.[0]?.color && message.member.roles[0].color !== '#99AAB5' ? { color: message.member.roles[0].color } : undefined}>
                {message.member?.user?.displayName || 'Unknown'}
              </span>
              <span className="text-[12px] font-medium text-[#949BA4]">{time}</span>
            </div>

            {/* Content */}
            {editing ? (
              <div className="mt-1">
                <input value={editContent} onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setEditing(false); }}
                  className="w-full px-3 py-1.5 rounded-md bg-[#383A40] text-[#DBDEE1] text-[16px] focus:outline-none" autoFocus />
                <div className="text-[11px] mt-1 text-[#DBDEE1]">
                  escape to <button className="text-[#00A8FC] hover:underline" onClick={() => setEditing(false)}>cancel</button> • enter to <button className="text-[#00A8FC] hover:underline" onClick={handleEdit}>save</button>
                </div>
              </div>
            ) : (
              <div className={`text-[16px] markdown-content text-[#DBDEE1] ${message.deleted ? 'italic opacity-50' : ''}`}>
                {message.deleted ? message.content : renderMarkdown(message.content)}
                {isEdited && <span className="text-[12px] text-[#949BA4] ml-1 leading-[0]">(edited)</span>}
              </div>
            )}

            {/* Reactions */}
            {reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {reactions.map((r: any) => (
                  <button key={r.emoji}
                    onClick={() => toggleReaction(r.emoji)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-[0.5rem] text-[14px] font-bold border transition-colors ${r.userIds?.includes(user?.id) ? 'bg-[#373E5E] border-discord-blurple text-white' : 'bg-[#2B2D31] border-transparent text-[#B5BAC1] hover:border-[#4E5058]'}`}>
                    <span className="scale-110">{r.emoji}</span>
                    <span className="text-[13px]">{r.userIds?.length || 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action toolbar */}
        {!message.deleted && (
          <div className="absolute -top-4 right-4 opacity-0 group-hover:opacity-100 flex items-center bg-[#2B2D31] border border-[#1E1F22] rounded-[4px] shadow-lg transition-opacity overflow-hidden z-20">
            <button className="p-2 hover:bg-[#35373C] text-[#B5BAC1] hover:text-[#DBDEE1]" title="Add Reaction"><SmilePlus size={20} /></button>
            {onReply && <button onClick={onReply} className="p-2 hover:bg-[#35373C] text-[#B5BAC1] hover:text-[#DBDEE1]" title="Reply"><Reply size={20} /></button>}
            {isAuthor && <button onClick={() => setEditing(true)} className="p-2 hover:bg-[#35373C] text-[#B5BAC1] hover:text-[#DBDEE1]" title="Edit"><Pencil size={20} /></button>}
            <button className="p-2 hover:bg-[#35373C] text-[#B5BAC1] hover:text-[#DBDEE1]" onClick={handlePin} title="Pin"><Pin size={20} /></button>
            {isAuthor && <button onClick={handleDelete} className="p-2 hover:bg-[#ED4245]/10 text-[#B5BAC1] hover:text-[#ED4245]" title="Delete"><Trash2 size={20} /></button>}
          </div>
        )}
      </div>
    </ContextMenu>
  );
}
