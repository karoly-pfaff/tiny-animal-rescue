import { bundledContentRegistry } from '../../sources/content/bundled-content-registry';
import {
  firstRescueReward,
  selectFirstRescueContent,
} from '../../sources/content/first-rescue-content';

export const testContentRegistry = bundledContentRegistry;
export const testFirstRescueContent = selectFirstRescueContent(testContentRegistry);
export const testFirstRescueReward = firstRescueReward(testFirstRescueContent);
