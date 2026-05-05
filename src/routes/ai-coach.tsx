import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
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
  sendLongTermChatMessage,
  sendShortTermChatMessage,
  generateInitialPlan,
  type EventAnalysis,
  EVENT_ANALYSIS_SCHEMA_VERSION,
} from '../services/aiService';
import type { ChatMessage } from '../data/userData';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const Route = createFileRoute('/ai-coach')({
  beforeLoad: () => {
    throw redirect({ to: '/' });
  },
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
  const [chatMode, setChatMode] = useState<'strategic' | 'tactical'>('tactical');
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
    const saved = localStorage.getItem('scoutly_event_analysis');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && 'version' in parsed && 'analyses' in parsed) {
          if (parsed.version === EVENT_ANALYSIS_SCHEMA_VERSION) {
            setEventAnalysis(parsed.analyses || {});
          } else {
            // Version mismatch -> ignore/purge handled by events page
            setEventAnalysis({});
          }
        } else {
          // Old cache shape; ignore
          setEventAnalysis({});
        }
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
          const parsed = event.newValue ? JSON.parse(event.newValue) : null;
          if (parsed && typeof parsed === 'object' && 'version' in parsed && 'analyses' in parsed) {
            if (parsed.version === EVENT_ANALYSIS_SCHEMA_VERSION) {
              setEventAnalysis(parsed.analyses || {});
            } else {
              setEventAnalysis({});
            }
          } else {
            setEventAnalysis({});
          }
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
      const chatFunction = chatMode === 'strategic' ? sendLongTermChatMessage : sendShortTermChatMessage;
      const { response, updatedPlan } = await chatFunction(
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
      <div className="app-shell flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-600" />
      </div>
    );
  }

  return (
    <div className="app-shell light-overrides">
      <div className="app-shell__content max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          {chatHistory.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50 transition-colors"
            >
              Clear History
            </button>
          )}
        </div>

        <div className="mb-6">
          <div className="app-surface rounded-2xl overflow-hidden">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">Monthly Focus Briefing</h2>
                <p className="text-sm text-stone-500">
                  Highlights for the next 30 days pulled from your analyzed events.
                </p>
              </div>
              <button
                onClick={handleGenerateMonthlySummary}
                disabled={isSummarizing}
                className="self-start md:self-auto rounded-xl bg-stone-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-700 transition-colors disabled:opacity-50 flex items-center gap-2"
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
                <p className="text-sm text-rose-600 mb-3">{summaryError}</p>
              )}

              {monthlySummary ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h2: ({ children }) => (
                        <h2 className="text-base font-semibold text-stone-900 mb-2 mt-3">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-semibold text-stone-700 mb-1 mt-2">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-stone-600 text-sm mb-2 leading-relaxed">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="space-y-1 text-stone-600 mb-3 text-sm">{children}</ul>
                      ),
                      li: ({ children }) => (
                        <li className="ml-4 text-stone-600 text-sm">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-stone-700 font-semibold">{children}</strong>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-2">
                          <table className="w-full border-collapse border border-stone-200 text-sm">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-stone-50">{children}</thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="divide-y divide-stone-200">{children}</tbody>
                      ),
                      tr: ({ children }) => (
                        <tr className="border-b border-stone-200">{children}</tr>
                      ),
                      th: ({ children }) => (
                        <th className="px-2 py-1 text-left text-stone-700 font-semibold border border-stone-200 text-xs">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="px-2 py-1 text-stone-600 border border-stone-200 text-xs">{children}</td>
                      ),
                    }}
                  >
                    {monthlySummary}
                  </ReactMarkdown>
                </div>
              ) : !summaryError ? (
                <p className="text-stone-500 text-sm">
                  Run an event analysis and regenerate to see your personalized monthly focus.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Chat Section */}
          <div className="lg:col-span-3">
            <div className="app-surface rounded-2xl overflow-hidden">
              {/* Chat Header */}
              <div className="bg-stone-50 border-b border-stone-200 px-6 py-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-stone-800 rounded-2xl">
                      <ScoutFleurDeLis className="w-6 h-6 text-white" size={24} />
                    </div>
                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight text-stone-900">AI Eagle Scout Coach</h1>
                      <p className="text-sm text-stone-500">Your personalized guide to Eagle</p>
                    </div>
                  </div>
                </div>
                
                {/* Chat Mode Toggle */}
                <div className="flex items-center gap-2 p-1 bg-stone-100 rounded-2xl border border-stone-200">
                  <button
                    onClick={() => setChatMode('tactical')}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                      chatMode === 'tactical'
                        ? 'bg-stone-800 text-white hover:bg-stone-700'
                        : 'border border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span>Tactical</span>
                      <span className="text-xs opacity-70">Next 2-4 weeks</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setChatMode('strategic')}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                      chatMode === 'strategic'
                        ? 'bg-stone-800 text-white hover:bg-stone-700'
                        : 'border border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span>Strategic</span>
                      <span className="text-xs opacity-70">6+ months</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="h-[500px] overflow-y-auto p-6 space-y-4">
                {chatHistory.length === 0 && !currentPlan && (
                  <div className="text-center py-12">
                    <ScoutFleurDeLis className="w-16 h-16 text-stone-400 mx-auto mb-4" size={64} />
                    <h3 className="text-xl font-semibold text-stone-900 mb-2">
                      Welcome to Your AI Coach!
                    </h3>
                    <p className="text-stone-500 mb-6">
                      Let's create a personalized plan to help you reach Eagle Scout.
                    </p>
                    <button
                      onClick={handleGenerateInitialPlan}
                      disabled={isGeneratingPlan}
                      className="rounded-xl bg-stone-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-700 transition-colors disabled:opacity-50"
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
                          ? 'bg-stone-800 text-white font-medium'
                          : 'bg-white text-stone-700 border border-stone-200 shadow-sm'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h2: ({ children }) => (
                                <h2 className="text-base font-semibold text-stone-900 mb-2 mt-3">{children}</h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-sm font-semibold text-stone-700 mb-1 mt-2">{children}</h3>
                              ),
                              p: ({ children }) => (
                                <p className="text-stone-600 text-sm mb-2 leading-relaxed">{children}</p>
                              ),
                              ul: ({ children }) => (
                                <ul className="space-y-1 text-stone-600 mb-3 text-sm">{children}</ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="space-y-1 text-stone-600 mb-3 text-sm list-decimal list-inside">{children}</ol>
                              ),
                              li: ({ children }) => {
                                const childText = flattenChildrenToText(children);
                                if (childText.includes('[ ]') || childText.includes('[x]')) {
                                  const isInitiallyChecked = childText.includes('[x]');
                                  const text = childText.replace(/\[[ x]\]\s*/, '');
                                  
                                  // Create a unique ID for this checkbox based on text content
                                  const checkboxId = `chat-${message.id}-${text.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '-')}`;
                                  const isChecked = checkedItems[checkboxId] ?? isInitiallyChecked;
                                  
                                  return (
                                    <li className="flex items-start gap-1.5 text-stone-600 text-sm">
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
                                        className="mt-0.5 w-3 h-3 rounded border-stone-400 text-stone-600 bg-white cursor-pointer"
                                      />
                                      <span className={`text-xs ${isChecked ? 'line-through text-stone-400' : ''}`}>{text}</span>
                                    </li>
                                  );
                                }
                                return <li className="text-stone-600 ml-4 text-sm">{children}</li>;
                              },
                              strong: ({ children }) => (
                                <strong className="text-stone-700 font-semibold">{children}</strong>
                              ),
                              em: ({ children }) => (
                                <em className="text-stone-700 italic">{children}</em>
                              ),
                              code: ({ children }) => (
                                <code className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                              ),
                              pre: ({ children }) => (
                                <pre className="bg-stone-100 text-stone-600 p-3 rounded-2xl text-xs overflow-x-auto my-2">{children}</pre>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-stone-300 pl-4 italic text-stone-500 my-2">{children}</blockquote>
                              ),
                              a: ({ href, children }) => {
                                const linkText = flattenChildrenToText(children);
                                return (
                                  <a 
                                    href={href} 
                                    className="text-stone-700 hover:text-stone-800 underline text-sm"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {linkText}
                                  </a>
                                );
                              },
                              hr: () => (
                                <hr className="border-stone-200 my-3" />
                              ),
                              table: ({ children }) => (
                                <div className="overflow-x-auto my-2">
                                  <table className="w-full border-collapse border border-stone-200 text-sm">{children}</table>
                                </div>
                              ),
                              thead: ({ children }) => (
                                <thead className="bg-stone-50">{children}</thead>
                              ),
                              tbody: ({ children }) => (
                                <tbody className="divide-y divide-stone-200">{children}</tbody>
                              ),
                              tr: ({ children }) => (
                                <tr className="border-b border-stone-200">{children}</tr>
                              ),
                              th: ({ children }) => (
                                <th className="px-2 py-1 text-left text-stone-700 font-semibold border border-stone-200 text-xs">{children}</th>
                              ),
                              td: ({ children }) => (
                                <td className="px-2 py-1 text-stone-600 border border-stone-200 text-xs">{children}</td>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                      <p
                        className={`text-xs mt-2 ${
                          message.role === 'user' ? 'text-white/75' : 'text-stone-400'
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-stone-200 px-4 py-3 rounded-2xl shadow-sm">
                      <Loader2 className="w-5 h-5 animate-spin text-stone-600" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-stone-200 p-4 bg-white/70">
                {/* Mode Description */}
                <div className="mb-3 px-2 text-xs text-stone-500">
                  {chatMode === 'tactical' ? (
                    <p>
                      💡 <span className="text-stone-700 font-semibold">Tactical Mode:</span> Get detailed action plans for the next 2-4 weeks with specific steps.
                    </p>
                  ) : (
                    <p>
                      🎯 <span className="text-stone-700 font-semibold">Strategic Mode:</span> Get high-level guidance for long-term planning (6+ months).
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      chatMode === 'tactical'
                        ? "Ask: What should I work on this month?"
                        : "Ask: How do I reach Eagle by June 2026?"
                    }
                    disabled={isLoading || !currentPlan}
                    className="flex-1 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading || !currentPlan}
                    className="rounded-xl bg-stone-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Plan Sidebar */}
          <div className="lg:col-span-2">
            <div className="app-surface rounded-2xl p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-stone-600" />
                <h2 className="text-lg font-semibold text-stone-900">Your Eagle Plan</h2>
              </div>

              {currentPlan ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h2: ({ children }) => (
                        <h2 className="text-base font-semibold text-stone-900 mb-2 mt-3">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-semibold text-stone-700 mb-1 mt-2">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-stone-600 text-sm mb-2 leading-relaxed">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="space-y-1 text-stone-600 mb-3 text-sm">{children}</ul>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-2">
                          <table className="w-full border-collapse border border-stone-200 text-sm">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-stone-50">{children}</thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="divide-y divide-stone-200">{children}</tbody>
                      ),
                      tr: ({ children }) => (
                        <tr className="border-b border-stone-200">{children}</tr>
                      ),
                      th: ({ children }) => (
                        <th className="px-2 py-1 text-left text-stone-700 font-semibold border border-stone-200 text-xs">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="px-2 py-1 text-stone-600 border border-stone-200 text-xs">{children}</td>
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
                            <li className="flex items-start gap-1.5 text-stone-600 text-sm">
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
                                className="mt-0.5 w-3 h-3 rounded border-stone-400 text-stone-600 bg-white cursor-pointer"
                              />
                              <span className={`text-xs ${isChecked ? 'line-through text-stone-400' : ''}`}>{text}</span>
                            </li>
                          );
                        }
                        return <li className="text-stone-600 ml-4 text-sm">{children}</li>;
                      },
                      strong: ({ children }) => (
                        <strong className="text-stone-700 font-semibold">{children}</strong>
                      ),
                      a: ({ href, children }) => {
                        // Extract text from children (handle both string and array cases)
                        const linkText = flattenChildrenToText(children);
                        
                        return (
                          <a 
                            href={href} 
                            className="text-stone-700 hover:text-stone-800 underline text-sm"
                          >
                            {linkText}
                          </a>
                        );
                      },
                      hr: () => (
                        <hr className="border-stone-200 my-3" />
                      ),
                    }}
                  >
                    {currentPlan}
                  </ReactMarkdown>
                  {userData.aiPlan?.lastUpdated && (
                    <p className="text-xs text-stone-400 mt-4">
                      Last updated: {new Date(userData.aiPlan.lastUpdated).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-stone-500 mx-auto mb-3" />
                  <p className="text-stone-400 text-sm">
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
