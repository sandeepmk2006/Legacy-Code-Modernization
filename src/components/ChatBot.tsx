import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Minimize2, Maximize2, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import Groq from 'groq-sdk';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

interface ChatBotProps {
  files: any[];
  targetLang: string;
}

export default function ChatBot({ files, targetLang }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Hello! I'm your Modernization Assistant. I can explain the legacy code, help you understand the conversion logic, or guide you through using this tool. How can I help you today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const groq = new Groq({ apiKey: (window as any).process?.env?.GROQ_API_KEY || '', dangerouslyAllowBrowser: true });
      
      // Prepare context
      const fileContext = files.map(f => `File: ${f.path}\nOriginal Content:\n${f.originalContent}\nConverted Content (${targetLang}):\n${f.convertedContent || 'Not converted yet'}`).join('\n\n---\n\n');

      const systemInstruction = `You are a helpful AI assistant for the "Legacy Modernizer" tool. 
Your goal is to help developers modernize legacy Java and COBOL code to Python or Go.

CONTEXT:
- Current Workspace Files: ${files.length} files.
- Target Language: ${targetLang}
- Tool Features: Local file upload (ZIP/individual), GitHub repository fetching, Noise striping (removing comments/sequence numbers), Dependency mapping, and Direct deployment to GitHub via Pull Requests.

WORKSPACE DATA:
${fileContext}

INSTRUCTIONS:
1. If the user asks about the code, explain the logic clearly, highlighting potential pitfalls in the legacy code or improvements in the modernized version.
2. If the user asks how to use the tool, explain the steps: Ingest (Upload or GitHub) -> Select Target Language -> Execute Modernization -> Export or Deploy.
3. Be concise, professional, and technical.
4. Use Markdown for code blocks and formatting.`;

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userMessage }
        ],
      });

      const botResponse = response.choices[0]?.message?.content || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'bot', content: botResponse }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'bot', content: "Sorry, I encountered an error while processing your request. Please make sure your API key is configured correctly." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              height: isMinimized ? '60px' : '500px',
              width: '380px'
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white border border-ink/10 rounded-2xl shadow-2xl overflow-hidden mb-4 flex flex-col"
          >
            {/* Header */}
            <div className="bg-ink text-bg px-4 py-3 flex justify-between items-center cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-accent" />
                <span className="text-xs font-bold uppercase tracking-widest">Modernization Assistant</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg/30 custom-scrollbar"
                >
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-ink text-bg rounded-tr-none' 
                          : 'bg-white border border-ink/5 text-ink rounded-tl-none shadow-sm'
                      }`}>
                        <div className="flex items-center gap-2 mb-1 opacity-40 uppercase font-bold text-[8px]">
                          {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                          {msg.role === 'user' ? 'You' : 'Assistant'}
                        </div>
                        <div className="markdown-body prose prose-invert prose-xs max-w-none">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-ink/5 text-ink rounded-2xl rounded-tl-none p-3 shadow-sm">
                        <Loader2 size={14} className="animate-spin opacity-40" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-ink/5 bg-white">
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask about the code or tool..."
                      className="flex-1 bg-ink/5 border border-ink/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent/50"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="bg-ink text-bg p-2 rounded-xl hover:bg-ink/90 transition-all disabled:opacity-30"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isOpen ? 'bg-accent text-ink rotate-90' : 'bg-ink text-bg'
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>
    </div>
  );
}
