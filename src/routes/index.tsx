import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Download, Loader2, FileDown } from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import { generateInitialPlan } from '../services/aiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const RankAdvancement = lazy(() =>
  import('../components/RankAdvancement').then((module) => ({
    default: module.RankAdvancement,
  })),
);

export const Route = createFileRoute('/')({ component: Dashboard });

function Dashboard() {
  const navigate = useNavigate();
  const { userData, isLoading, updateAIPlan } = useUserData();
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [completedEagleBadges, setCompletedEagleBadges] = useState(0);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Load checked state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('scoutly_plan_checkboxes');
    if (saved) {
      try {
        setCheckedItems(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load checkbox state:', e);
      }
    }
  }, [userData?.aiPlan?.plan]); // Reload when plan changes

  // Redirect to onboarding if no profile name
  useEffect(() => {
    if (!isLoading && userData && !userData.profile.name) {
      navigate({ to: '/onboarding' });
    }
  }, [userData, isLoading, navigate]);

  useEffect(() => {
    let isMounted = true;

    if (!userData) {
      setCompletedEagleBadges(0);
      return;
    }

    import('../lib/progress')
      .then(({ countEagleRequiredCompleted }) => {
        if (!isMounted) return;
        setCompletedEagleBadges(countEagleRequiredCompleted(userData));
      })
      .catch((error) => {
        console.error('Failed to load merit badge progress module:', error);
      });

    return () => {
      isMounted = false;
    };
  }, [userData]);

  const handleGeneratePlan = async () => {
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

  const handleDownloadPlan = () => {
    if (!userData?.aiPlan?.plan) return;
    
    const blob = new Blob([userData.aiPlan.plan], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eagle-scout-plan-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    if (!userData?.aiPlan?.plan) return;

    // Create a printable version
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const planContent = userData.aiPlan.plan
      .replace(/^## /gm, '<h2 style="color: #22d3ee; margin-top: 24px; margin-bottom: 12px;">')
      .replace(/\n/g, '</h2>\n')
      .replace(/^### /gm, '<h3 style="color: #06b6d4; margin-top: 16px; margin-bottom: 8px;">')
      .replace(/- \[ \] /g, '☐ ')
      .replace(/- \[x\] /g, '☑ ')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color: #22d3ee;">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em style="color: #3b82f6;">$1</em>')
      .replace(/^- /gm, '• ')
      .replace(/\n/g, '<br>');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Eagle Scout Plan - ${userData.profile.name}</title>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
              color: #1e293b;
              background: white;
            }
            h1 {
              color: #0f172a;
              border-bottom: 3px solid #22d3ee;
              padding-bottom: 12px;
              margin-bottom: 24px;
            }
            h2 {
              color: #22d3ee;
              margin-top: 24px;
              margin-bottom: 12px;
            }
            h3 {
              color: #06b6d4;
              margin-top: 16px;
              margin-bottom: 8px;
            }
            strong {
              color: #22d3ee;
            }
            em {
              color: #3b82f6;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e2e8f0;
              font-size: 12px;
              color: #64748b;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🦅 Eagle Scout Plan</h1>
            <p><strong>${userData.profile.name}</strong> • ${userData.profile.currentRank || 'Scout'} Rank</p>
            <p>Generated: ${new Date().toLocaleDateString()}</p>
          </div>
          ${planContent}
          <div class="footer">
            <p>Generated by Scoutly • ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Calculate real stats
  const calculateStats = () => {
    if (!userData) return { completed: 0, total: 21, events: 0, daysToEagle: '--', percentage: 0 };

    const completedCount = completedEagleBadges;

    let daysToEagle = '--';
    if (userData.profile.targetEagleDate) {
      const targetDate = new Date(userData.profile.targetEagleDate);
      const today = new Date();
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysToEagle = diffDays > 0 ? diffDays.toString() : 'Past';
    }

    return {
      completed: completedCount,
      total: 21,
      events: userData.events?.length || 0,
      daysToEagle,
      percentage: Math.round((completedCount / 21) * 100),
    };
  };

  if (isLoading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-slate-500">Loading your journey...</p>
        </div>
      </div>
    );
  }

  const userName = userData?.profile?.name || 'Scout';
  const currentRankId = userData?.profile?.currentRank || 'rank_scout';
  const normalizedCurrentRank = currentRankId.startsWith('rank_')
    ? currentRankId.replace('rank_', '').replace(/_/g, ' ')
    : currentRankId;
  
  // In-progress rank is always the next rank after the current completed rank
  const RANK_ORDER = [
    'rank_scout',
    'rank_tenderfoot',
    'rank_second_class',
    'rank_first_class',
    'rank_star',
    'rank_life',
    'rank_eagle',
  ];
  const currentRankIndex = RANK_ORDER.indexOf(currentRankId.startsWith('rank_') ? currentRankId : `rank_${currentRankId}`);
  const inProgressRankId = currentRankIndex >= 0 && currentRankIndex < RANK_ORDER.length - 1
    ? RANK_ORDER[currentRankIndex + 1]
    : null;
  const inProgressRankLabel = inProgressRankId
    ? inProgressRankId.replace('rank_', '').replace(/_/g, ' ')
    : null;
  const stats = calculateStats();
  const currentPlan = userData?.aiPlan?.plan;

  return (
    <div className="app-shell">
      <div className="app-shell__grid fixed inset-0" />
      <div className="app-shell__glow app-shell__glow--top fixed" />
      <div className="app-shell__glow app-shell__glow--bottom fixed" />

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-sky-600 shadow-[0_12px_28px_rgba(14,165,233,0.22)]">
              <span className="text-2xl">🧭</span>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Dashboard</p>
              <h1 className="text-3xl font-bold text-slate-950">
                Welcome back, <span className="text-emerald-700">{userName}</span>
              </h1>
              <p className="text-slate-600">Let's continue your Eagle Scout journey</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Progress Card */}
          <Link to="/merit-badges/" className="block">
            <div className="app-surface rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:border-emerald-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <span className="text-xl">🎯</span>
                </div>
                <span className="text-2xl font-bold text-slate-950">{stats.percentage}%</span>
              </div>
              <h3 className="text-sm font-medium text-slate-500">Overall Progress</h3>
            </div>
          </Link>

          {/*
          <Link to="/advancement" className="block">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-cyan-500/50 transition-all backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🦅</span>
                </div>
              </div>
              <h3 className="text-slate-300 text-sm font-medium mb-1">Current rank</h3>
              <p className="text-lg font-semibold text-white capitalize">
                {normalizedCurrentRank}
              </p>
              {inProgressRankLabel && (
                <p className="text-xs text-slate-400 mt-1">
                  In progress: <span className="capitalize text-cyan-300">{inProgressRankLabel}</span>
                </p>
              )}
            </div>
          </Link> Rank status card */}

          {/* Merit Badges Card */}
          <Link to="/merit-badges/" className="block">
            <div className="app-surface rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:border-emerald-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <span className="text-xl">🏅</span>
                </div>
                <span className="text-2xl font-bold text-slate-950">{stats.completed}/{stats.total}</span>
              </div>
              <h3 className="text-sm font-medium text-slate-500">Eagle Required</h3>
            </div>
          </Link>

          {/* Upcoming Events Card */}
          <Link to="/events" className="block">
            <div className="app-surface rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:border-sky-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <span className="text-xl">📅</span>
                </div>
                <span className="text-2xl font-bold text-slate-950">{stats.events}</span>
              </div>
              <h3 className="text-sm font-medium text-slate-500">Upcoming Events</h3>
            </div>
          </Link>

          {/* Days to Eagle Card */}
          <div className="app-surface rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:border-emerald-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <span className="text-xl">📈</span>
              </div>
              <span className="text-2xl font-bold text-slate-950">{stats.daysToEagle}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-500">Days to Goal</h3>
          </div>
        </div>

        {/* Main Content Grid - More balanced 5-column layout (3:2 ratio) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* AI Eagle Plan - Featured Section */}
          <div className="app-surface overflow-hidden rounded-3xl lg:col-span-3">
            {/* Header */}
            <div className="border-b border-slate-200 bg-linear-to-r from-emerald-50 via-white to-sky-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-linear-to-br from-emerald-500 to-sky-600 p-2 shadow-[0_12px_24px_rgba(14,165,233,0.2)]">
                    <span className="text-xl">🦅</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">Your Eagle Scout Plan</h2>
                    <p className="text-sm text-emerald-700">AI-powered personalized roadmap</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentPlan && (
                    <>
                      <button
                        onClick={handleDownloadPDF}
                        className="rounded-lg p-2 text-emerald-700 transition-colors hover:bg-white"
                        title="Download as PDF"
                      >
                        <FileDown className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleDownloadPlan}
                        className="rounded-lg p-2 text-emerald-700 transition-colors hover:bg-white"
                        title="Download as Markdown"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  <Link
                    to="/ai-coach"
                    className="rounded-lg p-2 transition-colors hover:bg-white"
                    title="Open AI Coach chat"
                  >
                    <span className="text-xl">💬</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Plan Content */}
            <div className="p-6">
              {currentPlan ? (
                <div className="prose prose-sm max-w-none prose-headings:text-slate-950 prose-p:text-slate-600">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="mb-4 text-2xl font-bold text-slate-950">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="mb-3 mt-6 text-xl font-bold text-slate-950">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="mb-2 mt-4 text-lg font-semibold text-emerald-700">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="mb-3 leading-relaxed text-slate-600">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="mb-4 space-y-2 text-slate-600">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="mb-4 list-decimal list-inside space-y-2 text-slate-600">{children}</ol>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                          <table className="w-full border-collapse border border-slate-200">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-emerald-50">{children}</thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="divide-y divide-slate-200">{children}</tbody>
                      ),
                      tr: ({ children }) => (
                        <tr className="border-b border-slate-200">{children}</tr>
                      ),
                      th: ({ children }) => (
                        <th className="border border-slate-200 px-4 py-2 text-left font-semibold text-emerald-700">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-slate-200 px-4 py-2 text-slate-600">{children}</td>
                      ),
                      li: ({ children }) => {
                        const childText = String(children);
                        // Check if this is a task list item (starts with [ ] or [x])
                        if (childText.includes('[ ]') || childText.includes('[x]')) {
                          const isInitiallyChecked = childText.includes('[x]');
                          const text = childText.replace(/\[[ x]\]\s*/, '');
                          
                          // Create a unique ID for this checkbox based on text content
                          const checkboxId = `checkbox-${text.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '-')}`;
                          const isChecked = checkedItems[checkboxId] ?? isInitiallyChecked;
                          
                          return (
                            <li className="flex items-start gap-2 text-slate-600">
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
                                className="mt-1 h-4 w-4 cursor-pointer rounded border-emerald-400 bg-white text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className={isChecked ? 'text-slate-400 line-through' : ''}>{text}</span>
                            </li>
                          );
                        }
                        return <li className="ml-6 text-slate-600">{children}</li>;
                      },
                      strong: ({ children }) => (
                        <strong className="font-semibold text-emerald-700">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="text-sky-700">{children}</em>
                      ),
                      a: ({ href, children }) => {
                        // Extract text from children (handle both string and array cases)
                        const linkText = typeof children === 'string' 
                          ? children 
                          : Array.isArray(children) 
                            ? children.join('') 
                            : String(children);
                        
                        return (
                          <a 
                            href={href} 
                            className="font-medium text-sky-700 underline transition-colors hover:text-sky-600"
                            target={href?.startsWith('http') ? '_blank' : undefined}
                            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                          >
                            {linkText}
                          </a>
                        );
                      },
                      code: ({ children }) => (
                        <code className="rounded bg-slate-100 px-2 py-1 text-sm text-emerald-700">{children}</code>
                      ),
                      hr: () => (
                        <hr className="my-6 border-slate-200" />
                      ),
                    }}
                  >
                    {currentPlan}
                  </ReactMarkdown>
                  {userData?.aiPlan?.lastUpdated && (
                    <p className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
                      Last updated: {new Date(userData.aiPlan.lastUpdated).toLocaleDateString()} at{' '}
                      {new Date(userData.aiPlan.lastUpdated).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <span className="text-3xl">📋</span>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-slate-950">No Plan Yet</h3>
                  <p className="mx-auto mb-6 max-w-md text-slate-600">
                    Let our AI coach create a personalized roadmap to help you reach Eagle Scout based on your progress and goals.
                  </p>
                  <button
                    onClick={handleGeneratePlan}
                    disabled={isGeneratingPlan}
                    className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-emerald-600 to-sky-600 px-6 py-3 font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                  >
                    {isGeneratingPlan ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Plan...
                      </>
                    ) : (
                      <>
                        Generate My Eagle Plan
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Quick Actions & Rank Advancement */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions look to bad so not including */}
            

            {/* Rank Advancement Checklist */}
            {userData && (
              <Suspense
                fallback={
                  <div className="app-surface rounded-2xl p-6">
                    <p className="text-sm text-slate-500">Loading rank advancement...</p>
                  </div>
                }
              >
                <RankAdvancement userData={userData} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
