import { executeQuery } from './database';
import { memorySystem } from './memory-system';

export interface AIPersona {
  id: string;
  userId: string;
  name: string;
  description: string;
  avatar?: string;
  isActive: boolean;
  isDefault: boolean;
  personality: {
    traits: PersonalityTrait[];
    communicationStyle: 'formal' | 'casual' | 'friendly' | 'professional' | 'technical' | 'creative';
    expertise: string[];
    responseStyle: 'concise' | 'detailed' | 'balanced' | 'step-by-step' | 'example-heavy';
    emotionalTone: 'neutral' | 'supportive' | 'enthusiastic' | 'calm' | 'motivational';
    humor: 'none' | 'light' | 'witty' | 'professional';
  };
  knowledge: {
    domains: string[];
    specializations: string[];
    weaknesses: string[];
    learningFocus: string[];
  };
  behavior: {
    proactivity: 'low' | 'medium' | 'high';
    questionAsking: 'minimal' | 'moderate' | 'frequent';
    followUpStyle: 'none' | 'gentle' | 'persistent' | 'scheduled';
    memoryUsage: 'minimal' | 'contextual' | 'comprehensive';
    suggestionsFrequency: 'rare' | 'occasional' | 'frequent' | 'constant';
  };
  customPrompts: {
    systemPrompt: string;
    greetingPrompt: string;
    farewellPrompt: string;
    errorHandling: string;
    clarificationStyle: string;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    usageCount: number;
    lastUsed: Date;
    userRating?: number;
    isPublic: boolean;
    tags: string[];
  };
}

export interface PersonalityTrait {
  name: string;
  value: number; // 0-1 scale
  description: string;
}

export interface PersonaTemplate {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'creative' | 'technical' | 'personal' | 'educational';
  template: Partial<AIPersona>;
  popularity: number;
}

export interface ConversationContext {
  currentPersona: AIPersona;
  userMood: string;
  conversationGoal: string;
  previousInteractions: number;
  relationshipLevel: 'new' | 'familiar' | 'trusted' | 'expert';
}

export class PersonaManager {
  private static instance: PersonaManager;

  public static getInstance(): PersonaManager {
    if (!PersonaManager.instance) {
      PersonaManager.instance = new PersonaManager();
    }
    return PersonaManager.instance;
  }

  /**
   * Create a new custom persona for a user
   */
  async createPersona(userId: string, personaData: Omit<AIPersona, 'id' | 'userId' | 'metadata'>): Promise<string> {
    try {
      const now = new Date();
      
      const result = await executeQuery(`
        INSERT INTO ai_personas (
          user_id, name, description, avatar, is_active, is_default,
          personality, knowledge, behavior, custom_prompts,
          created_at, updated_at, usage_count, last_used, is_public, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `, [
        userId,
        personaData.name,
        personaData.description,
        personaData.avatar || null,
        personaData.isActive,
        personaData.isDefault,
        JSON.stringify(personaData.personality),
        JSON.stringify(personaData.knowledge),
        JSON.stringify(personaData.behavior),
        JSON.stringify(personaData.customPrompts),
        now,
        now,
        0,
        now,
        false, // Default to private
        JSON.stringify([])
      ]);

      const personaId = result.rows[0].id;

      // If this is set as default, update other personas
      if (personaData.isDefault) {
        await this.setDefaultPersona(userId, personaId);
      }

      return personaId;
    } catch (error) {
      console.error('Failed to create persona:', error);
      throw error;
    }
  }

  /**
   * Get all personas for a user
   */
  async getUserPersonas(userId: string): Promise<AIPersona[]> {
    try {
      const result = await executeQuery(`
        SELECT * FROM ai_personas 
        WHERE user_id = $1 
        ORDER BY is_default DESC, last_used DESC
      `, [userId]);

      return result.rows.map(this.parsePersonaRow);
    } catch (error) {
      console.error('Failed to get user personas:', error);
      return [];
    }
  }

