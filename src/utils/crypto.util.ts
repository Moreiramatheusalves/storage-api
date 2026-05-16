import crypto from 'crypto';

export function generateSecureToken(size = 48): string {
  return crypto.randomBytes(size).toString('base64url');
}

export function sha256(value: Buffer | string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function timingSafeHashCompare(plainValue: string, expectedHash: string): boolean {
  const plainHash = sha256(plainValue);
  const left = Buffer.from(plainHash, 'hex');
  const right = Buffer.from(expectedHash, 'hex');

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}
