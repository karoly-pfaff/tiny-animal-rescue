import type { ScreenId, ScreenTitleKey } from '../i18n/localization';

type StaticRouteId = Exclude<ScreenId, 'mission'>;

type StaticRouteDefinition = {
  [Id in StaticRouteId]: Readonly<{
    id: Id;
    path: `/${string}`;
    titleKey: `screen.${Id}.title` & ScreenTitleKey;
  }>;
}[StaticRouteId];

type MissionRouteDefinition = Readonly<{
  id: 'mission';
  missionId: string | null;
  path: `/${string}`;
  titleKey: 'screen.mission.title';
}>;

export type RouteDefinition = MissionRouteDefinition | StaticRouteDefinition;

const routes = [
  { id: 'start', path: '/', titleKey: 'screen.start.title' },
  { id: 'map', path: '/map', titleKey: 'screen.map.title' },
  { id: 'celebration', path: '/celebration', titleKey: 'screen.celebration.title' },
  { id: 'shelter', path: '/shelter', titleKey: 'screen.shelter.title' },
  {
    id: 'parent-settings',
    path: '/parent-settings',
    titleKey: 'screen.parent-settings.title',
  },
] as const satisfies readonly StaticRouteDefinition[];

const defaultRoute = routes[0];
const missionRoute = {
  id: 'mission',
  missionId: null,
  path: '/mission',
  titleKey: 'screen.mission.title',
} as const satisfies MissionRouteDefinition;
const missionPathPattern = /^\/mission\/[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function resolveRoute(path: string): RouteDefinition {
  if (path === missionRoute.path) {
    return missionRoute;
  }
  if (missionPathPattern.test(path)) {
    const missionId = path.slice(missionRoute.path.length + 1);
    return { ...missionRoute, missionId, path: missionPath(missionId) };
  }
  return routes.find((route) => route.path === path) ?? defaultRoute;
}

export function missionPath(missionId: string): `/mission/${string}` {
  return `/mission/${missionId}`;
}
