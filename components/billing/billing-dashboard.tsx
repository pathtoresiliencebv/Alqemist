"use client";

import { FC, useState, useEffect } from "react";
import { 
  CreditCardIcon,
  DollarSignIcon,
  TrendingUpIcon,
  ZapIcon,
  CalendarIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  DownloadIcon,
  SettingsIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year";
  features: string[];
  limits: {
    apiCalls: number;
    storage: number; // in GB
    users: number;
  };
  current?: boolean;
}

interface UsageData {
  period: string;
  apiCalls: number;
  tokensUsed: number;
  cost: number;
}

interface BillingInfo {
  currentPlan: SubscriptionPlan;
  usage: {
    apiCalls: { used: number; limit: number };
    tokens: { used: number; limit: number };
    storage: { used: number; limit: number };
  };
  nextBilling: string;
  paymentMethod: {
    type: "card";
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
  };
  invoices: {
    id: string;
    date: string;
    amount: number;
    status: "paid" | "pending" | "failed";
    downloadUrl?: string;
  }[];
  usageHistory: UsageData[];
}

const PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 9.99,
    interval: "month",
    features: [
      "10.000 API calls per maand",
      "1 GB bestand opslag",
      "Basis AI modellen",
      "E-mail support"
    ],
    limits: {
      apiCalls: 10000,
      storage: 1,
      users: 1
    }
  },
  {
    id: "professional",
    name: "Professional",
    price: 29.99,
    interval: "month",
    features: [
      "100.000 API calls per maand",
      "10 GB bestand opslag",
      "Alle AI modellen",
      "Priority support",
      "Custom tool UIs",
      "Analytics dashboard"
    ],
    limits: {
      apiCalls: 100000,
      storage: 10,
      users: 5
    }
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99.99,
    interval: "month",
    features: [
      "Onbeperkte API calls",
      "100 GB bestand opslag",
      "Alle AI modellen + beta toegang",
      "24/7 support",
      "Custom integraties",
      "Dedicated account manager",
      "SSO & SAML",
      "Advanced analytics"
    ],
    limits: {
      apiCalls: -1, // unlimited
      storage: 100,
      users: -1 // unlimited
    }
  }
];

