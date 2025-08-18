import { memorySystem } from './memory-system';
import { taskScheduler } from './task-scheduler';
import { executeQuery } from './database';

export interface ProactiveSuggestion {
  id: string;
  type: 'workflow' | 'learning' | 'productivity' | 'reminder' | 'optimization' | 'insight';
  title: string;
  description: string;
  confidence: number; // 0-1 how confident we are this is useful
  priority: 'low' | 'medium' | 'high';
  metadata: {
    category: string;
    basedon: 'pattern' | 'calendar' | 'usage' | 'conversation' | 'context' | 'goal';
    relatedMemories?: string[];
    relatedTasks?: string[];
    actionRequired: boolean;
    estimatedTimeMinutes?: number;
    tags: string[];
  };
  actions: Array<{
    label: string;
    type: 'task' | 'reminder' | 'link' | 'workflow' | 'dismiss';
    data: any;
  }>;
  createdAt: Date;
  expiresAt?: Date;
  shown: boolean;
  dismissed: boolean;
}

export interface UserActivity {
  userId: string;
  timestamp: Date;
  activityType: 'chat' | 'task_completion' | 'login' | 'file_upload' | 'model_switch' | 'memory_access';
  data: any;
  sessionId: string;
}

export interface UserPattern {
  userId: string;
  patternType: 'working_hours' | 'preferred_topics' | 'communication_style' | 'task_frequency' | 'learning_pace';
  pattern: {
    frequency: number;
    confidence: number;
    lastSeen: Date;
    data: any;
  };
}

export class ProactiveSuggestionsEngine {
  private static instance: ProactiveSuggestionsEngine;

  public static getInstance(): ProactiveSuggestionsEngine {
    if (!ProactiveSuggestionsEngine.instance) {
      ProactiveSuggestionsEngine.instance = new ProactiveSuggestionsEngine();
    }
    return ProactiveSuggestionsEngine.instance;
  }

  /**
   * Generate proactive suggestions for a user based on their patterns and context
   */
  async generateSuggestions(userId: string): Promise<ProactiveSuggestion[]> {
    try {
      const suggestions: ProactiveSuggestion[] = [];

      // Get user patterns and context
      const [userPatterns, recentActivity, userProfile, pendingTasks, recentMemories] = await Promise.all([
        this.getUserPatterns(userId),
        this.getRecentActivity(userId),
        memorySystem.getUserProfile(userId),
        taskScheduler.getPendingTasks(userId),
        memorySystem.searchMemories(userId, '', undefined, 10)
      ]);

      // Generate different types of suggestions
      const workflowSuggestions = await this.generateWorkflowSuggestions(userId, userPatterns, recentActivity);
      const learningSuggestions = await this.generateLearningSuggestions(userId, recentMemories, userProfile);
      const productivitySuggestions = await this.generateProductivitySuggestions(userId, pendingTasks, userPatterns);
      const reminderSuggestions = await this.generateReminderSuggestions(userId, userPatterns, recentActivity);
      const optimizationSuggestions = await this.generateOptimizationSuggestions(userId, userPatterns, userProfile);
      const insightSuggestions = await this.generateInsightSuggestions(userId, recentMemories, userPatterns);

      suggestions.push(
        ...workflowSuggestions,
        ...learningSuggestions,
        ...productivitySuggestions,
        ...reminderSuggestions,
        ...optimizationSuggestions,
        ...insightSuggestions
      );

      // Sort by priority and confidence
      return suggestions
        .sort((a, b) => {
          const priorityWeight = { high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return b.confidence - a.confidence;
        })
        .slice(0, 5); // Return top 5 suggestions

    } catch (error) {
      console.error('Failed to generate proactive suggestions:', error);
      return [];
    }
  }

  /**
   * Generate workflow optimization suggestions
   */
  private async generateWorkflowSuggestions(
    userId: string, 
    patterns: UserPattern[], 
    activity: UserActivity[]
  ): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];

