import { executeQuery } from './database';
import { auth } from '@clerk/nextjs/server';

export interface MemoryEntry {
  id?: string;
  userId: string;
  type: 'conversation' | 'preference' | 'fact' | 'context' | 'relationship' | 'skill';
  content: string;
  metadata: {
    confidence: number; // 0-1 how confident we are about this memory
    importance: number; // 0-1 how important this memory is
    lastAccessed: Date;
    accessCount: number;
    source: 'chat' | 'manual' | 'inferred' | 'preference';
    tags: string[];
    relatedMemories?: string[]; // IDs of related memories
    embedding?: number[]; // Vector embedding for semantic search
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date; // Optional expiration for temporary memories
}

export interface ConversationContext {
  userId: string;
  threadId?: string;
  currentTopic?: string;
  userMood?: 'positive' | 'negative' | 'neutral' | 'frustrated' | 'excited';
  conversationGoal?: string;
  previousMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
}

export interface PersonalizationProfile {
  userId: string;
  preferences: {
    communicationStyle: 'formal' | 'casual' | 'friendly' | 'professional';
    detailLevel: 'brief' | 'moderate' | 'detailed';
    responseFormat: 'text' | 'bullet-points' | 'structured';
    topics: string[];
    avoidTopics: string[];
  };
  skills: {
    technical: string[];
    interests: string[];
    expertise: string[];
  };
  patterns: {
    commonQuestions: string[];
    workingHours: { start: string; end: string; timezone: string };
    preferredLanguage: string;
  };
}

export class MemorySystem {
  private static instance: MemorySystem;
  
  public static getInstance(): MemorySystem {
    if (!MemorySystem.instance) {
      MemorySystem.instance = new MemorySystem();
    }
    return MemorySystem.instance;
  }

  /**
   * Store a new memory entry
   */
  async storeMemory(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = new Date();
      
      // Generate simple text-based embedding (in production, use proper embedding model)
      const embedding = this.generateTextEmbedding(entry.content);
      
      const result = await executeQuery(`
        INSERT INTO memories (
          user_id, type, content, metadata, created_at, updated_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        entry.userId,
        entry.type,
        entry.content,
        JSON.stringify({
          ...entry.metadata,
          embedding,
          lastAccessed: now,
          accessCount: 0
        }),
        now,
        now,
        entry.expiresAt || null
      ]);

      return result.rows[0].id;
    } catch (error) {
      console.error('Failed to store memory:', error);
      throw error;
    }
  }

  /**
   * Retrieve memories for a user with semantic search
   */
  async searchMemories(
    userId: string,
    query: string,
    type?: MemoryEntry['type'],
    limit: number = 10
  ): Promise<MemoryEntry[]> {
    try {
      const queryEmbedding = this.generateTextEmbedding(query);
      
      let sql = `
        SELECT * FROM memories 
        WHERE user_id = $1 
        AND (expires_at IS NULL OR expires_at > NOW())
      `;
      const params: any[] = [userId];
      let paramIndex = 2;

      if (type) {
        sql += ` AND type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      // Simple text similarity (in production, use vector similarity)
      sql += ` ORDER BY 
        CASE 
          WHEN LOWER(content) LIKE LOWER($${paramIndex}) THEN 1
          ELSE 2
        END,
        (metadata->>'importance')::float DESC,
        updated_at DESC
        LIMIT $${paramIndex + 1}
      `;
      params.push(`%${query}%`, limit);

      const result = await executeQuery(sql, params);
      
      return result.rows.map(this.parseMemoryRow);
    } catch (error) {
      console.error('Failed to search memories:', error);
      return [];
    }
  }

  /**
   * Get recent conversation context
   */
  async getConversationContext(userId: string, threadId?: string): Promise<ConversationContext> {
    try {
      // Get recent memories and conversation patterns
      const recentMemories = await this.searchMemories(userId, '', 'conversation', 5);
      const preferences = await this.getUserProfile(userId);
      
      // Analyze recent conversation patterns
      const currentTopic = this.extractCurrentTopic(recentMemories);
      const userMood = this.inferUserMood(recentMemories);
      
      return {
        userId,
        threadId,
        currentTopic,
        userMood,
        conversationGoal: preferences?.patterns.commonQuestions[0],
        previousMessages: recentMemories.map(m => ({
          role: m.content.startsWith('User:') ? 'user' as const : 'assistant' as const,
          content: m.content,
          timestamp: m.createdAt
        }))
      };
    } catch (error) {
      console.error('Failed to get conversation context:', error);
      return {
        userId,
        threadId,
        previousMessages: []
      };
    }
  }

