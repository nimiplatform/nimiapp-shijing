import type { YueJingMonthLanguageCopy } from '../schema/yuejing-language.ts';

export const EN_YUEJING_LANGUAGE_COPY: YueJingMonthLanguageCopy = {
  tendency: {
    supportive: {
      tagline: 'Progress steadily before changing direction', body: 'Use the next 30 days to advance considered plans without rushing to change direction.', mainline: 'More supportive windows offer room to move confirmed plans forward.',
      best_for: ['Progress', 'Organize', 'Review', 'Build a rhythm'], avoid_tags: ['Impulsive decisions', 'Sudden changes', 'Too many new commitments'],
      suitable: 'Advance actions that need expression, resources, a meeting, or a concrete submission.', unsuitable: 'Do not pack every key action into one day. Leave room around observation and constrained dates.', review: 'Which actions received real feedback, and which only felt easy in the moment?',
      avoid: ['Packing every key action into one date', 'Escalating commitments after one easy step', 'Removing buffers around observation and constrained dates'],
    },
    steady: {
      tagline: 'Small steps, consistent progress', body: 'The window favors a steady rhythm and small steps toward observable results.', mainline: 'Use consistent steps to build results you can verify.',
      best_for: ['Maintain a rhythm', 'Routine progress', 'Improve details', 'Light review'], avoid_tags: ['Sudden escalation', 'Short sprints', 'Premature decisions'],
      suitable: 'Maintain recurring actions, review existing arrangements, and make modest progress.', unsuitable: 'Do not suddenly increase commitments after one supportive date. Keep the pace sustainable.', review: 'Which reliable actions should you retain, and which unnecessary demands can you remove?',
      avoid: ['Sudden escalation after one supportive date', 'Replacing consistency with a short sprint', 'Forcing a major decision before the rhythm settles'],
    },
    watch: {
      tagline: 'Observe first, then decide', body: 'Calibrate the pace by checking feedback and details before deciding to accelerate.', mainline: 'Check feedback before choosing a faster pace.',
      best_for: ['Observe feedback', 'Check risks', 'Fill information gaps', 'Slow down judgment'], avoid_tags: ['Rushed conclusions', 'Pressuring for results', 'Overweighting one signal'],
      suitable: 'Check uncertainties in communication, commitments, energy, and resources.', unsuitable: 'Do not turn one response into a lasting judgment or pressure for an immediate result.', review: 'Which signals repeated, and which reflected a single day’s mood or circumstances?',
      avoid: ['Rushed conclusions or major commitments', 'Treating one response as a lasting pattern', 'Assigning a fixed meaning to uncertain feedback'],
    },
    turning: {
      tagline: 'Notice changes and leave room to adjust', body: 'Signs of a turn invite a review of the old rhythm. Leave room for adjustment.', mainline: 'New signals may call for reviewing an older approach.',
      best_for: ['Review direction', 'Adjust strategy', 'Record changes', 'Rearrange the rhythm'], avoid_tags: ['Repeating an old approach', 'Rushed commitments', 'Ignoring changes'],
      suitable: 'Record changes and distinguish opportunities, shifting boundaries, and changes of pace.', unsuitable: 'Do not force the old approach onto new feedback. Leave room to adjust.', review: 'What changed in your choices, others’ responses, or outside conditions around the turning dates?',
      avoid: ['Forcing an old rhythm onto a new situation', 'Committing before a turn is clear', 'Ignoring repeated change signals'],
    },
    blocked: {
      tagline: 'Stabilize, review, and preserve room', body: 'Constraints are more prominent. Review demands, reduce avoidable losses, and preserve options.', mainline: 'Prioritize review, conservation, and room to respond.',
      best_for: ['Limit losses', 'Review', 'Reduce strain', 'Preserve options'], avoid_tags: ['Direct confrontation', 'Impulsive commitments', 'High strain'],
      suitable: 'Reduce demanding activities, review important materials, and postpone unnecessary commitments.', unsuitable: 'Avoid confrontation, pressure, impulsive promises, or investing too many resources at once.', review: 'Which constraints come from outside, and which demands could you reduce in advance?',
      avoid: ['Forcing progress through resistance', 'Committing too many resources at the hardest point', 'Ignoring physical and emotional strain'],
    },
  },
  phases: [
    { name: 'Observe changes', theme: 'Observe and record the rhythm', suitable: 'Record changes, gather information, organize ideas', unsuitable: 'Rushed conclusions or key decisions' },
    { name: 'Express and confirm', theme: 'Clarify shared understanding and direction', suitable: 'Communicate, check feedback, and coordinate', unsuitable: 'Impulsive statements, pressure, or ignoring feedback' },
    { name: 'Steady execution', theme: 'Maintain execution and coordination', suitable: 'Progress step by step with clear responsibilities', unsuitable: 'Frequent changes or sudden redirection' },
    { name: 'Close and review', theme: 'Review results and useful adjustments', suitable: 'Review, refine, and finish existing work', unsuitable: 'Major new commitments or abrupt changes' },
  ],
  brief: { push: 'Communicate, submit, and implement confirmed plans.', slow: 'Observe feedback before drawing conclusions.', turn: 'Review direction and adjust your approach.' },
  genericConcern: {
    supportive: 'Move a considered action toward a point you can verify.', steady: 'Maintain the existing rhythm without creating unnecessary change.', watch: 'Observe feedback and details before accelerating.', turning: 'Record new signals and review how the older approach fits.', blocked: 'Conserve, review, and leave room instead of forcing progress.',
  },
  concernByLabel: {
    姻缘: { supportive: 'Arrange real contact, clarify expectations, and check boundaries.', steady: 'Maintain regular, low-pressure interaction.', watch: 'Observe the other person’s responses and your feelings before reaching a conclusion.', turning: 'Notice changes in roles, distance, and expression.', blocked: 'Reduce pressure and clarify your own boundaries and expectations.' },
    事业: { supportive: 'Coordinate, submit a considered proposal, and clarify useful resources.', steady: 'Maintain established work and longer-term foundations.', watch: 'Check communication, schedules, and outside dependencies.', turning: 'Notice changes in a role or collaboration and allow room to adjust.', blocked: 'Reduce confrontation, review materials, and wait for constraints to ease.' },
    身体: { supportive: 'Restore regular routines and gentle activity at a sustainable pace.', steady: 'Maintain routines that already work without adding unnecessary strain.', watch: 'Observe sleep, meals, and energy, and reduce avoidable strain.', turning: 'Notice changes in wellbeing and review activity, rest, or planned checks.', blocked: 'Prioritize rest and avoid pushing through exhaustion.' },
    财运: { supportive: 'Review cash flow, considered payments, and resource arrangements.', steady: 'Maintain budget discipline and established reserves.', watch: 'Review agreements, prices, impulsive spending, and uncertain commitments.', turning: 'Notice changes in income sources or resource sharing.', blocked: 'Treat large commitments cautiously and leave time for review.' },
    学业: { supportive: 'Advance review, submissions, or discussions toward observable work.', steady: 'Maintain regular study and continuous accumulation.', watch: 'Check gaps in understanding and available information before adding more work.', turning: 'Notice changes in direction or feedback and adjust the learning approach.', blocked: 'Reduce last-minute pressure and address foundational gaps first.' },
    家人: { supportive: 'Arrange a concrete conversation or act of care.', steady: 'Maintain reliable presence and shared routines.', watch: 'Listen to feedback and check patience and boundaries before responding.', turning: 'Notice changes in shared responsibilities and expectations.', blocked: 'Avoid pressure, old arguments, or making too many decisions for others.' },
  },
  genericAction: {
    axis: 'Rhythm', summary: 'Arrange the key action for this concern in a suitable window.',
    actions: [{ source: 'primary', label: 'Advance one important action' }, { source: 'caution', label: 'Observe feedback before deciding' }, { source: 'turning', label: 'Review whether the pace needs adjustment' }],
    reminders: ['Name the main action', 'Reduce switching', 'Observe feedback'],
  },
  actionByLabel: {
    姻缘: {
      axis: 'Communication', summary: 'Use real, low-pressure communication to understand the relationship.',
      actions: [{ source: 'supportive', label: 'Arrange contact or a deeper conversation' }, { source: 'caution', label: 'Observe responses before deciding' }, { source: 'turning', label: 'Review changes in roles or expression' }], reminders: ['Real communication', 'Reduce pressure', 'Keep boundaries'],
    },
    事业: {
      axis: 'Progress', summary: 'Advance confirmed work without abruptly changing direction.',
      actions: [{ source: 'after_opening', label: 'Continue confirmed work' }, { source: 'middle_watch', label: 'Leave time before a key decision' }, { source: 'middle_turning', label: 'Review whether the direction needs adjustment' }], reminders: ['Maintain a rhythm', 'Reduce unnecessary switching', 'Focus on key results'],
    },
    身体: {
      axis: 'Balance', summary: 'Restore a sustainable rhythm of rest and activity.',
      actions: [{ source: 'first_supportive', label: 'Restore regular routines and gentle activity' }, { source: 'middle_watch', label: 'Avoid sudden increases in strain' }, { source: 'middle_turning', label: 'Observe sleep, meals, and fatigue' }], reminders: ['Regular routines', 'Moderate activity', 'Notice recovery and energy'],
    },
    财运: {
      axis: 'Stability', summary: 'Arrange cash flow and significant resource decisions with care.',
      actions: [{ source: 'supportive', label: 'Organize considered payments and resources' }, { source: 'caution', label: 'Review agreements, prices, and impulsive spending' }, { source: 'turning', label: 'Review changes in income or resource sharing' }], reminders: ['Cash flow first', 'Review commitments', 'Avoid impulsive spending'],
    },
    学业: {
      axis: 'Accumulation', summary: 'Turn regular study into work you can review.',
      actions: [{ source: 'supportive', label: 'Advance review, submissions, or discussions' }, { source: 'caution', label: 'Fill understanding gaps before adding work' }, { source: 'turning', label: 'Review direction, feedback, or research emphasis' }], reminders: ['Continuous practice', 'Check gaps', 'Review concrete work'],
    },
    家人: {
      axis: 'Presence', summary: 'Maintain care, understanding, and trust through regular contact.',
      actions: [{ source: 'supportive', label: 'Arrange a conversation or act of care' }, { source: 'caution', label: 'Listen fully before responding' }, { source: 'turning', label: 'Review shared responsibilities or interaction patterns' }], reminders: ['Reliable presence', 'Reduce pressure', 'Clarify expectations'],
    },
  },
  date: (month, day) => `${month}/${day}`,
  labels: {
    phase: 'Time phase', phaseNumber: (n) => `Phase ${n}`, currentWindow: 'Current window', mainline: '30-day main thread',
    push: 'Move forward', watch: 'Observe first', turn: 'Possible turn', pushWindow: 'Progress window', watchWindow: 'Observation window', turnWindow: 'Turning-signal window',
    pushCaution: 'Do not escalate after one supportive date. Leave a point for checking results.', watchCaution: 'Wait for repeated signals rather than pressing for an immediate conclusion.', turnCaution: 'Keep room to adjust when new feedback changes the picture.', missingConcern: 'Generate this concern’s window before including it in the monthly interpretation.',
    blockedRange: (text, range) => `${text} Constraints are concentrated in ${range}; avoid forcing progress on those dates.`,
    rangeList: (ranges, hasMore) => `${ranges.join(', ')}${hasMore ? ' and others' : ''}`,
    basis: (range, days, tags, cells) => [`${range}: ${days}/30 dates generated across ${tags} active concerns.`, `The main thread aggregates ${cells} daily concern results without scores, rankings, or trend curves.`, 'Saved memories and plans enter the interpretation only through citations or dates in the window; plans are never rewritten as events that happened.', 'Calculation evidence stays in the generation and daily evidence views. This page presents practical rhythm.'],
  },
};
