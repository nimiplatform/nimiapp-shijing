import type { BirthLocation } from '../../domain/person.ts';

export interface ResolvedBirthPlace {
  readonly matched_query: string;
  readonly place_name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly iana_time_zone: string;
}

const SEED_PLACES: readonly ResolvedBirthPlace[] = [
  {
    matched_query: '上海市黄浦区',
    place_name: '上海市黄浦区',
    iana_time_zone: 'Asia/Shanghai',
    longitude: 121.4737,
    latitude: 31.2304,
  },
  {
    matched_query: '青海省格尔木市',
    place_name: '青海省格尔木市',
    iana_time_zone: 'Asia/Shanghai',
    longitude: 94.9,
    latitude: 36.4,
  },
  {
    matched_query: '北京市',
    place_name: '北京市',
    iana_time_zone: 'Asia/Shanghai',
    longitude: 116.4074,
    latitude: 39.9042,
  },
] as const;

const PLACE_ALIASES: Readonly<Record<string, ResolvedBirthPlace['matched_query']>> = {
  上海: '上海市黄浦区',
  上海市: '上海市黄浦区',
  上海市黄浦区: '上海市黄浦区',
  青海省格尔木市: '青海省格尔木市',
  格尔木市: '青海省格尔木市',
  北京: '北京市',
  北京市: '北京市',
};

function normalizePlaceText(text: string): string {
  return text.trim().replace(/\s+/g, '');
}

export function resolveBirthPlace(placeText: string): ResolvedBirthPlace | null {
  const normalized = normalizePlaceText(placeText);
  if (!normalized) return null;
  const canonical = PLACE_ALIASES[normalized];
  if (!canonical) return null;
  return SEED_PLACES.find((place) => place.matched_query === canonical) ?? null;
}

export function birthLocationFromResolvedPlace(place: ResolvedBirthPlace): BirthLocation {
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    iana_time_zone: place.iana_time_zone,
    place_name: place.place_name,
  };
}

