export const HOUSEHOLD_RULES_SIGNATURE_ASPECT_RATIO = 2.45;

export function getHouseholdRulesSignatureHeight(width: number) {
  const normalizedWidth = Math.max(0, Number(width) || 0);
  if (normalizedWidth <= 0) return 0;
  return normalizedWidth / HOUSEHOLD_RULES_SIGNATURE_ASPECT_RATIO;
}
