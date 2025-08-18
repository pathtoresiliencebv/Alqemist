"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import { FC, useState } from "react";
import { CheckIcon, XIcon, ClockIcon, AlertTriangleIcon, UserIcon, InfoIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type ApprovalArgs = {
  action: string;
  description: string;
  details: Record<string, any>;
  priority: "low" | "medium" | "high" | "critical";
  requiredApproval: "manager" | "admin" | "user" | "any";
  timeoutMinutes?: number;
};

type ApprovalResult = {
  approved: boolean;
  approvedBy?: string;
  reason?: string;
  timestamp: string;
  actionTaken?: boolean;
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critical":
      return "destructive";
    case "high":
      return "destructive";
    case "medium":
      return "default";
    case "low":
      return "secondary";
    default:
      return "outline";
  }
};

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case "critical":
    case "high":
      return <AlertTriangleIcon className="h-4 w-4" />;
    case "medium":
      return <InfoIcon className="h-4 w-4" />;
    case "low":
      return <ClockIcon className="h-4 w-4" />;
    default:
      return <InfoIcon className="h-4 w-4" />;
  }
};

const ApprovalDisplay: FC<{ args: ApprovalArgs; result?: ApprovalResult; addResult: (result: ApprovalResult) => void; status: any }> = ({ 
  args, 
  result, 
  addResult,
  status 
}) => {
  const [reason, setReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApproval = async (approved: boolean) => {
    setIsProcessing(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const approvalResult: ApprovalResult = {
      approved,
      approvedBy: "Current User", // In real implementation, get from auth context
      reason: approved ? "Goedgekeurd door gebruiker" : reason || "Afgewezen door gebruiker",
      timestamp: new Date().toISOString(),
      actionTaken: approved,
    };
    
    addResult(approvalResult);
    setIsProcessing(false);
  };

  // Show result if approval is complete
  if (result) {
    return (
      <Card className={`w-full max-w-2xl mx-auto ${result.approved ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-red-200 bg-red-50 dark:bg-red-950/20'}`}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {result.approved ? (
              <CheckIcon className="h-5 w-5 text-green-500" />
            ) : (
              <XIcon className="h-5 w-5 text-red-500" />
            )}
            <span className={result.approved ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
              {result.approved ? "Goedgekeurd" : "Afgewezen"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Actie:</span> {args.action}
            </div>
            <div className="text-sm">
              <span className="font-medium">Beslissing door:</span> {result.approvedBy}
            </div>
            <div className="text-sm">
              <span className="font-medium">Tijdstip:</span> {new Date(result.timestamp).toLocaleString('nl-NL')}
            </div>
            {result.reason && (
              <div className="text-sm">
                <span className="font-medium">Reden:</span> {result.reason}
              </div>
            )}
          </div>
          
          {result.approved && (
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✅ De actie is goedgekeurd en zal worden uitgevoerd.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show approval request form
  return (
    <Card className="w-full max-w-2xl mx-auto border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserIcon className="h-5 w-5 text-yellow-600" />
          <span className="text-yellow-800 dark:text-yellow-300">Goedkeuring Vereist</span>
          <Badge variant={getPriorityColor(args.priority)} className="ml-auto">
            {getPriorityIcon(args.priority)}
            <span className="ml-1 capitalize">{args.priority}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Action Details */}
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Te Goedkeuren Actie:</h4>
            <p className="text-sm mt-1 p-3 bg-white dark:bg-gray-800 rounded border">
              {args.action}
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Beschrijving:</h4>
            <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">
              {args.description}
            </p>
          </div>
        </div>

        {/* Details Section */}
        {Object.keys(args.details).length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Details:</h4>
              <div className="bg-white dark:bg-gray-800 rounded border p-3">
                <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(args.details, null, 2)}
                </pre>
              </div>
            </div>
          </>
        )}

        {/* Approval Level */}
        <div className="flex items-center space-x-2 text-sm text-yellow-700 dark:text-yellow-400">
          <span className="font-medium">Vereiste goedkeuring:</span>
          <Badge variant="outline" className="capitalize">
            {args.requiredApproval}
          </Badge>
          {args.timeoutMinutes && (
            <span className="text-xs">
              (Timeout: {args.timeoutMinutes} min)
            </span>
          )}
        </div>

        <Separator />

        {/* Rejection Reason */}
        <div>
          <label htmlFor="reason" className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            Reden (optioneel, vereist bij afwijzing):
          </label>
          <Textarea
            id="reason"
            placeholder="Voer een reden in voor je beslissing..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1"
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <Button
            onClick={() => handleApproval(true)}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Verwerken...</span>
              </div>
            ) : (
              <>
                <CheckIcon className="h-4 w-4 mr-2" />
                Goedkeuren
              </>
            )}
          </Button>
          
          <Button
            onClick={() => handleApproval(false)}
            disabled={isProcessing || (!reason && true)} // Require reason for rejection
            variant="destructive"
            className="flex-1"
          >
            <XIcon className="h-4 w-4 mr-2" />
            Afwijzen
          </Button>
        </div>

        {!reason && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 text-center">
            💡 Tip: Voer een reden in voordat je afwijst
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export const ApprovalToolUI = makeAssistantToolUI<ApprovalArgs, ApprovalResult>({
  toolName: "requestApproval",
  render: ApprovalDisplay,
});
