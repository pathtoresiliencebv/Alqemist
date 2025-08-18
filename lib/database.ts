import { sql } from '@vercel/postgres';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  preferences: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface Thread {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  thread_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Record<string, unknown>;
  created_at: Date;
}

export const executeQuery = async (query: string, params: unknown[] = []) => {
  try {
    const result = await sql.query(query, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

export const testConnection = async () => {
  try {
    if (process.env.DATABASE_URL) {
      const result = await sql`SELECT NOW() as current_time`;
      console.log('Database connection successful:', result.rows[0]);
      return true;
    } else {
      console.error('DATABASE_URL environment variable not found');
      return false;
    }
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

export const initializeDatabase = async () => {
  try {
    // Create users table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create threads table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS threads (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create messages table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        thread_id VARCHAR(255) NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        attachments JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
};
