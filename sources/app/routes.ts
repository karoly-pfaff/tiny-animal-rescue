const routeIds = [
  'start',
  'map',
  'mission',
  'celebration',
  'shelter',
  'parent-settings',
] as const;

export type RouteId = (typeof routeIds)[number];

export type RouteDefinition = Readonly<{
  id: RouteId;
  path: `/${string}`;
  titleKey: `screen.${RouteId}.title`;
}>;

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
