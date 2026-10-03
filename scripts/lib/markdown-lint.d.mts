export interface MarkdownlintError {
  lineNumber: number;
  ruleNames: string[];
  ruleDescription: string;
  errorDetail?: string | null;
  errorContext?: string | null;
  errorRange?: [number, number] | null;
}

export type MarkdownlintResults = Record<string, MarkdownlintError[]>;

export function selectMarkdownFiles(files: string[]): string[];

export function formatMarkdownlintResults(
  results: MarkdownlintResults,
  displayPath: (file: string) => string,
): string[];
