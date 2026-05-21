export interface PasswordCheck {
  label: string;
  passed: boolean;
}

export const validatePassword = (password: string): PasswordCheck[] => [
  { label: "At least 8 characters",        passed: password.length >= 8 },
  { label: "One uppercase letter (A-Z)",   passed: /[A-Z]/.test(password) },
  { label: "One lowercase letter (a-z)",   passed: /[a-z]/.test(password) },
  { label: "One number (0-9)",             passed: /[0-9]/.test(password) },
  { label: "One special character (!@#$…)", passed: /[^A-Za-z0-9]/.test(password) },
];

export const isPasswordValid = (password: string): boolean =>
  validatePassword(password).every(c => c.passed);