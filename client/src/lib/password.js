// Mirrors the server policy in server/lib/password.js so the user sees the
// same message immediately instead of after a failed request — keep in sync.
export const PASSWORD_RULE = 'At least 8 characters, with an uppercase letter, a lowercase letter, and a number.';

export function validatePassword(pw) {
  if (!pw || pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(pw)) return 'Password must contain a number';
  return null;
}
