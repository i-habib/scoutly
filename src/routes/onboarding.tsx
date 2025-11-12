import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useUserData } from '../hooks/useUserData';
import { RANKS } from '../data/ranks';
import { ScoutFleurDeLis, EagleIcon, CompassIcon, CampfireIcon } from '../components/ScoutIcons';

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

    <div 
      className="min-h-screen bg-black flex items-center justify-center p-6"
      style={{
        backgroundImage: 'radial-gradient(#0b3b12 1px, transparent 1px)',
        backgroundSize: '14px 14px',
        backgroundPosition: '0 0, 14px 14px',
      }}
    >
      {/* Gradient glows */}
      <div className="fixed top-0 left-0 w-1/2 h-1/2 bg-green-500/10 rounded-full blur-[150px] animate-pulse pointer-events-none" />
      <div className="fixed -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-cyan-500/10 rounded-full blur-[150px] animate-pulse [animation-delay:2s] pointer-events-none" />
      
      <div className="w-full max-w-2xl relative z-10">
        {/* Progress Indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  s === step
                    ? 'bg-green-500 text-white scale-110 shadow-lg shadow-cyan-500/50'
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
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-green-500 to-cyan-600 rounded-2xl mb-4 shadow-lg shadow-green-500/30">
              {step === 1 && <ScoutFleurDeLis className="w-8 h-8 text-white" size={32} />}
              {step === 2 && <CompassIcon className="w-8 h-8 text-white" size={32} />}
              {step === 3 && <EagleIcon className="w-8 h-8 text-white" size={32} />}
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
                          ? 'border-cyan-500 bg-green-500/10 text-green-400 shadow-lg shadow-cyan-500/20'
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
                className="flex-1 px-6 py-3 bg-green-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/30 disabled:shadow-none flex items-center justify-center gap-2"
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
                    <CampfireIcon className="w-5 h-5" size={20} />
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