    // Detect repetitive tasks that could be automated
    const taskPatterns = patterns.filter(p => p.patternType === 'task_frequency');
    for (const pattern of taskPatterns) {
      if (pattern.pattern.frequency > 3 && pattern.pattern.confidence > 0.7) {
        suggestions.push({
          id: `workflow-${Date.now()}-${Math.random()}`,
          type: 'workflow',
          title: 'Workflow Automatisering Kans',
          description: `Je doet deze taak vaak (${pattern.pattern.frequency}x per week). Misschien kunnen we dit automatiseren?`,
          confidence: pattern.pattern.confidence,
          priority: 'medium',
          metadata: {
            category: 'automation',
            basedon: 'pattern',
            actionRequired: true,
            estimatedTimeMinutes: 15,
            tags: ['workflow', 'automation', 'efficiency']
          },
          actions: [
            {
              label: 'Bekijk Automatisering Opties',
              type: 'workflow',
              data: { patternId: pattern.userId, taskType: pattern.pattern.data.taskType }
            },
            {
              label: 'Niet Nu',
              type: 'dismiss',
              data: {}
            }
          ],
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          shown: false,
          dismissed: false
        });
      }
    }

    // Suggest workflow templates based on common patterns
    const recentChats = activity.filter(a => a.activityType === 'chat').slice(0, 10);
    if (recentChats.length > 5) {
      const commonTopics = this.extractCommonTopics(recentChats);
      if (commonTopics.length > 0) {
        suggestions.push({
          id: `workflow-template-${Date.now()}`,
          type: 'workflow',
          title: 'Workflow Template Suggestie',
          description: `Gebaseerd op je gesprekken over ${commonTopics[0]}, kan ik een workflow template maken.`,
          confidence: 0.6,
          priority: 'low',
          metadata: {
            category: 'template',
            basedon: 'conversation',
            actionRequired: false,
            estimatedTimeMinutes: 10,
            tags: ['template', 'workflow', commonTopics[0]]
          },
          actions: [
            {
              label: 'Maak Template',
              type: 'workflow',
              data: { topic: commonTopics[0], conversations: recentChats.length }
            },
            {
              label: 'Later',
              type: 'dismiss',
              data: {}
            }
          ],
          createdAt: new Date(),
          shown: false,
          dismissed: false
        });
      }
    }

