"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import { FC } from "react";
import { SearchIcon, ExternalLinkIcon, Globe, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type SearchArgs = {
  query: string;
  limit?: number;
  type?: "web" | "images" | "news" | "academic";
};

type SearchResult = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
  thumbnail?: string;
  relevanceScore?: number;
};

type SearchToolResult = {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
};

const SearchResultCard: FC<{ result: SearchResult }> = ({ result }) => {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {result.thumbnail && (
            <img 
              src={result.thumbnail} 
              alt={result.title}
              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
            />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-blue-600 dark:text-blue-400 hover:underline line-clamp-2">
                  <a href={result.url} target="_blank" rel="noopener noreferrer">
                    {result.title}
                  </a>
                </h3>
                
                <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  <span>{result.source}</span>
                  {result.publishedDate && (
                    <>
                      <Calendar className="h-3 w-3 ml-2" />
                      <span>{new Date(result.publishedDate).toLocaleDateString('nl-NL')}</span>
                    </>
                  )}
                </div>
              </div>
              
              <Button variant="ghost" size="sm" asChild>
                <a href={result.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon className="h-4 w-4" />
                </a>
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
              {result.snippet}
            </p>
            
            {result.relevanceScore && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  Relevantie: {Math.round(result.relevanceScore * 100)}%
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SearchDisplay: FC<{ args: SearchArgs; result?: SearchToolResult; status: any }> = ({ 
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
              Zoeken naar "{args.query}"...
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
                Zoeken mislukt
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Kon geen resultaten vinden voor "{args.query}"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result || !result.results.length) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center">
            <SearchIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Geen resultaten gevonden voor "{args.query}"
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Search Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <SearchIcon className="h-5 w-5 text-blue-500" />
            <span>Zoekresultaten voor "{result.query}"</span>
          </CardTitle>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>{result.totalResults.toLocaleString()} resultaten</span>
            <span>({result.searchTime}s)</span>
            {args.type && (
              <Badge variant="outline">{args.type}</Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Search Results */}
      <div className="space-y-3">
        {result.results.slice(0, args.limit || 5).map((searchResult) => (
          <SearchResultCard key={searchResult.id} result={searchResult} />
        ))}
      </div>

      {/* More Results Indicator */}
      {result.results.length > (args.limit || 5) && (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              ... en nog {result.results.length - (args.limit || 5)} resultaten
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export const SearchToolUI = makeAssistantToolUI<SearchArgs, SearchToolResult>({
  toolName: "webSearch",
  render: SearchDisplay,
});
