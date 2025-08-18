"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import { FC } from "react";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUpIcon, BarChart3Icon, PieChartIcon, ActivityIcon } from "lucide-react";

type DataAnalysisArgs = {
  data: any[];
  analysisType: "trend" | "comparison" | "distribution" | "correlation";
  title?: string;
  xAxis?: string;
  yAxis?: string;
};

type DataPoint = {
  name: string;
  value: number;
  category?: string;
  [key: string]: any;
};

type AnalysisResult = {
  summary: {
    totalRecords: number;
    averageValue: number;
    maxValue: number;
    minValue: number;
    trend: "increasing" | "decreasing" | "stable";
  };
  insights: string[];
  chartData: DataPoint[];
  recommendations: string[];
};

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

const ChartContainer: FC<{ 
  data: DataPoint[]; 
  type: string; 
  title: string;
  xAxis?: string;
  yAxis?: string;
}> = ({ data, type, title, xAxis = "name", yAxis = "value" }) => {
  const renderChart = () => {
    switch (type) {
      case "trend":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={yAxis} 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ fill: "#8884d8", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case "comparison":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yAxis} fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case "distribution":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey={yAxis}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yAxis} fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  const getIcon = () => {
    switch (type) {
      case "trend":
        return <TrendingUpIcon className="h-5 w-5" />;
      case "comparison":
        return <BarChart3Icon className="h-5 w-5" />;
      case "distribution":
        return <PieChartIcon className="h-5 w-5" />;
      default:
        return <ActivityIcon className="h-5 w-5" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getIcon()}
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
};

const DataAnalysisDisplay: FC<{ args: DataAnalysisArgs; result?: AnalysisResult; status: any }> = ({ 
  args, 
  result, 
  status 
}) => {
  if (status.type === "running") {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-sm text-muted-foreground">
              Data analyseren...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status.type === "incomplete" && status.reason === "error") {
    return (
      <Card className="w-full border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <div className="text-red-500">⚠️</div>
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Data analyse mislukt
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Kon de opgegeven data niet verwerken
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  return (
    <div className="w-full space-y-6">
      {/* Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ActivityIcon className="h-5 w-5 text-blue-500" />
            <span>Data Analyse Samenvatting</span>
            <Badge variant="outline">{args.analysisType}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{result.summary.totalRecords}</div>
              <div className="text-xs text-muted-foreground">Records</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {result.summary.averageValue.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Gemiddelde</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{result.summary.maxValue}</div>
              <div className="text-xs text-muted-foreground">Maximum</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{result.summary.minValue}</div>
              <div className="text-xs text-muted-foreground">Minimum</div>
            </div>
          </div>

          <div className="mt-4 flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Trend:</span>
            <Badge 
              variant={result.summary.trend === "increasing" ? "default" : 
                      result.summary.trend === "decreasing" ? "destructive" : "secondary"}
            >
              {result.summary.trend === "increasing" ? "📈 Stijgend" :
               result.summary.trend === "decreasing" ? "📉 Dalend" : "📊 Stabiel"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Chart and Insights */}
      <Tabs defaultValue="chart" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chart">Grafiek</TabsTrigger>
          <TabsTrigger value="insights">Inzichten</TabsTrigger>
          <TabsTrigger value="recommendations">Aanbevelingen</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chart" className="space-y-4">
          <ChartContainer
            data={result.chartData}
            type={args.analysisType}
            title={args.title || "Data Visualisatie"}
            xAxis={args.xAxis}
            yAxis={args.yAxis}
          />
        </TabsContent>
        
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Belangrijkste Inzichten</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.insights.map((insight, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span className="text-sm">{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aanbevelingen</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-green-500 mt-1">→</span>
                    <span className="text-sm">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const DataAnalysisToolUI = makeAssistantToolUI<DataAnalysisArgs, AnalysisResult>({
  toolName: "analyzeData",
  render: DataAnalysisDisplay,
});
