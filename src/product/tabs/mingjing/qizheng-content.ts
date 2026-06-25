// 命镜 · 七政四余 / 果老星宗 — deterministic content tables.
//
// The chart numbers (落宫, 宫势, 黄道度, 宿) are deterministic and come from the
// 七政四余 engine. This module holds the *universal* plain-language knowledge that
// is true for any chart: what each star essentially means, what each palace
// governs, the glossary, and the classical sign-rulership used to read 命主. The
// chart-specific composition (deep readings, hero archetype, 重点格局) lives in
// qizheng-narrative.ts and is built from these tables + each chart's real data.
//
// Like mingjing-narrative.ts this is rule-based and bilingual; it NEVER invents a
// placement or strength. The history-grounded AI 解读 stays a separate on-demand
// layer (MingJingQizhengNatalMirrorOutput).

import type { QizhengSiyuBodyKey } from '../../../domain/algorithm.ts';
import type { UiLanguage } from '../../../domain/settings.ts';

export type QzElement = '木' | '火' | '土' | '金' | '水';
export type QzStrength = '七强' | '次强' | '闲宫';

// 五行 of each body — fixed astrological knowledge, not in the chart payload.
// 七政: 日→火, 月→水, 水星→水, 金星→金, 火星→火, 木星→木, 土星→土.
// 四余: 罗喉→火, 计都→土, 月孛→水, 紫气→木.
export const BODY_ELEMENT: Record<QizhengSiyuBodyKey, QzElement> = {
  taiyang: '火',
  taiyin: '水',
  chenxing: '水',
  taibai: '金',
  yinghuo: '火',
  suixing: '木',
  zhenxing: '土',
  luohou: '火',
  jidu: '土',
  ziqi: '木',
  yuebei: '水',
};

// Element accent colours (match the offline reference palette).
export const EL_COLOR: Record<QzElement, string> = {
  木: '#5d9c69',
  火: '#d06a59',
  土: '#c0902e',
  金: '#8f9b53',
  水: '#5a8ec0',
};

// Display order: 七政 (by classical order) then 四余.
export const BODY_ORDER: readonly QizhengSiyuBodyKey[] = [
  'taiyang',
  'taiyin',
  'chenxing',
  'taibai',
  'yinghuo',
  'suixing',
  'zhenxing',
  'luohou',
  'jidu',
  'ziqi',
  'yuebei',
];

const ZODIAC_SIGNS = [
  '白羊',
  '金牛',
  '双子',
  '巨蟹',
  '狮子',
  '处女',
  '天秤',
  '天蝎',
  '射手',
  '摩羯',
  '水瓶',
  '双鱼',
] as const;

// Classical (七政) rulership of the twelve signs — no outer planets. Used to read
// the 宫主星 of a palace from the sign on its cusp, and 命主 from the ascendant.
const SIGN_RULER: Record<string, QizhengSiyuBodyKey> = {
  白羊: 'yinghuo',
  金牛: 'taibai',
  双子: 'chenxing',
  巨蟹: 'taiyin',
  狮子: 'taiyang',
  处女: 'chenxing',
  天秤: 'taibai',
  天蝎: 'yinghuo',
  射手: 'suixing',
  摩羯: 'zhenxing',
  水瓶: 'zhenxing',
  双鱼: 'suixing',
};

function normalizeDegrees(value: number): number {
  const out = value % 360;
  return out < 0 ? out + 360 : out;
}

export function signOfLongitude(longitude: number): string {
  return ZODIAC_SIGNS[Math.floor(normalizeDegrees(longitude) / 30)] ?? ZODIAC_SIGNS[0];
}

// 宫主星 of the palace whose cusp sits at `cuspLongitude`. With cusp at the
// ascendant this yields 命主.
export function rulerKeyForCusp(cuspLongitude: number): QizhengSiyuBodyKey {
  return SIGN_RULER[signOfLongitude(cuspLongitude)] ?? 'taiyang';
}

export interface QizhengContent {
  // '日 · 太阳' / 'Sun · solar self', etc.
  readonly bodyPlanet: Record<QizhengSiyuBodyKey, string>;
  // One-line essence — universal, true for any chart.
  readonly bodyEssence: Record<QizhengSiyuBodyKey, string>;
  // Full domain blurb shown under a palace heading.
  readonly palaceDomain: Record<string, string>;
  // Short noun phrase for composing sentences ("掌管「内心与精神世界」的福德宫").
  readonly palaceTheme: Record<string, string>;
  // Hover/click glossary: term text → plain-language definition.
  readonly gloss: Record<string, string>;
  // Hero archetype keyed by the palace 命主 falls in.
  readonly archetype: Record<string, { readonly title: string; readonly oneLiner: string }>;
  // Localised strength chip label for a raw position_class.
  readonly strengthLabel: Record<QzStrength, string>;
  readonly elementWord: Record<QzElement, string>;
}

