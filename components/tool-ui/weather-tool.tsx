"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import { FC } from "react";
import { CloudIcon, SunIcon, CloudRainIcon, Thermometer, Wind, Droplets } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type WeatherArgs = {
  location: string;
  unit?: "celsius" | "fahrenheit";
};

type WeatherResult = {
  location: string;
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  pressure: number;
  visibility: number;
  condition: "sunny" | "cloudy" | "rainy" | "stormy" | "snow";
};

const getWeatherIcon = (condition: string) => {
  switch (condition.toLowerCase()) {
    case "sunny":
    case "clear":
      return <SunIcon className="h-8 w-8 text-yellow-500" />;
    case "cloudy":
    case "overcast":
      return <CloudIcon className="h-8 w-8 text-gray-500" />;
    case "rainy":
    case "rain":
      return <CloudRainIcon className="h-8 w-8 text-blue-500" />;
    default:
      return <CloudIcon className="h-8 w-8 text-gray-500" />;
  }
};

const WeatherDisplay: FC<{ args: WeatherArgs; result?: WeatherResult; status: any }> = ({ 
  args, 
  result, 
  status 
}) => {
  if (status.type === "running") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-sm text-muted-foreground">
              Weer ophalen voor {args.location}...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status.type === "incomplete" && status.reason === "error") {
    return (
      <Card className="w-full max-w-md mx-auto border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <div className="text-red-500">⚠️</div>
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Weer ophalen mislukt
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Kon geen weergegevens vinden voor {args.location}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const unit = args.unit || "celsius";
  const tempUnit = unit === "celsius" ? "°C" : "°F";

  return (
    <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">{result.location}</h3>
            <p className="text-sm text-muted-foreground capitalize">{result.description}</p>
          </div>
          {getWeatherIcon(result.condition)}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Main Temperature */}
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-700 dark:text-blue-300">
              {result.temperature}{tempUnit}
            </div>
          </div>

          {/* Weather Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <span>Luchtvochtigheid: {result.humidity}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <Wind className="h-4 w-4 text-gray-500" />
              <span>Wind: {result.windSpeed} km/h</span>
            </div>
            <div className="flex items-center space-x-2">
              <Thermometer className="h-4 w-4 text-red-500" />
              <span>Druk: {result.pressure} hPa</span>
            </div>
            <div className="flex items-center space-x-2">
              <CloudIcon className="h-4 w-4 text-gray-400" />
              <span>Zicht: {result.visibility} km</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const WeatherToolUI = makeAssistantToolUI<WeatherArgs, WeatherResult>({
  toolName: "getWeather",
  render: WeatherDisplay,
});
