// SJG-ASTRO-13 - MingJing Relationship HePan output validator tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import { validateMirrorOutput } from '../src/contracts/mirror-output-validator.ts';
import { validMingjingRelationshipOutput } from './_fixtures.mjs';

test('valid mingjing relationship hepan output passes', () => {
  const result = validateMirrorOutput(validMingjingRelationshipOutput());
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('mingjing relationship hepan rejects empty timing_windows', () => {
  const result = validateMirrorOutput(validMingjingRelationshipOutput({ timing_windows: [] }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_mingjing_relationship_timing_invalid');
  }
});

test('mingjing relationship hepan rejects timing window without drivers', () => {
  const output = validMingjingRelationshipOutput();
  const result = validateMirrorOutput({
    ...output,
    timing_windows: [{ ...output.timing_windows[0], driver_refs: [] }],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_mingjing_relationship_timing_window_invalid');
  }
});

test('mingjing relationship hepan rejects empty timing window driver ref', () => {
  const output = validMingjingRelationshipOutput();
  const result = validateMirrorOutput({
    ...output,
    timing_windows: [{ ...output.timing_windows[0], driver_refs: [''] }],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_mingjing_relationship_timing_window_invalid');
  }
});

test('mingjing relationship hepan rejects forbidden match_score field', () => {
  const result = validateMirrorOutput(validMingjingRelationshipOutput({ match_score: 88 }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_forbidden_field_present');
  }
});

test('mingjing relationship hepan rejects stale timing field', () => {
  const result = validateMirrorOutput(
    validMingjingRelationshipOutput({ timing: { anchor_year: 2026, windows: [] } }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_forbidden_field_present');
  }
});

test('mingjing relationship hepan rejects forbidden trend_curve field', () => {
  const result = validateMirrorOutput(validMingjingRelationshipOutput({ trend_curve: [] }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_forbidden_field_present');
  }
});

test('mingjing relationship hepan rejects unadmitted root field', () => {
  const result = validateMirrorOutput(validMingjingRelationshipOutput({ unadmitted_payload: {} }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_forbidden_field_present');
  }
});

test('mingjing relationship hepan rejects bad relationship subject ref', () => {
  const output = validMingjingRelationshipOutput();
  const result = validateMirrorOutput({
    ...output,
    relationship_subject: {
      ...output.relationship_subject,
      related_person_ref: 'self',
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_mingjing_relationship_subject_invalid');
  }
});

test('mingjing relationship hepan rejects extra relationship subject field', () => {
  const output = validMingjingRelationshipOutput();
  const result = validateMirrorOutput({
    ...output,
    relationship_subject: {
      ...output.relationship_subject,
      unadmitted: 'x',
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_mingjing_relationship_subject_invalid');
  }
});

test('mingjing relationship hepan rejects extra related person ref field', () => {
  const output = validMingjingRelationshipOutput();
  const result = validateMirrorOutput({
    ...output,
    relationship_subject: {
      ...output.relationship_subject,
      related_person_ref: {
        ...output.relationship_subject.related_person_ref,
        unadmitted: 'x',
      },
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_mingjing_relationship_subject_invalid');
  }
});

test('mingjing relationship hepan rejects extra structure field', () => {
  const output = validMingjingRelationshipOutput();
  const result = validateMirrorOutput({
    ...output,
    structure: { ...output.structure, unadmitted: 'x' },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_mingjing_relationship_structure_invalid');
  }
});

test('mingjing relationship hepan rejects extra timing window field', () => {
  const output = validMingjingRelationshipOutput();
  const result = validateMirrorOutput({
    ...output,
    timing_windows: [{ ...output.timing_windows[0], unadmitted: 'x' }],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_mingjing_relationship_timing_window_invalid');
  }
});

test('mingjing relationship hepan rejects extra practice field', () => {
  const output = validMingjingRelationshipOutput();
  const result = validateMirrorOutput({
    ...output,
    practice: { ...output.practice, unadmitted: 'x' },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_mingjing_relationship_practice_invalid');
  }
});

test('mingjing relationship hepan rejects extra citation field', () => {
  const result = validateMirrorOutput(
    validMingjingRelationshipOutput({
      citations: [
        {
          method: 'bazi_ziping_v1',
          reference: 'mingjing.relationship_hepan.v1',
          unadmitted: 'x',
        },
      ],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_citation_method_invalid');
  }
});

test('mingjing relationship hepan rejects missing practice field', () => {
  const output = validMingjingRelationshipOutput();
  const practice = { ...output.practice };
  delete practice.repair;
  const result = validateMirrorOutput({ ...output, practice });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_mingjing_relationship_practice_invalid');
  }
});
