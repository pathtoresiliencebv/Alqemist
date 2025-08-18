"use client";

import { FC, useState, useEffect } from "react";
import { 
  LightbulbIcon,
  XIcon,
  ChevronRightIcon,
  ClockIcon,
  TrendingUpIcon,
  BookOpenIcon,
  TargetIcon,
  WrenchIcon,
  BrainIcon,
  CheckIcon,
  RefreshCwIcon
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";

interface ProactiveSuggestion {
  id: string;
  type: 'workflow' | 'learning' | 'productivity' | 'reminder' | 'optimization' | 'insight';
  title: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
  metadata: {
    category: string;
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
}

const getSuggestionIcon = (type: string) => {
  switch (type) {
    case 'workflow': return <WrenchIcon className="h-4 w-4" />;
    case 'learning': return <BookOpenIcon className="h-4 w-4" />;
    case 'productivity': return <TargetIcon className="h-4 w-4" />;
    case 'reminder': return <ClockIcon className="h-4 w-4" />;
    case 'optimization': return <TrendingUpIcon className="h-4 w-4" />;
    case 'insight': return <BrainIcon className="h-4 w-4" />;
    default: return <LightbulbIcon className="h-4 w-4" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'border-l-red-500 bg-red-50 dark:bg-red-950/10';
    case 'medium': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/10';
    case 'low': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/10';
    default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/10';
  }
};

const getPriorityBadgeVariant = (priority: string) => {
  switch (priority) {
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'outline';
  }
};

interface ProactiveSuggestionsProps {
  className?: string;
}

export const ProactiveSuggestions: FC<ProactiveSuggestionsProps> = ({ 
  className = "" 
}) => {
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/suggestions?limit=5');
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewSuggestions = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' })
      });

      if (response.ok) {
        await loadSuggestions();
      }
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSuggestionAction = async (suggestionId: string, action: any) => {
    try {
      // Mark as interacted
      await fetch(`/api/suggestions/${suggestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'interact' })
      });

      // Handle specific action
      switch (action.type) {
        case 'task':
          // Create a task
          await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: action.data.title,
              description: action.data.description || '',
              taskType: 'suggestion',
              scheduledFor: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
              status: 'pending',
              metadata: {
                priority: 'medium',
                category: action.data.category || 'general',
                reminderType: 'task',
                notificationChannels: ['push']
              }
            })
          });
          break;

        case 'workflow':
          console.log('Triggering workflow:', action.data);
          break;

        case 'link':
          if (action.data.url) {
            window.open(action.data.url, '_blank');
          }
          break;

        case 'dismiss':
          await dismissSuggestion(suggestionId);
          break;
      }

      // Mark as completed if not dismissing
      if (action.type !== 'dismiss') {
        await fetch(`/api/suggestions/${suggestionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete' })
        });
      }

      // Reload suggestions
      await loadSuggestions();
    } catch (error) {
      console.error('Failed to handle suggestion action:', error);
    }
  };

  const dismissSuggestion = async (suggestionId: string) => {
    try {
      await fetch(`/api/suggestions/${suggestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' })
      });

      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
    }
  };

  const markAsShown = async (suggestionId: string) => {
    try {
      await fetch(`/api/suggestions/${suggestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_shown' })
      });
    } catch (error) {
      console.error('Failed to mark suggestion as shown:', error);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className={`${className}`}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-2">
              <div className="flex items-center space-x-2">
                <LightbulbIcon className="h-4 w-4" />
                <span className="text-sm font-medium">AI Suggesties</span>
              </div>
              <ChevronRightIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-2">
            <div className="text-center py-6 text-muted-foreground">
              <LightbulbIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Geen nieuwe suggesties</p>
              <Button
                variant="outline"
                size="sm"
                onClick={generateNewSuggestions}
                disabled={refreshing}
                className="mt-2"
              >
                {refreshing ? (
                  <RefreshCwIcon className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCwIcon className="h-3 w-3 mr-1" />
                )}
                Genereer Suggesties
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-2">
            <div className="flex items-center space-x-2">
              <LightbulbIcon className="h-4 w-4" />
              <span className="text-sm font-medium">AI Suggesties</span>
              {suggestions.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {suggestions.length}
                </Badge>
              )}
            </div>
            <ChevronRightIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-2">
          <AnimatePresence>
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                onViewportEnter={() => markAsShown(suggestion.id)}
              >
                <Card className={`border-l-4 ${getPriorityColor(suggestion.priority)}`}>
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2 flex-1">
                          {getSuggestionIcon(suggestion.type)}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium truncate">
                              {suggestion.title}
                            </h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge 
                                variant={getPriorityBadgeVariant(suggestion.priority)} 
                                className="text-xs"
                              >
                                {suggestion.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {suggestion.type}
                              </Badge>
                              {suggestion.metadata.estimatedTimeMinutes && (
                                <span className="text-xs text-muted-foreground">
                                  ~{suggestion.metadata.estimatedTimeMinutes}min
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissSuggestion(suggestion.id)}
                          className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                        >
                          <XIcon className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground">
                        {suggestion.description}
                      </p>

                      {/* Confidence */}
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">Confidence:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full" 
                            style={{ width: `${suggestion.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(suggestion.confidence * 100)}%
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-1">
                        {suggestion.actions.slice(0, 2).map((action, actionIndex) => (
                          <Button
                            key={actionIndex}
                            variant={action.type === 'dismiss' ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => handleSuggestionAction(suggestion.id, action)}
                            className="text-xs h-6"
                          >
                            {action.type === 'task' && <CheckIcon className="h-3 w-3 mr-1" />}
                            {action.type === 'workflow' && <WrenchIcon className="h-3 w-3 mr-1" />}
                            {action.type === 'link' && <ChevronRightIcon className="h-3 w-3 mr-1" />}
                            {action.label}
                          </Button>
                        ))}
                      </div>

                      {/* Tags */}
                      {suggestion.metadata.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {suggestion.metadata.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={generateNewSuggestions}
            disabled={refreshing}
            className="w-full mt-2"
          >
            {refreshing ? (
              <RefreshCwIcon className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCwIcon className="h-3 w-3 mr-1" />
            )}
            Nieuwe Suggesties
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
