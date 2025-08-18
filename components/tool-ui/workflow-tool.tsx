"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import { FC, useState } from "react";
import { 
  PlayIcon, 
  PauseIcon,
  CheckIcon, 
  XIcon, 
  AlertTriangleIcon,
  ClockIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  SkipForwardIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

type WorkflowStep = {
  id: string;
  title: string;
  description: string;
  type: "action" | "approval" | "wait" | "condition" | "parallel";
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  duration?: number; // in seconds
  retryCount?: number;
  maxRetries?: number;
  dependencies?: string[]; // step IDs that must complete first
  data?: Record<string, any>;
  error?: string;
};

type WorkflowArgs = {
  title: string;
  description: string;
  steps: WorkflowStep[];
  autoStart?: boolean;
  allowSkip?: boolean;
  allowRetry?: boolean;
};

type WorkflowResult = {
  status: "running" | "completed" | "failed" | "paused";
  currentStep?: string;
  completedSteps: string[];
  failedSteps: string[];
  totalDuration: number;
  progress: number; // 0-100
  logs: {
    timestamp: string;
    step: string;
    action: string;
    message: string;
  }[];
};

const getStepIcon = (step: WorkflowStep) => {
  switch (step.status) {
    case "completed":
      return <CheckIcon className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XIcon className="h-4 w-4 text-red-500" />;
    case "running":
      return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />;
    case "skipped":
      return <SkipForwardIcon className="h-4 w-4 text-gray-400" />;
    default:
      return <ClockIcon className="h-4 w-4 text-gray-400" />;
  }
};

const getStepTypeColor = (type: string) => {
  switch (type) {
    case "action":
      return "bg-blue-500";
    case "approval":
      return "bg-yellow-500";
    case "wait":
      return "bg-gray-500";
    case "condition":
      return "bg-purple-500";
    case "parallel":
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
};

const WorkflowDisplay: FC<{ args: WorkflowArgs; result?: WorkflowResult; addResult: (result: WorkflowResult) => void; status: any }> = ({ 
  args, 
  result, 
  addResult,
  status 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [workflowStatus, setWorkflowStatus] = useState<"pending" | "running" | "paused" | "completed" | "failed">("pending");
  const [expandedLogs, setExpandedLogs] = useState(false);
  const [steps, setSteps] = useState<WorkflowStep[]>(args.steps);

  // Simulate workflow execution
  const startWorkflow = async () => {
    setWorkflowStatus("running");
    const logs: WorkflowResult["logs"] = [];
    const completedSteps: string[] = [];
    const failedSteps: string[] = [];
    let totalDuration = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setCurrentStep(i);
      
      // Update step status to running
      setSteps(prev => prev.map(s => 
        s.id === step.id ? { ...s, status: "running" as const } : s
      ));

      logs.push({
        timestamp: new Date().toISOString(),
        step: step.id,
        action: "started",
        message: `Stap "${step.title}" gestart`
      });

      // Simulate step execution time
      const stepDuration = step.duration || Math.random() * 3 + 1;
      await new Promise(resolve => setTimeout(resolve, stepDuration * 1000));
      
      // Simulate success/failure (90% success rate)
      const success = Math.random() > 0.1;
      
      if (success) {
        setSteps(prev => prev.map(s => 
          s.id === step.id ? { ...s, status: "completed" as const } : s
        ));
        completedSteps.push(step.id);
        logs.push({
          timestamp: new Date().toISOString(),
          step: step.id,
          action: "completed",
          message: `Stap "${step.title}" succesvol voltooid`
        });
      } else {
        setSteps(prev => prev.map(s => 
          s.id === step.id ? { ...s, status: "failed" as const, error: "Simulatie fout" } : s
        ));
        failedSteps.push(step.id);
        logs.push({
          timestamp: new Date().toISOString(),
          step: step.id,
          action: "failed",
          message: `Stap "${step.title}" mislukt: Simulatie fout`
        });
        
        if (!args.allowRetry) {
          setWorkflowStatus("failed");
          break;
        }
      }
      
      totalDuration += stepDuration;
    }

    const finalStatus = failedSteps.length > 0 ? "failed" : "completed";
    setWorkflowStatus(finalStatus);

    const workflowResult: WorkflowResult = {
      status: finalStatus,
      currentStep: steps[currentStep]?.id,
      completedSteps,
      failedSteps,
      totalDuration,
      progress: (completedSteps.length / steps.length) * 100,
      logs
    };

    addResult(workflowResult);
  };

  const retryStep = async (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;

    setSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, status: "running" as const, error: undefined } : s
    ));

    // Simulate retry
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, status: "completed" as const } : s
    ));
  };

  const skipStep = (stepId: string) => {
    setSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, status: "skipped" as const } : s
    ));
  };

  // Show workflow interface
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Workflow Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RefreshCwIcon className="h-5 w-5 text-blue-500" />
              <span>{args.title}</span>
              <Badge variant={
                workflowStatus === "completed" ? "default" :
                workflowStatus === "failed" ? "destructive" :
                workflowStatus === "running" ? "secondary" : "outline"
              }>
                {workflowStatus === "pending" ? "Wachtend" :
                 workflowStatus === "running" ? "Lopend" :
                 workflowStatus === "completed" ? "Voltooid" :
                 workflowStatus === "failed" ? "Mislukt" : "Gepauzeerd"}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              {workflowStatus === "pending" && (
                <Button onClick={startWorkflow} size="sm">
                  <PlayIcon className="h-4 w-4 mr-1" />
                  Start
                </Button>
              )}
              {workflowStatus === "running" && (
                <Button onClick={() => setWorkflowStatus("paused")} variant="outline" size="sm">
                  <PauseIcon className="h-4 w-4 mr-1" />
                  Pauzeer
                </Button>
              )}
            </div>
          </CardTitle>
          {args.description && (
            <p className="text-sm text-muted-foreground">
              {args.description}
            </p>
          )}
        </CardHeader>
        
        <CardContent>
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Voortgang</span>
              <span>{steps.filter(s => s.status === "completed").length} / {steps.length} stappen</span>
            </div>
            <Progress 
              value={(steps.filter(s => s.status === "completed").length / steps.length) * 100}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Workflow Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workflow Stappen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200 dark:bg-gray-700" />
              )}
              
              <div className={`flex items-start space-x-4 p-4 rounded-lg border ${
                step.status === "running" ? "border-blue-200 bg-blue-50 dark:bg-blue-950/20" :
                step.status === "completed" ? "border-green-200 bg-green-50 dark:bg-green-950/20" :
                step.status === "failed" ? "border-red-200 bg-red-50 dark:bg-red-950/20" :
                "border-gray-200 bg-gray-50 dark:bg-gray-950/20"
              }`}>
                {/* Step Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getStepIcon(step)}
                </div>
                
                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{step.title}</h4>
                    <Badge variant="outline" className={`text-xs ${getStepTypeColor(step.type)} text-white`}>
                      {step.type}
                    </Badge>
                    {currentStep === index && workflowStatus === "running" && (
                      <Badge variant="secondary" className="text-xs">
                        Actief
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>
                  
                  {step.error && (
                    <Alert className="mt-2">
                      <AlertTriangleIcon className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {step.error}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {step.status === "failed" && args.allowRetry && (
                    <Button
                      onClick={() => retryStep(step.id)}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                    >
                      <RefreshCwIcon className="h-3 w-3 mr-1" />
                      Opnieuw
                    </Button>
                  )}
                  
                  {step.status === "pending" && args.allowSkip && (
                    <Button
                      onClick={() => skipStep(step.id)}
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                    >
                      <SkipForwardIcon className="h-3 w-3 mr-1" />
                      Overslaan
                    </Button>
                  )}
                </div>
                
                {/* Step Number */}
                <div className="flex-shrink-0 text-sm text-muted-foreground">
                  #{index + 1}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Workflow Logs */}
      {result?.logs && result.logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedLogs(!expandedLogs)}
            >
              <span className="flex items-center space-x-2">
                <span>Workflow Logs</span>
                <Badge variant="outline">{result.logs.length}</Badge>
              </span>
              {expandedLogs ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
          
          {expandedLogs && (
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {result.logs.map((log, index) => (
                  <div key={index} className="text-xs p-2 bg-muted rounded border-l-2 border-blue-500">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString('nl-NL')}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.step}
                      </Badge>
                    </div>
                    <p className="mt-1">{log.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Workflow Summary */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Workflow Samenvatting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{result.completedSteps.length}</div>
                <div className="text-xs text-muted-foreground">Voltooid</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{result.failedSteps.length}</div>
                <div className="text-xs text-muted-foreground">Mislukt</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{Math.round(result.progress)}%</div>
                <div className="text-xs text-muted-foreground">Voortgang</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{Math.round(result.totalDuration)}s</div>
                <div className="text-xs text-muted-foreground">Duur</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export const WorkflowToolUI = makeAssistantToolUI<WorkflowArgs, WorkflowResult>({
  toolName: "executeWorkflow",
  render: WorkflowDisplay,
});
