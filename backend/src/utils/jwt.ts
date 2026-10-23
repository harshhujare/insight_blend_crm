import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUser } from '../types/express';

export function signToken(payload: AuthUser, expiresIn: SignOptions['expiresIn'] = '7d'): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, env.JWT_SECRET) as AuthUser;
}
