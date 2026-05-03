export function getRequirementsPerMeeting(
  signoffsPerWeek: string | number,
  meetingsPerWeek: string | number,
) {
  const weeklyRate = Number(signoffsPerWeek || 0);
  const meetings = Number(meetingsPerWeek || 0);
  if (!meetings || meetings <= 0) return weeklyRate;
  return weeklyRate / meetings;
}

export function formatRequirementsPerMeeting(
  signoffsPerWeek: string | number,
  meetingsPerWeek: string | number,
) {
  const perMeeting = getRequirementsPerMeeting(signoffsPerWeek, meetingsPerWeek);
  return Number.isInteger(perMeeting) ? String(perMeeting) : perMeeting.toFixed(1);
}

