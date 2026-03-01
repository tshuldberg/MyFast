export type { Database } from './database';
export { ALL_TABLES } from './schema';
export { seedProtocols, seedSettings, seedNotificationConfig } from './seed';
export { migrate, initDatabase, MIGRATIONS } from './migrations';
export type { Migration } from './migrations';
export {
  startFast,
  endFast,
  getActiveFast,
  getFast,
  listFasts,
  countFasts,
  deleteFast,
} from './fasts';
export type { ListFastsOptions } from './fasts';
export {
  getWaterIntake,
  incrementWaterIntake,
  setWaterTarget,
  setWaterIntakeCount,
  resetWaterIntake,
} from './water';
export {
  getNotificationPreferences,
  setNotificationPreference,
} from './notifications';
export {
  createGoal,
  listGoals,
  getGoal,
  archiveGoal,
  deleteGoal,
  upsertGoal,
  getGoalProgress,
  refreshGoalProgress,
  listGoalProgress,
} from './goals';