const ZH: QizhengContent = {
  bodyPlanet: {
    taiyang: '日 · 太阳',
    taiyin: '月 · 太阴',
    chenxing: '水星',
    taibai: '金星',
    yinghuo: '火星',
    suixing: '木星',
    zhenxing: '土星',
    luohou: '四余 · 虚星',
    jidu: '四余 · 虚星',
    ziqi: '四余 · 虚星',
    yuebei: '四余 · 虚星',
  },
  bodyEssence: {
    taiyang: '主体之光、外在身份与事业舞台，也代表父亲。',
    taiyin: '情绪与内心、母亲，以及身体的安定感。',
    chenxing: '思维、表达、学习与沟通的那根线。',
    taibai: '情感、审美、人缘与钱财的甜味。',
    yinghuo: '行动力、冲劲、脾气与争斗心。',
    suixing: '扩展、机会、信念与贵人的来路。',
    zhenxing: '责任、积累、根基与耐力的硬底。',
    luohou: '放大与执念，被无形牵引去做的事。',
    jidu: '断舍与突变，旧的东西被悄悄收走。',
    ziqi: '吉庆、格调，化解凶险的那点好运余光。',
    yuebei: '潜意识、隐忧，藏在心底的暗流。',
  },
  palaceDomain: {
    命宫: '你是谁——性格底色与人生的总开关',
    财帛: '钱与资源——怎么挣、怎么守',
    兄弟: '手足、同辈与协作关系',
    田宅: '家与不动产——根基、住所、安全感',
    男女: '子女、创作与付出传承',
    奴仆: '下属、帮手与可调动的人脉',
    夫妻: '伴侣与亲密关系',
    疾厄: '身体、压力与要扛的劳累',
    迁移: '远行、变动与出门在外的际遇',
    官禄: '事业、职位与社会成就',
    福德: '内心、福气、精神世界与享受',
    相貌: '外形、气质与给人的第一印象',
  },
  palaceTheme: {
    命宫: '性格底色与人生方向',
    财帛: '钱财与资源',
    兄弟: '手足与同辈',
    田宅: '家、根基与不动产',
    男女: '子女与创作',
    奴仆: '人手与人脉',
    夫妻: '伴侣与亲密关系',
    疾厄: '身体与压力',
    迁移: '远行与变动',
    官禄: '事业与社会成就',
    福德: '内心与精神世界',
    相貌: '形象与气质',
  },
  gloss: {
    七政: '日、月，加上金木水火土五颗行星，共七颗真实可见的星——古人叫它们「七政」，是星盘的主角。',
    四余: '罗喉、计都、月孛、紫气，四个看不见的「虚星」（由月亮轨道的交点、远地点等推算出来），用来补充七政看不到的隐线索。',
    命主: '代表「你本人」的那颗星，由命宫所在的位置决定。它的状态，往往是看盘的第一落点。',
    身主: '代表「身体与现实生活」的星，和命主一内一外，合看更完整。',
    空宫: '这个宫里没有星曜进驻。不代表这块人生空白，而是要去看它的「宫主星」落在哪、状态如何，来间接判断。',
    宫势: '一颗星落在某个位置上有没有「力气」。七强最得位、能尽情发挥；次强中上、稳定可用；闲宫则不得位，作用偏淡甚至打折。',
    宿: '二十八宿——把整条黄道分成 28 段的中国古老坐标系，比十二宫更精细，用来定位星曜到底在哪一格。',
    黄道度: '星在黄道（太阳一年走过的轨道）上的精确位置，用 0°–360° 表示。',
    上升度: '你出生那一刻，正从东方地平线升起的度数。它定下命宫的起点，是整张盘的地基。',
    昼夜盘: '看你出生在白天还是夜里。夜盘里，月亮、金星等「夜的星」更得力。',
    宫制: '把一圈黄道切成十二宫的方法。这里用「上升度起十二等宫」：从上升点开始，每 30° 一宫，均匀切分。',
  },
  archetype: {
    命宫: { title: '守心立命', oneLiner: '命主就坐在命宫——你是谁、想成为谁，自己说了算；自我意识清楚，认准方向就照着走。' },
    财帛: { title: '务实生财', oneLiner: '命主落在财帛——你对资源、价值与回报天生敏感，务实、会经营，安全感常和「攒下了什么」绑在一起。' },
    兄弟: { title: '以群为伴', oneLiner: '命主落在兄弟——同辈、伙伴与协作是你的人生底色，你在「我们」里找到自己的位置。' },
    田宅: { title: '厚土养根', oneLiner: '命主落在田宅——你重根基、念家、求安稳，是把日子一寸寸夯实、晚成而踏实的一型。' },
    男女: { title: '育苗传薪', oneLiner: '命主落在男女——创作、子女与付出传承是你的主场，你在「养出点什么」里获得意义。' },
    奴仆: { title: '借力成事', oneLiner: '命主落在奴仆——你擅长带人、调动资源、借众人之力把事做成，人脉就是你的舞台。' },
    夫妻: { title: '以情为镜', oneLiner: '命主落在夫妻——亲密关系是你照见自己的镜子，你在一对一的深度联结里活得最完整。' },
    疾厄: { title: '涉艰历练', oneLiner: '命主落在疾厄——身心、压力与要扛的事是你的修行场，熬过去就上一个台阶。' },
    迁移: { title: '行远求新', oneLiner: '命主落在迁移——你属于远方与变动，在路上、在新环境里最能打开自己。' },
    官禄: { title: '立身扬名', oneLiner: '命主落在官禄——事业、位置与社会成就是你的主线，你天生想做成点被看见的事。' },
    福德: { title: '敛光向内', oneLiner: '你的光不爱外露，更多收在心里——重意义、爱琢磨、向内求，是靠内功与长期积累取胜的一型。' },
    相貌: { title: '形神相照', oneLiner: '命主落在相貌——气质、形象与第一印象是你的资源，你在「被如何看见」里塑造自己。' },
  },
  strengthLabel: { 七强: '七强', 次强: '次强', 闲宫: '闲宫' },
  elementWord: { 木: '木', 火: '火', 土: '土', 金: '金', 水: '水' },
};

