export type UploadAllowedMimeType =
  | 'image/png'
  | 'image/jpeg'
  | 'application/pdf'
  | 'image/webp';

export type ReadAllowedMimeType =
  | UploadAllowedMimeType
  | 'application/vnd.microsoft.portable-executable';

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  return bytes.every((value, index) => buffer[index] === value);
}

export function detectAllowedMimeType(buffer: Buffer): ReadAllowedMimeType | null {
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

  // Windows executável / instalador baseado em PE
  // Assinatura inicial: "MZ"
  if (buffer.length >= 2 && startsWith(buffer, [0x4d, 0x5a])) {
    return 'application/vnd.microsoft.portable-executable';
  }

  return null;
}

export function ensureAllowedUploadFileType(buffer: Buffer): UploadAllowedMimeType {
  const mimeType = detectAllowedMimeType(buffer);

  if (
    mimeType === 'image/png' ||
    mimeType === 'image/jpeg' ||
    mimeType === 'application/pdf' ||
    mimeType === 'image/webp'
  ) {
    return mimeType;
  }

  throw new Error('Tipo de arquivo não permitido para upload. Use apenas PNG, JPEG, PDF ou WEBP.');
}

export function ensureAllowedReadableFileType(
  buffer: Buffer,
  options: { allowExecutable?: boolean } = {}
): ReadAllowedMimeType {
  const mimeType = detectAllowedMimeType(buffer);

  if (!mimeType) {
    throw new Error('Tipo de arquivo não permitido para leitura. Use apenas PNG, JPEG, PDF, WEBP ou EXE autorizado.');
  }

  if (
    mimeType === 'application/vnd.microsoft.portable-executable' &&
    !options.allowExecutable
  ) {
    throw new Error('Leitura de executável não autorizada para este caminho.');
  }

  return mimeType;
}

export function ensureAllowedFileType(buffer: Buffer): UploadAllowedMimeType {
  return ensureAllowedUploadFileType(buffer);
}