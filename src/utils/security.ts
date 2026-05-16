import crypto from 'crypto';

export function generateToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}