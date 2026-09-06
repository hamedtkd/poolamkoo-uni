export interface AccountUser {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}

export interface AccountUserRecord extends AccountUser {
  passwordHash: string;
}

export interface AccountSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}
