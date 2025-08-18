"use client";

import { FC, useState, useEffect } from "react";
import { 
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  XIcon,
  PlusIcon,
  BellIcon,
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  FilterIcon,
  MoreHorizontalIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface ScheduledTask {
  id: string;
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
  };
  createdAt: Date;
  updatedAt: Date;
}

interface TaskStats {
  totalTasks: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
  upcomingDeadlines: number;
}

const getTaskTypeIcon = (type: string) => {
  switch (type) {
    case 'reminder': return <BellIcon className="h-4 w-4" />;
    case 'followup': return <RotateCcwIcon className="h-4 w-4" />;
    case 'recurring': return <CalendarIcon className="h-4 w-4" />;
    case 'suggestion': return <TrendingUpIcon className="h-4 w-4" />;
    default: return <ClockIcon className="h-4 w-4" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'border-l-red-500 bg-red-50 dark:bg-red-950/20';
    case 'medium': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
    case 'low': return 'border-l-green-500 bg-green-50 dark:bg-green-950/20';
    default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/20';
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'completed': return 'default';
    case 'pending': return 'secondary';
    case 'snoozed': return 'outline';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};

const formatTimeUntil = (date: Date): string => {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff < 0) {
    const overdue = Math.abs(diff);
    const hours = Math.floor(overdue / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} dagen te laat`;
    if (hours > 0) return `${hours} uur te laat`;
    return `Verlopen`;
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `over ${days} dagen`;
  if (hours > 0) return `over ${hours} uur`;
  if (minutes > 0) return `over ${minutes} min`;
  return 'Nu';
};

export const TaskManager: FC = () => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>("upcoming");
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  useEffect(() => {
    loadTasks();
    loadStats();
  }, [selectedFilter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockTasks: ScheduledTask[] = [
        {
          id: "1",
          title: "Team meeting over Q1 planning",
          description: "Vergadering met het hele team om Q1 doelen te bespreken",
          taskType: "reminder",
          scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          status: "pending",
          metadata: {
            priority: "high",
            category: "meeting",
            reminderType: "meeting",
            notificationChannels: ["push", "email"]
          },
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        {
          id: "2",
          title: "Code review voor nieuwe feature",
          description: "Review de pull request voor de nieuwe dashboard feature",
          taskType: "followup",
          scheduledFor: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
          status: "pending",
          metadata: {
            priority: "medium",
            category: "development",
            reminderType: "task",
            notificationChannels: ["push"]
          },
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
        },
        {
          id: "3",
          title: "Daily standup meeting",
          description: "Dagelijkse team standup om 09:00",
          taskType: "recurring",
          scheduledFor: new Date(Date.now() + 18 * 60 * 60 * 1000), // tomorrow morning
          recurrencePattern: "daily",
          status: "pending",
          metadata: {
            priority: "medium",
            category: "meeting",
            reminderType: "meeting",
            notificationChannels: ["push"]
          },
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        {
          id: "4",
          title: "Documentatie updaten",
          description: "API documentatie bijwerken voor nieuwe endpoints",
          taskType: "suggestion",
          scheduledFor: new Date(Date.now() + 6 * 60 * 60 * 1000),
          status: "pending",
          metadata: {
            priority: "low",
            category: "documentation",
            reminderType: "task",
            notificationChannels: ["push"]
          },
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
        },
        {
          id: "5",
          title: "Client demo voorbereiding",
          description: "Demo environment opzetten voor client presentatie",
          taskType: "reminder",
          scheduledFor: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago (overdue)
          status: "pending",
          metadata: {
            priority: "high",
            category: "client",
            reminderType: "deadline",
            notificationChannels: ["push", "email", "sms"]
          },
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        }
      ];
      
      setTasks(mockTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockStats: TaskStats = {
        totalTasks: 25,
        completed: 18,
        pending: 5,
        overdue: 2,
        completionRate: 72,
        upcomingDeadlines: 3
      };
      
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleTaskAction = async (taskId: string, action: 'complete' | 'snooze' | 'cancel', snoozeMinutes?: number) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status: action === 'complete' ? 'completed' : action === 'cancel' ? 'cancelled' : 'snoozed',
              scheduledFor: action === 'snooze' && snoozeMinutes 
                ? new Date(Date.now() + snoozeMinutes * 60 * 1000) 
                : task.scheduledFor
            }
          : task
      ));
      
      // Reload stats
      loadStats();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    switch (selectedFilter) {
      case 'pending':
        return task.status === 'pending';
      case 'completed':
        return task.status === 'completed';
      case 'overdue':
        return task.status === 'pending' && new Date(task.scheduledFor) < new Date();
      case 'today':
        const today = new Date();
        const taskDate = new Date(task.scheduledFor);
        return taskDate.toDateString() === today.toDateString();
      case 'upcoming':
      default:
        return task.status === 'pending' && new Date(task.scheduledFor) >= new Date();
    }
  });

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
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
          <h1 className="text-3xl font-bold">Task Manager</h1>
          <p className="text-muted-foreground">Beheer je reminders, taken en afspraken</p>
        </div>
        <Button onClick={() => setNewTaskOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Nieuwe Taak
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totaal Taken</CardTitle>
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground">Alle tijd</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Voltooid</CardTitle>
              <CheckIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">{stats.completionRate}% completion rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Te Laat</CardTitle>
              <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <p className="text-xs text-muted-foreground">Aandacht vereist</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Komende Deadlines</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.upcomingDeadlines}</div>
              <p className="text-xs text-muted-foreground">Volgende 24 uur</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filteren</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Komend</SelectItem>
                <SelectItem value="pending">In Behandeling</SelectItem>
                <SelectItem value="today">Vandaag</SelectItem>
                <SelectItem value="overdue">Te Laat</SelectItem>
                <SelectItem value="completed">Voltooid</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline">
              <FilterIcon className="h-4 w-4 mr-2" />
              Meer Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedFilter === 'upcoming' && 'Komende Taken'}
            {selectedFilter === 'pending' && 'In Behandeling'}
            {selectedFilter === 'today' && 'Vandaag'}
            {selectedFilter === 'overdue' && 'Te Laat'}
            {selectedFilter === 'completed' && 'Voltooid'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Geen taken gevonden</h3>
              <p className="text-muted-foreground">Probeer een ander filter of voeg een nieuwe taak toe.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => {
                const isOverdue = new Date(task.scheduledFor) < new Date() && task.status === 'pending';
                
                return (
                  <div
                    key={task.id}
                    className={`border-l-4 rounded-lg p-4 ${getPriorityColor(task.metadata.priority)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getTaskTypeIcon(task.taskType)}
                          <h4 className="font-medium">{task.title}</h4>
                          <Badge variant={getStatusBadgeVariant(task.status)}>
                            {task.status}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${task.metadata.priority === 'high' ? 'border-red-500 text-red-700' : task.metadata.priority === 'medium' ? 'border-yellow-500 text-yellow-700' : 'border-green-500 text-green-700'}`}>
                            {task.metadata.priority}
                          </Badge>
                          {task.recurrencePattern && (
                            <Badge variant="secondary" className="text-xs">
                              {task.recurrencePattern}
                            </Badge>
                          )}
                        </div>
                        
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <CalendarIcon className="h-3 w-3" />
                            <span>{task.scheduledFor.toLocaleDateString('nl-NL', { 
                              weekday: 'short', 
                              day: 'numeric', 
                              month: 'short', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}</span>
                          </div>
                          <div className={`flex items-center space-x-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                            <ClockIcon className="h-3 w-3" />
                            <span>{formatTimeUntil(task.scheduledFor)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span>Category:</span>
                            <span className="font-medium">{task.metadata.category}</span>
                          </div>
                        </div>
                      </div>
                      
                      {task.status === 'pending' && (
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTaskAction(task.id, 'complete')}
                          >
                            <CheckIcon className="h-3 w-3 mr-1" />
                            Voltooid
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTaskAction(task.id, 'snooze', 60)}
                          >
                            <PauseIcon className="h-3 w-3 mr-1" />
                            Snooze
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTaskAction(task.id, 'cancel')}
                          >
                            <XIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
