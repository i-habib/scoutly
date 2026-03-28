import { describe, expect, it } from 'vitest';
import { initialUserData, type Event, type UserData } from '../data/userData';
import {
  generateEventRecommendations,
  getCalendarActionSummary,
  isTroopMeetingEvent,
} from './calendarRecommendations';

function makeUserData(currentRank: string, events: Event[]): UserData {
  const userData = structuredClone(initialUserData);
  userData.profile.currentRank = currentRank;
  userData.events = events;
  return userData;
}

function makeEvent(partial: Partial<Event> & Pick<Event, 'id' | 'name' | 'startTime' | 'type'>): Event {
  return {
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe('calendar recommendations', () => {
  it('assigns different next signoffs across consecutive troop meetings', () => {
    const userData = makeUserData('rank_scout', [
      makeEvent({
        id: 'meeting-1',
        name: 'Troop Meeting',
        type: 'meeting',
        startTime: '2099-06-10T19:00:00',
      }),
      makeEvent({
        id: 'meeting-2',
        name: 'Troop Meeting',
        type: 'meeting',
        startTime: '2099-06-17T19:00:00',
      }),
      makeEvent({
        id: 'meeting-3',
        name: 'Troop Meeting',
        type: 'meeting',
        startTime: '2099-06-24T19:00:00',
      }),
    ]);

    const analysis = generateEventRecommendations(userData, userData.events);
    const meetingOne = analysis['meeting-1']?.signoffs.map((signoff) => signoff.id) || [];
    const meetingTwo = analysis['meeting-2']?.signoffs.map((signoff) => signoff.id) || [];
    const meetingThree = analysis['meeting-3']?.signoffs.map((signoff) => signoff.id) || [];

    expect(meetingOne.length).toBeGreaterThan(0);
    expect(meetingTwo.length).toBeGreaterThan(0);
    expect(meetingThree.length).toBeGreaterThan(0);
    expect(meetingTwo).not.toEqual(meetingOne);
    expect(meetingThree).not.toEqual(meetingTwo);
  });

  it('keeps troop-meeting signoffs separate from campout-only work', () => {
    const troopMeeting = makeEvent({
      id: 'meeting-1',
      name: 'Troop Meeting',
      type: 'meeting',
      startTime: '2099-06-10T19:00:00',
    });
    const campout = makeEvent({
      id: 'campout-1',
      name: 'June Campout',
      type: 'campout',
      startTime: '2099-06-14T18:00:00',
    });
    const userData = makeUserData('rank_scout', [troopMeeting, campout]);

    const analysis = generateEventRecommendations(userData, userData.events);
    const meetingSignoffIds = analysis[troopMeeting.id]?.signoffs.map((signoff) => signoff.id) || [];
    const campoutSignoffIds = analysis[campout.id]?.signoffs.map((signoff) => signoff.id) || [];

    expect(meetingSignoffIds).not.toEqual(
      expect.arrayContaining(['1b', '1c', '2a', '2b']),
    );
    expect(meetingSignoffIds).toEqual(
      expect.arrayContaining(['2c']),
    );
    expect(campoutSignoffIds).toEqual(
      expect.arrayContaining(['1b']),
    );
  });

  it('routes service-focused requirements to service events', () => {
    const serviceProject = makeEvent({
      id: 'service-1',
      name: 'Community Cleanup',
      type: 'service',
      startTime: '2099-07-01T09:00:00',
    });
    const userData = makeUserData('rank_scout', [serviceProject]);

    const analysis = generateEventRecommendations(userData, userData.events);
    const serviceSignoffIds = analysis[serviceProject.id]?.signoffs.map((signoff) => signoff.id) || [];

    expect(serviceSignoffIds).toContain('7b');
  });

  it('builds separate dashboard action lanes for troop meetings and non-meeting events', () => {
    const troopMeeting = makeEvent({
      id: 'meeting-1',
      name: 'Troop Meeting',
      type: 'meeting',
      startTime: '2099-06-10T19:00:00',
    });
    const campout = makeEvent({
      id: 'campout-1',
      name: 'June Campout',
      type: 'campout',
      startTime: '2099-06-14T18:00:00',
    });
    const userData = makeUserData('rank_scout', [troopMeeting, campout]);

    const summary = getCalendarActionSummary(userData, userData.events);

    expect(summary.nextTroopMeeting?.id).toBe('meeting-1');
    expect(summary.nextNonTroopMeetingEvent?.id).toBe('campout-1');
    expect(isTroopMeetingEvent(summary.nextTroopMeeting!)).toBe(true);
    expect(summary.nextTroopMeetingAnalysis?.signoffs.length).toBeGreaterThan(0);
    expect(summary.nextNonTroopMeetingAnalysis?.signoffs.length).toBeGreaterThan(0);
  });

  it('stops assigning already-completed meeting signoffs', () => {
    const userData = makeUserData('rank_scout', [
      makeEvent({
        id: 'meeting-1',
        name: 'Troop Meeting',
        type: 'meeting',
        startTime: '2099-06-10T19:00:00',
      }),
    ]);
    userData.rankProgress = {
      rank_tenderfoot: {
        req_5: '2099-06-01',
      },
    };

    const analysis = generateEventRecommendations(userData, userData.events);
    const meetingSignoffIds = analysis['meeting-1']?.signoffs.map((signoff) => signoff.id) || [];

    expect(meetingSignoffIds).not.toContain('2c');
  });
});