const EN: QizhengContent = {
  bodyPlanet: {
    taiyang: 'Sun',
    taiyin: 'Moon',
    chenxing: 'Mercury',
    taibai: 'Venus',
    yinghuo: 'Mars',
    suixing: 'Jupiter',
    zhenxing: 'Saturn',
    luohou: 'SiYu · shadow point',
    jidu: 'SiYu · shadow point',
    ziqi: 'SiYu · shadow point',
    yuebei: 'SiYu · shadow point',
  },
  bodyEssence: {
    taiyang: 'Your core light — outward identity, the stage you stand on, and the father.',
    taiyin: 'Feelings and inner life, the mother, and the body’s baseline ease.',
    chenxing: 'The thread of thinking, speaking, learning and connecting.',
    taibai: 'The sweetness of feeling, taste, rapport and money.',
    yinghuo: 'Drive, push, temper and the will to contend.',
    suixing: 'Expansion, opportunity, belief and where benefactors come from.',
    zhenxing: 'Responsibility, accumulation, foundations and the hard floor of endurance.',
    luohou: 'Amplification and fixation — what some unseen pull keeps you doing.',
    jidu: 'Cutting away and sudden change — old things quietly taken back.',
    ziqi: 'Auspice and grace — the leftover luck that softens hard turns.',
    yuebei: 'The subconscious and quiet worry — undercurrents kept at the bottom of the heart.',
  },
  palaceDomain: {
    命宫: 'Who you are — your core temperament and life’s master switch',
    财帛: 'Money & resources — how you earn and how you keep',
    兄弟: 'Siblings, peers and working alongside others',
    田宅: 'Home & property — roots, dwelling, the sense of safety',
    男女: 'Children, creation and what you pass on',
    奴仆: 'Subordinates, helpers and the network you can move',
    夫妻: 'Partner and intimate relationship',
    疾厄: 'Body, pressure and the burdens you carry',
    迁移: 'Travel, change and what you meet away from home',
    官禄: 'Career, position and social standing',
    福德: 'Inner life, fortune, the world of spirit and enjoyment',
    相貌: 'Appearance, bearing and the first impression you give',
  },
  palaceTheme: {
    命宫: 'temperament and life direction',
    财帛: 'money and resources',
    兄弟: 'siblings and peers',
    田宅: 'home, roots and property',
    男女: 'children and creation',
    奴仆: 'helpers and network',
    夫妻: 'partner and intimacy',
    疾厄: 'body and pressure',
    迁移: 'travel and change',
    官禄: 'career and standing',
    福德: 'inner and spiritual life',
    相貌: 'image and bearing',
  },
  gloss: {
    七政: 'The Sun and Moon plus the five visible planets — seven real, visible bodies the ancients called the “seven governors”, the leads of the chart.',
    四余: 'LuoHou, JiDu, YueBei and ZiQi — four invisible “shadow stars” derived from the Moon’s nodes and apogee, filling in clues the seven governors can’t show.',
    命主: 'The star that stands for “you”, set by where the 命宫 falls. Its condition is usually the first thing to read.',
    身主: 'The star for “body and material life” — paired with 命主 as inner and outer, read together for a fuller picture.',
    空宫: 'No star sits in this palace. It doesn’t mean that part of life is blank — read it through where its ruling star falls and how that star fares.',
    宫势: 'How much “strength” a star has where it sits. 七强 is best placed and free to act; 次强 is solid and usable; 闲宫 is off-duty, weaker, even discounted.',
    宿: 'The twenty-eight mansions — an old Chinese coordinate that cuts the ecliptic into 28 finer slices, locating exactly which cell a star sits in.',
    黄道度: 'A star’s precise spot on the ecliptic (the Sun’s yearly path), given as 0°–360°.',
    上升度: 'The degree rising on the eastern horizon at your birth. It sets where the 命宫 begins — the bedrock of the whole chart.',
    昼夜盘: 'Whether you were born by day or by night. On a night chart the “night stars” — Moon, Venus — are stronger.',
    宫制: 'How the ecliptic is cut into twelve houses. Here: twelve equal houses from the ascendant — 30° each, evenly from the rising point.',
  },
  archetype: {
    命宫: { title: 'Self-anchored', oneLiner: '命主 sits in the 命宫 itself — who you are and want to become is yours to decide; clear-eyed about self, you go where you set your sights.' },
    财帛: { title: 'Builder of means', oneLiner: '命主 falls in 财帛 — you read value, resources and return by instinct; pragmatic and good at managing, your sense of safety ties to what you’ve put aside.' },
    兄弟: { title: 'Among peers', oneLiner: '命主 falls in 兄弟 — peers, partners and collaboration are your ground note; you find your place inside a “we”.' },
    田宅: { title: 'Deep roots', oneLiner: '命主 falls in 田宅 — you value roots, home and steadiness, the type who tamps life down inch by inch and ripens late but sure.' },
    男女: { title: 'Tending growth', oneLiner: '命主 falls in 男女 — creation, children and what you pass on are your home turf; meaning comes from raising something up.' },
    奴仆: { title: 'Through others', oneLiner: '命主 falls in 奴仆 — you lead people, move resources and get things done through many hands; your network is your stage.' },
    夫妻: { title: 'Mirror of love', oneLiner: '命主 falls in 夫妻 — intimacy is the mirror you see yourself in; you live most fully in deep one-to-one bonds.' },
    疾厄: { title: 'Tempered by trial', oneLiner: '命主 falls in 疾厄 — body, pressure and burdens are your training ground; get through, and you step up a level.' },
    迁移: { title: 'Far and new', oneLiner: '命主 falls in 迁移 — you belong to distance and change, opening up most on the road and in new ground.' },
    官禄: { title: 'Standing seen', oneLiner: '命主 falls in 官禄 — career, position and standing are your through-line; you’re built to make something that gets seen.' },
    福德: { title: 'Light turned inward', oneLiner: 'Your light doesn’t court the spotlight — it gathers within. You prize meaning, love to mull, turn inward, and win by inner work and long accumulation.' },
    相貌: { title: 'Form and spirit', oneLiner: '命主 falls in 相貌 — bearing, image and first impressions are your resource; you shape yourself through how you’re seen.' },
  },
  strengthLabel: { 七强: 'peak', 次强: 'strong', 闲宫: 'idle' },
  elementWord: { 木: 'Wood', 火: 'Fire', 土: 'Earth', 金: 'Metal', 水: 'Water' },
};

export const QIZHENG_CONTENT: Record<UiLanguage, QizhengContent> = { zh: ZH, en: EN };
