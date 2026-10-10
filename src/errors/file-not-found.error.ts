import { AppError } from './app.error';

export class FileNotFoundError extends AppError {
  readonly code = 'FILE_NOT_FOUND';

  constructor() {
    super('File not found', 404);
    this.name = 'FileNotFoundError';
  }
}
