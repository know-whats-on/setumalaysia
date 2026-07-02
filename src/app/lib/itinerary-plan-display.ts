const GENERATED_ITINERARY_PLAN_NOTE_RE =
  /^\s*\d+\s+stops?\s+route\s+from\s+my\s+itinerary\.?\s*$/i;

export function formatItinerarySpotSummary(count: number, isSetuChina: boolean) {
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  const english = `${safeCount} spot${safeCount === 1 ? "" : "s"}`;
  return isSetuChina ? `${english} · ${safeCount} 个地点` : english;
}

export function shouldShowItineraryPlanNote(note: unknown) {
  const clean = String(note || "").trim();
  return Boolean(clean && !GENERATED_ITINERARY_PLAN_NOTE_RE.test(clean));
}
