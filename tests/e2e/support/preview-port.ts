export function resolvePreviewPort(rawPort: string | undefined): number {
  const port = Number(rawPort ?? '4173');
  if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
    throw new Error('TINY_RESCUE_PREVIEW_PORT must be an integer from 1024 through 65535.');
  }
  return port;
}
