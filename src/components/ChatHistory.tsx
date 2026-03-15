import React from 'react';
import { Plus, MessageSquare } from 'lucide-react';

interface Chat {
  id: string;
  name: string;
}

interface ChatHistoryProps {
  chats: Chat[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
}

export default function ChatHistory({ chats, activeChatId, onSelectChat, onNewChat }: ChatHistoryProps) {
  return (
    <div className="w-64 bg-gray-50 border-r border-ink/10 flex flex-col p-3 gap-2">
      <button
        onClick={onNewChat}
        className="w-full bg-accent text-ink py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
      >
        <Plus size={14} />
        NEW SESSION
      </button>
      <div className="flex-1 overflow-y-auto space-y-1 mt-2 custom-scrollbar">
        {chats.map(chat => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-semibold transition-all flex items-start gap-3 ${
              activeChatId === chat.id ? 'bg-ink text-bg' : 'hover:bg-ink/5'
            }`}
          >
            <MessageSquare size={14} className="mt-0.5 shrink-0" />
            <span className="truncate">{chat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
