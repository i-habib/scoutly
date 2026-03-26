import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Award,
  ChevronRight,
  CalendarRange,
  Clock3,
  Download,
  FileDown,
  FileText,
  Loader2,
  Route as RouteIcon,
  ShieldCheck,
} from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import { generateInitialPlan } from '../services/aiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScoutFleurDeLis } from '../components/ScoutIcons';

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

  useEffect(() => {
    const saved = localStorage.getItem('scoutly_plan_checkboxes');
    if (saved) {
      try {
        setCheckedItems(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load checkbox state:', e);
      }
    }
  }, [userData?.aiPlan?.plan]);

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

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const planContent = userData.aiPlan.plan
      .replace(/^## /gm, '<h2 style="color: #24584b; margin-top: 24px; margin-bottom: 12px;">')
      .replace(/\n/g, '</h2>\n')
      .replace(/^### /gm, '<h3 style="color: #1f3448; margin-top: 16px; margin-bottom: 8px;">')
      .replace(/- \[ \] /g, 'Open item: ')
      .replace(/- \[x\] /g, 'Completed: ')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color: #24584b;">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em style="color: #1f3448;">$1</em>')
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
              font-family: "Avenir Next", "Segoe UI", Arial, sans-serif;
              max-width: 840px;
              margin: 40px auto;
              padding: 24px;
              line-height: 1.65;
              color: #18232f;
              background: #ffffff;
            }
            h1 {
              color: #18232f;
              border-bottom: 3px solid #c89b52;
              padding-bottom: 12px;
              margin-bottom: 24px;
            }
            h2 {
              color: #24584b;
              margin-top: 24px;
              margin-bottom: 12px;
            }
            h3 {
              color: #1f3448;
              margin-top: 16px;
              margin-bottom: 8px;
            }
            strong {
              color: #24584b;
            }
            em {
              color: #1f3448;
            }
            .header {
              text-align: center;
              margin-bottom: 36px;
            }
            .eyebrow {
              margin-bottom: 10px;
              font-size: 12px;
              font-weight: 700;
              letter-spacing: 0.24em;
              text-transform: uppercase;
              color: #617080;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              font-size: 12px;
              color: #617080;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <p class="eyebrow">Scoutly Planning Workspace</p>
            <h1>Eagle Scout Roadmap</h1>
            <p><strong>${userData.profile.name}</strong> • ${userData.profile.currentRank || 'Scout'} Rank</p>
            <p>Generated ${new Date().toLocaleDateString()}</p>
          </div>
          ${planContent}
          <div class="footer">
            <p>Generated by Scoutly on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

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
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-[#24584b] border-t-transparent"></div>
          <p className="text-slate-500">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  const userName = userData?.profile?.name || 'Scout';
  const currentRankId = userData?.profile?.currentRank || 'rank_scout';
  const normalizedCurrentRank = currentRankId.startsWith('rank_')
    ? currentRankId.replace('rank_', '').replace(/_/g, ' ')
    : currentRankId;

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
  const inProgressRankId =
    currentRankIndex >= 0 && currentRankIndex < RANK_ORDER.length - 1
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

      <div className="app-shell__content mx-auto max-w-7xl px-6 py-8">
        <section className="app-surface mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f3448] text-white">
                  <ScoutFleurDeLis className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Dashboard</p>
                  <p className="text-sm text-slate-500">Central workspace</p>
                </div>
              </div>
              <h1 className="text-3xl font-semibold text-slate-950">{userName}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Current rank: {capitalizeWords(normalizedCurrentRank)}.
                {inProgressRankLabel ? ` Next rank in progress: ${capitalizeWords(inProgressRankLabel)}.` : ''}
                {' '}Use the sections below to review roadmap, badges, events, and advancement.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[28rem]">
              <SummaryTile label="Current rank" value={capitalizeWords(normalizedCurrentRank)} />
              <SummaryTile label="Days to goal" value={stats.daysToEagle} />
              <SummaryTile label="Upcoming events" value={`${stats.events}`} />
            </div>
          </div>
        </section>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            to="/merit-badges/"
            icon={<Award className="h-5 w-5" />}
            label="Overall progress"
            value={`${stats.percentage}%`}
            detail={`${stats.completed} of ${stats.total} Eagle-required badges complete`}
          />
          <StatCard
            to="/merit-badges/"
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Badge completion"
            value={`${stats.completed}/${stats.total}`}
            detail="Track progress across every Eagle-required badge."
          />
          <StatCard
            to="/events"
            icon={<CalendarRange className="h-5 w-5" />}
            label="Upcoming events"
            value={`${stats.events}`}
            detail="Review the calendar items that can unlock requirements next."
          />
          <StatCard
            icon={<Clock3 className="h-5 w-5" />}
            label="Days to target"
            value={stats.daysToEagle}
            detail="Measured against your current Eagle target date."
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="app-surface overflow-hidden rounded-2xl lg:col-span-3">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1f3448] text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">Roadmap</h2>
                  <p className="text-sm text-slate-600">
                    Planning notes based on your profile, progress, and schedule.
                  </p>
                </div>
              </div>

              {currentPlan ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
                    title="Download as PDF"
                  >
                    <FileDown className="h-4 w-4" />
                    PDF
                  </button>
                  <button
                    onClick={handleDownloadPlan}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
                    title="Download as Markdown"
                  >
                    <Download className="h-4 w-4" />
                    Markdown
                  </button>
                </div>
              ) : null}
            </div>

            <div className="p-6">
              {currentPlan ? (
                <div className="prose prose-sm max-w-none prose-headings:text-slate-950 prose-p:text-slate-600">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="mb-4 text-2xl font-semibold text-slate-950">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="mb-3 mt-6 text-xl font-semibold text-slate-950">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="mb-2 mt-5 text-lg font-semibold text-[#24584b]">{children}</h3>
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
                        <div className="my-4 overflow-x-auto">
                          <table className="w-full border-collapse border border-slate-200">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-[#f2f5f0]">{children}</thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="divide-y divide-slate-200">{children}</tbody>
                      ),
                      tr: ({ children }) => (
                        <tr className="border-b border-slate-200">{children}</tr>
                      ),
                      th: ({ children }) => (
                        <th className="border border-slate-200 px-4 py-2 text-left font-semibold text-[#24584b]">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-slate-200 px-4 py-2 text-slate-600">{children}</td>
                      ),
                      li: ({ children }) => {
                        const childText = String(children);
                        if (childText.includes('[ ]') || childText.includes('[x]')) {
                          const isInitiallyChecked = childText.includes('[x]');
                          const text = childText.replace(/\[[ x]\]\s*/, '');
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
                                className="mt-1 h-4 w-4 cursor-pointer rounded border-[#7ca292] bg-white text-[#24584b] focus:ring-[#24584b]"
                              />
                              <span className={isChecked ? 'text-slate-400 line-through' : ''}>{text}</span>
                            </li>
                          );
                        }
                        return <li className="ml-6 text-slate-600">{children}</li>;
                      },
                      strong: ({ children }) => (
                        <strong className="font-semibold text-[#24584b]">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="text-[#1f3448]">{children}</em>
                      ),
                      a: ({ href, children }) => {
                        const linkText =
                          typeof children === 'string'
                            ? children
                            : Array.isArray(children)
                              ? children.join('')
                              : String(children);

                        return (
                          <a
                            href={href}
                            className="font-medium text-[#1f3448] underline transition-colors hover:text-[#24584b]"
                            target={href?.startsWith('http') ? '_blank' : undefined}
                            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                          >
                            {linkText}
                          </a>
                        );
                      },
                      code: ({ children }) => (
                        <code className="rounded bg-slate-100 px-2 py-1 text-sm text-[#24584b]">{children}</code>
                      ),
                      hr: () => (
                        <hr className="my-6 border-slate-200" />
                      ),
                    }}
                  >
                    {currentPlan}
                  </ReactMarkdown>
                  {userData?.aiPlan?.lastUpdated && (
                    <p className="mt-6 border-t border-slate-200 pt-4 text-xs uppercase tracking-[0.14em] text-slate-500">
                      Last updated {new Date(userData.aiPlan.lastUpdated).toLocaleDateString()} at{' '}
                      {new Date(userData.aiPlan.lastUpdated).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-[#1f3448]">
                    <FileText className="h-7 w-7" />
                  </div>
                  <h3 className="mb-2 text-2xl font-semibold text-slate-950">Generate roadmap</h3>
                  <p className="mx-auto mb-6 max-w-md text-slate-600">
                    Create an initial plan using your current profile and progress.
                  </p>
                  <button
                    onClick={handleGeneratePlan}
                    disabled={isGeneratingPlan}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1f3448] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#182b3b] disabled:opacity-50"
                  >
                    {isGeneratingPlan ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Roadmap'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <QuickLinkCard
                to="/timeline"
                icon={<RouteIcon className="h-5 w-5" />}
                title="Timeline"
                description="Review milestone pacing and target dates."
              />
              <QuickLinkCard
                to="/events"
                icon={<CalendarRange className="h-5 w-5" />}
                title="Events"
                description="Manage meetings, campouts, and service opportunities."
              />
              <QuickLinkCard
                to="/advancement"
                icon={<Award className="h-5 w-5" />}
                title="Advancement"
                description="Review rank requirements and mark progress."
              />
            </div>

            {userData ? (
              <Suspense
                fallback={
                  <div className="app-surface rounded-[1.75rem] p-6">
                    <p className="text-sm text-slate-500">Loading next rank progress...</p>
                  </div>
                }
              >
                <RankAdvancement userData={userData} />
              </Suspense>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function capitalizeWords(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function SummaryTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function StatCard({
  to,
  icon,
  label,
  value,
  detail,
}: {
  to?: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  const content = (
    <div className="app-surface rounded-xl p-5 transition-all hover:border-slate-300">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          {icon}
        </div>
        <div className="text-3xl font-semibold text-slate-950">{value}</div>
      </div>
      <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{detail}</div>
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }

  return content;
}

function QuickLinkCard({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link to={to} className="app-surface block rounded-xl p-5 transition-all hover:border-slate-300">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        {icon}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}
