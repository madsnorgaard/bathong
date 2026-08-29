import * as migration_20260730_223102_initial from './20260730_223102_initial';
import * as migration_20260808_211146_phase1_rsvps_people_settings from './20260808_211146_phase1_rsvps_people_settings';
import * as migration_20260809_101622_phase2_drop_flat_sequence from './20260809_101622_phase2_drop_flat_sequence';
import * as migration_20260809_101633_phase2_essay_blocks from './20260809_101633_phase2_essay_blocks';
import * as migration_20260809_102630_phase2_member_number from './20260809_102630_phase2_member_number';
import * as migration_20260809_134609_phase2_anonymous_submissions from './20260809_134609_phase2_anonymous_submissions';
import * as migration_20260809_140000_phase2_photocall_status_values from './20260809_140000_phase2_photocall_status_values';
import * as migration_20260814_090000_phase3_walk_route_geo from './20260814_090000_phase3_walk_route_geo';
import * as migration_20260821_090000_phase4_frame_top_pick from './20260821_090000_phase4_frame_top_pick';
import * as migration_20260829_121228_phase5_walk_links_albums from './20260829_121228_phase5_walk_links_albums';
import * as migration_20260829_124727_phase5_membership_plan from './20260829_124727_phase5_membership_plan';
import * as migration_20260829_174237_phase5_card_for_subscribers from './20260829_174237_phase5_card_for_subscribers';

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
    name: '20260809_102630_phase2_member_number',
  },
  {
    up: migration_20260809_134609_phase2_anonymous_submissions.up,
    down: migration_20260809_134609_phase2_anonymous_submissions.down,
    name: '20260809_134609_phase2_anonymous_submissions',
  },
  {
    up: migration_20260809_140000_phase2_photocall_status_values.up,
    down: migration_20260809_140000_phase2_photocall_status_values.down,
    name: '20260809_140000_phase2_photocall_status_values',
  },
  {
    up: migration_20260814_090000_phase3_walk_route_geo.up,
    down: migration_20260814_090000_phase3_walk_route_geo.down,
    name: '20260814_090000_phase3_walk_route_geo',
  },
  {
    up: migration_20260821_090000_phase4_frame_top_pick.up,
    down: migration_20260821_090000_phase4_frame_top_pick.down,
    name: '20260821_090000_phase4_frame_top_pick',
  },
  {
    up: migration_20260829_121228_phase5_walk_links_albums.up,
    down: migration_20260829_121228_phase5_walk_links_albums.down,
    name: '20260829_121228_phase5_walk_links_albums',
  },
  {
    up: migration_20260829_124727_phase5_membership_plan.up,
    down: migration_20260829_124727_phase5_membership_plan.down,
    name: '20260829_124727_phase5_membership_plan',
  },
  {
    up: migration_20260829_174237_phase5_card_for_subscribers.up,
    down: migration_20260829_174237_phase5_card_for_subscribers.down,
    name: '20260829_174237_phase5_card_for_subscribers'
  },
];