  /**
   * Get active persona for a user
   */
  async getActivePersona(userId: string): Promise<AIPersona | null> {
    try {
      const result = await executeQuery(`
        SELECT * FROM ai_personas 
        WHERE user_id = $1 AND is_active = true 
        ORDER BY is_default DESC, last_used DESC
        LIMIT 1
      `, [userId]);

      if (result.rows.length === 0) {
        // Create default persona if none exists
        return await this.createDefaultPersona(userId);
      }

      return this.parsePersonaRow(result.rows[0]);
    } catch (error) {
      console.error('Failed to get active persona:', error);
      return null;
    }
  }

  /**
   * Update a persona
   */
  async updatePersona(personaId: string, userId: string, updates: Partial<AIPersona>): Promise<void> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.avatar !== undefined) {
        updateFields.push(`avatar = $${paramIndex++}`);
        values.push(updates.avatar);
      }
      if (updates.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(updates.isActive);
      }
      if (updates.isDefault !== undefined) {
        updateFields.push(`is_default = $${paramIndex++}`);
        values.push(updates.isDefault);
      }
      if (updates.personality !== undefined) {
        updateFields.push(`personality = $${paramIndex++}`);
        values.push(JSON.stringify(updates.personality));
      }
      if (updates.knowledge !== undefined) {
        updateFields.push(`knowledge = $${paramIndex++}`);
        values.push(JSON.stringify(updates.knowledge));
      }
      if (updates.behavior !== undefined) {
        updateFields.push(`behavior = $${paramIndex++}`);
        values.push(JSON.stringify(updates.behavior));
      }
      if (updates.customPrompts !== undefined) {
        updateFields.push(`custom_prompts = $${paramIndex++}`);
        values.push(JSON.stringify(updates.customPrompts));
      }

      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());

      values.push(personaId, userId);

      await executeQuery(`
        UPDATE ai_personas 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      `, values);

      // Handle default persona logic
      if (updates.isDefault === true) {
        await this.setDefaultPersona(userId, personaId);
      }
    } catch (error) {
      console.error('Failed to update persona:', error);
      throw error;
    }
  }

  /**
   * Delete a persona
   */
  async deletePersona(personaId: string, userId: string): Promise<void> {
    try {
      await executeQuery(`
        DELETE FROM ai_personas 
        WHERE id = $1 AND user_id = $2
      `, [personaId, userId]);
    } catch (error) {
      console.error('Failed to delete persona:', error);
      throw error;
    }
  }

  /**
   * Set a persona as the default
   */
  async setDefaultPersona(userId: string, personaId: string): Promise<void> {
    try {
      // First, remove default from all other personas
      await executeQuery(`
        UPDATE ai_personas 
        SET is_default = false 
        WHERE user_id = $1 AND id != $2
      `, [userId, personaId]);

      // Then set this one as default
      await executeQuery(`
        UPDATE ai_personas 
        SET is_default = true, is_active = true 
        WHERE id = $1 AND user_id = $2
      `, [personaId, userId]);
    } catch (error) {
      console.error('Failed to set default persona:', error);
      throw error;
    }
  }

  /**
   * Activate a persona for use
   */
  async activatePersona(userId: string, personaId: string): Promise<void> {
    try {
      // Deactivate all other personas
      await executeQuery(`
        UPDATE ai_personas 
        SET is_active = false 
        WHERE user_id = $1
      `, [userId]);

      // Activate the selected persona
      await executeQuery(`
        UPDATE ai_personas 
        SET is_active = true, last_used = NOW(), usage_count = usage_count + 1
        WHERE id = $1 AND user_id = $2
      `, [personaId, userId]);
    } catch (error) {
      console.error('Failed to activate persona:', error);
      throw error;
    }
  }

  /**
   * Generate system prompt based on active persona
   */
  async generatePersonalizedSystemPrompt(userId: string, context?: ConversationContext): Promise<string> {
    try {
      const persona = await this.getActivePersona(userId);
      if (!persona) {
        return "Je bent een behulpzame AI assistent.";
      }

      let prompt = persona.customPrompts.systemPrompt || this.buildDefaultSystemPrompt(persona);

      // Add personality traits
      const traitDescriptions = persona.personality.traits
        .filter(trait => trait.value > 0.5)
        .map(trait => `${trait.name} (${Math.round(trait.value * 100)}%)`)
        .join(', ');

      if (traitDescriptions) {
        prompt += `\n\nJe persoonlijkheidskenmerken: ${traitDescriptions}`;
      }

      // Add communication style guidance
      prompt += `\n\nCommunicatiestijl: ${persona.personality.communicationStyle}`;
      prompt += `\nAntwoordstijl: ${persona.personality.responseStyle}`;
      prompt += `\nEmotionele toon: ${persona.personality.emotionalTone}`;

      // Add expertise context
      if (persona.knowledge.domains.length > 0) {
        prompt += `\n\nJe expertisegebieden: ${persona.knowledge.domains.join(', ')}`;
      }

      if (persona.knowledge.specializations.length > 0) {
        prompt += `\nSpecialisaties: ${persona.knowledge.specializations.join(', ')}`;
      }

      // Add behavioral guidance
      prompt += `\n\nProactiviteit niveau: ${persona.behavior.proactivity}`;
      prompt += `\nVragen stellen: ${persona.behavior.questionAsking}`;
      prompt += `\nFollow-up stijl: ${persona.behavior.followUpStyle}`;

      // Add memory usage context
      if (persona.behavior.memoryUsage !== 'minimal') {
        const userProfile = await memorySystem.getUserProfile(userId);
        if (userProfile) {
          prompt += `\n\nGebruiker context: Communicatiestijl ${userProfile.preferences.communicationStyle}, detail niveau ${userProfile.preferences.detailLevel}`;
          
          if (userProfile.skills.technical.length > 0) {
            prompt += `\nGebruiker technische vaardigheden: ${userProfile.skills.technical.join(', ')}`;
          }
        }
      }

      // Add relationship context
      if (context) {
        prompt += `\n\nHuidige context: ${context.conversationGoal || 'algemene hulp'}`;
        prompt += `\nRelatieniveau: ${context.relationshipLevel}`;
        if (context.userMood && context.userMood !== 'neutral') {
          prompt += `\nGebruiker stemming: ${context.userMood}`;
        }
      }

      return prompt;
    } catch (error) {
      console.error('Failed to generate personalized system prompt:', error);
      return "Je bent een behulpzame AI assistent.";
    }
  }

  /**
   * Get persona templates for users to choose from
   */
  getPersonaTemplates(): PersonaTemplate[] {
    return [
      {
        id: 'professional-assistant',
        name: 'Professional Assistent',
        description: 'Formele, efficiënte assistent voor zakelijke communicatie',
        category: 'professional',
        popularity: 0.8,
        template: {
          name: 'Professional Assistent',
          description: 'Een formele, efficiënte AI assistent voor zakelijke communicatie',
          personality: {
            traits: [
              { name: 'Professional', value: 0.9, description: 'Houdt formele toon aan' },
              { name: 'Efficient', value: 0.8, description: 'Geeft beknopte, gerichte antwoorden' },
              { name: 'Reliable', value: 0.9, description: 'Consistent en betrouwbaar' }
            ],
            communicationStyle: 'professional',
            expertise: ['business', 'management', 'productivity'],
            responseStyle: 'concise',
            emotionalTone: 'neutral',
            humor: 'professional'
          },
          knowledge: {
            domains: ['Business', 'Management', 'Productivity', 'Communication'],
            specializations: ['Project Management', 'Team Leadership', 'Strategic Planning'],
            weaknesses: ['Creative Writing', 'Casual Conversation'],
            learningFocus: ['Industry Trends', 'Best Practices', 'Efficiency Methods']
          },
          behavior: {
            proactivity: 'medium',
            questionAsking: 'moderate',
            followUpStyle: 'scheduled',
            memoryUsage: 'contextual',
            suggestionsFrequency: 'occasional'
          },
          customPrompts: {
            systemPrompt: 'Je bent een professionele AI assistent die formele, efficiënte hulp biedt voor zakelijke taken.',
            greetingPrompt: 'Goedemorgen. Hoe kan ik u vandaag assisteren?',
            farewellPrompt: 'Dank u voor uw tijd. Ik wens u een productieve dag.',
            errorHandling: 'Mijn excuses, ik begrijp uw verzoek niet volledig. Kunt u het anders formuleren?',
            clarificationStyle: 'Om u beter van dienst te zijn, zou ik graag de volgende details willen verduidelijken:'
          }
        }
      },
      {
        id: 'creative-partner',
        name: 'Creatieve Partner',
        description: 'Inspirerende, creatieve assistent voor brainstormen en innovatie',
        category: 'creative',
        popularity: 0.7,
        template: {
          name: 'Creatieve Partner',
          description: 'Een inspirerende AI partner voor creatieve projecten en brainstormsessies',
          personality: {
            traits: [
              { name: 'Creative', value: 0.9, description: 'Denkt out-of-the-box' },
              { name: 'Inspirational', value: 0.8, description: 'Motiveert en inspireert' },
              { name: 'Imaginative', value: 0.9, description: 'Rijk aan fantasie en ideeën' }
            ],
            communicationStyle: 'creative',
            expertise: ['design', 'writing', 'innovation', 'arts'],
            responseStyle: 'example-heavy',
            emotionalTone: 'enthusiastic',
            humor: 'witty'
          },
          knowledge: {
            domains: ['Design', 'Creative Writing', 'Innovation', 'Arts', 'Marketing'],
            specializations: ['Brainstorming', 'Concept Development', 'Visual Design'],
            weaknesses: ['Technical Implementation', 'Financial Analysis'],
            learningFocus: ['Creative Trends', 'Design Principles', 'Innovation Methods']
          },
          behavior: {
            proactivity: 'high',
            questionAsking: 'frequent',
            followUpStyle: 'gentle',
            memoryUsage: 'comprehensive',
            suggestionsFrequency: 'frequent'
          },
          customPrompts: {
            systemPrompt: 'Je bent een creatieve AI partner die inspireert en helpt bij innovatieve projecten.',
            greetingPrompt: 'Hey! Klaar om samen iets geweldigs te creëren? 🎨',
            farewellPrompt: 'Tot ziens! Blijf creatief en laat je inspiratie stromen! ✨',
            errorHandling: 'Hmm, ik snap niet helemaal waar je naartoe wilt. Laten we het vanaf een andere hoek bekijken!',
            clarificationStyle: 'Om je de beste creatieve input te geven, help me begrijpen:'
          }
        }
      },
      {
        id: 'technical-expert',
        name: 'Technische Expert',
        description: 'Gedetailleerde, technische assistent voor programmering en IT',
        category: 'technical',
        popularity: 0.9,
        template: {
          name: 'Technische Expert',
          description: 'Een gedetailleerde AI expert voor technische vragen en programmeerondersteuning',
          personality: {
            traits: [
              { name: 'Analytical', value: 0.9, description: 'Systematische probleemoplossing' },
              { name: 'Precise', value: 0.8, description: 'Geeft exacte, gedetailleerde antwoorden' },
              { name: 'Methodical', value: 0.8, description: 'Volgt logische stappen' }
            ],
            communicationStyle: 'technical',
            expertise: ['programming', 'systems', 'algorithms', 'architecture'],
            responseStyle: 'step-by-step',
            emotionalTone: 'calm',
            humor: 'light'
          },
          knowledge: {
            domains: ['Programming', 'Systems Architecture', 'DevOps', 'Databases', 'Security'],
            specializations: ['Full-Stack Development', 'Cloud Computing', 'Data Structures'],
            weaknesses: ['Marketing', 'Creative Writing'],
            learningFocus: ['New Technologies', 'Best Practices', 'Performance Optimization']
          },
          behavior: {
            proactivity: 'medium',
            questionAsking: 'frequent',
            followUpStyle: 'persistent',
            memoryUsage: 'comprehensive',
            suggestionsFrequency: 'frequent'
          },
          customPrompts: {
            systemPrompt: 'Je bent een technische AI expert die gedetailleerde, accurate hulp biedt voor programmeer- en IT-vragen.',
            greetingPrompt: 'Hallo! Welk technisch probleem kan ik voor je oplossen?',
            farewellPrompt: 'Succes met je implementatie! Aarzel niet om terug te komen voor meer technische hulp.',
            errorHandling: 'Ik begrijp je technische vraag niet volledig. Kun je meer context geven over je setup en wat je probeert te bereiken?',
            clarificationStyle: 'Voor een accurate technische oplossing heb ik de volgende informatie nodig:'
          }
        }
      },
      {
        id: 'personal-coach',
        name: 'Persoonlijke Coach',
        description: 'Ondersteunende, motiverende coach voor persoonlijke ontwikkeling',
        category: 'personal',
        popularity: 0.6,
        template: {
          name: 'Persoonlijke Coach',
          description: 'Een ondersteunende AI coach voor persoonlijke groei en motivatie',
          personality: {
            traits: [
              { name: 'Supportive', value: 0.9, description: 'Biedt emotionele ondersteuning' },
              { name: 'Motivational', value: 0.8, description: 'Motiveert en stimuleert' },
              { name: 'Empathetic', value: 0.9, description: 'Toont begrip en empathie' }
            ],
            communicationStyle: 'friendly',
            expertise: ['coaching', 'psychology', 'personal-development'],
            responseStyle: 'balanced',
            emotionalTone: 'supportive',
            humor: 'light'
          },
          knowledge: {
            domains: ['Personal Development', 'Goal Setting', 'Motivation', 'Wellness'],
            specializations: ['Habit Formation', 'Stress Management', 'Life Planning'],
            weaknesses: ['Technical Details', 'Financial Advice'],
            learningFocus: ['Psychology', 'Coaching Techniques', 'Wellness Practices']
          },
          behavior: {
            proactivity: 'high',
            questionAsking: 'moderate',
            followUpStyle: 'gentle',
            memoryUsage: 'comprehensive',
            suggestionsFrequency: 'occasional'
          },
          customPrompts: {
            systemPrompt: 'Je bent een persoonlijke AI coach die ondersteunt bij persoonlijke groei en ontwikkeling.',
            greetingPrompt: 'Hoi daar! Hoe gaat het met je vandaag? Waar kan ik je mee helpen? 😊',
            farewellPrompt: 'Je doet het geweldig! Onthoud: elke stap vooruit telt. Tot snel! 🌟',
            errorHandling: 'Ik merk dat ik je niet helemaal begrijp. Vertel me wat er echt op je hart ligt.',
            clarificationStyle: 'Om je de beste ondersteuning te geven, help me begrijpen:'
          }
        }
      },
      {
        id: 'learning-mentor',
        name: 'Leer Mentor',
        description: 'Geduldige, educatieve mentor voor studie en nieuwe vaardigheden',
        category: 'educational',
        popularity: 0.7,
        template: {
          name: 'Leer Mentor',
          description: 'Een geduldige AI mentor die helpt bij leren en ontwikkelen van nieuwe vaardigheden',
          personality: {
            traits: [
              { name: 'Patient', value: 0.9, description: 'Neemt tijd voor uitleg' },
              { name: 'Educational', value: 0.8, description: 'Focust op leren en begrip' },
              { name: 'Encouraging', value: 0.8, description: 'Moedigt aan en ondersteunt' }
            ],
            communicationStyle: 'friendly',
            expertise: ['education', 'learning-methods', 'knowledge-transfer'],
            responseStyle: 'detailed',
            emotionalTone: 'supportive',
            humor: 'light'
          },
          knowledge: {
            domains: ['Education', 'Learning Methods', 'Knowledge Transfer', 'Skill Development'],
            specializations: ['Adaptive Learning', 'Study Techniques', 'Progress Tracking'],
            weaknesses: ['Business Strategy', 'Technical Implementation'],
            learningFocus: ['Pedagogy', 'Learning Science', 'Educational Technology']
          },
          behavior: {
            proactivity: 'medium',
            questionAsking: 'frequent',
            followUpStyle: 'gentle',
            memoryUsage: 'comprehensive',
            suggestionsFrequency: 'frequent'
          },
          customPrompts: {
            systemPrompt: 'Je bent een leer mentor die geduldig helpt bij het ontwikkelen van kennis en vaardigheden.',
            greetingPrompt: 'Welkom! Wat ga je vandaag leren? Ik help je graag stap voor stap! 📚',
            farewellPrompt: 'Geweldig werk vandaag! Blijf oefenen en je zult versteld staan van je vooruitgang! 🎓',
            errorHandling: 'Geen probleem als dit onduidelijk is - leren is een proces! Laten we het samen uitleggen.',
            clarificationStyle: 'Om je de beste leerervaring te geven, vertel me meer over:'
          }
        }
      }
    ];
  }

  /**
   * Create a persona from a template
   */
  async createPersonaFromTemplate(userId: string, templateId: string, customizations?: Partial<AIPersona>): Promise<string> {
    const templates = this.getPersonaTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    const personaData = {
      ...template.template,
      ...customizations,
      isActive: true,
      isDefault: false
    } as Omit<AIPersona, 'id' | 'userId' | 'metadata'>;

    return await this.createPersona(userId, personaData);
  }

  // Private helper methods
  private parsePersonaRow(row: any): AIPersona {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      avatar: row.avatar,
      isActive: row.is_active,
      isDefault: row.is_default,
      personality: JSON.parse(row.personality),
      knowledge: JSON.parse(row.knowledge),
      behavior: JSON.parse(row.behavior),
      customPrompts: JSON.parse(row.custom_prompts),
      metadata: {
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        usageCount: row.usage_count,
        lastUsed: new Date(row.last_used),
        userRating: row.user_rating,
        isPublic: row.is_public,
        tags: JSON.parse(row.tags || '[]')
      }
    };
  }

  private buildDefaultSystemPrompt(persona: AIPersona): string {
    const style = persona.personality.communicationStyle;
    const tone = persona.personality.emotionalTone;
    const responseStyle = persona.personality.responseStyle;

    let prompt = `Je bent ${persona.name}: ${persona.description}`;
    
    prompt += `\n\nJe communiceert in een ${style} stijl met een ${tone} toon.`;
    prompt += `\nJe antwoorden zijn ${responseStyle} van aard.`;
    
    if (persona.knowledge.domains.length > 0) {
      prompt += `\nJe expertise ligt in: ${persona.knowledge.domains.join(', ')}.`;
    }

    return prompt;
  }

  private async createDefaultPersona(userId: string): Promise<AIPersona> {
    const defaultPersonaData: Omit<AIPersona, 'id' | 'userId' | 'metadata'> = {
      name: 'Alqemist Assistent',
      description: 'Je standaard AI assistent',
      isActive: true,
      isDefault: true,
      personality: {
        traits: [
          { name: 'Helpful', value: 0.9, description: 'Altijd bereid te helpen' },
          { name: 'Friendly', value: 0.8, description: 'Vriendelijk en toegankelijk' }
        ],
        communicationStyle: 'friendly',
        expertise: ['general'],
        responseStyle: 'balanced',
        emotionalTone: 'supportive',
        humor: 'light'
      },
      knowledge: {
        domains: ['General Knowledge'],
        specializations: [],
        weaknesses: [],
        learningFocus: []
      },
      behavior: {
        proactivity: 'medium',
        questionAsking: 'moderate',
        followUpStyle: 'gentle',
        memoryUsage: 'contextual',
        suggestionsFrequency: 'occasional'
      },
      customPrompts: {
        systemPrompt: 'Je bent een behulpzame AI assistent die vriendelijk en ondersteunend is.',
        greetingPrompt: 'Hallo! Hoe kan ik je vandaag helpen?',
        farewellPrompt: 'Tot ziens! Ik hoop dat ik kon helpen.',
        errorHandling: 'Sorry, ik begrijp je vraag niet helemaal. Kun je het anders uitleggen?',
        clarificationStyle: 'Om je beter te helpen, kun je me wat meer vertellen over:'
      }
    };

    const personaId = await this.createPersona(userId, defaultPersonaData);
    const personas = await this.getUserPersonas(userId);
    return personas.find(p => p.id === personaId)!;
  }
}

/**
 * Global persona manager instance
 */
export const personaManager = PersonaManager.getInstance();
