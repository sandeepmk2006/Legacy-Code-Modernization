import React, { useState } from 'react';
import { Plus, MessageSquare, Edit2, Trash2, X } from 'lucide-react';

interface Chat {
  id: string;
  name: string;
}

interface ChatHistoryProps {
  chats: Chat[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onNewChat: (name?: string) => void;
  onEditChat: (id: string, newName: string) => void;
  onDeleteChat: (id: string) => void;
}

export default function ChatHistory({ chats, activeChatId, onSelectChat, onNewChat, onEditChat, onDeleteChat }: ChatHistoryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  // Modals state
  const [isCreating, setIsCreating] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);

  const startEditing = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditName(chat.name);
  };

  const handleEditSubmit = (e: React.FormEvent | React.KeyboardEvent, id: string) => {
    e.preventDefault();
    if (editName.trim()) {
      onEditChat(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleDeleteRequest = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    setChatToDelete(chat);
  };

  const confirmDelete = () => {
    if (chatToDelete) {
      onDeleteChat(chatToDelete.id);
      setChatToDelete(null);
    }
  };

  const handleCreateRequest = () => {
    setNewSessionName('');
    setIsCreating(true);
  };

  const confirmCreate = () => {
    if (newSessionName.trim()) {
      onNewChat(newSessionName.trim());
    } else {
      onNewChat(); // Will fallback to default name in backend
    }
    setIsCreating(false);
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-ink/10 flex flex-col p-3 gap-2 relative">
      {/* Create Modal overlay */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-80 border border-ink/5 relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setIsCreating(false)} className="absolute top-4 right-4 text-gray-400 hover:text-ink">
              <X size={16} />
            </button>
            <h3 className="font-bold text-sm mb-4">New Session Name</h3>
            <input 
              autoFocus
              type="text" 
              placeholder="e.g. Migration Phase 1" 
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmCreate()}
              className="w-full bg-gray-50 border border-ink/10 rounded-lg px-3 py-2 text-sm mb-4 outline-none focus:border-accent"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsCreating(false)} className="px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-100">Cancel</button>
              <button onClick={confirmCreate} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-accent text-ink">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {chatToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-80 border border-ink/5 relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setChatToDelete(null)} className="absolute top-4 right-4 text-gray-400 hover:text-ink">
              <X size={16} />
            </button>
            <h3 className="font-bold text-sm mb-2">Delete Session</h3>
            <p className="text-xs text-gray-500 mb-6">Are you sure you want to delete <span className="font-bold text-ink">"{chatToDelete.name}"</span>? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setChatToDelete(null)} className="px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-100">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleCreateRequest}
        className="w-full bg-accent text-ink py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
      >
        <Plus size={14} />
        NEW SESSION
      </button>
      <div className="flex-1 overflow-y-auto space-y-1 mt-2 custom-scrollbar">
        {chats.map(chat => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`w-full group cursor-pointer text-left px-4 py-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-3 ${
              activeChatId === chat.id ? 'bg-ink text-bg' : 'hover:bg-ink/5'
            }`}
          >
            <MessageSquare size={14} className="shrink-0" />
            {editingId === chat.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={(e) => handleEditSubmit(e as any, chat.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditSubmit(e, chat.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                autoFocus
                className="flex-1 bg-transparent border-b border-current outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate">{chat.name}</span>
            )}
            
            {editingId !== chat.id && (
              <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => startEditing(e, chat)}
                  className="p-1 hover:text-accent transition-colors"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={(e) => handleDeleteRequest(e, chat)}
                  className="p-1 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
