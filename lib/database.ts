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

    // Create usage_events table for tracking
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS usage_events (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('api_call', 'token_usage', 'file_upload', 'attachment_processing', 'tool_execution')),
        resource VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        metadata JSONB DEFAULT '{}',
        cost INTEGER DEFAULT 0,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes for performance
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_usage_events_user_timestamp 
      ON usage_events (user_id, timestamp);
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_usage_events_type 
      ON usage_events (type);
    `);

    // Create subscriptions table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_subscription_id VARCHAR(255) UNIQUE,
        tier VARCHAR(50) NOT NULL DEFAULT 'starter',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        current_period_start TIMESTAMP WITH TIME ZONE,
        current_period_end TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create memories table for long-term memory system
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS memories (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('conversation', 'preference', 'fact', 'context', 'relationship', 'skill')),
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // Create indexes for memory search performance
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_memories_user_type 
      ON memories (user_id, type);
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_memories_content_search 
      ON memories USING GIN (to_tsvector('english', content));
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_memories_expires 
      ON memories (expires_at) WHERE expires_at IS NOT NULL;
    `);

    // Create user profiles table for personalization
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        profile_data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create scheduled tasks table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('reminder', 'followup', 'recurring', 'suggestion')),
        scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
        recurrence_pattern VARCHAR(100), -- 'daily', 'weekly', 'monthly', 'custom'
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'snoozed')),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_user_status 
      ON scheduled_tasks (user_id, status, scheduled_for);
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
};
