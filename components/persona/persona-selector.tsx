"use client";

import { FC, useState, useEffect } from "react";
import { 
  UserIcon,
  ChevronDownIcon,
  PlusIcon,
  SettingsIcon,
  CheckIcon,
  SparklesIcon,
  BrainIcon,
  GraduationCapIcon,
  BriefcaseIcon,
  HeartIcon,
  CodeIcon
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AIPersona {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  isActive: boolean;
  isDefault: boolean;
  personality: {
    communicationStyle: string;
    expertise: string[];
    emotionalTone: string;
  };
  metadata: {
    usageCount: number;
    lastUsed: Date;
  };
}

interface PersonaTemplate {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'creative' | 'technical' | 'personal' | 'educational';
  popularity: number;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'professional': return <BriefcaseIcon className="h-4 w-4" />;
    case 'creative': return <SparklesIcon className="h-4 w-4" />;
    case 'technical': return <CodeIcon className="h-4 w-4" />;
    case 'personal': return <HeartIcon className="h-4 w-4" />;
    case 'educational': return <GraduationCapIcon className="h-4 w-4" />;
    default: return <BrainIcon className="h-4 w-4" />;
  }
};

const getPersonaInitials = (name: string): string => {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
};

interface PersonaSelectorProps {
  className?: string;
  onPersonaChange?: (personaId: string) => void;
}

export const PersonaSelector: FC<PersonaSelectorProps> = ({ 
  className = "",
  onPersonaChange 
}) => {
  const [personas, setPersonas] = useState<AIPersona[]>([]);
  const [activePersona, setActivePersona] = useState<AIPersona | null>(null);
  const [templates, setTemplates] = useState<PersonaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadPersonas();
    loadTemplates();
  }, []);

  const loadPersonas = async () => {
    try {
      const response = await fetch('/api/personas');
      if (response.ok) {
        const data = await response.json();
        setPersonas(data);
        
        const active = data.find((p: AIPersona) => p.isActive);
        setActivePersona(active || data[0] || null);
      }
    } catch (error) {
      console.error('Failed to load personas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/personas?action=templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handlePersonaActivate = async (personaId: string) => {
    try {
      const response = await fetch(`/api/personas/${personaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' })
      });

      if (response.ok) {
        await loadPersonas(); // Reload to get updated state
        onPersonaChange?.(personaId);
        setOpen(false);
      }
    } catch (error) {
      console.error('Failed to activate persona:', error);
    }
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      const response = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'from-template',
          templateId
        })
      });

      if (response.ok) {
        const result = await response.json();
        await handlePersonaActivate(result.id);
      }
    } catch (error) {
      console.error('Failed to create persona from template:', error);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`h-auto p-2 ${className}`}>
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={activePersona?.avatar} />
              <AvatarFallback className="text-xs">
                {activePersona ? getPersonaInitials(activePersona.name) : 'AI'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {activePersona?.name || 'Selecteer Persona'}
              </span>
              {activePersona && (
                <span className="text-xs text-muted-foreground">
                  {activePersona.personality.communicationStyle}
                </span>
              )}
            </div>
            
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>AI Persona's</DropdownMenuLabel>
        
        {/* Current Personas */}
        {personas.length > 0 && (
          <>
            {personas.map((persona) => (
              <DropdownMenuItem
                key={persona.id}
                onClick={() => handlePersonaActivate(persona.id)}
                className="p-3 cursor-pointer"
              >
                <div className="flex items-center space-x-3 w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={persona.avatar} />
                    <AvatarFallback className="text-xs">
                      {getPersonaInitials(persona.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm truncate">
                        {persona.name}
                      </span>
                      {persona.isActive && (
                        <CheckIcon className="h-4 w-4 text-green-600" />
                      )}
                      {persona.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate">
                      {persona.description}
                    </p>
                    
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {persona.personality.communicationStyle}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {persona.metadata.usageCount} keer gebruikt
                      </span>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Quick Templates */}
        <DropdownMenuLabel>Snelle Templates</DropdownMenuLabel>
        {templates.slice(0, 3).map((template) => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => handleCreateFromTemplate(template.id)}
            className="p-3 cursor-pointer"
          >
            <div className="flex items-center space-x-3 w-full">
              <div className="flex-shrink-0">
                {getCategoryIcon(template.category)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm truncate">
                    {template.name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Template
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground truncate">
                  {template.description}
                </p>
                
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {template.category}
                  </Badge>
                  <div className="flex text-xs text-muted-foreground">
                    ⭐ {Math.round(template.popularity * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        {/* Actions */}
        <DropdownMenuItem className="p-3 cursor-pointer">
          <PlusIcon className="h-4 w-4 mr-3" />
          <span>Nieuwe Persona Maken</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="p-3 cursor-pointer">
          <SettingsIcon className="h-4 w-4 mr-3" />
          <span>Persona Instellingen</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
