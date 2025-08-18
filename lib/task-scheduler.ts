import { executeQuery } from './database';
import { auth } from '@clerk/nextjs/server';

export interface ScheduledTask {
  id?: string;
  userId: string;
  title: string;
  description?: string;
  taskType: 'reminder' | 'followup' | 'recurring' | 'suggestion';
  scheduledFor: Date;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'custom';
  status: 'pending' | 'completed' | 'cancelled' | 'snoozed';
  metadata: {
    priority: 'low' | 'medium' | 'high';
    category: string;
    relatedThreadId?: string;
    reminderType?: 'deadline' | 'meeting' | 'task' | 'birthday' | 'custom';
    notificationChannels: ('email' | 'push' | 'sms')[];
    customRecurrence?: {
      interval: number;
      unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
      endDate?: Date;
      maxOccurrences?: number;
    };
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskNotification {
  taskId: string;
  userId: string;
  message: string;
  scheduledFor: Date;
  channels: ('email' | 'push' | 'sms')[];
  sent: boolean;
}

export interface UserPreferences {
  userId: string;
  defaultNotificationTime: string; // "09:00"
  timezone: string;
  workingHours: {
    start: string;
    end: string;
    workdays: number[]; // 0-6, Sunday=0
  };
  quietHours: {
    start: string;
    end: string;
  };
  reminderSettings: {
    defaultAdvanceTime: number; // minutes before
    maxRemindersPerDay: number;
    autoSnoozeTime: number; // minutes
  };
}

export class TaskScheduler {
  private static instance: TaskScheduler;

  public static getInstance(): TaskScheduler {
    if (!TaskScheduler.instance) {
      TaskScheduler.instance = new TaskScheduler();
    }
    return TaskScheduler.instance;
  }

  /**
   * Schedule a new task
   */
  async scheduleTask(task: Omit<ScheduledTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = new Date();
      
      const result = await executeQuery(`
        INSERT INTO scheduled_tasks (
          user_id, title, description, task_type, scheduled_for, 
          recurrence_pattern, status, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        task.userId,
        task.title,
        task.description || null,
        task.taskType,
        task.scheduledFor,
        task.recurrencePattern || null,
        task.status,
        JSON.stringify(task.metadata),
        now,
        now
      ]);

      const taskId = result.rows[0].id;

      // Schedule recurring tasks if needed
      if (task.recurrencePattern) {
        await this.scheduleRecurringTasks(taskId, task);
      }

      return taskId;
    } catch (error) {
      console.error('Failed to schedule task:', error);
      throw error;
    }
  }

  /**
   * Get pending tasks for a user
   */
  async getPendingTasks(userId: string): Promise<ScheduledTask[]> {
    try {
      const result = await executeQuery(`
        SELECT * FROM scheduled_tasks 
        WHERE user_id = $1 
        AND status = 'pending'
        AND scheduled_for <= NOW() + INTERVAL '24 hours'
        ORDER BY scheduled_for ASC
      `, [userId]);

      return result.rows.map(this.parseTaskRow);
    } catch (error) {
      console.error('Failed to get pending tasks:', error);
      return [];
    }
  }

  /**
   * Get upcoming tasks for a user
   */
  async getUpcomingTasks(
    userId: string, 
    days: number = 7
  ): Promise<ScheduledTask[]> {
    try {
      const result = await executeQuery(`
        SELECT * FROM scheduled_tasks 
        WHERE user_id = $1 
        AND status IN ('pending', 'snoozed')
        AND scheduled_for BETWEEN NOW() AND NOW() + INTERVAL '${days} days'
        ORDER BY scheduled_for ASC
        LIMIT 20
      `, [userId]);

      return result.rows.map(this.parseTaskRow);
    } catch (error) {
      console.error('Failed to get upcoming tasks:', error);
      return [];
    }
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: string, userId: string): Promise<void> {
    try {
      await executeQuery(`
        UPDATE scheduled_tasks 
        SET status = 'completed', updated_at = NOW()
        WHERE id = $1 AND user_id = $2
      `, [taskId, userId]);

      // Generate follow-up suggestions if appropriate
      await this.generateFollowUpSuggestions(taskId, userId);
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  }

  /**
   * Snooze a task
   */
  async snoozeTask(
    taskId: string, 
    userId: string, 
    snoozeMinutes: number = 60
  ): Promise<void> {
    try {
      const newScheduledFor = new Date(Date.now() + snoozeMinutes * 60 * 1000);
      
      await executeQuery(`
        UPDATE scheduled_tasks 
        SET scheduled_for = $3, status = 'snoozed', updated_at = NOW()
        WHERE id = $1 AND user_id = $2
      `, [taskId, userId, newScheduledFor]);
    } catch (error) {
      console.error('Failed to snooze task:', error);
    }
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string, userId: string): Promise<void> {
    try {
      await executeQuery(`
        UPDATE scheduled_tasks 
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1 AND user_id = $2
      `, [taskId, userId]);
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  }

  /**
   * Process due tasks and send notifications
   */
  async processDueTasks(): Promise<void> {
    try {
      // Get all due tasks
      const result = await executeQuery(`
        SELECT * FROM scheduled_tasks 
        WHERE status = 'pending'
        AND scheduled_for <= NOW()
        ORDER BY scheduled_for ASC
      `);

      const dueTasks = result.rows.map(this.parseTaskRow);

      for (const task of dueTasks) {
        await this.processTask(task);
      }
    } catch (error) {
      console.error('Failed to process due tasks:', error);
    }
  }

  /**
   * Create intelligent suggestions based on user patterns
   */
  async generateSmartSuggestions(userId: string): Promise<ScheduledTask[]> {
    try {
      // Analyze user patterns from memories and tasks
      const patterns = await this.analyzeUserPatterns(userId);
      const suggestions: ScheduledTask[] = [];

      // Suggest follow-ups for incomplete tasks
      const incompleteTasks = await this.getOverdueTasks(userId);
      for (const task of incompleteTasks) {
        if (task.metadata.priority === 'high') {
          suggestions.push({
            userId,
            title: `Follow-up: ${task.title}`,
            description: `Deze belangrijke taak is nog niet voltooid.`,
            taskType: 'followup',
            scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
            status: 'pending',
            metadata: {
              priority: 'medium',
              category: 'followup',
              relatedThreadId: task.metadata.relatedThreadId,
              reminderType: 'task',
              notificationChannels: ['push']
            }
          });
        }
      }

      // Suggest recurring reminders based on patterns
      if (patterns.commonMeetingTimes.length > 0) {
        const nextMeetingTime = this.getNextOccurrence(patterns.commonMeetingTimes[0]);
        suggestions.push({
          userId,
          title: 'Recurring Meeting Reminder',
          description: 'Gebaseerd op je gebruikelijke meeting tijden',
          taskType: 'suggestion',
          scheduledFor: new Date(nextMeetingTime.getTime() - 15 * 60 * 1000), // 15 min before
          status: 'pending',
          metadata: {
            priority: 'medium',
            category: 'meeting',
            reminderType: 'meeting',
            notificationChannels: ['push', 'email']
          }
        });
      }

      // Suggest break reminders for intensive work patterns
      if (patterns.workIntensity > 0.8) {
        suggestions.push({
          userId,
          title: 'Take a Break',
          description: 'Je werkt hard vandaag! Tijd voor een korte pauze.',
          taskType: 'suggestion',
          scheduledFor: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          status: 'pending',
          metadata: {
            priority: 'low',
            category: 'wellbeing',
            reminderType: 'custom',
            notificationChannels: ['push']
          }
        });
      }

      return suggestions;
    } catch (error) {
      console.error('Failed to generate smart suggestions:', error);
      return [];
    }
  }

  /**
   * Get user preferences for task scheduling
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const result = await executeQuery(`
        SELECT profile_data FROM user_profiles WHERE user_id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return this.getDefaultPreferences(userId);
      }

      const profileData = JSON.parse(result.rows[0].profile_data);
      return profileData.taskPreferences || this.getDefaultPreferences(userId);
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return this.getDefaultPreferences(userId);
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    try {
      // Get existing profile
      const existingResult = await executeQuery(`
        SELECT profile_data FROM user_profiles WHERE user_id = $1
      `, [userId]);

      let profileData = {};
      if (existingResult.rows.length > 0) {
        profileData = JSON.parse(existingResult.rows[0].profile_data);
      }

      // Update task preferences
      profileData = {
        ...profileData,
        taskPreferences: {
          ...profileData.taskPreferences,
          ...preferences
        }
      };

      await executeQuery(`
        INSERT INTO user_profiles (user_id, profile_data, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET profile_data = $2, updated_at = NOW()
      `, [userId, JSON.stringify(profileData)]);
    } catch (error) {
      console.error('Failed to update user preferences:', error);
    }
  }

  // Private helper methods
  private parseTaskRow(row: any): ScheduledTask {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      taskType: row.task_type,
      scheduledFor: new Date(row.scheduled_for),
      recurrencePattern: row.recurrence_pattern,
      status: row.status,
      metadata: JSON.parse(row.metadata),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private async scheduleRecurringTasks(taskId: string, task: ScheduledTask): Promise<void> {
    // Implementation for creating recurring task instances
    const maxOccurrences = task.metadata.customRecurrence?.maxOccurrences || 10;
    const interval = this.getRecurrenceInterval(task.recurrencePattern!);

    for (let i = 1; i < maxOccurrences; i++) {
      const nextDate = new Date(task.scheduledFor.getTime() + interval * i);
      
      if (task.metadata.customRecurrence?.endDate && nextDate > task.metadata.customRecurrence.endDate) {
        break;
      }

      await executeQuery(`
        INSERT INTO scheduled_tasks (
          user_id, title, description, task_type, scheduled_for, 
          recurrence_pattern, status, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        task.userId,
        task.title,
        task.description,
        task.taskType,
        nextDate,
        task.recurrencePattern,
        'pending',
        JSON.stringify(task.metadata)
      ]);
    }
  }

  private getRecurrenceInterval(pattern: string): number {
    switch (pattern) {
      case 'daily': return 24 * 60 * 60 * 1000;
      case 'weekly': return 7 * 24 * 60 * 60 * 1000;
      case 'monthly': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private async processTask(task: ScheduledTask): Promise<void> {
    try {
      // Send notifications
      await this.sendTaskNotification(task);

      // Mark as processed if it's a one-time task
      if (!task.recurrencePattern) {
        // For non-recurring tasks, we might want to update status or create follow-ups
        await this.generateTaskFollowUp(task);
      }
    } catch (error) {
      console.error(`Failed to process task ${task.id}:`, error);
    }
  }

  private async sendTaskNotification(task: ScheduledTask): Promise<void> {
    // Implementation would integrate with notification services
    console.log(`Sending notification for task: ${task.title} to user: ${task.userId}`);
    
    // In a real implementation, this would:
    // 1. Check user's notification preferences
    // 2. Send push notifications
    // 3. Send emails if configured
    // 4. Log notification history
  }

  private async generateTaskFollowUp(task: ScheduledTask): Promise<void> {
    // Create intelligent follow-up suggestions
    if (task.metadata.priority === 'high') {
      const followUpTime = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours later
      
      await this.scheduleTask({
        userId: task.userId,
        title: `Follow-up: ${task.title}`,
        description: 'Check if this important task was completed',
        taskType: 'followup',
        scheduledFor: followUpTime,
        status: 'pending',
        metadata: {
          priority: 'medium',
          category: 'followup',
          relatedThreadId: task.metadata.relatedThreadId,
          reminderType: 'task',
          notificationChannels: ['push']
        }
      });
    }
  }

  private async generateFollowUpSuggestions(taskId: string, userId: string): Promise<void> {
    // Analyze completed task and suggest related actions
    const task = await this.getTaskById(taskId);
    if (!task) return;

    // Create contextual suggestions based on task type and content
    if (task.metadata.category === 'meeting') {
      await this.scheduleTask({
        userId,
        title: 'Meeting Follow-up',
        description: 'Stuur follow-up acties of samenvattingen naar deelnemers',
        taskType: 'suggestion',
        scheduledFor: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        status: 'pending',
        metadata: {
          priority: 'medium',
          category: 'followup',
          reminderType: 'custom',
          notificationChannels: ['push']
        }
      });
    }
  }

  private async getTaskById(taskId: string): Promise<ScheduledTask | null> {
    try {
      const result = await executeQuery(`
        SELECT * FROM scheduled_tasks WHERE id = $1
      `, [taskId]);

      return result.rows.length > 0 ? this.parseTaskRow(result.rows[0]) : null;
    } catch (error) {
      console.error('Failed to get task by ID:', error);
      return null;
    }
  }

  private async getOverdueTasks(userId: string): Promise<ScheduledTask[]> {
    try {
      const result = await executeQuery(`
        SELECT * FROM scheduled_tasks 
        WHERE user_id = $1 
        AND status = 'pending'
        AND scheduled_for < NOW() - INTERVAL '1 hour'
        ORDER BY scheduled_for DESC
        LIMIT 5
      `, [userId]);

      return result.rows.map(this.parseTaskRow);
    } catch (error) {
      console.error('Failed to get overdue tasks:', error);
      return [];
    }
  }

  private async analyzeUserPatterns(userId: string): Promise<{
    commonMeetingTimes: Date[];
    workIntensity: number;
    preferredReminderTimes: string[];
  }> {
    // Analyze user's historical tasks and patterns
    // This is a simplified implementation
    return {
      commonMeetingTimes: [new Date(Date.now() + 24 * 60 * 60 * 1000)], // Tomorrow same time
      workIntensity: 0.6, // 60% work intensity
      preferredReminderTimes: ['09:00', '14:00', '17:00']
    };
  }

  private getNextOccurrence(baseTime: Date): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(baseTime.getHours(), baseTime.getMinutes(), 0, 0);
    return tomorrow;
  }

  private getDefaultPreferences(userId: string): UserPreferences {
    return {
      userId,
      defaultNotificationTime: '09:00',
      timezone: 'Europe/Amsterdam',
      workingHours: {
        start: '09:00',
        end: '17:00',
        workdays: [1, 2, 3, 4, 5] // Monday to Friday
      },
      quietHours: {
        start: '22:00',
        end: '08:00'
      },
      reminderSettings: {
        defaultAdvanceTime: 15, // 15 minutes before
        maxRemindersPerDay: 10,
        autoSnoozeTime: 60 // 1 hour
      }
    };
  }
}

/**
 * Global task scheduler instance
 */
export const taskScheduler = TaskScheduler.getInstance();
