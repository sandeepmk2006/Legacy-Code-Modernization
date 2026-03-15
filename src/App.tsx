import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileCode, ArrowRight, CheckCircle2, Loader2, Download, Settings, Database, Trash2, Github, LogOut, GitPullRequest } from 'lucide-react';
import Groq from 'groq-sdk';
import { motion, AnimatePresence } from 'motion/react';
import ChatBot from './components/ChatBot';
import LoginPage from './components/LoginPage';
import ChatHistory from './components/ChatHistory';

interface Chat {
  id: string;
  name: string;
  createdAt: any;
  files: ProjectFile[];
  convertedFiles: Record<string, string>;
  targetLang: 'python' | 'go';
}


interface ProjectFile {
  path: string;
  content: string;
  originalContent: string;
  dependencies: string[];
  status: 'pending' | 'converting' | 'completed' | 'error';
  convertedContent?: string;
}

export default function App() {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [targetLang, setTargetLang] = useState<'python' | 'go'>('python');
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'upload' | 'github'>('upload');
  const [githubAuthStatus, setGithubAuthStatus] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoInfo, setRepoInfo] = useState<{ owner: string, repo: string, defaultBranch: string } | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [urlError, setUrlError] = useState('');
  const [pushSuccessMessage, setPushSuccessMessage] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem('lm_user_email');
    if (savedEmail) {
      setUserEmail(savedEmail);
      setIsAuthenticated(true);
      fetchChats(savedEmail);
    }
  }, []);

  useEffect(() => {
    checkGitHubAuth();
    
    // Listen for postMessage from opener
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') checkGitHubAuth();
    };
    
    // Listen for localStorage changes
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'OAUTH_AUTH_SUCCESS') checkGitHubAuth();
    };

    // Listen for BroadcastChannel
    const bc = new BroadcastChannel('oauth_channel');
    bc.onmessage = (event) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') checkGitHubAuth();
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
      bc.close();
    };
  }, []);

  const checkGitHubAuth = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setGithubAuthStatus(data.authenticated);
    } catch (e) {
      setGithubAuthStatus(false);
    }
  };

  const handleLogin = (email: string) => {
    setUserEmail(email);
    setIsAuthenticated(true);
    localStorage.setItem('lm_user_email', email);
    fetchChats(email);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserEmail('');
    localStorage.removeItem('lm_user_email');
    setChats([]);
    setActiveChatId('');
  };

  const removeFile = (path: string) => {
    setFiles(prev => prev.filter(f => f.path !== path));
  };

  const handleGitHubConnect = async () => {
    try {
      const res = await fetch('/api/auth/github/url');
      const { url } = await res.json();
      
      // Navigate the CURRENT window to GitHub to avoid all popup block/auto-close issues
      window.location.href = url;
    } catch (e) {
      alert("Failed to get GitHub auth URL");
    }
  };

  const handleGitHubLogout = async () => {
    await fetch('/api/auth/logout');
    setGithubAuthStatus(false);
    setRepoInfo(null);
  };

  const isValidGithubUrl = (url: string) => {
    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+(\/)?$/;
    return githubRegex.test(url);
  };

  const handleGitHubFetch = async () => {
    if (!repoUrl) return;
    setPushSuccessMessage('');
    
    if (!isValidGithubUrl(repoUrl)) {
      setUrlError('Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)');
      return;
    }
    
    setUrlError('');
    setIsIngesting(true);
    try {
      const res = await fetch('/api/github/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFiles(data.files.map((f: any) => ({ ...f, status: 'pending' })));
      setRepoInfo(data.repoInfo);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "GitHub fetch failed";
      setUrlError(errorMessage);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleGitHubPush = async () => {
    if (!repoInfo) return;
    setIsPushing(true);
    setPushSuccessMessage('');
    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          branch: repoInfo.defaultBranch,
          targetLang
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPushSuccessMessage(`Successfully pushed! PR created: ${data.prUrl}`);
      window.open(data.prUrl, '_blank');
    } catch (error) {
      alert(error instanceof Error ? error.message : "GitHub push failed");
    } finally {
      setIsPushing(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsIngesting(true);
    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('files', selectedFiles[i]);
    }

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const text = await response.text();
          if (text) {
            try {
              const errorJson = JSON.parse(text);
              errorMessage = errorJson.error || text;
            } catch (e) {
              errorMessage = text;
            }
          }
        } catch (e) {
          // Fallback to status text if reading body fails
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.files) {
        setFiles(data.files.map((f: any) => ({ ...f, status: 'pending' })));
      }
    } catch (error) {
      console.error("Ingestion failed:", error);
      alert(error instanceof Error ? error.message : "Ingestion failed");
    } finally {
      setIsIngesting(false);
    }
  };

  const convertFile = async (file: ProjectFile, groq: Groq) => {
    const systemInstruction = `You are a Senior Software Architect specializing in legacy modernization. 
Convert the provided ${file.path.endsWith('.java') ? 'Java' : 'COBOL'} source code into high-quality, idiomatic ${targetLang === 'python' ? 'Python 3' : 'Go'}.
Maintain all business logic integrity. Preserving every logical branch and rule is critical.
Context of external dependencies: ${file.dependencies.join(', ')}.
Use this context to ensure correct imports and interfaces.
Return ONLY the source code. No explanations.`;

    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: file.content }
        ],
      });

      let convertedContent = response.choices[0]?.message?.content || '';
      
      // Remove generic markdown code block formatting if present
      if (convertedContent.startsWith('\`\`\`')) {
        const firstNewline = convertedContent.indexOf('\n');
        const lastBackticks = convertedContent.lastIndexOf('\`\`\`');
        if (firstNewline !== -1 && lastBackticks !== -1 && lastBackticks > firstNewline) {
          convertedContent = convertedContent.substring(firstNewline + 1, lastBackticks).trim();
        }
      }
      
      // Save to backend
      await fetch('/api/save-converted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: file.path, content: convertedContent }),
      });

      return convertedContent;
    } catch (error) {
      console.error(`Failed to convert ${file.path}`, error);
      throw error;
    }
  };

  const startConversion = async () => {
    if (files.length === 0) return;
    setIsConverting(true);
    setProgress(0);

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '', dangerouslyAllowBrowser: true });

    let completedCount = 0;
    const updatedFiles = [...files];

    for (let i = 0; i < updatedFiles.length; i++) {
      const file = updatedFiles[i];
      updatedFiles[i] = { ...file, status: 'converting' };
      setFiles([...updatedFiles]);

      try {
        const converted = await convertFile(file, groq);
        updatedFiles[i] = { ...file, status: 'completed', convertedContent: converted };
      } catch (error) {
        updatedFiles[i] = { ...file, status: 'error' };
      }

      completedCount++;
      setProgress(Math.round((completedCount / files.length) * 100));
      setFiles([...updatedFiles]);
    }

    setIsConverting(false);
  };

  const downloadProject = () => {
    window.location.href = `/api/download?lang=${targetLang}`;
  };

  const fetchChats = async (email: string) => {
    if (!email) return;
    try {
      const res = await fetch(`/api/chats/${email}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setChats(data);
      if (data.length > 0) {
        const latestChat = data[0];
        setActiveChatId(latestChat.id);
        setFiles(latestChat.files || []);
        setTargetLang(latestChat.targetLang || 'python');
      } else {
        handleNewChat(email);
      }
    } catch (error) {
      console.error("Failed to fetch chats:", error);
      // Handle error appropriately, e.g., show a notification
    }
  };

  const handleNewChat = async (email: string) => {
    if (!email) return;
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const newChat = await res.json();
      setChats([newChat, ...chats]);
      setActiveChatId(newChat.id);
      setFiles([]);
      setTargetLang('python');
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  const handleSelectChat = (id: string) => {
    const chat = chats.find(c => c.id === id);
    if (chat) {
      setActiveChatId(id);
      setFiles(chat.files);
      setTargetLang(chat.targetLang);
    }
  };

  useEffect(() => {
    if (activeChatId && userEmail) {
      const activeChat = chats.find(c => c.id === activeChatId);
      if (activeChat && (files !== activeChat.files || targetLang !== activeChat.targetLang)) {
        fetch(`/api/chats/${userEmail}/${activeChatId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files, targetLang }),
        });
      }
    }
  }, [files, targetLang, activeChatId, userEmail, chats]);

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-bg text-ink font-sans selection:bg-accent selection:text-ink">
      <ChatHistory chats={chats} activeChatId={activeChatId} onSelectChat={handleSelectChat} onNewChat={handleNewChat} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navigation Rail / Header */}
        <header className="border-b border-ink/10 bg-white/50 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
            <div className="flex items-center gap-8">
              <div>
                <h1 className="text-2xl font-bold tracking-tighter flex items-center gap-2">
                  <span className="bg-ink text-bg px-2 py-0.5 rounded italic font-serif">LM</span>
                  MODERNIZER
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">System Online</span>
                  <span className="w-1 h-1 rounded-full bg-ink/10" />
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{userEmail}</span>
                  <button onClick={handleLogout} className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:underline ml-2">Logout</button>
                </div>
              </div>

              <nav className="hidden md:flex items-center gap-1 bg-ink/5 p-1 rounded-full">
                <button 
                  onClick={() => setActiveTab('upload')}
                  className={`px-6 py-1.5 rounded-full text-[10px] font-bold transition-all ${activeTab === 'upload' ? 'bg-ink text-bg shadow-lg' : 'hover:bg-ink/5'}`}
                >
                  LOCAL ASSETS
                </button>
                <button 
                  onClick={() => setActiveTab('github')}
                  className={`px-6 py-1.5 rounded-full text-[10px] font-bold transition-all ${activeTab === 'github' ? 'bg-ink text-bg shadow-lg' : 'hover:bg-ink/5'}`}
                >
                  GITHUB REPO
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-white border border-ink/10 p-1 rounded-lg">
                <button 
                  onClick={() => setTargetLang('python')}
                  className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${targetLang === 'python' ? 'bg-accent text-ink' : 'hover:bg-gray-50'}`}
                >
                  PYTHON
                </button>
                <button 
                  onClick={() => setTargetLang('go')}
                  className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${targetLang === 'go' ? 'bg-accent text-ink' : 'hover:bg-gray-50'}`}
                >
                  GOLANG
                </button>
              </div>

              {activeTab === 'upload' && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isConverting}
                  className="neo-brutal bg-accent text-ink px-6 py-2 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  <Upload size={14} />
                  INGEST
                </button>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleUpload} 
                accept=".zip,.java,.cbl,.cob" 
                multiple
                className="hidden" 
              />
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
          {/* Left Column: Workspace */}
          <div className="lg:col-span-8 space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === 'github' && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass p-6 rounded-2xl flex items-center gap-4 shadow-sm"
                >
                  {!githubAuthStatus ? (
                    <button 
                      onClick={handleGitHubConnect}
                      className="bg-[#24292e] text-white px-8 py-3 rounded-xl text-xs font-bold flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                    >
                      <Github size={18} />
                      AUTHORIZE GITHUB ACCESS
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center gap-4">
                      <div className="flex-1 relative">
                        <Github className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={16} />
                        <input 
                          type="text"
                          value={repoUrl}
                          onChange={(e) => {
                            setRepoUrl(e.target.value);
                            if (urlError) setUrlError('');
                          }}
                          placeholder="https://github.com/owner/repository"
                          className={`w-full bg-ink/5 border ${urlError ? 'border-red-500' : 'border-ink/10'} rounded-xl pl-12 pr-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all`}
                        />
                        {urlError && (
                          <p className="absolute -bottom-5 left-1 text-[9px] font-bold text-red-500 uppercase tracking-wider">
                            {urlError}
                          </p>
                        )}
                      </div>
                      <button 
                        onClick={handleGitHubFetch}
                        disabled={isIngesting || !repoUrl}
                        className="bg-ink text-bg px-8 py-3 rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-ink/90 transition-all shadow-lg"
                      >
                        {isIngesting ? <Loader2 size={16} className="animate-spin" /> : 'FETCH SOURCE'}
                      </button>
                      <button 
                        onClick={handleGitHubLogout}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                        title="Logout"
                      >
                        <LogOut size={18} />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-white border border-ink/10 rounded-3xl overflow-hidden flex flex-col h-[75vh] shadow-xl">
              <div className="px-6 py-4 border-b border-ink/10 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted flex items-center gap-2">
                    <FileCode size={14} className="text-ink" />
                    Workspace / {files.length} Files
                  </span>
                </div>
                {files.length > 0 && !isConverting && (
                  <button 
                    onClick={startConversion}
                    className="bg-ink text-bg px-6 py-2 rounded-full text-[10px] font-bold tracking-widest hover:scale-105 transition-all active:scale-95"
                  >
                    EXECUTE MODERNIZATION
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {files.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-24 h-24 bg-ink/5 rounded-full flex items-center justify-center mb-6">
                      <Database size={40} className="text-ink/20" strokeWidth={1} />
                    </div>
                    <h3 className="font-serif italic text-2xl mb-2">Workspace Empty</h3>
                    <p className="text-sm text-muted max-w-sm mx-auto">
                      Ingest legacy Java or COBOL assets to begin the transformation pipeline.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-ink/5">
                    {files.map((file, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={idx} 
                        className="px-6 py-5 flex items-center justify-between hover:bg-accent/5 transition-colors group cursor-default"
                      >
                        <div className="flex items-center gap-6">
                          <div className="relative">
                            <div className={`w-3 h-3 rounded-full ${
                              file.status === 'completed' ? 'bg-accent shadow-[0_0_10px_rgba(0,255,65,0.5)]' : 
                              file.status === 'converting' ? 'bg-blue-500 animate-pulse' : 
                              file.status === 'error' ? 'bg-red-500' : 'bg-ink/10'
                            }`} />
                            {file.status === 'converting' && (
                              <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-mono font-semibold tracking-tight">{file.path}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                                {file.dependencies.length} Deps
                              </span>
                              <span className="w-1 h-1 rounded-full bg-ink/10" />
                              <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                                {file.path.split('.').pop()} Source
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <AnimatePresence mode="wait">
                            {file.status === 'converting' && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                              >
                                <Loader2 size={16} className="animate-spin text-blue-500" />
                              </motion.div>
                            )}
                            {file.status === 'completed' && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                              >
                                <CheckCircle2 size={18} className="text-accent" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                          
                          {!isConverting && (
                            <button 
                              onClick={() => removeFile(file.path)}
                              className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              title="Remove file"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {isConverting && (
                <div className="p-6 bg-ink text-bg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">Pipeline Throughput</span>
                    <span className="text-xs font-mono font-bold text-accent">{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-accent shadow-[0_0_15px_rgba(0,255,65,0.8)]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Intelligence & Control */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-ink text-bg p-8 rounded-4xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-accent/20 transition-all duration-700" />
              
              <h3 className="font-serif italic text-3xl mb-8 leading-tight">Transformation<br/>Intelligence</h3>
              
              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-end border-b border-white/10 pb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Target Architecture</span>
                  <span className="text-sm font-bold text-accent uppercase tracking-tighter">{targetLang}</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/10 pb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Asset Count</span>
                  <span className="text-sm font-bold">{files.length}</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/10 pb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Context Engine</span>
                  <span className="text-sm font-bold text-accent">llama-3.3-70b-versatile</span>
                </div>
              </div>

              <div className="mt-10 space-y-3">
                <button 
                  disabled={files.length === 0 || files.some(f => f.status !== 'completed')}
                  onClick={downloadProject}
                  className="w-full bg-accent text-ink py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100 shadow-lg"
                >
                  <Download size={16} />
                  EXPORT ARCHIVE (.ZIP)
                </button>

                {repoInfo && (
                  <button 
                    disabled={isPushing || files.length === 0 || files.some(f => f.status !== 'completed')}
                    onClick={handleGitHubPush}
                    className="w-full border-2 border-white/10 text-white py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-3 hover:bg-white/5 transition-all disabled:opacity-30 shadow-sm"
                  >
                    {isPushing ? <Loader2 size={16} className="animate-spin" /> : <GitPullRequest size={16} />}
                    DEPLOY TO GITHUB
                  </button>
                )}
                {pushSuccessMessage && (
                  <div className="text-center text-accent text-xs mt-2">
                    {pushSuccessMessage}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-ink/10 p-8 rounded-4xl shadow-sm">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                <Settings size={16} className="text-accent" />
                Pipeline Config
              </h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-ink">01</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-tight mb-1">Noise Reduction</h4>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Automated stripping of legacy metadata, Javadoc, and sequence numbers.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-ink">02</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-tight mb-1">Dependency Mapping</h4>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Recursive scanning of imports and CALL statements for context injection.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-ink">03</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-tight mb-1">Semantic Shift</h4>
                    <p className="text-[11px] text-muted leading-relaxed">
                      LLM-driven conversion preserving business logic integrity across paradigms.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <AnimatePresence>
          {isIngesting && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/40 backdrop-blur-md flex items-center justify-center z-50"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white p-12 rounded-[3rem] border border-ink/10 shadow-2xl flex flex-col items-center max-w-sm w-full mx-4"
              >
                <div className="relative mb-8">
                  <Loader2 className="animate-spin text-ink" size={48} strokeWidth={1.5} />
                  <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse" />
                </div>
                <h3 className="font-serif italic text-3xl mb-3">Ingesting Assets</h3>
                <p className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-40 text-center">
                  Analyzing structure & mapping dependencies
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ChatBot files={files} targetLang={targetLang} />
      </div>
    </div>
  );
}
