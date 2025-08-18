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

    // Create AI personas table for custom persona management
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ai_personas (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        avatar VARCHAR(255),
        is_active BOOLEAN DEFAULT false,
        is_default BOOLEAN DEFAULT false,
        personality JSONB NOT NULL DEFAULT '{}',
        knowledge JSONB NOT NULL DEFAULT '{}',
        behavior JSONB NOT NULL DEFAULT '{}',
        custom_prompts JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        usage_count INTEGER DEFAULT 0,
        last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
        is_public BOOLEAN DEFAULT false,
        tags JSONB DEFAULT '[]'
      )
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_ai_personas_user_active 
      ON ai_personas (user_id, is_active);
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_ai_personas_user_default 
      ON ai_personas (user_id, is_default);
    `);

    // Create proactive suggestions table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS proactive_suggestions (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('workflow', 'learning', 'productivity', 'reminder', 'optimization', 'insight')),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
        priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high')),
        metadata JSONB DEFAULT '{}',
        actions JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE,
        shown BOOLEAN DEFAULT false,
        dismissed BOOLEAN DEFAULT false,
        interacted_at TIMESTAMP WITH TIME ZONE
      )
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_proactive_suggestions_user_active 
      ON proactive_suggestions (user_id, shown, dismissed);
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_proactive_suggestions_expires 
      ON proactive_suggestions (expires_at) WHERE expires_at IS NOT NULL;
    `);

    // Create user activity tracking table for pattern analysis
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('chat', 'task_completion', 'login', 'file_upload', 'model_switch', 'memory_access')),
        activity_data JSONB DEFAULT '{}',
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_user_activity_user_time 
      ON user_activity (user_id, timestamp);
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_user_activity_session 
      ON user_activity (session_id, timestamp);
    `);

    // Create user patterns table for AI learning
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS user_patterns (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN ('working_hours', 'preferred_topics', 'communication_style', 'task_frequency', 'learning_pace')),
        pattern_data JSONB NOT NULL,
        confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
        frequency INTEGER DEFAULT 1,
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_user_patterns_user_type 
      ON user_patterns (user_id, pattern_type);
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_user_patterns_confidence 
      ON user_patterns (confidence DESC);
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
};
