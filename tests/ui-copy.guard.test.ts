import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '..');

function read(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

describe('onboarding and calendar CTA copy guards', () => {
  it('keeps onboarding as a two-step low-friction flow', () => {
    const onboardingRoute = read('src/routes/onboarding.tsx');
    expect(onboardingRoute).toContain('Optional planning details');
    expect(onboardingRoute).toContain('Skip for now');
    expect(onboardingRoute).toContain('Open dashboard');
  });

  it('uses one primary calendar action in Events', () => {
    const eventsRoute = read('src/routes/events.tsx');
    expect(eventsRoute).toContain('Manage Calendar');
    expect(eventsRoute).not.toContain('Import ICS');
    expect(eventsRoute).not.toContain('Sync Scoutbook');
  });

  it('keeps Profile calendar management passive', () => {
    const profileRoute = read('src/routes/profile.tsx');
    expect(profileRoute).toContain('Manage in Events');
    expect(profileRoute).not.toContain('Sync Now');
  });
});