  /**
   * Update user personalization profile
   */
  async updateUserProfile(userId: string, updates: Partial<PersonalizationProfile>): Promise<void> {
    try {
      const existing = await this.getUserProfile(userId);
      const merged = existing ? { ...existing, ...updates } : updates;
      
      await executeQuery(`
        INSERT INTO user_profiles (user_id, profile_data, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET profile_data = $2, updated_at = NOW()
      `, [userId, JSON.stringify(merged)]);
    } catch (error) {
      console.error('Failed to update user profile:', error);
    }
  }

  /**
   * Get user personalization profile
   */
  async getUserProfile(userId: string): Promise<PersonalizationProfile | null> {
    try {
      const result = await executeQuery(`
        SELECT profile_data FROM user_profiles WHERE user_id = $1
      `, [userId]);
      
      return result.rows[0] ? JSON.parse(result.rows[0].profile_data) : null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Learn from conversation and extract insights
   */
  async learnFromConversation(
    userId: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>,
    threadId?: string
  ): Promise<void> {
    try {
      // Extract facts and preferences from conversation
      const insights = this.extractInsights(messages);
      
      for (const insight of insights) {
        await this.storeMemory({
          userId,
          type: insight.type,
          content: insight.content,
          metadata: {
            confidence: insight.confidence,
            importance: insight.importance,
            lastAccessed: new Date(),
            accessCount: 0,
            source: 'inferred',
            tags: insight.tags,
            relatedMemories: []
          }
        });
      }

      // Update conversation patterns
      const profile = await this.getUserProfile(userId) || this.getDefaultProfile(userId);
      const updatedPatterns = this.updateConversationPatterns(profile, messages);
      
      await this.updateUserProfile(userId, { patterns: updatedPatterns });
    } catch (error) {
      console.error('Failed to learn from conversation:', error);
    }
  }

  /**
   * Generate personalized response suggestions
   */
  async generateResponseContext(userId: string, userInput: string): Promise<{
    relevantMemories: MemoryEntry[];
    userProfile: PersonalizationProfile | null;
    suggestions: string[];
    contextPrompt: string;
  }> {
    try {
      // Find relevant memories
      const relevantMemories = await this.searchMemories(userId, userInput, undefined, 5);
      
      // Get user profile
      const userProfile = await this.getUserProfile(userId);
      
      // Generate context prompt for AI
      const contextPrompt = this.buildContextPrompt(relevantMemories, userProfile, userInput);
      
      // Generate response suggestions based on patterns
      const suggestions = this.generateSuggestions(relevantMemories, userProfile, userInput);
      
      return {
        relevantMemories,
        userProfile,
        suggestions,
        contextPrompt
      };
    } catch (error) {
      console.error('Failed to generate response context:', error);
      return {
        relevantMemories: [],
        userProfile: null,
        suggestions: [],
        contextPrompt: ''
      };
    }
  }

  /**
   * Clean up expired memories and optimize storage
   */
  async optimizeMemories(userId: string): Promise<void> {
    try {
      // Remove expired memories
      await executeQuery(`
        DELETE FROM memories 
        WHERE user_id = $1 AND expires_at < NOW()
      `, [userId]);

      // Reduce importance of old, unused memories
      await executeQuery(`
        UPDATE memories 
        SET metadata = jsonb_set(
          metadata, 
          '{importance}', 
          CASE 
            WHEN (metadata->>'lastAccessed')::timestamp < NOW() - INTERVAL '30 days' 
            THEN ((metadata->>'importance')::float * 0.8)::text::jsonb
            ELSE metadata->'importance'
          END
        )
        WHERE user_id = $1
      `, [userId]);

      // Archive very old memories with low importance
      await executeQuery(`
        UPDATE memories 
        SET expires_at = NOW() + INTERVAL '7 days'
        WHERE user_id = $1 
        AND (metadata->>'importance')::float < 0.1
        AND created_at < NOW() - INTERVAL '90 days'
      `, [userId]);
    } catch (error) {
      console.error('Failed to optimize memories:', error);
    }
  }

  // Private helper methods
  private parseMemoryRow(row: any): MemoryEntry {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      content: row.content,
      metadata: JSON.parse(row.metadata),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined
    };
  }

  private generateTextEmbedding(text: string): number[] {
    // Simple text-based embedding (in production, use proper embedding model)
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts: Record<string, number> = {};
    
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Create a simple vector representation
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const vector: number[] = [];
    
    commonWords.forEach(word => {
      vector.push((wordCounts[word] || 0) / words.length);
    });
    
    return vector;
  }

  private extractCurrentTopic(memories: MemoryEntry[]): string | undefined {
    if (memories.length === 0) return undefined;
    
    // Extract most common tags from recent memories
    const tagCounts: Record<string, number> = {};
    memories.forEach(memory => {
      memory.metadata.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    const mostCommonTag = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    return mostCommonTag ? mostCommonTag[0] : undefined;
  }

  private inferUserMood(memories: MemoryEntry[]): ConversationContext['userMood'] {
    // Simple sentiment analysis based on memory content
    const recentContent = memories.slice(0, 3).map(m => m.content).join(' ').toLowerCase();
    
    if (recentContent.includes('frustrated') || recentContent.includes('problem') || recentContent.includes('error')) {
      return 'frustrated';
    }
    if (recentContent.includes('great') || recentContent.includes('excellent') || recentContent.includes('perfect')) {
      return 'positive';
    }
    if (recentContent.includes('excited') || recentContent.includes('amazing') || recentContent.includes('awesome')) {
      return 'excited';
    }
    
    return 'neutral';
  }

  private extractInsights(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Array<{
    type: MemoryEntry['type'];
    content: string;
    confidence: number;
    importance: number;
    tags: string[];
  }> {
    const insights: Array<{
      type: MemoryEntry['type'];
      content: string;
      confidence: number;
      importance: number;
      tags: string[];
    }> = [];

    messages.forEach(message => {
      if (message.role === 'user') {
        const content = message.content.toLowerCase();
        
        // Extract preferences
        if (content.includes('prefer') || content.includes('like') || content.includes('favorite')) {
          insights.push({
            type: 'preference',
            content: message.content,
            confidence: 0.8,
            importance: 0.7,
            tags: ['preference', 'user-stated']
          });
        }
        
        // Extract facts about user
        if (content.includes('i am') || content.includes("i'm") || content.includes('my job') || content.includes('i work')) {
          insights.push({
            type: 'fact',
            content: message.content,
            confidence: 0.9,
            importance: 0.8,
            tags: ['personal', 'fact']
          });
        }
        
        // Extract skills/expertise
        if (content.includes('experienced in') || content.includes('expert') || content.includes('good at')) {
          insights.push({
            type: 'skill',
            content: message.content,
            confidence: 0.7,
            importance: 0.6,
            tags: ['skill', 'expertise']
          });
        }
      }
    });

    return insights;
  }

  private updateConversationPatterns(
    profile: PersonalizationProfile, 
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): PersonalizationProfile['patterns'] {
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
    
    // Extract common question patterns
    const questions = userMessages.filter(msg => msg.includes('?'));
    const updatedCommonQuestions = [...(profile.patterns?.commonQuestions || []), ...questions]
      .slice(-10); // Keep last 10 questions
    
    return {
      ...profile.patterns,
      commonQuestions: updatedCommonQuestions,
      workingHours: profile.patterns?.workingHours || { start: '09:00', end: '17:00', timezone: 'UTC' },
      preferredLanguage: profile.patterns?.preferredLanguage || 'nl'
    };
  }

  private buildContextPrompt(
    memories: MemoryEntry[], 
    profile: PersonalizationProfile | null, 
    userInput: string
  ): string {
    let prompt = `Context about the user:\n`;
    
    if (profile) {
      prompt += `- Communication style: ${profile.preferences.communicationStyle}\n`;
      prompt += `- Detail level: ${profile.preferences.detailLevel}\n`;
      prompt += `- Response format: ${profile.preferences.responseFormat}\n`;
      prompt += `- Technical skills: ${profile.skills.technical.join(', ')}\n`;
      prompt += `- Interests: ${profile.skills.interests.join(', ')}\n`;
    }
    
    if (memories.length > 0) {
      prompt += `\nRelevant memories:\n`;
      memories.forEach((memory, index) => {
        prompt += `${index + 1}. [${memory.type}] ${memory.content}\n`;
      });
    }
    
    prompt += `\nPlease respond considering this context and the user's preferences.`;
    
    return prompt;
  }

  private generateSuggestions(
    memories: MemoryEntry[], 
    profile: PersonalizationProfile | null, 
    userInput: string
  ): string[] {
    const suggestions: string[] = [];
    
    // Based on user preferences
    if (profile?.patterns.commonQuestions) {
      const similarQuestions = profile.patterns.commonQuestions
        .filter(q => this.calculateSimilarity(q, userInput) > 0.3)
        .slice(0, 2);
      suggestions.push(...similarQuestions);
    }
    
    // Based on memories
    memories.forEach(memory => {
      if (memory.type === 'preference' && memory.metadata.importance > 0.5) {
        suggestions.push(`Remember: ${memory.content}`);
      }
    });
    
    return suggestions.slice(0, 3);
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private getDefaultProfile(userId: string): PersonalizationProfile {
    return {
      userId,
      preferences: {
        communicationStyle: 'friendly',
        detailLevel: 'moderate',
        responseFormat: 'text',
        topics: [],
        avoidTopics: []
      },
      skills: {
        technical: [],
        interests: [],
        expertise: []
      },
      patterns: {
        commonQuestions: [],
        workingHours: { start: '09:00', end: '17:00', timezone: 'UTC' },
        preferredLanguage: 'nl'
      }
    };
  }
}

/**
 * Global memory system instance
 */
export const memorySystem = MemorySystem.getInstance();
