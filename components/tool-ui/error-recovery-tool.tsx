"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import { FC, useState } from "react";
import { 
  AlertTriangleIcon, 
  RefreshCwIcon,
  CheckIcon, 
  XIcon, 
  BugIcon,
  ShieldIcon,
  ClockIcon,
  InfoIcon,
  ZapIcon,
  RotateCcwIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type ErrorDetails = {
  type: "api_error" | "timeout" | "validation_error" | "permission_error" | "rate_limit" | "unknown";
  message: string;
  code?: string;
  timestamp: string;
  context?: Record<string, any>;
  stackTrace?: string;
  userAction?: string;
};

type RecoveryAction = {
  id: string;
  title: string;
  description: string;
  type: "retry" | "fallback" | "skip" | "manual" | "escalate";
  automated: boolean;
  estimatedTime?: number; // in seconds
  riskLevel: "low" | "medium" | "high";
};

type ErrorRecoveryArgs = {
  error: ErrorDetails;
  recoveryActions: RecoveryAction[];
  autoRecover?: boolean;
  maxRetries?: number;
  escalationTimeout?: number; // in minutes
};

type ErrorRecoveryResult = {
  recovered: boolean;
  actionTaken: string;
  attempts: number;
  resolution: string;
  timestamp: string;
  userFeedback?: string;
};

const getErrorIcon = (type: string) => {
  switch (type) {
    case "api_error":
      return <ZapIcon className="h-5 w-5 text-red-500" />;
    case "timeout":
      return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    case "validation_error":
      return <AlertTriangleIcon className="h-5 w-5 text-orange-500" />;
    case "permission_error":
      return <ShieldIcon className="h-5 w-5 text-red-600" />;
    case "rate_limit":
      return <RefreshCwIcon className="h-5 w-5 text-blue-500" />;
    default:
      return <BugIcon className="h-5 w-5 text-gray-500" />;
  }
};

const getErrorSeverity = (type: string) => {
  switch (type) {
    case "permission_error":
      return "destructive";
    case "api_error":
      return "destructive";
    case "timeout":
      return "default";
    case "validation_error":
      return "secondary";
    case "rate_limit":
      return "outline";
    default:
      return "outline";
  }
};

const getRiskLevelColor = (level: string) => {
  switch (level) {
    case "high":
      return "text-red-500 bg-red-50 dark:bg-red-950/20";
    case "medium":
      return "text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
    case "low":
      return "text-green-500 bg-green-50 dark:bg-green-950/20";
    default:
      return "text-gray-500 bg-gray-50 dark:bg-gray-950/20";
  }
};

const ErrorRecoveryDisplay: FC<{ args: ErrorRecoveryArgs; result?: ErrorRecoveryResult; addResult: (result: ErrorRecoveryResult) => void; status: any }> = ({ 
  args, 
  result, 
  addResult,
  status 
}) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [userFeedback, setUserFeedback] = useState("");
  const [attempts, setAttempts] = useState(0);

  const executeRecoveryAction = async (actionId: string) => {
    const action = args.recoveryActions.find(a => a.id === actionId);
    if (!action) return;

    setIsRecovering(true);
    setSelectedAction(actionId);
    setAttempts(prev => prev + 1);

    // Simulate recovery action execution
    const executionTime = action.estimatedTime || Math.random() * 5 + 2;
    await new Promise(resolve => setTimeout(resolve, executionTime * 1000));

    // Simulate success rate based on action type and risk level
    let successRate = 0.8;
    if (action.type === "retry") successRate = 0.6;
    if (action.type === "fallback") successRate = 0.9;
    if (action.type === "skip") successRate = 0.95;
    if (action.riskLevel === "high") successRate *= 0.7;

    const success = Math.random() < successRate;

    const recoveryResult: ErrorRecoveryResult = {
      recovered: success,
      actionTaken: action.title,
      attempts,
      resolution: success 
        ? `Probleem opgelost door: ${action.title}` 
        : `Herstelpoging mislukt: ${action.title}`,
      timestamp: new Date().toISOString(),
      userFeedback: userFeedback || undefined,
    };

    addResult(recoveryResult);
    setIsRecovering(false);
  };

  const escalateIssue = () => {
    const escalationResult: ErrorRecoveryResult = {
      recovered: false,
      actionTaken: "Escalated to support",
      attempts,
      resolution: "Issue escalated to technical support team",
      timestamp: new Date().toISOString(),
      userFeedback: userFeedback || undefined,
    };

    addResult(escalationResult);
  };

  // Show result if recovery is complete
  if (result) {
    return (
      <Card className={`w-full max-w-3xl mx-auto ${result.recovered ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-orange-200 bg-orange-50 dark:bg-orange-950/20'}`}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {result.recovered ? (
              <CheckIcon className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangleIcon className="h-5 w-5 text-orange-500" />
            )}
            <span className={result.recovered ? "text-green-700 dark:text-green-300" : "text-orange-700 dark:text-orange-300"}>
              {result.recovered ? "Probleem Opgelost" : "Herstel Mislukt"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Actie ondernomen:</span> {result.actionTaken}
            </div>
            <div className="text-sm">
              <span className="font-medium">Aantal pogingen:</span> {result.attempts}
            </div>
            <div className="text-sm">
              <span className="font-medium">Tijdstip:</span> {new Date(result.timestamp).toLocaleString('nl-NL')}
            </div>
            <div className="text-sm">
              <span className="font-medium">Resultaat:</span> {result.resolution}
            </div>
          </div>
          
          {result.recovered ? (
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✅ Het probleem is succesvol opgelost en de actie kan worden voortgezet.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <p className="text-sm text-orange-700 dark:text-orange-300">
                ⚠️ Automatisch herstel is mislukt. Het probleem is doorgestuurd naar de support afdeling.
              </p>
            </div>
          )}

          {result.userFeedback && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Gebruiker feedback:</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{result.userFeedback}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show error recovery interface
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Error Details */}
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getErrorIcon(args.error.type)}
            <span className="text-red-700 dark:text-red-300">Fout Gedetecteerd</span>
            <Badge variant={getErrorSeverity(args.error.type)}>
              {args.error.type.replace("_", " ").toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>
              <strong>{args.error.message}</strong>
              {args.error.code && (
                <span className="block text-xs text-muted-foreground mt-1">
                  Error Code: {args.error.code}
                </span>
              )}
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Tijdstip:</span> {new Date(args.error.timestamp).toLocaleString('nl-NL')}
          </div>

          {args.error.userAction && (
            <div className="text-sm">
              <span className="font-medium">Gebruiker actie:</span> {args.error.userAction}
            </div>
          )}

          {args.error.context && Object.keys(args.error.context).length > 0 && (
            <details className="mt-2">
              <summary className="text-sm font-medium cursor-pointer hover:text-red-600">
                Technische details
              </summary>
              <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
                {JSON.stringify(args.error.context, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Recovery Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCwIcon className="h-5 w-5 text-blue-500" />
            <span>Herstel Opties</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="actions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="actions">Herstel Acties</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
            </TabsList>
            
            <TabsContent value="actions" className="space-y-4 mt-4">
              {args.recoveryActions.map((action) => (
                <div 
                  key={action.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedAction === action.id 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedAction(action.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{action.title}</h4>
                        <Badge variant="outline" className={getRiskLevelColor(action.riskLevel)}>
                          {action.riskLevel} risico
                        </Badge>
                        {action.automated && (
                          <Badge variant="secondary" className="text-xs">
                            Automatisch
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {action.description}
                      </p>
                      {action.estimatedTime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Geschatte tijd: ~{action.estimatedTime}s
                        </p>
                      )}
                    </div>
                    
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        executeRecoveryAction(action.id);
                      }}
                      disabled={isRecovering}
                      size="sm"
                      className="ml-4"
                    >
                      {isRecovering && selectedAction === action.id ? (
                        <div className="flex items-center space-x-1">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          <span>Bezig...</span>
                        </div>
                      ) : (
                        <>
                          <RotateCcwIcon className="h-3 w-3 mr-1" />
                          Uitvoeren
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}

              <Separator />

              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  Kan het probleem niet automatisch oplossen?
                </div>
                <Button 
                  onClick={escalateIssue}
                  variant="outline"
                  disabled={isRecovering}
                >
                  <AlertTriangleIcon className="h-4 w-4 mr-2" />
                  Doorsturen naar Support
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="feedback" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">
                  Aanvullende informatie (optioneel)
                </label>
                <Textarea
                  placeholder="Beschrijf wat er gebeurde voordat de fout optrad, of geef andere relevante details..."
                  value={userFeedback}
                  onChange={(e) => setUserFeedback(e.target.value)}
                  className="mt-2"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Deze informatie helpt ons om de fout beter te begrijpen en te voorkomen.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Status Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <InfoIcon className="h-4 w-4" />
              <span>Poging {attempts + 1}</span>
            </div>
            {args.maxRetries && (
              <span>van maximaal {args.maxRetries}</span>
            )}
            {args.autoRecover && (
              <Badge variant="outline" className="text-xs">
                Auto-herstel ingeschakeld
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const ErrorRecoveryToolUI = makeAssistantToolUI<ErrorRecoveryArgs, ErrorRecoveryResult>({
  toolName: "handleError",
  render: ErrorRecoveryDisplay,
});
