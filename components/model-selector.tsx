"use client";

import { FC, useState, useEffect } from "react";
import { 
  BrainIcon,
  ZapIcon,
  EyeIcon,
  DollarSignIcon,
  CheckIcon,
  ChevronDownIcon,
  InfoIcon,
  SparklesIcon,
  CodeIcon,
  TrendingUpIcon,
  ShieldIcon,
  BoltIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  AVAILABLE_MODELS, 
  ModelInfo, 
  getModelsForTier,
  getModelsByCategory,
  recommendModel,
  estimateConversationCost
} from "@/lib/model-providers";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  userTier?: 'free' | 'starter' | 'professional' | 'enterprise';
  showCostEstimate?: boolean;
  className?: string;
}

const getProviderIcon = (provider: string) => {
  switch (provider) {
    case 'openai':
      return '🤖';
    case 'anthropic':
      return '🧠';
    case 'google':
      return '🔍';
    case 'mistral':
      return '🌪️';
    case 'cohere':
      return '🌐';
    case 'openrouter':
      return '🚀';
    default:
      return '🤖';
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'chat':
      return <BrainIcon className="h-4 w-4" />;
    case 'vision':
      return <EyeIcon className="h-4 w-4" />;
    case 'code':
      return <CodeIcon className="h-4 w-4" />;
    case 'reasoning':
      return <SparklesIcon className="h-4 w-4" />;
    case 'embedding':
      return <TrendingUpIcon className="h-4 w-4" />;
    default:
      return <BrainIcon className="h-4 w-4" />;
  }
};

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'free':
      return 'bg-gray-500';
    case 'starter':
      return 'bg-blue-500';
    case 'professional':
      return 'bg-purple-500';
    case 'enterprise':
      return 'bg-gold-500';
    default:
      return 'bg-gray-500';
  }
};

