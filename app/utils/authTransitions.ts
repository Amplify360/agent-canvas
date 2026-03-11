export interface AuthUserTransition {
  didSignIn: boolean;
  didSwitchUsers: boolean;
  nextStableUserId: string | null;
}

export function deriveAuthUserTransition(
  previousStableUserId: string | null,
  currentUserId: string | null,
): AuthUserTransition {
  const didSignIn = previousStableUserId === null && currentUserId !== null;
  const didSwitchUsers =
    previousStableUserId !== null &&
    currentUserId !== null &&
    previousStableUserId !== currentUserId;

  return {
    didSignIn,
    didSwitchUsers,
    nextStableUserId: currentUserId ?? previousStableUserId,
  };
}
