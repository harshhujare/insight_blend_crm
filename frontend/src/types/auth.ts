export type Role = 'MANAGER' | 'STRATEGIST' | 'WRITER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
}

export interface AuthResponse {
  user: User;
  token?: string;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
