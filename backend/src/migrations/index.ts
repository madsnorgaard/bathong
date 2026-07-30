import * as migration_20260730_223102_initial from './20260730_223102_initial';

export const migrations = [
  {
    up: migration_20260730_223102_initial.up,
    down: migration_20260730_223102_initial.down,
    name: '20260730_223102_initial'
  },
];
