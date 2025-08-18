"use client";

import ShikiHighlighter, { type ShikiHighlighterProps } from "react-shiki";
import { FC } from "react";

interface SyntaxHighlighterProps {
  language?: string;
  children?: string;
}

export const SyntaxHighlighter: FC<SyntaxHighlighterProps> = ({ 
  language = "text", 
  children = "" 
}) => {
  const shikiProps: ShikiHighlighterProps = {
    language,
    theme: {
      light: "github-light",
      dark: "github-dark",
    },
    children,
    delay: 50, // Delay voor streaming support
    className: "rounded-lg overflow-hidden",
  };

  return <ShikiHighlighter {...shikiProps} />;
};
