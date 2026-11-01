import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { RefreshTokenRecord, User, UserRole } from '@spendwise/shared';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'auth_store.json');

export interface AuthDatabaseState {
  users: User[];
  refreshTokens: RefreshTokenRecord[];
}

export class AuthRepository {
  private state: AuthDatabaseState = { users: [], refreshTokens: [] };
  private initialized = false;

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (this.initialized) return;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.state = JSON.parse(raw);
      } catch (err) {
        console.error('Error loading auth database file, starting clean:', err);
      }
    }
    this.initialized = true;
  }

  private persist() {
    this.ensureInitialized();
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing auth database file:', err);
    }
  }

  public async findUserByEmail(email: string): Promise<User | null> {
    this.ensureInitialized();
    const normalized = email.trim().toLowerCase();
    return this.state.users.find((u) => u.email.toLowerCase() === normalized) || null;
  }

  public async findUserById(id: string): Promise<User | null> {
    this.ensureInitialized();
    return this.state.users.find((u) => u.id === id) || null;
  }

  public async listUsers(): Promise<User[]> {
    this.ensureInitialized();
    return [...this.state.users];
  }

  public async createUser(userData: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    departmentId?: string;
    departmentName?: string;
  }): Promise<User> {
    this.ensureInitialized();
    const existing = await this.findUserByEmail(userData.email);
    if (existing) {
      throw new Error(`User with email ${userData.email} already exists`);
    }

    const newUser: User = {
      id: uuidv4(),
      email: userData.email.trim().toLowerCase(),
      passwordHash: userData.passwordHash,
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
      role: userData.role,
      departmentId: userData.departmentId,
      departmentName: userData.departmentName,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.users.push(newUser);
    this.persist();
    return newUser;
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    this.ensureInitialized();
    const index = this.state.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    this.state.users[index] = {
      ...this.state.users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.state.users[index];
  }

  public async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshTokenRecord> {
    this.ensureInitialized();
    const record: RefreshTokenRecord = {
      id: uuidv4(),
      userId,
      token,
      expiresAt: expiresAt.toISOString(),
      revoked: false,
      createdAt: new Date().toISOString(),
    };

    this.state.refreshTokens.push(record);
    this.persist();
    return record;
  }

  public async findRefreshToken(token: string): Promise<RefreshTokenRecord | null> {
    this.ensureInitialized();
    return this.state.refreshTokens.find((r) => r.token === token && !r.revoked) || null;
  }

  public async revokeRefreshToken(token: string): Promise<boolean> {
    this.ensureInitialized();
    const record = this.state.refreshTokens.find((r) => r.token === token);
    if (!record) return false;
    record.revoked = true;
    this.persist();
    return true;
  }

  public async revokeAllUserTokens(userId: string): Promise<number> {
    this.ensureInitialized();
    let count = 0;
    for (const record of this.state.refreshTokens) {
      if (record.userId === userId && !record.revoked) {
        record.revoked = true;
        count++;
      }
    }
    if (count > 0) this.persist();
    return count;
  }
}

export const authRepo = new AuthRepository();
