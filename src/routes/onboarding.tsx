import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Calendar, User, Target, Rocket, ChevronRight } from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import { RANKS } from '../data/ranks';

export const Route = createFileRoute('/onboarding')({ component: Onboarding });

function Onboarding() {
  const navigate = useNavigate();
  const { updateProfileAsync, isUpdatingProfile } = useUserData();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    currentRank: '',
    targetEagleDate: '',
  });

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      await updateProfileAsync({
        name: formData.name,
        currentRank: formData.currentRank,
        targetEagleDate: formData.targetEagleDate,
      });
      navigate({ to: '/' });
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return formData.currentRank.length > 0;
      case 3:
        return formData.targetEagleDate.length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress Indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  s === step
                    ? 'bg-cyan-500 text-white scale-110 shadow-lg shadow-cyan-500/50'
                    : s < step
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 mx-2 rounded transition-all duration-300 ${
                    s < step ? 'bg-cyan-600' : 'bg-slate-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-cyan-500/30">
              {step === 1 && <User className="w-8 h-8 text-white" />}
              {step === 2 && <Target className="w-8 h-8 text-white" />}
              {step === 3 && <Calendar className="w-8 h-8 text-white" />}
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              {step === 1 && "Welcome to Scoutly"}
              {step === 2 && "Your Current Progress"}
              {step === 3 && "Set Your Eagle Goal"}
            </h1>
            
            <p className="text-gray-400 text-lg">
              {step === 1 && "Let's start your journey to Eagle Scout"}
              {step === 2 && "Where are you on your path?"}
              {step === 3 && "When do you aim to achieve Eagle?"}
            </p>
          </div>

          {/* Step 1: Name */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  What's your name?
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  placeholder="Enter your first name"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 2: Current Rank */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  What's your current rank?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {RANKS.filter(r => r.id !== 'eagle').map((rank) => (
                    <button
                      key={rank.id}
                      onClick={() => setFormData({ ...formData, currentRank: rank.id })}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        formData.currentRank === rank.id
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-500/20'
                          : 'border-slate-600 bg-slate-900/30 text-gray-300 hover:border-slate-500 hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="font-semibold">{rank.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Target Eagle Date */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label htmlFor="targetDate" className="block text-sm font-medium text-gray-300 mb-2">
                  When do you want to achieve Eagle Scout?
                </label>
                <input
                  type="date"
                  id="targetDate"
                  value={formData.targetEagleDate}
                  onChange={(e) => setFormData({ ...formData, targetEagleDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
                <p className="mt-2 text-sm text-gray-400">
                  💡 Most Scouts take 3-5 years to reach Eagle
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                Back
              </button>
            )}
            
            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="flex-1 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/30 disabled:shadow-none flex items-center justify-center gap-2"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!isStepValid() || isUpdatingProfile}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg shadow-cyan-500/30 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isUpdatingProfile ? (
                  'Starting Your Journey...'
                ) : (
                  <>
                    Start Your Journey
                    <Rocket className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Bottom Text */}
        <p className="text-center mt-6 text-gray-400 text-sm">
          Your data is stored locally and completely private
        </p>
      </div>
    </div>
  );
}
