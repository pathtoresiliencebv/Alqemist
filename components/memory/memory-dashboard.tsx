"use client";

import { FC, useState, useEffect } from "react";
import { 
  BrainIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  SearchIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  TrendingUpIcon,
  MemoryStickIcon,
  CalendarIcon,
  FilterIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

interface MemoryEntry {
  id: string;
  type: 'conversation' | 'preference' | 'fact' | 'context' | 'relationship' | 'skill';
  content: string;
  metadata: {
    confidence: number;
    importance: number;
    lastAccessed: Date;
    accessCount: number;
    source: 'chat' | 'manual' | 'inferred' | 'preference';
    tags: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

interface MemoryStats {
  totalMemories: number;
  byType: Record<string, number>;
  recentlyAccessed: number;
  averageConfidence: number;
  topTags: Array<{ tag: string; count: number }>;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'conversation': return <BrainIcon className="h-4 w-4" />;
    case 'preference': return <UserIcon className="h-4 w-4" />;
    case 'fact': return <MemoryStickIcon className="h-4 w-4" />;
    case 'context': return <TagIcon className="h-4 w-4" />;
    case 'relationship': return <TrendingUpIcon className="h-4 w-4" />;
    case 'skill': return <EditIcon className="h-4 w-4" />;
    default: return <BrainIcon className="h-4 w-4" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'conversation': return 'bg-blue-500';
    case 'preference': return 'bg-green-500';
    case 'fact': return 'bg-purple-500';
    case 'context': return 'bg-orange-500';
    case 'relationship': return 'bg-pink-500';
    case 'skill': return 'bg-indigo-500';
    default: return 'bg-gray-500';
  }
};

const getSourceBadgeVariant = (source: string) => {
  switch (source) {
    case 'chat': return 'default';
    case 'manual': return 'secondary';
    case 'inferred': return 'outline';
    case 'preference': return 'destructive';
    default: return 'outline';
  }
};

export const MemoryDashboard: FC = () => {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");

  useEffect(() => {
    loadMemories();
    loadStats();
  }, []);

  const loadMemories = async () => {
    try {
      // Simulate API call to get memories
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockMemories: MemoryEntry[] = [
        {
          id: "1",
          type: "preference",
          content: "Prefers detailed explanations with examples",
          metadata: {
            confidence: 0.9,
            importance: 0.8,
            lastAccessed: new Date(),
            accessCount: 15,
            source: "inferred",
            tags: ["communication", "learning-style"]
          },
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        },
        {
          id: "2",
          type: "fact",
          content: "Works as a software developer at a tech startup",
          metadata: {
            confidence: 0.95,
            importance: 0.9,
            lastAccessed: new Date(Date.now() - 2 * 60 * 60 * 1000),
            accessCount: 8,
            source: "chat",
            tags: ["profession", "personal"]
          },
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          id: "3",
          type: "skill",
          content: "Experienced in React, TypeScript, and Node.js",
          metadata: {
            confidence: 0.85,
            importance: 0.7,
            lastAccessed: new Date(Date.now() - 24 * 60 * 60 * 1000),
            accessCount: 12,
            source: "chat",
            tags: ["technical", "programming", "expertise"]
          },
          createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        {
          id: "4",
          type: "conversation",
          content: "Often asks follow-up questions about implementation details",
          metadata: {
            confidence: 0.75,
            importance: 0.6,
            lastAccessed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            accessCount: 5,
            source: "inferred",
            tags: ["behavior", "learning-pattern"]
          },
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      ];
      
      setMemories(mockMemories);
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Simulate API call to get stats
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockStats: MemoryStats = {
        totalMemories: 47,
        byType: {
          preference: 12,
          fact: 15,
          skill: 8,
          conversation: 7,
          context: 3,
          relationship: 2
        },
        recentlyAccessed: 18,
        averageConfidence: 0.82,
        topTags: [
          { tag: "technical", count: 15 },
          { tag: "personal", count: 12 },
          { tag: "communication", count: 8 },
          { tag: "learning-style", count: 6 },
          { tag: "expertise", count: 5 }
        ]
      };
      
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const filteredMemories = memories.filter(memory => {
    const matchesSearch = searchQuery === "" || 
      memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memory.metadata.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = selectedType === "all" || memory.type === selectedType;
    const matchesSource = selectedSource === "all" || memory.metadata.source === selectedSource;
    
    return matchesSearch && matchesType && matchesSource;
  });

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Memory Dashboard</h1>
          <p className="text-muted-foreground">Bekijk en beheer wat de AI over je heeft geleerd</p>
        </div>
        <Button>
          <PlusIcon className="h-4 w-4 mr-2" />
          Handmatig Toevoegen
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totaal Memories</CardTitle>
              <MemoryStickIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMemories}</div>
              <p className="text-xs text-muted-foreground">Opgeslagen herinneringen</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Accessed</CardTitle>
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentlyAccessed}</div>
              <p className="text-xs text-muted-foreground">Laatste 7 dagen</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gemiddelde Confidence</CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.averageConfidence * 100)}%</div>
              <Progress value={stats.averageConfidence * 100} className="mt-2 h-1" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Tags</CardTitle>
              <TagIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {stats.topTags.slice(0, 3).map((tagData, index) => (
                  <div key={tagData.tag} className="flex items-center justify-between text-xs">
                    <span>{tagData.tag}</span>
                    <Badge variant="outline">{tagData.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Zoeken & Filteren</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek in memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Types</SelectItem>
                <SelectItem value="preference">Preferences</SelectItem>
                <SelectItem value="fact">Facts</SelectItem>
                <SelectItem value="skill">Skills</SelectItem>
                <SelectItem value="conversation">Conversations</SelectItem>
                <SelectItem value="context">Context</SelectItem>
                <SelectItem value="relationship">Relationships</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Sources</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
                <SelectItem value="manual">Handmatig</SelectItem>
                <SelectItem value="inferred">Inferred</SelectItem>
                <SelectItem value="preference">Preference</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <FilterIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Memory List */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Lijst Weergave</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          {filteredMemories.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MemoryStickIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Geen memories gevonden</h3>
                <p className="text-muted-foreground">Probeer je zoektermen aan te passen of andere filters te gebruiken.</p>
              </CardContent>
            </Card>
          ) : (
            filteredMemories.map((memory) => (
              <Card key={memory.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getTypeIcon(memory.type)}
                        <Badge className={`text-xs ${getTypeColor(memory.type)} text-white`}>
                          {memory.type}
                        </Badge>
                        <Badge variant={getSourceBadgeVariant(memory.metadata.source)} className="text-xs">
                          {memory.metadata.source}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {memory.metadata.accessCount} keer gebruikt
                        </span>
                      </div>
                      
                      <p className="text-sm mb-3">{memory.content}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <span>Confidence:</span>
                          <span className="font-medium">{Math.round(memory.metadata.confidence * 100)}%</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>Importance:</span>
                          <span className="font-medium">{Math.round(memory.metadata.importance * 100)}%</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="h-3 w-3" />
                          <span>{memory.createdAt.toLocaleDateString('nl-NL')}</span>
                        </div>
                      </div>
                      
                      {memory.metadata.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {memory.metadata.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button variant="ghost" size="sm">
                        <EditIcon className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardContent className="text-center py-8">
              <ClockIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Timeline Weergave</h3>
              <p className="text-muted-foreground">Chronologische weergave van je AI memories wordt hier getoond.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardContent className="text-center py-8">
              <TrendingUpIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Memory Analytics</h3>
              <p className="text-muted-foreground">Gedetailleerde analytics over je AI memory patterns.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
