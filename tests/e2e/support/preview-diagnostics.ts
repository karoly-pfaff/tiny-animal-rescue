import { createLogger, type Logger } from 'vite';

export interface PreviewDiagnostics {
  readonly logger: Logger;
  assertClean(): void;
}

export function createPreviewDiagnostics(): PreviewDiagnostics {
  const findings: string[] = [];
  const logger = createLogger('silent');

  logger.warn = (message) => {
    findings.push(`warning: ${message}`);
  };
  logger.warnOnce = (message) => {
    const finding = `warning: ${message}`;
    if (!findings.includes(finding)) {
      findings.push(finding);
    }
  };
  logger.error = (message) => {
    findings.push(`error: ${message}`);
  };

  return {
    logger,
    assertClean() {
      if (findings.length > 0) {
        throw new Error(`Production preview emitted diagnostics:\n${findings.join('\n')}`);
      }
    },
  };
}
