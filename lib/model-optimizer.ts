import { 
  AVAILABLE_MODELS, 
  ModelInfo, 
  getModelsForTier, 
  estimateConversationCost,
  recommendModel
} from './model-providers';

export interface OptimizationStrategy {
  strategy: 'cost' | 'speed' | 'quality' | 'balanced';
  maxCostPerConversation?: number; // in cents
  prioritizeFeatures?: ('vision' | 'reasoning' | 'function-calling')[];
  fallbackEnabled?: boolean;
}

export interface ModelRecommendation {
  primary: ModelInfo;
  fallbacks: ModelInfo[];
  estimatedCost: number;
  reasoning: string;
}

export class ModelOptimizer {
  private userTier: 'free' | 'starter' | 'professional' | 'enterprise';
  private strategy: OptimizationStrategy;

  constructor(
    userTier: 'free' | 'starter' | 'professional' | 'enterprise' = 'starter',
    strategy: OptimizationStrategy = { strategy: 'balanced', fallbackEnabled: true }
  ) {
    this.userTier = userTier;
    this.strategy = strategy;
  }

  /**
   * Recommend the best model based on the input and strategy
   */
  recommendForInput(
    inputText: string,
    hasAttachments: boolean = false,
    expectedOutputLength: 'short' | 'medium' | 'long' = 'medium'
  ): ModelRecommendation {
    const availableModels = getModelsForTier(this.userTier);
    const inputLength = inputText.length;
    const estimatedTokens = Math.ceil(inputLength / 4); // Rough estimation

    // Determine required features
    const requiredFeatures: string[] = [];
    if (hasAttachments) requiredFeatures.push('vision');
    if (inputText.includes('code') || inputText.includes('function')) {
      // Coding task detected
    }
    if (inputText.toLowerCase().includes('analyze') || inputText.toLowerCase().includes('think')) {
      requiredFeatures.push('reasoning');
    }

    let primaryModel: ModelInfo;
    let reasoning: string;

    switch (this.strategy.strategy) {
      case 'cost':
        primaryModel = this.findCheapestModel(availableModels, requiredFeatures);
        reasoning = "Gekozen voor kostenefficiëntie";
        break;
        
      case 'speed':
        primaryModel = this.findFastestModel(availableModels, requiredFeatures);
        reasoning = "Gekozen voor snelheid";
        break;
        
      case 'quality':
        primaryModel = this.findHighestQualityModel(availableModels, requiredFeatures);
        reasoning = "Gekozen voor hoogste kwaliteit";
        break;
        
      case 'balanced':
      default:
        primaryModel = this.findBalancedModel(availableModels, requiredFeatures, inputLength);
        reasoning = "Gebalanceerde keuze tussen kost, snelheid en kwaliteit";
        break;
    }

    // Generate fallback models
    const fallbacks = this.generateFallbacks(primaryModel, availableModels, requiredFeatures);
    
    // Estimate cost
    const outputTokens = expectedOutputLength === 'short' ? 100 : 
                        expectedOutputLength === 'medium' ? 500 : 1500;
    const estimatedCost = estimateConversationCost(primaryModel.id, estimatedTokens, outputTokens);

    return {
      primary: primaryModel,
      fallbacks,
      estimatedCost,
      reasoning
    };
  }

  /**
   * Handle model fallback when primary model fails
   */
  async handleModelFailure(
    failedModel: string,
    errorType: 'rate_limit' | 'context_limit' | 'unavailable' | 'auth_error',
    originalRecommendation: ModelRecommendation
  ): Promise<ModelInfo | null> {
    if (!this.strategy.fallbackEnabled) {
      return null;
    }

    // Find appropriate fallback based on error type
    switch (errorType) {
      case 'rate_limit':
        // Try different provider
        return this.findAlternativeProvider(failedModel, originalRecommendation.fallbacks);
        
      case 'context_limit':
        // Find model with larger context window
        return this.findLargerContextModel(originalRecommendation.fallbacks);
        
      case 'unavailable':
        // Use first available fallback
        return originalRecommendation.fallbacks[0] || null;
        
      case 'auth_error':
        // Try different provider that doesn't require auth
        return this.findFreeAlternative(originalRecommendation.fallbacks);
        
      default:
        return originalRecommendation.fallbacks[0] || null;
    }
  }

  /**
   * Monitor and optimize costs over time
   */
  optimizeForUsage(
    dailyUsage: { modelId: string; calls: number; cost: number }[],
    monthlyBudget: number
  ): {
    recommendations: string[];
    potentialSavings: number;
    suggestedTierUpgrade?: string;
  } {
    const totalCost = dailyUsage.reduce((sum, usage) => sum + usage.cost, 0);
    const monthlyProjection = totalCost * 30;
    
    const recommendations: string[] = [];
    let potentialSavings = 0;
    let suggestedTierUpgrade: string | undefined;

    // Analyze usage patterns
    const mostUsedModel = dailyUsage.reduce((prev, current) => 
      current.calls > prev.calls ? current : prev
    );

    // Cost optimization suggestions
    if (monthlyProjection > monthlyBudget) {
      recommendations.push(
        `Maandelijkse kosten (€${(monthlyProjection/100).toFixed(2)}) overschrijden budget (€${(monthlyBudget/100).toFixed(2)})`
      );
      
      // Suggest cheaper alternatives
      const cheaperModel = this.findCheapestModel(
        getModelsForTier(this.userTier), 
        AVAILABLE_MODELS.find(m => m.id === mostUsedModel.modelId)?.features || []
      );
      
      if (cheaperModel.id !== mostUsedModel.modelId) {
        const savings = estimateConversationCost(mostUsedModel.modelId, 1000, 500) - 
                       estimateConversationCost(cheaperModel.id, 1000, 500);
        potentialSavings = savings * mostUsedModel.calls;
        
        recommendations.push(
          `Overweeg ${cheaperModel.name} voor routinetaken (€${(potentialSavings/100).toFixed(2)} besparing per maand)`
        );
      }
    }

    // Tier upgrade suggestions
    const nextTier = this.getNextTier(this.userTier);
    if (nextTier && monthlyProjection > this.getTierCostThreshold(this.userTier)) {
      recommendations.push(
        `Overweeg upgrade naar ${nextTier} tier voor betere modellen en lagere per-token kosten`
      );
      suggestedTierUpgrade = nextTier;
    }

    return {
      recommendations,
      potentialSavings,
      suggestedTierUpgrade
    };
  }

