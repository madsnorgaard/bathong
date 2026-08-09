import * as migration_20260730_223102_initial from './20260730_223102_initial';
import * as migration_20260808_211146_phase1_rsvps_people_settings from './20260808_211146_phase1_rsvps_people_settings';
import * as migration_20260809_101622_phase2_drop_flat_sequence from './20260809_101622_phase2_drop_flat_sequence';
import * as migration_20260809_101633_phase2_essay_blocks from './20260809_101633_phase2_essay_blocks';
import * as migration_20260809_102630_phase2_member_number from './20260809_102630_phase2_member_number';

export const migrations = [
  {
    up: migration_20260730_223102_initial.up,
    down: migration_20260730_223102_initial.down,
    name: '20260730_223102_initial',
  },
  {
    up: migration_20260808_211146_phase1_rsvps_people_settings.up,
    down: migration_20260808_211146_phase1_rsvps_people_settings.down,
    name: '20260808_211146_phase1_rsvps_people_settings',
  },
  {
    up: migration_20260809_101622_phase2_drop_flat_sequence.up,
    down: migration_20260809_101622_phase2_drop_flat_sequence.down,
    name: '20260809_101622_phase2_drop_flat_sequence',
  },
  {
    up: migration_20260809_101633_phase2_essay_blocks.up,
    down: migration_20260809_101633_phase2_essay_blocks.down,
    name: '20260809_101633_phase2_essay_blocks',
  },
  {
    up: migration_20260809_102630_phase2_member_number.up,
    down: migration_20260809_102630_phase2_member_number.down,
    name: '20260809_102630_phase2_member_number'
  },
];
