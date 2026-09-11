// Who is making this request, for endpoints that stamp a record with the
// requester's address (activist profile generation, document ingestion).
//
// One definition, shared: this used to live as a private helper inside
// ActivistDashboard, and a second caller needed the identical fallback chain.
// Copying it would have let the two drift apart, which for an audit field
// means two different answers to "who asked for this?".
//
// The redux user is preferred when the caller has one; localStorage is the
// fallback for callers that don't, and for the window before auth state has
// hydrated. Returns undefined rather than "" when nothing is known, so callers
// can omit the field entirely instead of sending an empty string.
export const getCreatorEmail = (user?: { email?: string | null } | null): string | undefined => {
  if (user?.email) return user.email;
  try {
    const stored = JSON.parse(localStorage.getItem("User") || "null");
    return stored?.email || undefined;
  } catch {
    return undefined;
  }
};