const ModelCard: FC<{ 
  model: ModelInfo; 
  isSelected: boolean; 
  onSelect: () => void; 
  showCost?: boolean;
  disabled?: boolean;
}> = ({ model, isSelected, onSelect, showCost = false, disabled = false }) => {
  const totalCost = model.costPer1kTokens.input + model.costPer1kTokens.output;
  
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
          : 'hover:border-gray-300 hover:shadow-sm'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={disabled ? undefined : onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">{getProviderIcon(model.provider)}</span>
              <span className="font-semibold text-sm truncate">{model.name}</span>
              {isSelected && <CheckIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />}
            </div>
            
            <div className="flex items-center space-x-2 mb-2">
              {getCategoryIcon(model.category)}
              <Badge variant="outline" className={`text-xs ${getTierColor(model.tier)} text-white`}>
                {model.tier}
              </Badge>
              
              {model.features.includes('vision') && (
                <Badge variant="secondary" className="text-xs">
                  <EyeIcon className="h-3 w-3 mr-1" />
                  Vision
                </Badge>
              )}
              
              {model.features.includes('reasoning') && (
                <Badge variant="secondary" className="text-xs">
                  <SparklesIcon className="h-3 w-3 mr-1" />
                  Reasoning
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {model.description}
            </p>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <span className="text-muted-foreground">
                  {(model.contextLength / 1000).toFixed(0)}K context
                </span>
                {showCost && (
                  <span className="text-muted-foreground">
                    €{(totalCost / 100).toFixed(3)}/1K tokens
                  </span>
                )}
              </div>
              
              {disabled && (
                <Badge variant="destructive" className="text-xs">
                  Upgrade Vereist
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const RecommendationCard: FC<{ 
  useCase: string; 
  model: ModelInfo; 
  onSelect: () => void;
  isSelected: boolean;
}> = ({ useCase, model, onSelect, isSelected }) => {
  const getUseCaseIcon = (useCase: string) => {
    switch (useCase) {
      case 'vision': return <EyeIcon className="h-5 w-5" />;
      case 'coding': return <CodeIcon className="h-5 w-5" />;
      case 'reasoning': return <SparklesIcon className="h-5 w-5" />;
      case 'cost-effective': return <DollarSignIcon className="h-5 w-5" />;
      default: return <BrainIcon className="h-5 w-5" />;
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all ${
        isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-3 mb-2">
          {getUseCaseIcon(useCase)}
          <div>
            <h4 className="font-medium text-sm">{useCase.charAt(0).toUpperCase() + useCase.slice(1)}</h4>
            <p className="text-xs text-muted-foreground">Aanbevolen: {model.name}</p>
          </div>
          {isSelected && <CheckIcon className="h-4 w-4 text-blue-500 ml-auto" />}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>{getProviderIcon(model.provider)}</span>
            <Badge variant="outline" className="text-xs">
              {model.provider}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            €{((model.costPer1kTokens.input + model.costPer1kTokens.output) / 100).toFixed(3)}/1K
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export const ModelSelector: FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  userTier = 'starter',
  showCostEstimate = true,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel);
  const availableModels = getModelsForTier(userTier);
  
  const categories = ['all', 'chat', 'vision', 'code', 'reasoning'];
  const useCases = ['general', 'vision', 'coding', 'reasoning', 'cost-effective'];
  
  const filteredModels = selectedCategory === 'all' 
    ? availableModels 
    : getModelsByCategory(selectedCategory as ModelInfo['category']).filter(m => 
        availableModels.some(am => am.id === m.id)
      );

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between"
            size="sm"
          >
            <div className="flex items-center space-x-2">
              {currentModel && (
                <>
                  <span>{getProviderIcon(currentModel.provider)}</span>
                  <span className="truncate">{currentModel.name}</span>
                </>
              )}
            </div>
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[600px] p-0" align="start">
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-4">
              <BrainIcon className="h-5 w-5" />
              <h3 className="font-semibold">AI Model Selecteren</h3>
              <Badge variant="outline" className={`text-xs ${getTierColor(userTier)} text-white`}>
                {userTier}
              </Badge>
            </div>
            
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">Alle</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="vision">Vision</TabsTrigger>
                <TabsTrigger value="code">Code</TabsTrigger>
                <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                {/* Quick Recommendations */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center space-x-2">
                    <ZapIcon className="h-4 w-4" />
                    <span>Snelle Keuze</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {useCases.slice(0, 4).map(useCase => {
                      const recommended = recommendModel(useCase as any, userTier);
                      return (
                        <RecommendationCard
                          key={useCase}
                          useCase={useCase}
                          model={recommended}
                          onSelect={() => handleModelSelect(recommended.id)}
                          isSelected={selectedModel === recommended.id}
                        />
                      );
                    })}
                  </div>
                </div>
                
                <Separator className="my-4" />
              </TabsContent>
              
              {/* Model Grid */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredModels.length === 0 ? (
                  <div className="text-center py-8">
                    <BrainIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Geen modellen beschikbaar voor {selectedCategory}
                    </p>
                  </div>
                ) : (
                  filteredModels.map(model => {
                    const isDisabled = !availableModels.some(am => am.id === model.id);
                    return (
                      <ModelCard
                        key={model.id}
                        model={model}
                        isSelected={selectedModel === model.id}
                        onSelect={() => handleModelSelect(model.id)}
                        showCost={showCostEstimate}
                        disabled={isDisabled}
                      />
                    );
                  })
                )}
              </div>
            </Tabs>
            
            {/* Current Model Info */}
            {currentModel && showCostEstimate && (
              <>
                <Separator className="my-4" />
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <InfoIcon className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Huidig Model Info</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Provider:</span> {currentModel.provider}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Context:</span> {(currentModel.contextLength / 1000).toFixed(0)}K tokens
                    </div>
                    <div>
                      <span className="text-muted-foreground">Input:</span> €{(currentModel.costPer1kTokens.input / 100).toFixed(4)}/1K
                    </div>
                    <div>
                      <span className="text-muted-foreground">Output:</span> €{(currentModel.costPer1kTokens.output / 100).toFixed(4)}/1K
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Upgrade Notice */}
            {userTier !== 'enterprise' && (
              <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border">
                <div className="flex items-center space-x-2 mb-1">
                  <ShieldIcon className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Upgrade voor meer modellen</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Krijg toegang tot Claude Opus, GPT-o1, en meer premium modellen
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  <BoltIcon className="h-3 w-3 mr-1" />
                  Upgrade Nu
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
