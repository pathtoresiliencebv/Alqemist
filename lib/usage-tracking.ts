import { executeQuery } from './database';
import { auth } from '@clerk/nextjs/server';

export interface UsageEvent {
  id?: string;
  userId: string;
  type: 'api_call' | 'token_usage' | 'file_upload' | 'attachment_processing' | 'tool_execution';
  resource: string; // e.g., 'chat', 'image_analysis', 'pdf_processing'
  quantity: number; // tokens, bytes, calls, etc.
  metadata?: Record<string, any>;
  timestamp?: Date;
  cost?: number; // in cents
}

export interface UsageLimits {
  apiCalls: number;
  tokens: number;
  storage: number; // in bytes
  toolExecutions: number;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  limits: UsageLimits;
  price: number; // in cents
  interval: 'month' | 'year';
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    limits: {
      apiCalls: 10000,
      tokens: 1000000,
      storage: 1 * 1024 * 1024 * 1024, // 1GB
      toolExecutions: 100,
    },
    price: 999, // $9.99
    interval: 'month',
  },
  {
    id: 'professional',
    name: 'Professional', 
    limits: {
      apiCalls: 100000,
      tokens: 10000000,
      storage: 10 * 1024 * 1024 * 1024, // 10GB
      toolExecutions: 1000,
    },
    price: 2999, // $29.99
    interval: 'month',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    limits: {
      apiCalls: -1, // unlimited
      tokens: -1, // unlimited
      storage: 100 * 1024 * 1024 * 1024, // 100GB
      toolExecutions: -1, // unlimited
    },
    price: 9999, // $99.99
    interval: 'month',
  },
];

