export function npmProcess(arguments_) {
  const npmCli = process.env.npm_execpath;
  if (npmCli === undefined || npmCli.length === 0) {
    throw new Error('This repository command must be launched through npm run.');
  }

  return {
    command: process.execPath,
    arguments: [npmCli, ...arguments_],
  };
}
