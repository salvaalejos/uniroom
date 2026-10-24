interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const otpAttemptsStore = new Map<string, { attempts: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  if (process.env.BUN_TEST) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function registerOtpAttempt(email: string): { allowed: boolean; remainingAttempts: number } {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutos
  const maxAttempts = 5;

  const entry = otpAttemptsStore.get(key);
  if (!entry || now > entry.resetAt) {
    otpAttemptsStore.set(key, { attempts: 1, resetAt: now + windowMs });
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }

  entry.attempts += 1;
  if (entry.attempts > maxAttempts) {
    return { allowed: false, remainingAttempts: 0 };
  }

  return { allowed: true, remainingAttempts: maxAttempts - entry.attempts };
}

export function resetOtpAttempts(email: string): void {
  otpAttemptsStore.delete(email.trim().toLowerCase());
}
