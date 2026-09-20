import type { ScreenId, ScreenTitleKey } from '../i18n/temporary-localization';

type RouteId = ScreenId;

export type RouteDefinition = {
  [Id in RouteId]: Readonly<{
    id: Id;
    path: `/${string}`;
    titleKey: `screen.${Id}.title` & ScreenTitleKey;
  }>;
}[RouteId];

const routes = [
  { id: 'start', path: '/', titleKey: 'screen.start.title' },
  { id: 'map', path: '/map', titleKey: 'screen.map.title' },
  { id: 'mission', path: '/mission', titleKey: 'screen.mission.title' },
  { id: 'celebration', path: '/celebration', titleKey: 'screen.celebration.title' },
  { id: 'shelter', path: '/shelter', titleKey: 'screen.shelter.title' },
  {
    id: 'parent-settings',
    path: '/parent-settings',
    titleKey: 'screen.parent-settings.title',
  },
] as const satisfies readonly RouteDefinition[];

const defaultRoute = routes[0];

export function resolveRoute(path: string): RouteDefinition {
  return routes.find((route) => route.path === path) ?? defaultRoute;
}
