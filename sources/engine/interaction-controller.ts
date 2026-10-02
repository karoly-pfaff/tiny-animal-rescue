export type InteractionController = Readonly<{
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  dispose: () => void;
}>;
