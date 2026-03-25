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

    <div className="app-shell flex items-center justify-center p-6">
      <div className="app-shell__grid" />
      <div className="app-shell__glow app-shell__glow--top" />
      <div className="app-shell__glow app-shell__glow--bottom" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Progress Indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  s === step
                    ? 'scale-110 bg-linear-to-br from-emerald-600 to-sky-600 text-white shadow-lg shadow-sky-200'
                    : s < step
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-white text-slate-400 ring-1 ring-slate-200'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 mx-2 rounded transition-all duration-300 ${
                    s < step ? 'bg-emerald-400' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div className="app-surface rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-sky-600 shadow-[0_16px_36px_rgba(14,165,233,0.22)]">
              {step === 1 && <ScoutFleurDeLis className="w-8 h-8 text-white" size={32} />}
              {step === 2 && <CompassIcon className="w-8 h-8 text-white" size={32} />}
              {step === 3 && <EagleIcon className="w-8 h-8 text-white" size={32} />}
            </div>
            
            <h1 className="mb-2 text-3xl font-bold text-slate-950">
              {step === 1 && "Welcome to Scoutly"}
              {step === 2 && "Your Current Progress"}
              {step === 3 && "Set Your Eagle Goal"}
            </h1>
            
            <p className="text-lg text-slate-600">
              {step === 1 && "Let's start your journey to Eagle Scout"}
              {step === 2 && "Where are you on your path?"}
              {step === 3 && "When do you aim to achieve Eagle?"}
            </p>
          </div>

          {/* Step 1: Name */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
                  What's your name?
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400"
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
                <label className="mb-4 block text-sm font-medium text-slate-700">
                  What's your current rank?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {RANKS.filter(r => r.id !== 'eagle').map((rank) => (
                    <button
                      key={rank.id}
                      onClick={() => setFormData({ ...formData, currentRank: rank.id })}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        formData.currentRank === rank.id
                          ? 'border-sky-400 bg-sky-50 text-sky-700 shadow-lg shadow-sky-100'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-slate-50'
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
                <label htmlFor="targetDate" className="mb-2 block text-sm font-medium text-slate-700">
                  When do you want to achieve Eagle Scout?
                </label>
                <input
                  type="date"
                  id="targetDate"
                  value={formData.targetEagleDate}
                  onChange={(e) => setFormData({ ...formData, targetEagleDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400"
                />
                <p className="mt-2 text-sm text-slate-500">
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
                className="flex-1 rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Back
              </button>
            )}
            
            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-sky-600 px-6 py-3 font-semibold text-white transition-colors shadow-lg shadow-sky-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!isStepValid() || isUpdatingProfile}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-sky-600 px-6 py-3 font-semibold text-white transition-all shadow-lg shadow-sky-100 hover:from-emerald-500 hover:to-sky-500 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
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
        <p className="mt-6 text-center text-sm text-slate-500">
          Your data is stored locally and completely private
        </p>
      </div>
    </div>
  );
}