export const BillingDashboard: FC = () => {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading billing info
    const timer = setTimeout(() => {
      setBillingInfo({
        currentPlan: { ...PLANS[1], current: true },
        usage: {
          apiCalls: { used: 45000, limit: 100000 },
          tokens: { used: 2500000, limit: 5000000 },
          storage: { used: 2.3, limit: 10 }
        },
        nextBilling: "2024-02-15",
        paymentMethod: {
          type: "card",
          last4: "4242",
          brand: "visa",
          expiryMonth: 12,
          expiryYear: 2026
        },
        invoices: [
          {
            id: "inv_001",
            date: "2024-01-15",
            amount: 29.99,
            status: "paid",
            downloadUrl: "/invoices/inv_001.pdf"
          },
          {
            id: "inv_002",
            date: "2023-12-15",
            amount: 29.99,
            status: "paid"
          }
        ],
        usageHistory: [
          { period: "Jan 2024", apiCalls: 45000, tokensUsed: 2500000, cost: 29.99 },
          { period: "Dec 2023", apiCalls: 38000, tokensUsed: 2100000, cost: 29.99 },
          { period: "Nov 2023", apiCalls: 42000, tokensUsed: 2300000, cost: 29.99 },
          { period: "Oct 2023", apiCalls: 35000, tokensUsed: 1900000, cost: 29.99 },
        ]
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading || !billingInfo) {
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

  const { currentPlan, usage, nextBilling, paymentMethod, invoices, usageHistory } = billingInfo;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Abonnementen</h1>
          <p className="text-muted-foreground">Beheer je abonnement en bekijk je verbruik</p>
        </div>
        <Button>
          <SettingsIcon className="h-4 w-4 mr-2" />
          Instellingen
        </Button>
      </div>

      {/* Current Plan & Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Huidig Plan</CardTitle>
            <ZapIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentPlan.name}</div>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-lg font-semibold">€{currentPlan.price}</span>
              <span className="text-sm text-muted-foreground">per {currentPlan.interval === "month" ? "maand" : "jaar"}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Volgende factuur: {new Date(nextBilling).toLocaleDateString('nl-NL')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.apiCalls.used.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              van {usage.apiCalls.limit === -1 ? "onbeperkt" : usage.apiCalls.limit.toLocaleString()}
            </div>
            {usage.apiCalls.limit > 0 && (
              <Progress 
                value={(usage.apiCalls.used / usage.apiCalls.limit) * 100} 
                className="mt-2 h-1"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opslag</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.storage.used} GB</div>
            <div className="text-xs text-muted-foreground">
              van {usage.storage.limit} GB
            </div>
            <Progress 
              value={(usage.storage.used / usage.storage.limit) * 100} 
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Billing Information */}
      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="usage">Verbruik</TabsTrigger>
          <TabsTrigger value="plans">Plannen</TabsTrigger>
          <TabsTrigger value="payment">Betaling</TabsTrigger>
          <TabsTrigger value="invoices">Facturen</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-6">
          {/* Usage Charts */}
          <Card>
            <CardHeader>
              <CardTitle>Verbruik Overzicht</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={usageHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="apiCalls" stroke="#8884d8" name="API Calls" />
                  <Line type="monotone" dataKey="tokensUsed" stroke="#82ca9d" name="Tokens" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Usage Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Maandelijks Verbruik</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Calls</span>
                  <div className="text-right">
                    <div className="font-semibold">{usage.apiCalls.used.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {usage.apiCalls.limit > 0 && `${Math.round((usage.apiCalls.used / usage.apiCalls.limit) * 100)}% gebruikt`}
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tokens Verwerkt</span>
                  <div className="text-right">
                    <div className="font-semibold">{usage.tokens.used.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">tokens</div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm">Bestand Opslag</span>
                  <div className="text-right">
                    <div className="font-semibold">{usage.storage.used} GB</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round((usage.storage.used / usage.storage.limit) * 100)}% gebruikt
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={usageHistory.slice(-3)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="cost" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.id === currentPlan.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : ''}`}>
                {plan.id === currentPlan.id && (
                  <Badge className="absolute -top-2 left-4 bg-blue-500">
                    Huidig Plan
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{plan.name}</span>
                    {plan.name === "Professional" && (
                      <Badge variant="secondary">Populair</Badge>
                    )}
                  </CardTitle>
                  <div className="text-3xl font-bold">
                    €{plan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{plan.interval === "month" ? "maand" : "jaar"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className="w-full" 
                    variant={plan.id === currentPlan.id ? "outline" : "default"}
                    disabled={plan.id === currentPlan.id}
                  >
                    {plan.id === currentPlan.id ? "Huidig Plan" : "Upgrade"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Betalingsmethode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4 p-4 border rounded-lg">
                <CreditCardIcon className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">
                    {paymentMethod.brand.toUpperCase()} •••• {paymentMethod.last4}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Verloopt {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Wijzigen
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium">Volgende factuur</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(nextBilling).toLocaleDateString('nl-NL')} - €{currentPlan.price}
                  </div>
                </div>
                <Badge variant="outline">Automatisch</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Factuur Geschiedenis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {new Date(invoice.date).toLocaleDateString('nl-NL', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Factuur #{invoice.id}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-semibold">€{invoice.amount}</div>
                        <Badge variant={
                          invoice.status === "paid" ? "default" :
                          invoice.status === "pending" ? "secondary" : "destructive"
                        }>
                          {invoice.status === "paid" ? "Betaald" :
                           invoice.status === "pending" ? "In behandeling" : "Mislukt"}
                        </Badge>
                      </div>
                      
                      {invoice.downloadUrl && (
                        <Button variant="ghost" size="sm">
                          <DownloadIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