    return suggestions;
  }

  /**
   * Generate learning suggestions based on user interests and knowledge gaps
   */
  private async generateLearningSuggestions(
    userId: string, 
    memories: any[], 
    userProfile: any
  ): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];

    // Identify knowledge gaps based on questions asked
    const questionMemories = memories.filter(m => 
      m.content.includes('?') || 
      m.metadata.tags.includes('question') ||
      m.content.toLowerCase().includes('how to') ||
      m.content.toLowerCase().includes('what is')
    );

    if (questionMemories.length > 2) {
      const commonTopics = this.extractTopicsFromMemories(questionMemories);
      
      for (const topic of commonTopics.slice(0, 2)) {
        suggestions.push({
          id: `learning-${topic}-${Date.now()}`,
          type: 'learning',
          title: `Leer Meer Over ${topic}`,
          description: `Je hebt veel vragen gesteld over ${topic}. Wil je een gestructureerd leerpad?`,
          confidence: 0.8,
          priority: 'medium',
          metadata: {
            category: 'skill-development',
            basedon: 'conversation',
            actionRequired: false,
            estimatedTimeMinutes: 30,
            tags: ['learning', 'skill', topic]
          },
          actions: [
            {
              label: 'Start Leerpad',
              type: 'workflow',
              data: { topic, type: 'learning-path', questions: questionMemories.length }
            },
            {
              label: 'Bewaar Voor Later',
              type: 'task',
              data: { title: `Leer ${topic}`, category: 'learning' }
            },
            {
              label: 'Niet Interessant',
              type: 'dismiss',
              data: {}
            }
          ],
          createdAt: new Date(),
          shown: false,
          dismissed: false
        });
      }
    }

    // Suggest skill reinforcement for areas of expertise
    if (userProfile?.skills?.technical?.length > 0) {
      const topSkill = userProfile.skills.technical[0];
      suggestions.push({
        id: `skill-reinforcement-${Date.now()}`,
        type: 'learning',
        title: 'Versterk Je Expertise',
        description: `Als ${topSkill} expert, zou je anderen kunnen helpen en je kennis verdiepen.`,
        confidence: 0.7,
        priority: 'low',
        metadata: {
          category: 'expertise',
          basedon: 'conversation',
          actionRequired: false,
          estimatedTimeMinutes: 20,
          tags: ['expertise', 'sharing', topSkill]
        },
        actions: [
          {
            label: 'Deel Kennis',
            type: 'workflow',
            data: { skill: topSkill, type: 'knowledge-sharing' }
          },
          {
            label: 'Later',
            type: 'dismiss',
            data: {}
          }
        ],
        createdAt: new Date(),
        shown: false,
        dismissed: false
      });
    }

    return suggestions;
  }

  /**
   * Generate productivity suggestions based on task patterns and habits
   */
  private async generateProductivitySuggestions(
    userId: string, 
    pendingTasks: any[], 
    patterns: UserPattern[]
  ): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];

    // Suggest task batching for similar tasks
    const tasksByCategory = this.groupTasksByCategory(pendingTasks);
    for (const [category, tasks] of Object.entries(tasksByCategory)) {
      if (tasks.length > 2) {
        suggestions.push({
          id: `batching-${category}-${Date.now()}`,
          type: 'productivity',
          title: 'Task Batching Opportunity',
          description: `Je hebt ${tasks.length} ${category} taken. Batch ze voor meer efficiency!`,
          confidence: 0.8,
          priority: 'medium',
          metadata: {
            category: 'task-management',
            basedon: 'pattern',
            actionRequired: true,
            estimatedTimeMinutes: tasks.length * 10,
            tags: ['batching', 'efficiency', category]
          },
          actions: [
            {
              label: 'Plan Batch Session',
              type: 'task',
              data: { 
                title: `${category} Batch Session`, 
                tasks: tasks.map(t => t.id),
                category: 'productivity'
              }
            },
            {
              label: 'Niet Nu',
              type: 'dismiss',
              data: {}
            }
          ],
          createdAt: new Date(),
          shown: false,
          dismissed: false
        });
      }
    }

    // Suggest break reminders for intensive work periods
    const workingHoursPattern = patterns.find(p => p.patternType === 'working_hours');
    if (workingHoursPattern && workingHoursPattern.pattern.data.intensiveHours > 4) {
      suggestions.push({
        id: `break-reminder-${Date.now()}`,
        type: 'productivity',
        title: 'Pauze Reminder',
        description: 'Je werkt al lange tijd intensief. Een korte pauze verhoogt je productiviteit.',
        confidence: 0.9,
        priority: 'high',
        metadata: {
          category: 'wellbeing',
          basedon: 'usage',
          actionRequired: false,
          estimatedTimeMinutes: 15,
          tags: ['break', 'wellbeing', 'productivity']
        },
        actions: [
          {
            label: 'Plan 15min Pauze',
            type: 'task',
            data: { 
              title: 'Korte Pauze', 
              scheduledFor: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
              category: 'wellbeing'
            }
          },
          {
            label: 'Later Herinneren',
            type: 'reminder',
            data: { delayMinutes: 60 }
          },
          {
            label: 'Ik Neem Straks Pauze',
            type: 'dismiss',
            data: {}
          }
        ],
        createdAt: new Date(),
        shown: false,
        dismissed: false
      });
    }

    return suggestions;
  }

  /**
   * Generate reminder suggestions based on user patterns and forgotten items
   */
  private async generateReminderSuggestions(
    userId: string, 
    patterns: UserPattern[], 
    activity: UserActivity[]
  ): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];

    // Check for forgotten recurring activities
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // Example: If user usually has meetings on Fridays at 14:00 but no meeting scheduled
    if (dayOfWeek === 5 && hour === 13) { // Friday 1 PM
      const meetingPattern = patterns.find(p => 
        p.patternType === 'task_frequency' && 
        p.pattern.data.taskType === 'meeting' &&
        p.pattern.data.dayOfWeek === 5
      );

      if (meetingPattern && meetingPattern.pattern.confidence > 0.6) {
        suggestions.push({
          id: `forgotten-meeting-${Date.now()}`,
          type: 'reminder',
          title: 'Mogelijke Vergeten Meeting',
          description: 'Je hebt meestal een meeting op vrijdagmiddag. Heb je iets gemist?',
          confidence: meetingPattern.pattern.confidence,
          priority: 'high',
          metadata: {
            category: 'schedule',
            basedon: 'pattern',
            actionRequired: true,
            tags: ['meeting', 'schedule', 'reminder']
          },
          actions: [
            {
              label: 'Check Agenda',
              type: 'link',
              data: { url: '/calendar' }
            },
            {
              label: 'Plan Meeting Nu',
              type: 'task',
              data: { title: 'Vrijdag Meeting', category: 'meeting' }
            },
            {
              label: 'Geen Meeting Vandaag',
              type: 'dismiss',
              data: {}
            }
          ],
          createdAt: new Date(),
          shown: false,
          dismissed: false
        });
      }
    }

    return suggestions;
  }

  /**
   * Generate optimization suggestions for user workflows and habits
   */
  private async generateOptimizationSuggestions(
    userId: string, 
    patterns: UserPattern[], 
    userProfile: any
  ): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];

    // Suggest communication style optimization
    if (userProfile?.preferences?.communicationStyle) {
      const style = userProfile.preferences.communicationStyle;
      if (style === 'casual' && patterns.some(p => p.pattern.data.context === 'professional')) {
        suggestions.push({
          id: `communication-optimization-${Date.now()}`,
          type: 'optimization',
          title: 'Communicatie Stijl Optimalisatie',
          description: 'Je gebruikt nu casual stijl, maar ik zie professionele context. Wil je dat ik aanpas?',
          confidence: 0.7,
          priority: 'low',
          metadata: {
            category: 'communication',
            basedon: 'context',
            actionRequired: false,
            tags: ['communication', 'style', 'professional']
          },
          actions: [
            {
              label: 'Schakel naar Professional',
              type: 'workflow',
              data: { action: 'update-communication-style', style: 'professional' }
            },
            {
              label: 'Blijf bij Casual',
              type: 'dismiss',
              data: {}
            }
          ],
          createdAt: new Date(),
          shown: false,
          dismissed: false
        });
      }
    }

    // Suggest model optimization based on usage patterns
    const modelUsagePattern = patterns.find(p => p.pattern.data.modelUsage);
    if (modelUsagePattern) {
      const usage = modelUsagePattern.pattern.data.modelUsage;
      if (usage.expensive_model_usage > 0.8) {
        suggestions.push({
          id: `model-optimization-${Date.now()}`,
          type: 'optimization',
          title: 'AI Model Kosten Optimalisatie',
          description: 'Je gebruikt vaak dure modellen. Voor veel taken kunnen goedkopere modellen volstaan.',
          confidence: 0.8,
          priority: 'medium',
          metadata: {
            category: 'cost-optimization',
            basedon: 'usage',
            actionRequired: false,
            estimatedTimeMinutes: 5,
            tags: ['cost', 'models', 'optimization']
          },
          actions: [
            {
              label: 'Bekijk Model Suggestions',
              type: 'workflow',
              data: { action: 'show-model-recommendations' }
            },
            {
              label: 'Automatisch Optimaliseren',
              type: 'workflow',
              data: { action: 'enable-auto-model-optimization' }
            },
            {
              label: 'Behoud Huidige Setup',
              type: 'dismiss',
              data: {}
            }
          ],
          createdAt: new Date(),
          shown: false,
          dismissed: false
        });
      }
    }

    return suggestions;
  }

  /**
   * Generate insight suggestions based on user data and patterns
   */
  private async generateInsightSuggestions(
    userId: string, 
    memories: any[], 
    patterns: UserPattern[]
  ): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];

    // Generate productivity insights
    const workingHoursPattern = patterns.find(p => p.patternType === 'working_hours');
    if (workingHoursPattern) {
      const peakHours = workingHoursPattern.pattern.data.peakProductivityHours;
      if (peakHours && peakHours.length > 0) {
        suggestions.push({
          id: `productivity-insight-${Date.now()}`,
          type: 'insight',
          title: 'Je Productiviteit Patroon',
          description: `Je bent het meest productief tussen ${peakHours[0]} en ${peakHours[1]}. Plan belangrijke taken in deze uren!`,
          confidence: workingHoursPattern.pattern.confidence,
          priority: 'medium',
          metadata: {
            category: 'productivity-analytics',
            basedon: 'pattern',
            actionRequired: false,
            tags: ['productivity', 'timing', 'insight']
          },
          actions: [
            {
              label: 'Plan Belangrijke Taken',
              type: 'workflow',
              data: { action: 'schedule-in-peak-hours', hours: peakHours }
            },
            {
              label: 'Zie Meer Analytics',
              type: 'link',
              data: { url: '/analytics' }
            },
            {
              label: 'Begrepen',
              type: 'dismiss',
              data: {}
            }
          ],
          createdAt: new Date(),
          shown: false,
          dismissed: false
        });
      }
    }

    // Generate learning progress insights
    const skillMemories = memories.filter(m => m.type === 'skill');
    if (skillMemories.length > 3) {
      const skillGroups = this.groupMemoriesBySkill(skillMemories);
      const topSkill = Object.keys(skillGroups)[0];
      
      if (topSkill) {
        suggestions.push({
          id: `learning-insight-${Date.now()}`,
          type: 'insight',
          title: 'Je Leer Voortgang',
          description: `Je hebt veel geleerd over ${topSkill} laatst. Je kennis groeit snel op dit gebied!`,
          confidence: 0.8,
          priority: 'low',
          metadata: {
            category: 'learning-analytics',
            basedon: 'conversation',
            actionRequired: false,
            tags: ['learning', 'progress', topSkill]
          },
          actions: [
            {
              label: 'Zie Voortgang Details',
              type: 'link',
              data: { url: '/learning-analytics' }
            },
            {
              label: 'Deel Achievement',
              type: 'workflow',
              data: { action: 'share-learning-achievement', skill: topSkill }
            },
            {
              label: 'Bedankt!',
              type: 'dismiss',
              data: {}
            }
          ],
          createdAt: new Date(),
          shown: false,
          dismissed: false
        });
      }
    }

    return suggestions;
  }

  // Helper methods
  private async getUserPatterns(userId: string): Promise<UserPattern[]> {
    // In a real implementation, this would query a patterns table
    // For now, return mock patterns
    return [
      {
        userId,
        patternType: 'working_hours',
        pattern: {
          frequency: 5,
          confidence: 0.9,
          lastSeen: new Date(),
          data: {
            startHour: 9,
            endHour: 17,
            peakProductivityHours: ['10:00', '15:00'],
            intensiveHours: 6
          }
        }
      },
      {
        userId,
        patternType: 'task_frequency',
        pattern: {
          frequency: 4,
          confidence: 0.8,
          lastSeen: new Date(),
          data: {
            taskType: 'code-review',
            dayOfWeek: 5
          }
        }
      }
    ];
  }

  private async getRecentActivity(userId: string): Promise<UserActivity[]> {
    // Mock recent activity data
    return [
      {
        userId,
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        activityType: 'chat',
        data: { topic: 'react', questionCount: 3 },
        sessionId: 'session-1'
      },
      {
        userId,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        activityType: 'task_completion',
        data: { taskType: 'code-review', category: 'development' },
        sessionId: 'session-1'
      }
    ];
  }

  private extractCommonTopics(activities: UserActivity[]): string[] {
    const topics = activities
      .map(a => a.data.topic)
      .filter(Boolean);
    
    const topicCounts = topics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([topic]) => topic);
  }

  private extractTopicsFromMemories(memories: any[]): string[] {
    const tags = memories.flatMap(m => m.metadata.tags);
    const tagCounts = tags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([tag]) => tag)
      .slice(0, 3);
  }

  private groupTasksByCategory(tasks: any[]): Record<string, any[]> {
    return tasks.reduce((acc, task) => {
      const category = task.metadata.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(task);
      return acc;
    }, {} as Record<string, any[]>);
  }

  private groupMemoriesBySkill(memories: any[]): Record<string, any[]> {
    return memories.reduce((acc, memory) => {
      const skills = memory.metadata.tags.filter(tag => 
        ['technical', 'programming', 'language', 'framework'].some(type => 
          tag.includes(type)
        )
      );
      
      skills.forEach(skill => {
        if (!acc[skill]) acc[skill] = [];
        acc[skill].push(memory);
      });
      
      return acc;
    }, {} as Record<string, any[]>);
  }

  /**
   * Mark a suggestion as shown
   */
  async markSuggestionShown(suggestionId: string): Promise<void> {
    // In a real implementation, this would update the database
    console.log(`Marking suggestion ${suggestionId} as shown`);
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(suggestionId: string, userId: string): Promise<void> {
    // In a real implementation, this would update the database
    console.log(`Dismissing suggestion ${suggestionId} for user ${userId}`);
  }

  /**
   * Track user interaction with suggestions for learning
   */
  async trackSuggestionInteraction(
    suggestionId: string, 
    userId: string, 
    action: 'viewed' | 'clicked' | 'dismissed' | 'completed'
  ): Promise<void> {
    // In a real implementation, this would help improve suggestion quality
    console.log(`User ${userId} ${action} suggestion ${suggestionId}`);
  }
}

/**
 * Global proactive suggestions engine instance
 */
export const proactiveSuggestionsEngine = ProactiveSuggestionsEngine.getInstance();
