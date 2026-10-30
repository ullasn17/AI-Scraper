'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Send, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageSquare, 
  ArrowRight, 
  Briefcase
} from 'lucide-react';
import FormattedMessage from '@/components/chatbot/FormattedMessage';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citedSchemes?: Array<{
    schemeId?: string;
    title: string;
    slug?: string;
    url?: string;
  }>;
}

interface SavedSession {
  sessionId: string;
  title: string;
  updatedAt: string;
}

function AssistantContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Namaste! I am SchemeSathi AI, your dedicated conversational advisor for Indian government schemes, scholarships, and welfare benefits. You can also ask me general questions or seek help drafting applications. What would you like to explore today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = async (messageText?: string, sidToUse?: string) => {
    const text = (messageText || input).trim();
    if (!text || isLoading) return;

    const currentSid = sidToUse || sessionId;
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: currentSid }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get answer');

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          citedSchemes: data.citedSchemes,
        },
      ]);

      // Refresh sessions
      fetch('/api/chat/history')
        .then((r) => r.json())
        .then((d) => {
          if (d?.sessions) setSessions(d.sessions);
        })
        .catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error contacting assistant';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ ${msg}. Please try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let sid = localStorage.getItem('schemesathi_full_session');
    if (!sid) {
      sid = 'session_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('schemesathi_full_session', sid);
    }
    setSessionId(sid);

    // Fetch user sessions
    fetch('/api/chat/history')
      .then((res) => res.json())
      .then((data) => {
        if (data?.sessions) setSessions(data.sessions);
      })
      .catch(() => {});

    // If initial query provided via URL param
    if (initialQuery) {
      handleSend(initialQuery, sid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const startNewSession = () => {
    const newId = 'session_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('schemesathi_full_session', newId);
    setSessionId(newId);
    setMessages([
      {
        role: 'assistant',
        content:
          'Started a fresh conversation session. Ask me anything about Indian central and state welfare programmes or general topics.',
      },
    ]);
  };

  const loadSession = async (sid: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/chat/history?sessionId=${sid}`);
      const data = await res.json();
      if (data?.session) {
        setSessionId(data.session.sessionId);
        localStorage.setItem('schemesathi_full_session', data.session.sessionId);
        setMessages(
          data.session.messages.map((m: { role: 'user' | 'assistant'; content: string; citedSchemes?: Array<{ schemeId?: string; title: string; slug?: string; url?: string }> }) => ({
            role: m.role,
            content: m.content,
            citedSchemes: m.citedSchemes,
          }))
        );
      }
    } catch {
      // error handling
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-8rem)] min-h-[600px] flex flex-col md:flex-row gap-6">
      {/* Sidebar: Past Conversations & Suggested Topics */}
      <div className="w-full md:w-72 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hidden md:flex shrink-0">
        <div className="space-y-4">
          <button
            onClick={startNewSession}
            className="w-full py-2.5 px-4 bg-[#0b2545] hover:bg-[#0d9488] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Conversation</span>
          </button>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block px-2">
              Recent Chats
            </span>
            <div className="space-y-1 overflow-y-auto max-h-[300px] pr-1">
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-400 px-2 py-3 italic">No saved history yet.</p>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.sessionId}
                    onClick={() => loadSession(s.sessionId)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs truncate transition-colors flex items-center gap-2 ${
                      s.sessionId === sessionId
                        ? 'bg-slate-100 text-[#0b2545] font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{s.title || 'Conversation'}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Suggested Queries */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Suggested Queries
          </span>
          <div className="space-y-1.5 text-xs text-slate-600">
            <button
              onClick={() => handleSend('give any job application that are available')}
              className="text-left hover:text-[#0d9488] flex items-center gap-1.5 truncate w-full font-medium text-slate-700"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#0d9488] shrink-0" />
              <span className="truncate">Available Job Applications</span>
            </button>
            <button
              onClick={() => handleSend('Scholarships for Karnataka engineering students')}
              className="text-left hover:text-[#0d9488] block truncate w-full"
            >
              • Karnataka Student Aid
            </button>
            <button
              onClick={() => handleSend('What documents are needed for PM Kisan Samman Nidhi?')}
              className="text-left hover:text-[#0d9488] block truncate w-full"
            >
              • PM-KISAN Required Docs
            </button>
            <button
              onClick={() => handleSend('Explain artificial intelligence in simple words')}
              className="text-left hover:text-[#0d9488] block truncate w-full"
            >
              • General: Explain AI simply
            </button>
          </div>
        </div>
      </div>

      {/* Main Conversation Window */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0b2545] flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5 text-[#14b8a6]" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-[#0b2545]">SchemeSathi AI Assistant</h2>
              <p className="text-[11px] text-slate-500">
                Powered by Groq AI & Official Indian Government Scheme Repository
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={startNewSession}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-white transition-colors md:hidden"
            >
              New Chat
            </button>
            <Link
              href="/schemes"
              className="text-xs font-semibold text-[#0d9488] hover:underline flex items-center gap-1"
            >
              Scheme Directory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[95%] sm:max-w-[88%] lg:max-w-[85%] rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-[#0b2545] text-white rounded-br-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                  }`}
                >
                  <FormattedMessage content={msg.content} isUser={isUser} />

                  {/* Cited Schemes */}
                  {msg.citedSchemes && msg.citedSchemes.length > 0 && (
                    <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Verified Government Schemes & Recruitments Cited:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.citedSchemes.map((scheme, sIdx) => (
                          <div
                            key={sIdx}
                            className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 flex items-center justify-between gap-2 hover:bg-slate-100/60 transition-colors"
                          >
                            <span className="font-semibold text-xs text-slate-800 truncate">
                              {scheme.title}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {scheme.slug && (
                                <Link
                                  href={`/schemes/${scheme.slug}`}
                                  className="text-xs font-bold text-[#0d9488] hover:underline"
                                >
                                  View
                                </Link>
                              )}
                              {scheme.url && (
                                <a
                                  href={scheme.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-slate-400 hover:text-slate-700"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Assistant Copy action */}
                {!isUser && (
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <button
                      onClick={() => copyToClipboard(msg.content, idx)}
                      className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy Answer
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-slate-500 text-xs py-3 px-4 bg-white rounded-xl border border-slate-200 w-fit">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-[#0d9488] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-[#0d9488] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-[#0d9488] rounded-full animate-bounce"></div>
              </div>
              <span>Searching verified official scheme records & generating response...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 bg-white border-t border-slate-200 flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about schemes, eligibility, required documents, or general topics..."
            className="flex-1 px-4 py-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488] text-slate-900"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 py-3 bg-[#0b2545] hover:bg-[#0d9488] disabled:opacity-50 text-white font-medium text-sm rounded-xl transition-colors flex items-center gap-2 shrink-0 shadow-sm"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-[#0d9488] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-3">Initializing AI Assistant...</p>
        </div>
      }
    >
      <AssistantContent />
    </Suspense>
  );
}
