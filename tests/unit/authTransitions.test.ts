import { describe, expect, it } from 'vitest';

import { deriveAuthUserTransition } from '@/utils/authTransitions';

describe('deriveAuthUserTransition', () => {
  it('treats a transient null user as a refresh blip, not a switch', () => {
    expect(deriveAuthUserTransition('user_123', null)).toEqual({
      didSignIn: false,
      didSwitchUsers: false,
      nextStableUserId: 'user_123',
    });
  });

  it('detects a real user switch once the replacement user appears', () => {
    expect(deriveAuthUserTransition('user_123', 'user_456')).toEqual({
      didSignIn: false,
      didSwitchUsers: true,
      nextStableUserId: 'user_456',
    });
  });

  it('detects the first authenticated user in a session', () => {
    expect(deriveAuthUserTransition(null, 'user_123')).toEqual({
      didSignIn: true,
      didSwitchUsers: false,
      nextStableUserId: 'user_123',
    });
  });
});
