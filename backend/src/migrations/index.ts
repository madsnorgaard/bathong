import * as migration_20260730_223102_initial from './20260730_223102_initial';
import * as migration_20260808_211146_phase1_rsvps_people_settings from './20260808_211146_phase1_rsvps_people_settings';

export const migrations = [
  {
    up: migration_20260730_223102_initial.up,
    down: migration_20260730_223102_initial.down,
    name: '20260730_223102_initial',
  },
  {
    up: migration_20260808_211146_phase1_rsvps_people_settings.up,
    down: migration_20260808_211146_phase1_rsvps_people_settings.down,
    name: '20260808_211146_phase1_rsvps_people_settings'
  },
];