  // Private helper methods
  private findCheapestModel(models: ModelInfo[], requiredFeatures: string[]): ModelInfo {
    const compatible = models.filter(m => 
      requiredFeatures.every(feature => m.features.includes(feature as any))
    );
    
    return compatible.reduce((cheapest, current) => {
      const cheapestCost = cheapest.costPer1kTokens.input + cheapest.costPer1kTokens.output;
      const currentCost = current.costPer1kTokens.input + current.costPer1kTokens.output;
      return currentCost < cheapestCost ? current : cheapest;
    });
  }

  private findFastestModel(models: ModelInfo[], requiredFeatures: string[]): ModelInfo {
    const compatible = models.filter(m => 
      requiredFeatures.every(feature => m.features.includes(feature as any))
    );
    
    // Prefer smaller, faster models
    return compatible.find(m => m.name.includes('mini') || m.name.includes('flash')) || 
           compatible.find(m => m.provider === 'openai') ||
           compatible[0];
  }

  private findHighestQualityModel(models: ModelInfo[], requiredFeatures: string[]): ModelInfo {
    const compatible = models.filter(m => 
      requiredFeatures.every(feature => m.features.includes(feature as any))
    );
    
    // Prefer larger, more capable models
    return compatible.find(m => m.category === 'reasoning') ||
           compatible.find(m => m.name.includes('Opus') || m.name.includes('GPT-4o')) ||
           compatible.find(m => m.tier === 'enterprise') ||
           compatible[0];
  }

  private findBalancedModel(models: ModelInfo[], requiredFeatures: string[], inputLength: number): ModelInfo {
    const compatible = models.filter(m => 
      requiredFeatures.every(feature => m.features.includes(feature as any))
    );
    
    // For short inputs, prefer cheaper models
    if (inputLength < 500) {
      return this.findCheapestModel(compatible, requiredFeatures);
    }
    
    // For longer inputs, prefer quality
    if (inputLength > 5000) {
      return this.findHighestQualityModel(compatible, requiredFeatures);
    }
    
    // Medium inputs - find middle ground
    return compatible.find(m => 
      !m.name.includes('mini') && 
      !m.name.includes('Opus') &&
      m.tier === 'professional'
    ) || compatible[0];
  }

  private generateFallbacks(primary: ModelInfo, available: ModelInfo[], requiredFeatures: string[]): ModelInfo[] {
    const fallbacks = available
      .filter(m => 
        m.id !== primary.id && 
        requiredFeatures.every(feature => m.features.includes(feature as any))
      )
      .sort((a, b) => {
        // Sort by cost (cheaper first) and provider diversity
        const aCost = a.costPer1kTokens.input + a.costPer1kTokens.output;
        const bCost = b.costPer1kTokens.input + b.costPer1kTokens.output;
        
        if (a.provider !== primary.provider && b.provider === primary.provider) return -1;
        if (a.provider === primary.provider && b.provider !== primary.provider) return 1;
        
        return aCost - bCost;
      });

    return fallbacks.slice(0, 3); // Return top 3 fallbacks
  }

  private findAlternativeProvider(failedModel: string, fallbacks: ModelInfo[]): ModelInfo | null {
    const failedProvider = AVAILABLE_MODELS.find(m => m.id === failedModel)?.provider;
    return fallbacks.find(m => m.provider !== failedProvider) || null;
  }

  private findLargerContextModel(fallbacks: ModelInfo[]): ModelInfo | null {
    return fallbacks.sort((a, b) => b.contextLength - a.contextLength)[0] || null;
  }

  private findFreeAlternative(fallbacks: ModelInfo[]): ModelInfo | null {
    return fallbacks.find(m => m.tier === 'free' || m.tier === 'starter') || null;
  }

  private getNextTier(currentTier: string): string | null {
    const tiers = ['free', 'starter', 'professional', 'enterprise'];
    const currentIndex = tiers.indexOf(currentTier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  }

  private getTierCostThreshold(tier: string): number {
    // Thresholds where tier upgrade makes sense (in cents)
    switch (tier) {
      case 'free': return 500; // €5
      case 'starter': return 2000; // €20
      case 'professional': return 8000; // €80
      default: return Infinity;
    }
  }
}

/**
 * Global optimizer instance
 */
export const modelOptimizer = new ModelOptimizer();
