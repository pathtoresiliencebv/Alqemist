"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  CheckIcon, 
  XIcon, 
  FileTextIcon, 
  CalendarIcon, 
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  MailIcon,
  CreditCardIcon,
  HashIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type FormField = {
  id: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select" | "checkbox" | "date" | "number";
  placeholder?: string;
  required?: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string;
  };
};

type FormArgs = {
  title: string;
  description: string;
  fields: FormField[];
  submitLabel?: string;
  priority?: "low" | "medium" | "high";
};

type FormResult = {
  submitted: boolean;
  data: Record<string, any>;
  timestamp: string;
  validationErrors?: string[];
};

// Dynamic schema generation based on form fields
const createFormSchema = (fields: FormField[]) => {
  const schemaObj: Record<string, z.ZodTypeAny> = {};
  
  fields.forEach(field => {
    let fieldSchema: z.ZodTypeAny;
    
    switch (field.type) {
      case "email":
        fieldSchema = z.string().email("Ongeldig e-mailadres");
        break;
      case "tel":
        fieldSchema = z.string().regex(/^[\+]?[0-9\s\-\(\)]+$/, "Ongeldig telefoonnummer");
        break;
      case "number":
        fieldSchema = z.number();
        if (field.validation?.min) fieldSchema = (fieldSchema as z.ZodNumber).min(field.validation.min);
        if (field.validation?.max) fieldSchema = (fieldSchema as z.ZodNumber).max(field.validation.max);
        break;
      case "date":
        fieldSchema = z.string().refine(val => !isNaN(Date.parse(val)), "Ongeldige datum");
        break;
      case "checkbox":
        fieldSchema = z.boolean();
        break;
      default:
        fieldSchema = z.string();
        if (field.validation?.min) fieldSchema = (fieldSchema as z.ZodString).min(field.validation.min);
        if (field.validation?.max) fieldSchema = (fieldSchema as z.ZodString).max(field.validation.max);
        if (field.validation?.pattern) {
          fieldSchema = (fieldSchema as z.ZodString).regex(new RegExp(field.validation.pattern));
        }
    }
    
    if (!field.required && field.type !== "checkbox") {
      fieldSchema = fieldSchema.optional();
    }
    
    schemaObj[field.id] = fieldSchema;
  });
  
  return z.object(schemaObj);
};

const getFieldIcon = (type: string) => {
  switch (type) {
    case "email":
      return <MailIcon className="h-4 w-4" />;
    case "tel":
      return <PhoneIcon className="h-4 w-4" />;
    case "date":
      return <CalendarIcon className="h-4 w-4" />;
    case "number":
      return <HashIcon className="h-4 w-4" />;
    case "textarea":
      return <FileTextIcon className="h-4 w-4" />;
    case "select":
      return <MapPinIcon className="h-4 w-4" />;
    default:
      return <UserIcon className="h-4 w-4" />;
  }
};

const FormDisplay: FC<{ args: FormArgs; result?: FormResult; addResult: (result: FormResult) => void; status: any }> = ({ 
  args, 
  result, 
  addResult,
  status 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const formSchema = createFormSchema(args.fields);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: args.fields.reduce((acc, field) => {
      acc[field.id] = field.type === "checkbox" ? false : "";
      return acc;
    }, {} as Record<string, any>)
  });

  const onSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const formResult: FormResult = {
      submitted: true,
      data,
      timestamp: new Date().toISOString(),
    };
    
    addResult(formResult);
    setIsSubmitting(false);
  };

  // Show result if form is submitted
  if (result?.submitted) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckIcon className="h-5 w-5 text-green-500" />
            <span className="text-green-700 dark:text-green-300">Formulier Verzonden</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Verzonden op:</span> {new Date(result.timestamp).toLocaleString('nl-NL')}
            </div>
            <div className="text-sm">
              <span className="font-medium">Aantal velden:</span> {Object.keys(result.data).length}
            </div>
          </div>
          
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300">
              ✅ Uw formulier is succesvol verzonden en wordt verwerkt.
            </p>
          </div>

          {/* Show submitted data summary */}
          <details className="mt-4">
            <summary className="text-sm font-medium cursor-pointer hover:text-green-600">
              Ingezonden gegevens bekijken
            </summary>
            <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded border text-xs">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          </details>
        </CardContent>
      </Card>
    );
  }

  // Show interactive form
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileTextIcon className="h-5 w-5 text-blue-500" />
          <span>{args.title}</span>
          {args.priority && (
            <Badge variant={args.priority === "high" ? "destructive" : args.priority === "medium" ? "default" : "secondary"}>
              {args.priority}
            </Badge>
          )}
        </CardTitle>
        {args.description && (
          <p className="text-sm text-muted-foreground mt-2">
            {args.description}
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {args.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id} className="flex items-center space-x-2">
                {getFieldIcon(field.type)}
                <span>{field.label}</span>
                {field.required && <span className="text-red-500">*</span>}
              </Label>
              
              {field.type === "textarea" && (
                <Textarea
                  id={field.id}
                  placeholder={field.placeholder}
                  {...form.register(field.id)}
                  className="min-h-[100px]"
                />
              )}
              
              {field.type === "select" && field.options && (
                <Select onValueChange={(value) => form.setValue(field.id, value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder || "Maak een keuze..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {field.type === "checkbox" && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    {...form.register(field.id)}
                  />
                  <Label htmlFor={field.id} className="text-sm">
                    {field.placeholder || field.label}
                  </Label>
                </div>
              )}
              
              {!["textarea", "select", "checkbox"].includes(field.type) && (
                <Input
                  id={field.id}
                  type={field.type}
                  placeholder={field.placeholder}
                  {...form.register(field.id, { 
                    valueAsNumber: field.type === "number" 
                  })}
                />
              )}
              
              {form.formState.errors[field.id] && (
                <p className="text-sm text-red-500">
                  {form.formState.errors[field.id]?.message as string}
                </p>
              )}
            </div>
          ))}

          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isValid}
              className="flex-1"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Verzenden...</span>
                </div>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  {args.submitLabel || "Verzenden"}
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSubmitting}
            >
              <XIcon className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Form validation summary */}
          {Object.keys(form.formState.errors).length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                Corrigeer de volgende fouten:
              </p>
              <ul className="text-xs text-red-600 dark:text-red-400 mt-1 list-disc list-inside">
                {Object.entries(form.formState.errors).map(([field, error]) => (
                  <li key={field}>
                    {args.fields.find(f => f.id === field)?.label}: {error?.message as string}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export const FormToolUI = makeAssistantToolUI<FormArgs, FormResult>({
  toolName: "createForm",
  render: FormDisplay,
});
