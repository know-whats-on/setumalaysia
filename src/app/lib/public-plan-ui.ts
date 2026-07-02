export function getPublicPlanPersonInitials(
  displayName?: string | null,
  fallbackEmail?: string | null,
) {
  const normalizedName = String(displayName || "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim();
  const nameParts = normalizedName.split(/\s+/).filter(Boolean);

  if (nameParts.length >= 2) {
    return `${nameParts[0][0] || ""}${nameParts[1][0] || ""}`.toUpperCase();
  }

  if (nameParts.length === 1) {
    return nameParts[0].slice(0, 2).toUpperCase();
  }

  const emailPrefix = String(fallbackEmail || "")
    .split("@")[0]
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim();
  const emailParts = emailPrefix.split(/\s+/).filter(Boolean);

  if (emailParts.length >= 2) {
    return `${emailParts[0][0] || ""}${emailParts[1][0] || ""}`.toUpperCase();
  }

  if (emailParts.length === 1) {
    return emailParts[0].slice(0, 2).toUpperCase();
  }

  return "??";
}

export function getPublicPlanActionGridClass(actionCount: number) {
  if (actionCount >= 5) return "grid-cols-2 md:grid-cols-5";
  if (actionCount >= 4) return "grid-cols-2 md:grid-cols-4";
  if (actionCount === 3) return "grid-cols-2 md:grid-cols-3";
  if (actionCount === 2) return "grid-cols-2";
  return "grid-cols-1";
}
