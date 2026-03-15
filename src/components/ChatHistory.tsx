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
    <div className="w-64 bg-gray-50 border-r border-ink/10 flex flex-col">
      <div className="p-4 border-b border-ink/10">
        <button
          onClick={onNewChat}
          className="w-full bg-accent text-ink py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
        >
          <Plus size={14} />
          New Session
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.map(chat => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`p-4 cursor-pointer text-sm ${activeChatId === chat.id ? 'bg-accent/20' : 'hover:bg-gray-100'}`}
          >
            <p className="font-semibold truncate">{chat.name}</p>
            <p className="text-xs text-muted truncate">{new Date().toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
