import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Compass, Target, Calendar, Award, TrendingUp, Sparkles } from 'lucide-react';
import { useUserData } from '../hooks/useUserData';

export const Route = createFileRoute('/')({ component: Dashboard });

function Dashboard() {
  const navigate = useNavigate();
  const { userData, isLoading } = useUserData();

  // Redirect to onboarding if no profile name
  useEffect(() => {
    if (!isLoading && userData && !userData.profile.name) {
      navigate({ to: '/onboarding' });
    }
  }, [userData, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your journey...</p>
        </div>
      </div>
    );
  }

  const userName = userData?.profile?.name || 'Scout';

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-linear-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-linear-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Welcome back, <span className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{userName}</span>
              </h1>
              <p className="text-gray-400">Let's continue your Eagle Scout journey</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Progress Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-2xl font-bold text-white">0%</span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium">Overall Progress</h3>
          </div>

          {/* Merit Badges Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-2xl font-bold text-white">0/21</span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium">Eagle Required</h3>
          </div>

          {/* Upcoming Events Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-2xl font-bold text-white">0</span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium">Upcoming Events</h3>
          </div>

          {/* Days to Eagle Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-2xl font-bold text-white">--</span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium">Days to Goal</h3>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* What's Next Section */}
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-linear-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">What's Next?</h2>
            </div>
            
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400">Start tracking your progress to get personalized recommendations</p>
            </div>
          </div>

          {/* Quick Actions / Recent Activity */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
            
            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg text-cyan-400 font-medium transition-all text-left">
                Add Progress
              </button>
              <a 
                href="/merit-badges"
                className="w-full px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 rounded-lg text-blue-400 font-medium transition-all text-left block"
              >
                View Merit Badges
              </a>
              <button className="w-full px-4 py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 rounded-lg text-purple-400 font-medium transition-all text-left">
                Schedule Event
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
