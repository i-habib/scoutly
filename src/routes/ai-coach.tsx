import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  Children,
  type ReactNode,
} from 'react';
import { Send, FileText, Loader2, ArrowLeft } from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import { ScoutFleurDeLis } from '../components/ScoutIcons';
import {
  sendChatMessage,
  generateInitialPlan,
  type EventAnalysis,
} from '../services/aiService';
import type { ChatMessage } from '../data/userData';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const Route = createFileRoute('/ai-coach')({
  component: AICoach,
});

const SUMMARY_STORAGE_KEY = 'scoutly_monthly_focus_summary';

const flattenChildrenToText = (node: ReactNode): string =>
  Children.toArray(node)
    .map(child => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child);
      }
      if (typeof child === 'object' && child && 'props' in child) {
        const nested = (child as { props?: { children?: ReactNode } }).props?.children;
        return nested ? flattenChildrenToText(nested) : '';
      }
      return '';
    })
    .join('');

function AICoach() {
  const navigate = useNavigate();
  const { userData, updateAIPlan, addChatMessage, clearChatHistory } = useUserData();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [eventAnalysis, setEventAnalysis] = useState<Record<string, EventAnalysis>>({});
  const [monthlySummary, setMonthlySummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatHistory = userData?.aiPlan?.chatHistory || [];
  const currentPlan = userData?.aiPlan?.plan || '';

  // Load checked state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('scoutly_plan_checkboxes');
    if (saved) {
      try {
        setCheckedItems(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load checkbox state:', e);
      }
    }
  }, [currentPlan]); // Reload when plan changes

  useEffect(() => {
    const savedAnalysis = localStorage.getItem('scoutly_event_analysis');
    if (savedAnalysis) {
      try {
        setEventAnalysis(JSON.parse(savedAnalysis));
      } catch (error) {
        console.error('Failed to parse saved event analysis:', error);
      }
    }

    const savedSummary = localStorage.getItem(SUMMARY_STORAGE_KEY);
    if (savedSummary) {
      setMonthlySummary(savedSummary);
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'scoutly_event_analysis') {
        try {
          const parsed = event.newValue ? JSON.parse(event.newValue) : {};
          setEventAnalysis(parsed);
        } catch (error) {
          console.error('Failed to parse updated event analysis:', error);
        }
      }

      if (event.key === SUMMARY_STORAGE_KEY) {
        setMonthlySummary(event.newValue ?? null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleGenerateMonthlySummary = useCallback(async () => {
    if (!userData) return;

    if (Object.keys(eventAnalysis).length === 0) {
      setSummaryError('Analyze your upcoming events first to unlock the monthly focus.');
      return;
    }

    setIsSummarizing(true);
    setSummaryError(null);
    try {
      // TODO: Implement monthly summary feature
      setMonthlySummary('Monthly summary feature coming soon!');
      localStorage.setItem(SUMMARY_STORAGE_KEY, 'Monthly summary feature coming soon!');
    } catch (error) {
      console.error('Failed to summarize events:', error);
      if (error instanceof Error) {
        setSummaryError(error.message);
      } else {
        setSummaryError('Failed to generate the summary. Please try again.');
      }
    } finally {
      setIsSummarizing(false);
    }
  }, [eventAnalysis, userData]);

  useEffect(() => {
    if (!userData) return;
    if (monthlySummary || isSummarizing || summaryError) return;
    if (Object.keys(eventAnalysis).length === 0) return;

    void handleGenerateMonthlySummary();
  }, [eventAnalysis, handleGenerateMonthlySummary, isSummarizing, monthlySummary, summaryError, userData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleGenerateInitialPlan = async () => {
    if (!userData) return;
    
    setIsGeneratingPlan(true);
    try {
      const plan = await generateInitialPlan(userData);
      await updateAIPlan(plan, []);
    } catch (error) {
      console.error('Failed to generate plan:', error);
      alert('Failed to generate plan. Please try again.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !userData || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setInput('');
    setIsLoading(true);

    try {
      // Add user message to history
      await addChatMessage(userMessage);

      // Convert our chat history to Gemini format
      const geminiHistory = chatHistory.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      // Get AI response
      const { response, updatedPlan } = await sendChatMessage(
        userMessage.content,
        userData,
        geminiHistory as any
      );

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      await addChatMessage(assistantMessage);

      // Update the plan
      if (updatedPlan) {
        const updatedHistory = [...chatHistory, userMessage, assistantMessage];
        await updateAIPlan(updatedPlan, updatedHistory);
      }
    } catch (error) {
      console.error('Chat error:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear the chat history? Your plan will remain.')) {
      await clearChatHistory();
    }
  };

  if (!userData) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen">
      {/* Dotted Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'radial-gradient(#0b3b12 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      />
      {/* Gradient Glow */}
      <div className="fixed -top-1/4 -left-1/4 w-1/2 h-1/2 bg-green-500/10 rounded-full blur-[150px] animate-pulse pointer-events-none" />
      <div className="fixed -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-cyan-500/10 rounded-full blur-[150px] animate-pulse [animation-delay:2s] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          {chatHistory.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              Clear History
            </button>
          )}
        </div>

        <div className="mb-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-6 py-4 border-b border-white/10 bg-green-500/10">
              <div>
                <h2 className="text-lg font-semibold text-white">Monthly Focus Briefing</h2>
                <p className="text-sm text-green-100">
                  Highlights for the next 30 days pulled from your analyzed events.
                </p>
              </div>
              <button
                onClick={handleGenerateMonthlySummary}
                disabled={isSummarizing}
                className="self-start md:self-auto px-4 py-2 bg-linear-to-r from-green-500 to-cyan-600 text-black font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {isSummarizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <ScoutFleurDeLis className="w-4 h-4" size={16} />
                    Regenerate Summary
                  </>
                )}
              </button>
            </div>
            <div className="px-6 py-5">
              {summaryError && (
                <p className="text-sm text-rose-300 mb-3">{summaryError}</p>
              )}

              {monthlySummary ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h2: ({ children }) => (
                        <h2 className="text-base font-semibold text-white mb-2 mt-3">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-semibold text-green-400 mb-1 mt-2">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-slate-300 text-sm mb-2 leading-relaxed">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="space-y-1 text-slate-300 mb-3 text-sm">{children}</ul>
                      ),
                      li: ({ children }) => (
                        <li className="ml-4 text-slate-300 text-sm">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-green-400 font-semibold">{children}</strong>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-2">
                          <table className="w-full border-collapse border border-white/20 text-sm">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-green-500/20">{children}</thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="divide-y divide-white/10">{children}</tbody>
                      ),
                      tr: ({ children }) => (
                        <tr className="border-b border-white/10">{children}</tr>
                      ),
                      th: ({ children }) => (
                        <th className="px-2 py-1 text-left text-green-400 font-semibold border border-white/20 text-xs">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="px-2 py-1 text-slate-300 border border-white/20 text-xs">{children}</td>
                      ),
                    }}
                  >
                    {monthlySummary}
                  </ReactMarkdown>
                </div>
              ) : !summaryError ? (
                <p className="text-slate-300 text-sm">
                  Run an event analysis and regenerate to see your personalized monthly focus.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Chat Section */}
          <div className="lg:col-span-3">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Chat Header */}
              <div className="bg-green-500/10 border-b border-white/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-linear-to-br from-green-500 to-cyan-600 rounded-xl">
                    <ScoutFleurDeLis className="w-6 h-6 text-black" size={24} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">AI Eagle Scout Coach</h1>
                    <p className="text-sm text-green-300">Your personalized guide to Eagle</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="h-[500px] overflow-y-auto p-6 space-y-4">
                {chatHistory.length === 0 && !currentPlan && (
                  <div className="text-center py-12">
                    <ScoutFleurDeLis className="w-16 h-16 text-green-500/50 mx-auto mb-4" size={64} />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Welcome to Your AI Coach!
                    </h3>
                    <p className="text-slate-400 mb-6">
                      Let's create a personalized plan to help you reach Eagle Scout.
                    </p>
                    <button
                      onClick={handleGenerateInitialPlan}
                      disabled={isGeneratingPlan}
                      className="px-6 py-3 bg-linear-to-r from-green-500 to-cyan-600 text-black font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {isGeneratingPlan ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating Plan...
                        </span>
                      ) : (
                        'Generate My Eagle Plan'
                      )}
                    </button>
                  </div>
                )}

                {chatHistory.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-linear-to-br from-green-500 to-cyan-600 text-black font-semibold'
                          : 'bg-white/10 text-slate-100 border border-white/10'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={`text-xs mt-2 ${
                          message.role === 'user' ? 'text-white/60' : 'text-slate-400'
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 border border-white/10 px-4 py-3 rounded-2xl">
                      <Loader2 className="w-5 h-5 animate-spin text-green-500" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-white/10 p-4 bg-white/5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about merit badges, timeline, or next steps..."
                    disabled={isLoading || !currentPlan}
                    className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading || !currentPlan}
                    className="px-6 py-3 bg-linear-to-r from-green-500 to-cyan-600 text-black font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Plan Sidebar */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-semibold text-white">Your Eagle Plan</h2>
              </div>

              {currentPlan ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h2: ({ children }) => (
                        <h2 className="text-base font-bold text-white mb-2 mt-3">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-semibold text-green-400 mb-1 mt-2">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-slate-300 text-sm mb-2 leading-relaxed">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="space-y-1 text-slate-300 mb-3 text-sm">{children}</ul>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-2">
                          <table className="w-full border-collapse border border-white/20 text-sm">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-green-500/20">{children}</thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="divide-y divide-white/10">{children}</tbody>
                      ),
                      tr: ({ children }) => (
                        <tr className="border-b border-white/10">{children}</tr>
                      ),
                      th: ({ children }) => (
                        <th className="px-2 py-1 text-left text-green-400 font-semibold border border-white/20 text-xs">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="px-2 py-1 text-slate-300 border border-white/20 text-xs">{children}</td>
                      ),
                      li: ({ children }) => {
                        const childText = flattenChildrenToText(children);
                        if (childText.includes('[ ]') || childText.includes('[x]')) {
                          const isInitiallyChecked = childText.includes('[x]');
                          const text = childText.replace(/\[[ x]\]\s*/, '');
                          
                          // Create a unique ID for this checkbox based on text content
                          const checkboxId = `checkbox-${text.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '-')}`;
                          const isChecked = checkedItems[checkboxId] ?? isInitiallyChecked;
                          
                          return (
                            <li className="flex items-start gap-1.5 text-slate-300 text-sm">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const newCheckedItems = {
                                    ...checkedItems,
                                    [checkboxId]: e.target.checked,
                                  };
                                  setCheckedItems(newCheckedItems);
                                  localStorage.setItem('scoutly_plan_checkboxes', JSON.stringify(newCheckedItems));
                                }}
                                className="mt-0.5 w-3 h-3 rounded border-green-500 text-green-500 bg-black cursor-pointer"
                              />
                              <span className={`text-xs ${isChecked ? 'line-through text-slate-500' : ''}`}>{text}</span>
                            </li>
                          );
                        }
                        return <li className="text-slate-300 ml-4 text-sm">{children}</li>;
                      },
                      strong: ({ children }) => (
                        <strong className="text-green-400 font-semibold">{children}</strong>
                      ),
                      a: ({ href, children }) => {
                        // Extract text from children (handle both string and array cases)
                        const linkText = flattenChildrenToText(children);
                        
                        return (
                          <a 
                            href={href} 
                            className="text-green-400 hover:text-green-300 underline text-sm"
                          >
                            {linkText}
                          </a>
                        );
                      },
                      hr: () => (
                        <hr className="border-white/10 my-3" />
                      ),
                    }}
                  >
                    {currentPlan}
                  </ReactMarkdown>
                  {userData.aiPlan?.lastUpdated && (
                    <p className="text-xs text-slate-500 mt-4">
                      Last updated: {new Date(userData.aiPlan.lastUpdated).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">
                    Generate a plan to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
