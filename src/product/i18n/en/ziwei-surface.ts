import type { ZiweiSurfaceCopy } from '../schema/ziwei-surface.ts';

export const EN_ZIWEI_SURFACE_COPY: ZiweiSurfaceCopy = {
  route: {
    personaMark: 'Self', personaTitle: 'My natal chart', personaSubtitle: 'Ziwei natal chart', chartTitle: 'Ziwei chart', chartHint: 'Select a palace to view its stars', centralEyebrow: 'ZIWEI · SANHE', emptyPalace: 'Empty palace', minorStars: 'Supporting stars', majorStars: 'Major stars', palaceDetailEyebrow: 'PALACE DETAIL',
    ageLabel: 'Decadal range', stemBranchLabel: 'Ganzhi', sihuaLabel: 'Four transformations', interpretationTitle: 'Palace interpretation', decadeTitle: 'Decadal guidance', decadeEmpty: 'Generate a reading to see this decadal range’s theme and suggestions.', soulRole: 'Life palace', bodyRole: 'Body palace', selectedRole: 'Selected',
    basis: { soulPalace: 'Life palace', bodyPalace: 'Body palace', fiveElements: 'Five-element class', soulStar: 'Life ruler', bodyStar: 'Body ruler', palaces: 'Palaces' },
  },
  defaultPalaceDomain: { tagline: 'Life direction · relationships', scope: 'This palace frames your natural responses, investment, and relationships in this area of life.', boundary: 'It suggests a long-term theme rather than a certain event or fixed judgment.' },
  palaceDomains: {
    命宫: { tagline: 'Self · life direction', scope: 'The Life palace frames your natal tendencies, decision habits, and how you approach your life direction.', boundary: 'It suggests how you may initiate life questions rather than assigning a fixed personality label.' },
    兄弟: { tagline: 'Peers · collaboration', scope: 'The Siblings palace frames siblings, peers, support, and competition among equals.', boundary: 'It suggests a pattern of peer relationships rather than deciding who will help or hinder you.' },
    夫妻: { tagline: 'Intimacy · commitment', scope: 'The Partners palace frames intimate relationships, long-term partnerships, deep collaboration, and commitment.', boundary: 'It suggests relationship questions to explore rather than a compatibility score or marriage prediction.' },
    子女: { tagline: 'Next generation · creative work', scope: 'The Children palace frames children, younger people, students, and the continuation of creative work, including care responsibilities.', boundary: 'It suggests themes of care and continuity rather than a number of children or certain events.' },
    财帛: { tagline: 'Money · resource security', scope: 'The Wealth palace frames income, resource habits, security, and exchange.', boundary: 'It suggests how you manage resources and security rather than predicting a financial amount.' },
    疾厄: { tagline: 'Wellbeing · stress rhythm', scope: 'The Wellbeing palace frames physical rhythm, stress, recovery, and how you care for yourself.', boundary: 'It suggests questions about rhythm and stress management rather than a medical diagnosis.' },
    迁移: { tagline: 'Outside world · movement', scope: 'The Travel palace frames changes of environment, movement, and opportunities outside familiar settings.', boundary: 'It suggests how you respond to external settings rather than promising a particular journey or opportunity.' },
    仆役: { tagline: 'Networks · working together', scope: 'The Associates palace frames colleagues, networks, and how you collaborate and share support.', boundary: 'It suggests patterns to observe rather than deciding another person’s intentions or loyalty.' },
    官禄: { tagline: 'Work · long-term contribution', scope: 'The Career palace frames work, responsibility, expertise, and your ways of contributing over time.', boundary: 'It suggests a direction to explore rather than promising a title, promotion, or fixed career.' },
    田宅: { tagline: 'Home · belonging', scope: 'The Home palace frames living space, family resources, stability, and belonging.', boundary: 'It suggests how you build a base rather than predicting property ownership or a specific move.' },
    福德: { tagline: 'Inner life · recovery', scope: 'The Inner Life palace frames meaning, rest, enjoyment, and how you restore your resources.', boundary: 'It suggests inner themes to observe rather than ranking happiness or moral worth.' },
    父母: { tagline: 'Origins · support and authority', scope: 'The Parents palace frames parents, elders, sources of support, and your relationship with authority.', boundary: 'It suggests questions about support and boundaries rather than judging a parent or predicting their fate.' },
  },
};
