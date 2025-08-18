"use client";

import { useEffect, useRef, useState, FC } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  children?: string;
  language?: string;
}

// Initialize Mermaid with configuration
mermaid.initialize({
  theme: "default",
  securityLevel: "loose",
  fontFamily: "system-ui, -apple-system, sans-serif",
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: "basis",
  },
  sequence: {
    useMaxWidth: true,
    wrap: true,
  },
  gantt: {
    useMaxWidth: true,
  },
});

export const MermaidDiagram: FC<MermaidDiagramProps> = ({ 
  children = "", 
  language = "mermaid" 
}) => {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const diagramRef = useRef<HTMLDivElement>(null);
  const codeId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  // Check if the code block is complete for streaming scenarios
  const isCompleteBlock = (code: string): boolean => {
    const trimmed = code.trim();
    if (!trimmed) return false;
    
    // Check for common diagram types and their completion
    const diagramTypes = [
      { start: /^graph\s+(TD|TB|BT|RL|LR)/, end: /\w+$/ },
      { start: /^flowchart\s+(TD|TB|BT|RL|LR)/, end: /\w+$/ },
      { start: /^sequenceDiagram/, end: /\w+$/ },
      { start: /^gantt/, end: /\w+$/ },
      { start: /^classDiagram/, end: /\w+$/ },
      { start: /^stateDiagram/, end: /\w+$/ },
      { start: /^erDiagram/, end: /\w+$/ },
      { start: /^journey/, end: /\w+$/ },
      { start: /^gitgraph/, end: /\w+$/ },
      { start: /^pie/, end: /\w+$/ },
    ];

    // Must start with a known diagram type
    const hasValidStart = diagramTypes.some(type => type.start.test(trimmed));
    if (!hasValidStart) return false;

    // Should end meaningfully (not with incomplete syntax)
    const lines = trimmed.split('\n');
    const lastLine = lines[lines.length - 1].trim();
    
    // Avoid rendering if last line suggests incomplete syntax
    if (lastLine.endsWith('-->') || lastLine.endsWith('->') || 
        lastLine.endsWith(':') || lastLine.endsWith('|') ||
        lastLine.endsWith('||') || lastLine.endsWith('&&')) {
      return false;
    }

    return true;
  };

  useEffect(() => {
    const renderDiagram = async () => {
      if (!children || !children.trim()) {
        setSvg("");
        setIsLoading(false);
        return;
      }

      // Only render if the block appears complete (for streaming support)
      if (!isCompleteBlock(children)) {
        setIsLoading(true);
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        // Validate and render the mermaid diagram
        const isValid = await mermaid.parse(children.trim());
        if (!isValid) {
          throw new Error("Invalid Mermaid syntax");
        }

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(codeId.current, children.trim());
        setSvg(renderedSvg);
        setError("");
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(err instanceof Error ? err.message : "Diagram rendering failed");
        setSvg("");
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [children]);

  // Loading state
  if (isLoading && children) {
    return (
      <div className="mermaid-container my-4 p-4 border rounded-lg bg-muted/20">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="text-sm text-muted-foreground">Diagram renderen...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mermaid-container my-4 p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
        <div className="flex items-start space-x-2">
          <div className="text-red-500">⚠️</div>
          <div>
            <div className="text-sm font-medium text-red-700 dark:text-red-300">
              Diagram Error
            </div>
            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
              {error}
            </div>
            <details className="mt-2">
              <summary className="text-xs text-red-500 cursor-pointer hover:text-red-600">
                Show source
              </summary>
              <pre className="text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded mt-1 overflow-x-auto">
                {children}
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  // Successful render
  if (svg) {
    return (
      <div 
        ref={diagramRef}
        className="mermaid-container my-4 p-4 border rounded-lg bg-background overflow-x-auto"
      >
        <div 
          className="mermaid-diagram flex justify-center"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    );
  }

  // Fallback for empty/incomplete content
  return null;
};
