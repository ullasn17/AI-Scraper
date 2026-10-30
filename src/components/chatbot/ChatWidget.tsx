'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  ExternalLink, 
  Maximize2, 
  Minimize2,
  RefreshCw,
  Copy,
  Check,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';
import FormattedMessage from './FormattedMessage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citedSchemes?: Array<{
    schemeId?: string;
    title: string;
    slug?: string;
    url?: string;
  }>;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Namaste! I am SchemeSathi AI. You can ask me general questions or inquire about Indian central and state government schemes, scholarships, and welfare benefits. How can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('schemesathi_chat_session');
      if (stored) return stored;
      const newId = 'session_' + Math.random().toString(36).substring(2, 11);
      try {
        localStorage.setItem('schemesathi_chat_session', newId);
      } catch {
        // localStorage not available
      }
      return newId;
    }
    return '';
  });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          citedSchemes: data.citedSchemes,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error reaching assistant';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ ${msg}. Please verify your connection or try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const resetChat = () => {
    const newId = 'session_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('schemesathi_chat_session', newId);
    setSessionId(newId);
    setMessages([
      {
        role: 'assistant',
        content: 'New chat started. How can I assist you with government schemes or general queries today?',
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-[#0b2545] hover:bg-[#0d9488] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group border border-slate-700/30"
          aria-label="Open AI Assistant"
        >
          <div className="w-6 h-6 rounded-full bg-[#0d9488] group-hover:bg-[#14b8a6] flex items-center justify-center transition-colors">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-wide">Ask SchemeSathi AI</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-300 ${
            isExpanded
              ? 'fixed inset-4 md:inset-10 z-50'
              : 'w-[92vw] sm:w-[420px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-[#0b2545] px-4 py-3.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0d9488] flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">SchemeSathi AI</h3>
                <p className="text-[11px] text-teal-200">Official Schemes & General Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-300">
              <button
                onClick={resetChat}
                title="New Chat"
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Restore' : 'Maximize'}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors hidden sm:block"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 text-slate-800 text-sm">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[95%] sm:max-w-[90%] rounded-2xl px-4 py-3 leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-[#0b2545] text-white rounded-br-sm text-sm'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-sm'
                    }`}
                  >
                    <FormattedMessage content={msg.content} isUser={isUser} />

                    {/* Cited Scheme Badges */}
                    {msg.citedSchemes && msg.citedSchemes.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                          Referenced Schemes & Recruitments:
                        </span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {msg.citedSchemes.map((scheme, sIdx) => (
                            <div
                              key={sIdx}
                              className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-lg p-2 text-xs flex items-center justify-between transition-colors"
                            >
                              <span className="font-semibold text-slate-800 truncate mr-2">
                                {scheme.title}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {scheme.slug && (
                                  <Link
                                    href={`/schemes/${scheme.slug}`}
                                    className="px-2 py-0.5 bg-[#0b2545] hover:bg-[#0d9488] text-white text-[11px] font-medium rounded transition-colors"
                                    onClick={() => setIsOpen(false)}
                                  >
                                    Details
                                  </Link>
                                )}
                                {scheme.url && (
                                  <a
                                    href={scheme.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200/50"
                                    title="Official Source"
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

                  {/* Actions under assistant message */}
                  {!isUser && (
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <button
                        onClick={() => copyToClipboard(msg.content, idx)}
                        className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-600 text-xs py-2 px-3 bg-white rounded-lg border border-slate-200 w-fit">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[#0d9488] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-[#0d9488] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-[#0d9488] rounded-full animate-bounce"></div>
                </div>
                <span>Checking official records & Groq AI...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-slate-100/70 border-t border-slate-200 flex gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
              <button
                onClick={() => handleSend('give any job application that are available')}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-slate-700 whitespace-nowrap flex items-center gap-1"
              >
                <Briefcase className="w-3 h-3 text-[#0d9488]" /> Available Job Applications
              </button>
              <button
                onClick={() => handleSend('Scholarships for college students in Karnataka')}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-slate-700 whitespace-nowrap"
              >
                🎓 Karnataka Scholarships
              </button>
              <button
                onClick={() => handleSend('Financial schemes for small farmers')}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-slate-700 whitespace-nowrap"
              >
                🌾 Farmer Schemes
              </button>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about schemes, eligibility, or general questions..."
              className="flex-1 px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent text-slate-900"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2.5 bg-[#0b2545] hover:bg-[#0d9488] disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
