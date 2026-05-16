export type AllowedMimeType = 'image/png' | 'image/jpeg' | 'application/pdf' | 'image/webp';

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  return bytes.every((value, index) => buffer[index] === value);
}

export function detectAllowedMimeType(buffer: Buffer): AllowedMimeType | null {
  if (buffer.length >= 8 && startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }

  if (buffer.length >= 3 && startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }

  if (buffer.length >= 4 && startsWith(buffer, [0x25, 0x50, 0x44, 0x46])) {
    return 'application/pdf';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

export function ensureAllowedFileType(buffer: Buffer): AllowedMimeType {
  const mimeType = detectAllowedMimeType(buffer);
  if (!mimeType) {
    throw new Error('Tipo de arquivo não permitido. Use apenas PNG, JPEG, PDF ou WEBP.');
  }

  return mimeType;
}
