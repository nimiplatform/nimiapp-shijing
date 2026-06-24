export const MINGJING_CORE_FIELDS: readonly string[] = [
  'personality',
  'strengths',
  'long_term_themes',
  'relationship_pattern',
  'career_inclination',
];

export const MINGJING_RELATIONSHIP_STRUCTURE_FIELDS: readonly string[] = [
  'baseline_pattern',
  'attraction_and_support',
  'friction_and_misread',
  'communication_rhythm',
  'boundary_advice',
];

export const MINGJING_RELATIONSHIP_PRACTICE_FIELDS: readonly string[] = [
  'communication',
  'boundary',
  'repair',
];

export const MINGJING_RELATIONSHIP_ROOT_KEYS = new Set<string>([
  'mirror_kind',
  'output_kind',
  'relationship_subject',
  'summary',
  'structure',
  'timing_windows',
  'practice',
  'cited_event_memory_refs',
  'cited_plan_item_refs',
  'citations',
]);

export const MINGJING_RELATIONSHIP_SUBJECT_KEYS = new Set<string>([
  'primary_subject_ref',
  'related_person_ref',
  'anchor_year',
  'basis_time_zone',
]);

export const MINGJING_RELATIONSHIP_PERSON_REF_KEYS = new Set<string>(['kind', 'id']);

export const MINGJING_RELATIONSHIP_STRUCTURE_KEYS = new Set<string>(
  MINGJING_RELATIONSHIP_STRUCTURE_FIELDS,
);

export const MINGJING_RELATIONSHIP_TIMING_WINDOW_KEYS = new Set<string>([
  'start_date',
  'end_date',
  'nature',
  'driver_refs',
  'summary',
]);

export const MINGJING_RELATIONSHIP_PRACTICE_KEYS = new Set<string>(
  MINGJING_RELATIONSHIP_PRACTICE_FIELDS,
);

export const MINGJING_ZIWEI_ROOT_KEYS = new Set<string>([
  'mirror_kind',
  'output_kind',
  'summary',
  'chart_basis',
  'profile',
  'decade_guidance',
  'cited_event_memory_refs',
  'cited_plan_item_refs',
  'citations',
]);

export const MINGJING_ZIWEI_CHART_BASIS_KEYS = new Set<string>([
  'soul_palace_branch',
  'soul_palace_name',
  'body_palace_name',
  'five_elements_class',
  'soul_star',
  'body_star',
  'palace_count',
  'sihua_refs',
]);

export const MINGJING_ZIWEI_PROFILE_FIELDS: readonly string[] = [
  'life_pattern',
  'strengths',
  'long_term_theme',
  'relationship_pattern',
  'career_inclination',
];

export const MINGJING_ZIWEI_PROFILE_KEYS = new Set<string>(
  MINGJING_ZIWEI_PROFILE_FIELDS,
);

export const MINGJING_ZIWEI_DECADE_GUIDANCE_KEYS = new Set<string>([
  'age_range',
  'palace_name',
  'palace_branch',
  'major_stars',
  'theme',
  'strategy',
]);