export class UsageTracker {
  /**
   * Track a usage event for the current user
   */
  static async track(event: Omit<UsageEvent, 'userId' | 'timestamp'>): Promise<void> {
    try {
      const { userId } = await auth();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const usageEvent: UsageEvent = {
        ...event,
        userId,
        timestamp: new Date(),
      };

      await executeQuery(`
        INSERT INTO usage_events (
          user_id, type, resource, quantity, metadata, timestamp, cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        usageEvent.userId,
        usageEvent.type,
        usageEvent.resource,
        usageEvent.quantity,
        JSON.stringify(usageEvent.metadata || {}),
        usageEvent.timestamp,
        usageEvent.cost || 0,
      ]);

    } catch (error) {
      console.error('Failed to track usage:', error);
      // Don't throw - usage tracking should not break the main flow
    }
  }

  /**
   * Get current month usage for a user
   */
  static async getCurrentUsage(userId?: string): Promise<{
    apiCalls: number;
    tokens: number;
    storage: number;
    toolExecutions: number;
    cost: number;
  }> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { userId: authUserId } = await auth();
        if (!authUserId) {
          throw new Error('User not authenticated');
        }
        targetUserId = authUserId;
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const result = await executeQuery(`
        SELECT 
          type,
          SUM(quantity) as total_quantity,
          SUM(cost) as total_cost
        FROM usage_events 
        WHERE user_id = $1 
          AND timestamp >= $2
        GROUP BY type
      `, [targetUserId, startOfMonth]);

      const usage = {
        apiCalls: 0,
        tokens: 0,
        storage: 0,
        toolExecutions: 0,
        cost: 0,
      };

      result.rows.forEach((row: any) => {
        const quantity = parseInt(row.total_quantity) || 0;
        const cost = parseFloat(row.total_cost) || 0;
        
        switch (row.type) {
          case 'api_call':
            usage.apiCalls += quantity;
            break;
          case 'token_usage':
            usage.tokens += quantity;
            break;
          case 'file_upload':
          case 'attachment_processing':
            usage.storage += quantity;
            break;
          case 'tool_execution':
            usage.toolExecutions += quantity;
            break;
        }
        
        usage.cost += cost;
      });

      return usage;
    } catch (error) {
      console.error('Failed to get usage:', error);
      return {
        apiCalls: 0,
        tokens: 0,
        storage: 0,
        toolExecutions: 0,
        cost: 0,
      };
    }
  }

  /**
   * Check if user has exceeded their limits
   */
  static async checkLimits(userId?: string): Promise<{
    withinLimits: boolean;
    usage: Awaited<ReturnType<typeof UsageTracker.getCurrentUsage>>;
    limits: UsageLimits;
    tier: SubscriptionTier;
  }> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { userId: authUserId } = await auth();
        if (!authUserId) {
          throw new Error('User not authenticated');
        }
        targetUserId = authUserId;
      }

      // Get user's subscription tier (default to starter for demo)
      const userTier = SUBSCRIPTION_TIERS[0]; // TODO: Get from database
      
      const usage = await this.getCurrentUsage(targetUserId);
      
      const withinLimits = (
        (userTier.limits.apiCalls === -1 || usage.apiCalls <= userTier.limits.apiCalls) &&
        (userTier.limits.tokens === -1 || usage.tokens <= userTier.limits.tokens) &&
        (userTier.limits.storage === -1 || usage.storage <= userTier.limits.storage) &&
        (userTier.limits.toolExecutions === -1 || usage.toolExecutions <= userTier.limits.toolExecutions)
      );

      return {
        withinLimits,
        usage,
        limits: userTier.limits,
        tier: userTier,
      };
    } catch (error) {
      console.error('Failed to check limits:', error);
      // Default to allowing usage if check fails
      return {
        withinLimits: true,
        usage: await this.getCurrentUsage(userId),
        limits: SUBSCRIPTION_TIERS[0].limits,
        tier: SUBSCRIPTION_TIERS[0],
      };
    }
  }

  /**
   * Get usage analytics for a date range
   */
  static async getUsageAnalytics(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<{
    daily: Array<{
      date: string;
      apiCalls: number;
      tokens: number;
      cost: number;
    }>;
    byResource: Array<{
      resource: string;
      count: number;
      cost: number;
    }>;
    totalCost: number;
  }> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { userId: authUserId } = await auth();
        if (!authUserId) {
          throw new Error('User not authenticated');
        }
        targetUserId = authUserId;
      }

      // Daily usage
      const dailyResult = await executeQuery(`
        SELECT 
          DATE(timestamp) as date,
          SUM(CASE WHEN type = 'api_call' THEN quantity ELSE 0 END) as api_calls,
          SUM(CASE WHEN type = 'token_usage' THEN quantity ELSE 0 END) as tokens,
          SUM(cost) as cost
        FROM usage_events 
        WHERE user_id = $1 
          AND timestamp BETWEEN $2 AND $3
        GROUP BY DATE(timestamp)
        ORDER BY date
      `, [targetUserId, startDate, endDate]);

      // Usage by resource
      const resourceResult = await executeQuery(`
        SELECT 
          resource,
          COUNT(*) as count,
          SUM(cost) as cost
        FROM usage_events 
        WHERE user_id = $1 
          AND timestamp BETWEEN $2 AND $3
        GROUP BY resource
        ORDER BY count DESC
      `, [targetUserId, startDate, endDate]);

      // Total cost
      const totalCostResult = await executeQuery(`
        SELECT SUM(cost) as total_cost
        FROM usage_events 
        WHERE user_id = $1 
          AND timestamp BETWEEN $2 AND $3
      `, [targetUserId, startDate, endDate]);

      return {
        daily: dailyResult.rows.map((row: any) => ({
          date: row.date,
          apiCalls: parseInt(row.api_calls) || 0,
          tokens: parseInt(row.tokens) || 0,
          cost: parseFloat(row.cost) || 0,
        })),
        byResource: resourceResult.rows.map((row: any) => ({
          resource: row.resource,
          count: parseInt(row.count) || 0,
          cost: parseFloat(row.cost) || 0,
        })),
        totalCost: parseFloat(totalCostResult.rows[0]?.total_cost) || 0,
      };
    } catch (error) {
      console.error('Failed to get usage analytics:', error);
      return {
        daily: [],
        byResource: [],
        totalCost: 0,
      };
    }
  }

  /**
   * Rate limiting middleware check
   */
  static async canMakeRequest(
    type: UsageEvent['type'],
    quantity = 1,
    userId?: string
  ): Promise<{ allowed: boolean; reason?: string; resetTime?: Date }> {
    try {
      const limits = await this.checkLimits(userId);
      
      if (!limits.withinLimits) {
        return {
          allowed: false,
          reason: 'Monthly usage limit exceeded',
          resetTime: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        };
      }

      // Check specific type limits
      switch (type) {
        case 'api_call':
          if (limits.limits.apiCalls !== -1 && 
              limits.usage.apiCalls + quantity > limits.limits.apiCalls) {
            return {
              allowed: false,
              reason: 'API call limit exceeded',
              resetTime: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
            };
          }
          break;
        
        case 'token_usage':
          if (limits.limits.tokens !== -1 && 
              limits.usage.tokens + quantity > limits.limits.tokens) {
            return {
              allowed: false,
              reason: 'Token limit exceeded',
              resetTime: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
            };
          }
          break;
        
        case 'tool_execution':
          if (limits.limits.toolExecutions !== -1 && 
              limits.usage.toolExecutions + quantity > limits.limits.toolExecutions) {
            return {
              allowed: false,
              reason: 'Tool execution limit exceeded',
              resetTime: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
            };
          }
          break;
      }

      return { allowed: true };
    } catch (error) {
      console.error('Failed to check rate limit:', error);
      // Default to allowing if check fails
      return { allowed: true };
    }
  }
}

/**
 * Calculate usage cost based on type and quantity
 */
export function calculateUsageCost(
  type: UsageEvent['type'],
  quantity: number,
  tier: SubscriptionTier
): number {
  // Base costs per unit (in cents)
  const costs = {
    api_call: 0.001, // $0.00001 per API call
    token_usage: 0.000001, // $0.000000001 per token  
    file_upload: 0.01, // $0.0001 per MB
    attachment_processing: 0.05, // $0.0005 per processing
    tool_execution: 0.1, // $0.001 per execution
  };

  // Enterprise tier gets reduced rates
  const multiplier = tier.id === 'enterprise' ? 0.5 : tier.id === 'professional' ? 0.8 : 1.0;
  
  return Math.ceil((costs[type] || 0) * quantity * multiplier);
}
