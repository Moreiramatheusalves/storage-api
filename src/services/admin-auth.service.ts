import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { SqlStoreService } from './sql-store.service';

export class AdminAuthService {
  constructor(private readonly store = new SqlStoreService()) {}

  async validateCredentials(
    username: string,
    password: string
  ): Promise<{ id: string; username: string } | null> {
    const user = this.store.get<{ id: string; username: string; passwordHash: string }>(
      'SELECT id, username, passwordHash FROM adminUsers WHERE username = ?',
      [username]
    );
    if (!user) {
      return null;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return null;
    }
    return { id: user.id, username: user.username };
  }

  signJwt(payload: { id: string; username: string }): string {
    return jwt.sign(payload, env.jwtSecret, { expiresIn: '12h' });
  }

  verifyJwt(token: string): { id: string; username: string } {
    return jwt.verify(token, env.jwtSecret) as { id: string; username: string };
  }
}
