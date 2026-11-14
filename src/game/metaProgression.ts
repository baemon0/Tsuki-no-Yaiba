import type { BossId } from './storyStages';

export const META_STORAGE_KEY = 'tsuki_meta_progression_v1';

export type BlacksmithUpgradeKey =
  | 'bladeSharpness'
  | 'uniformDefense'
  | 'lungCapacity';

export interface MetaProgressionState {
  bloodCrystals: number;
  totalDemonsSlain: number;
  highestCombo: number;
  defeatedBosses: Partial<Record<BossId, number>>;
  unlockedRankIds: string[];
  unlockedTitles: string[];
  equippedTitleId: string | null;
  upgrades: Record<BlacksmithUpgradeKey, number>;
}

export interface SlayerRankDef {
  id: string;
  name: string;
  arabicName: string;
  minSlain: number;
  color: string;
  brightColor: string;
  darkColor: string;
}

export const SLAYER_RANKS: SlayerRankDef[] = [
  {
    id: 'mizunoto',
    name: 'Mizunoto',
    arabicName: 'ميزونوتو',
    minSlain: 0,
    color: '#64748b',
    brightColor: '#cbd5e1',
    darkColor: '#1e293b',
  },
  {
    id: 'mizunoe',
    name: 'Mizunoe',
    arabicName: 'ميزونوي',
    minSlain: 15,
    color: '#38bdf8',
    brightColor: '#bae6fd',
    darkColor: '#0c2d48',
  },
  {
    id: 'kanoto',
    name: 'Kanoto',
    arabicName: 'كانوتو',
    minSlain: 35,
    color: '#2dd4bf',
    brightColor: '#99f6e4',
    darkColor: '#0f3836',
  },
  {
    id: 'kanoe',
    name: 'Kanoe',
    arabicName: 'كانوي',
    minSlain: 65,
    color: '#22c55e',
    brightColor: '#bbf7d0',
    darkColor: '#0d361d',
  },
  {
    id: 'tsuchinoto',
    name: 'Tsuchinoto',
    arabicName: 'تسوتشينوتو',
    minSlain: 100,
    color: '#a3e635',
    brightColor: '#ecfccb',
    darkColor: '#25360a',
  },
  {
    id: 'tsuchinoe',
    name: 'Tsuchinoe',
    arabicName: 'تسوتشينوي',
    minSlain: 150,
    color: '#eab308',
    brightColor: '#fef08a',
    darkColor: '#3b2d06',
  },
  {
    id: 'hinoto',
    name: 'Hinoto',
    arabicName: 'هينوتو',
    minSlain: 210,
    color: '#f97316',
    brightColor: '#fed7aa',
    darkColor: '#431807',
  },
  {
    id: 'hinoe',
    name: 'Hinoe',
    arabicName: 'هينوي',
    minSlain: 280,
    color: '#fb7185',
    brightColor: '#fecdd3',
    darkColor: '#4a0d1c',
  },
  {
    id: 'kinoto',
    name: 'Kinoto',
    arabicName: 'كينوتو',
    minSlain: 360,
    color: '#c084fc',
    brightColor: '#f3e8ff',
    darkColor: '#331252',
  },
  {
    id: 'kinoe',
    name: 'Kinoe',
    arabicName: 'كينوي',
    minSlain: 450,
    color: '#f59e0b',
    brightColor: '#fef3c7',
    darkColor: '#452205',
  },
  {
    id: 'hashira',
    name: 'Hashira',
    arabicName: 'هاشيرا',
    minSlain: 600,
    color: '#ef4444',
    brightColor: '#fef08a',
    darkColor: '#450a0a',
  },
];

export interface BlacksmithUpgradeDef {
  key: BlacksmithUpgradeKey;
  name: string;
  arabicName: string;
  effectPerLevel: string;
  arabicEffect: string;
  maxLevel: number;
  costs: [number, number, number, number, number];
  color: string;
  brightColor: string;
}

export const BLACKSMITH_UPGRADES: BlacksmithUpgradeDef[] = [
  {
    key: 'bladeSharpness',
    name: 'Nichirin Blade Sharpness',
    arabicName: 'نصل النيتشرين',
    effectPerLevel: '+15% Base Slash Damage per level',
    arabicEffect: '+15% ضرر السيف الأساسي لكل مستوى',
    maxLevel: 5,
    costs: [15, 35, 65, 110, 175],
    color: '#f43f5e',
    brightColor: '#fda4af',
  },
  {
    key: 'uniformDefense',
    name: 'Slayer Uniform Defense',
    arabicName: 'زي الفيلق',
    effectPerLevel: '+20 Max HP per level',
    arabicEffect: '+20 صحة قصوى لكل مستوى',
    maxLevel: 5,
    costs: [15, 35, 65, 110, 175],
    color: '#38bdf8',
    brightColor: '#bae6fd',
  },
  {
    key: 'lungCapacity',
    name: 'Total Concentration Lung Capacity',
    arabicName: 'سعة التنفس',
    effectPerLevel: '+0.5s Charged Breath Duration per level',
    arabicEffect: '+0.5 ثانية لمدة شحن النفس لكل مستوى',
    maxLevel: 5,
    costs: [15, 35, 65, 110, 175],
    color: '#f59e0b',
    brightColor: '#fde68a',
  },
];

export interface BestiaryEntry {
  bossId: BossId;
  stageLabel: string;
  name: string;
  arabicName: string;
  title: string;
  perilArt: string;
  lore: string;
  arabicLore: string;
  baseHp: number;
  baseDamage: number;
  color: string;
  brightColor: string;
}

export const DEMON_BESTIARY: BestiaryEntry[] = [
  {
    bossId: 'hand_demon',
    stageLabel: 'Stage 1',
    name: 'Hand Demon',
    arabicName: 'شيطان الأيدي',
    title: 'Mt. Fujikasane Terror',
    perilArt: 'Crushing Multi-Arm Lunge',
    lore: 'Imprisoned inside the wisteria cage for 47 years, devouring Final Selection trainees to grow monstrous extra arms.',
    arabicLore: 'سُجن في غابة الوستارية 47 عاماً والتهم المتدربين لينمّي عشرات الأذرع الوحشية.',
    baseHp: 210,
    baseDamage: 20,
    color: '#84cc16',
    brightColor: '#ecfccb',
  },
  {
    bossId: 'swamp_demon',
    stageLabel: 'Stage 2',
    name: 'Swamp Demon',
    arabicName: 'شيطان المستنقع',
    title: 'Midnight Alley Stalker',
    perilArt: 'Abyssal Puddle Ambush',
    lore: 'Hunts under cover of dark rain by opening black water portals beneath cobblestones to drag prey into its mire.',
    arabicLore: 'يصطاد تحت أمطار الليل بفتح بوابات مائية سوداء تحت أقدام ضحاياه.',
    baseHp: 245,
    baseDamage: 22,
    color: '#38bdf8',
    brightColor: '#e0f2fe',
  },
  {
    bossId: 'kyogai',
    stageLabel: 'Stage 3',
    name: 'Kyogai',
    arabicName: 'كيوغاي',
    title: 'Former Lower Moon 6',
    perilArt: 'Rapid Drumming Claw Slash',
    lore: 'Strikes tsuzumi drums fused into his torso to warp gravity and hurl invisible high-speed claw shockwaves.',
    arabicLore: 'يقرع الطبول المغروسة في جسده ليقلب الغرفة ويطلق موجات مخالب قاتلة.',
    baseHp: 280,
    baseDamage: 24,
    color: '#f59e0b',
    brightColor: '#fef3c7',
  },
  {
    bossId: 'rui',
    stageLabel: 'Stage 4',
    name: 'Rui',
    arabicName: 'روي',
    title: 'Lower Moon 5',
    perilArt: 'Crimson Blood Web Cage',
    lore: 'A cold prodigy of Mt. Natagumo whose steel-hard crimson threads slice effortlessly through Nichirin steel.',
    arabicLore: 'شيطان القمر السفلي الخامس؛ خيوطه القرمزية أصلب من الفولاذ وتقطع السيوف.',
    baseHp: 320,
    baseDamage: 25,
    color: '#e11d48',
    brightColor: '#ffe4e6',
  },
  {
    bossId: 'enmu',
    stageLabel: 'Stage 5',
    name: 'Enmu',
    arabicName: 'إنمو',
    title: 'Lower Moon 1',
    perilArt: 'Forced Unconscious Sleep Orbs',
    lore: 'Fused his flesh into the Mugen Train locomotive, luring passengers into endless nightmares with hypnotic eye-hands.',
    arabicLore: 'دمج جسده مع قطار اللانهاية ليغرق الركاب في أحلام أبدية بعيون التنويم.',
    baseHp: 360,
    baseDamage: 26,
    color: '#a855f7',
    brightColor: '#f3e8ff',
  },
  {
    bossId: 'akaza',
    stageLabel: 'Stage 6',
    name: 'Akaza',
    arabicName: 'أكازا',
    title: 'Upper Moon 3',
    perilArt: 'Destructive Death: Compass Shockwave',
    lore: 'Obsessed with martial perfection, sensing every fighting spirit with his compass needle and shattering earth with his fists.',
    arabicLore: 'مهووس بالقوة القتالية، يقرأ روح القتال ويحطم الأرض بلكماته الصادمة.',
    baseHp: 420,
    baseDamage: 29,
    color: '#f43f5e',
    brightColor: '#fecdd3',
  },
  {
    bossId: 'gyutaro',
    stageLabel: 'Stage 7',
    name: 'Gyutaro & Daki',
    arabicName: 'غيوتارو وداكي',
    title: 'Upper Moon 6',
    perilArt: 'Flying Blood Sickles',
    lore: 'Twin siblings lurking in the Entertainment District; Daki’s sweeping obi sashes shield Gyutaro’s venomous crimson crescents.',
    arabicLore: 'أخوان لا يُقهران في حي الترفيه؛ مناجل دم سامة وأوشحة حارقة.',
    baseHp: 470,
    baseDamage: 30,
    color: '#22c55e',
    brightColor: '#dcfce7',
  },
  {
    bossId: 'hantengu',
    stageLabel: 'Stage 8',
    name: 'Hantengu',
    arabicName: 'هانتينغو',
    title: 'Upper Moon 4',
    perilArt: 'Zohakuten Sky-Splitting Lightning',
    lore: 'Manifests his overwhelming hatred as Zohakuten, beating wooden drums to call down relentless pillars of golden lightning.',
    arabicLore: 'يجسّد غضبه في هيئة زوهاكوتين ليضرب ساحة المعركة بصواعق السماء الذهبية.',
    baseHp: 520,
    baseDamage: 31,
    color: '#eab308',
    brightColor: '#fef9c3',
  },
  {
    bossId: 'kokushibo',
    stageLabel: 'Stage 9',
    name: 'Kokushibo',
    arabicName: 'كوكوشيبو',
    title: 'Upper Moon 1',
    perilArt: 'Moon Breathing: Crescent Moon Blades',
    lore: 'The six-eyed fallen swordsman who forged Moon Breathing into living flesh-blades trailing chaotic crescent moon arcs.',
    arabicLore: 'السياف ذو الست عيون؛ يطلق هلالاً متفجراً من شفرات تنفس القمر المظلم.',
    baseHp: 580,
    baseDamage: 34,
    color: '#c084fc',
    brightColor: '#f3e8ff',
  },
  {
    bossId: 'muzan',
    stageLabel: 'Stage 10',
    name: 'Demon King Muzan',
    arabicName: 'موزان كيبوتسوجي',
    title: 'Progenitor of Demons',
    perilArt: 'Biokinesis Crimson Blood Whips',
    lore: 'The first and deadliest demon reigning at the core of Infinity Castle, lashing blinding supersonic crimson bone-whips.',
    arabicLore: 'سيد الشياطين الأول في قلب قلعة اللانهاية؛ سياط دموية خاطفة لا تُصد.',
    baseHp: 680,
    baseDamage: 36,
    color: '#dc2626',
    brightColor: '#fee2e2',
  },
  {
    bossId: 'demon_moon',
    stageLabel: 'Endless',
    name: 'Demon Moon',
    arabicName: 'قمر الشياطين',
    title: 'Endless Night Warden',
    perilArt: 'Blood Moon Crescent Wave',
    lore: 'An ancient nocturnal aberration that descends every third Endless wave, growing fiercer with each moon cycle.',
    arabicLore: 'طيف قمر الدم الذي يظهر كل 3 موجات في وضع البقاء اللانهائي.',
    baseHp: 260,
    baseDamage: 26,
    color: '#f43f5e',
    brightColor: '#ffe4e6',
  },
];

export interface SecretTitleDef {
  id: string;
  name: string;
  arabicName: string;
  badgeCode: string;
  description: string;
  arabicDescription: string;
  color: string;
  brightColor: string;
  darkColor: string;
}

export const SECRET_TITLES: SecretTitleDef[] = [
  {
    id: 'untouchable_hashira',
    name: 'Untouchable Hashira',
    arabicName: 'هاشيرا لا يُمس',
    badgeCode: '無',
    description: 'Vanquish any Stage or Endless Boss without taking a single hit.',
    arabicDescription: 'اهزم أي زعيم دون أن تتلقى أي ضربة أثناء القتال.',
    color: '#38bdf8',
    brightColor: '#e0f2fe',
    darkColor: '#0c2d48',
  },
  {
    id: 'lightning_flash',
    name: 'Lightning Flash',
    arabicName: 'ومضة البرق',
    badgeCode: '雷',
    description: 'Clear a complete 3-wave Stage or Endless Boss cycle in under 45 seconds.',
    arabicDescription: 'أنهِ مرحلة كاملة من 3 موجات في أقل من 45 ثانية.',
    color: '#facc15',
    brightColor: '#fef9c3',
    darkColor: '#3f2e04',
  },
  {
    id: 'master_blacksmith',
    name: 'Master Blacksmith',
    arabicName: 'الحداد الأعظم',
    badgeCode: '鍛',
    description: 'Max out all 3 Haganezuka Blacksmith upgrades to Level 5.',
    arabicDescription: 'طوّر جميع ترقيات ورشة الحداد الثلاث إلى المستوى الأقصى 5.',
    color: '#f97316',
    brightColor: '#ffedd5',
    darkColor: '#431407',
  },
  {
    id: 'mark_awakened',
    name: 'Scarlet Awakened',
    arabicName: 'الموقظ بالعلامة',
    badgeCode: '紋',
    description: 'Awaken the Demon Slayer Mark below 30% HP against a Boss.',
    arabicDescription: 'أيقظ علامة الصياد عندما تنخفض صحتك عن 30% أمام الزعيم.',
    color: '#ef4444',
    brightColor: '#fee2e2',
    darkColor: '#450a0a',
  },
  {
    id: 'parry_virtuoso',
    name: 'Steel Virtuoso',
    arabicName: 'سيد الصد',
    badgeCode: '剣',
    description: 'Land 5 Perfect Parries or Shockwave Deflects in a single run.',
    arabicDescription: 'نفّذ 5 عمليات صد مثالي في جولة واحدة.',
    color: '#eab308',
    brightColor: '#fef08a',
    darkColor: '#3b2d06',
  },
  {
    id: 'combo_tempest',
    name: 'Blade Tempest',
    arabicName: 'عاصفة النصل',
    badgeCode: '連',
    description: 'Reach a 30+ hit Combo chain without taking damage.',
    arabicDescription: 'حقّق سلسلة ضربات متتالية (كومبو) تصل إلى 30 ضربة أو أكثر.',
    color: '#2dd4bf',
    brightColor: '#ccfbf1',
    darkColor: '#0f3836',
  },
  {
    id: 'dawn_bringer',
    name: 'Dawn Bringer',
    arabicName: 'جالب الفجر',
    badgeCode: '曙',
    description: 'Defeat Demon King Muzan in Stage 10 and clear Story Campaign.',
    arabicDescription: 'اهزم ملك الشياطين موزان في المرحلة العاشرة وأكمل وضع القصة.',
    color: '#fb7185',
    brightColor: '#ffe4e6',
    darkColor: '#4c0519',
  },
  {
    id: 'corps_pillar',
    name: 'Corps Pillar',
    arabicName: 'عمود الفيلق',
    badgeCode: '柱',
    description: 'Slay 600 demons across all hunts to ascend to Hashira Rank.',
    arabicDescription: 'اقضِ على 600 شيطان للوصول إلى رتبة الهاشيرا العليا.',
    color: '#c084fc',
    brightColor: '#f3e8ff',
    darkColor: '#331252',
  },
];

export const SECRET_TITLE_MAP: Record<string, SecretTitleDef> = Object.fromEntries(
  SECRET_TITLES.map((t) => [t.id, t])
);

function computeUnlockedRankIds(totalSlain: number, existing: string[] = []): string[] {
  const set = new Set<string>(existing);
  for (const r of SLAYER_RANKS) {
    if (totalSlain >= r.minSlain) {
      set.add(r.id);
    }
  }
  if (set.size === 0) set.add('mizunoto');
  return SLAYER_RANKS.map((r) => r.id).filter((id) => set.has(id));
}

function reconcileAutomaticTitles(state: MetaProgressionState): string[] {
  const validIds = new Set(SECRET_TITLES.map((t) => t.id));
  const set = new Set(state.unlockedTitles.filter((id) => validIds.has(id)));
  if (
    state.upgrades.bladeSharpness >= 5 &&
    state.upgrades.uniformDefense >= 5 &&
    state.upgrades.lungCapacity >= 5
  ) {
    set.add('master_blacksmith');
  }
  if (state.highestCombo >= 30) {
    set.add('combo_tempest');
  }
  if (state.totalDemonsSlain >= 600) {
    set.add('corps_pillar');
  }
  if ((state.defeatedBosses.muzan ?? 0) > 0) {
    set.add('dawn_bringer');
  }
  return SECRET_TITLES.map((t) => t.id).filter((id) => set.has(id));
}

export function getDefaultMetaProgression(): MetaProgressionState {
  return {
    bloodCrystals: 0,
    totalDemonsSlain: 0,
    highestCombo: 0,
    defeatedBosses: {},
    unlockedRankIds: ['mizunoto'],
    unlockedTitles: [],
    equippedTitleId: null,
    upgrades: {
      bladeSharpness: 0,
      uniformDefense: 0,
      lungCapacity: 0,
    },
  };
}

export function loadMetaProgression(): MetaProgressionState {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return getDefaultMetaProgression();
    const parsed = JSON.parse(raw) as Partial<MetaProgressionState>;
    const clampLvl = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v)
        ? Math.max(0, Math.min(5, Math.floor(v)))
        : 0;
    const totalDemonsSlain =
      typeof parsed.totalDemonsSlain === 'number' && parsed.totalDemonsSlain > 0
        ? Math.floor(parsed.totalDemonsSlain)
        : 0;
    const existingRanks = Array.isArray(parsed.unlockedRankIds)
      ? parsed.unlockedRankIds.filter((x): x is string => typeof x === 'string')
      : [];
    const existingTitles = Array.isArray(parsed.unlockedTitles)
      ? parsed.unlockedTitles.filter((x): x is string => typeof x === 'string')
      : [];

    const defeatedBosses: Partial<Record<BossId, number>> = {};
    if (parsed.defeatedBosses && typeof parsed.defeatedBosses === 'object') {
      for (const [k, v] of Object.entries(parsed.defeatedBosses)) {
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
          defeatedBosses[k as BossId] = Math.floor(v);
        }
      }
    }

    const baseState: MetaProgressionState = {
      bloodCrystals:
        typeof parsed.bloodCrystals === 'number' && parsed.bloodCrystals > 0
          ? Math.floor(parsed.bloodCrystals)
          : 0,
      totalDemonsSlain,
      highestCombo:
        typeof parsed.highestCombo === 'number' && parsed.highestCombo > 0
          ? Math.floor(parsed.highestCombo)
          : 0,
      defeatedBosses,
      unlockedRankIds: computeUnlockedRankIds(totalDemonsSlain, existingRanks),
      unlockedTitles: existingTitles,
      equippedTitleId:
        typeof parsed.equippedTitleId === 'string' && parsed.equippedTitleId.length > 0
          ? parsed.equippedTitleId
          : null,
      upgrades: {
        bladeSharpness: clampLvl(parsed.upgrades?.bladeSharpness),
        uniformDefense: clampLvl(parsed.upgrades?.uniformDefense),
        lungCapacity: clampLvl(parsed.upgrades?.lungCapacity),
      },
    };
    baseState.unlockedTitles = reconcileAutomaticTitles(baseState);
    if (
      baseState.equippedTitleId &&
      !baseState.unlockedTitles.includes(baseState.equippedTitleId)
    ) {
      baseState.equippedTitleId = null;
    }
    return baseState;
  } catch {
    return getDefaultMetaProgression();
  }
}

export function saveMetaProgression(state: MetaProgressionState): MetaProgressionState {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
  return state;
}

export function addBloodCrystals(amount: number): MetaProgressionState {
  const current = loadMetaProgression();
  current.bloodCrystals += Math.max(0, Math.floor(amount));
  return saveMetaProgression(current);
}

export function addDemonsSlain(count = 1): MetaProgressionState {
  const current = loadMetaProgression();
  current.totalDemonsSlain += Math.max(0, Math.floor(count));
  current.unlockedRankIds = computeUnlockedRankIds(
    current.totalDemonsSlain,
    current.unlockedRankIds
  );
  current.unlockedTitles = reconcileAutomaticTitles(current);
  return saveMetaProgression(current);
}

export function recordHighestCombo(combo: number): MetaProgressionState {
  const current = loadMetaProgression();
  if (combo > current.highestCombo) {
    current.highestCombo = Math.floor(combo);
    current.unlockedTitles = reconcileAutomaticTitles(current);
    return saveMetaProgression(current);
  }
  return current;
}

export function recordBossDefeated(bossId: BossId): MetaProgressionState {
  const current = loadMetaProgression();
  current.defeatedBosses[bossId] = (current.defeatedBosses[bossId] ?? 0) + 1;
  current.unlockedTitles = reconcileAutomaticTitles(current);
  return saveMetaProgression(current);
}

export function unlockSecretTitle(titleId: string): {
  newlyUnlocked: boolean;
  title?: SecretTitleDef;
  state: MetaProgressionState;
} {
  const def = SECRET_TITLE_MAP[titleId];
  const current = loadMetaProgression();
  if (!def) {
    return { newlyUnlocked: false, state: current };
  }
  if (current.unlockedTitles.includes(titleId)) {
    return { newlyUnlocked: false, title: def, state: current };
  }
  current.unlockedTitles = reconcileAutomaticTitles({
    ...current,
    unlockedTitles: [...current.unlockedTitles, titleId],
  });
  return { newlyUnlocked: true, title: def, state: saveMetaProgression(current) };
}

export function setEquippedTitle(titleId: string | null): MetaProgressionState {
  const current = loadMetaProgression();
  if (titleId && current.unlockedTitles.includes(titleId)) {
    current.equippedTitleId = titleId;
  } else {
    current.equippedTitleId = null;
  }
  return saveMetaProgression(current);
}

export function buyBlacksmithUpgrade(
  key: BlacksmithUpgradeKey
): { ok: boolean; state: MetaProgressionState } {
  const current = loadMetaProgression();
  const def = BLACKSMITH_UPGRADES.find((u) => u.key === key);
  if (!def) return { ok: false, state: current };

  const level = current.upgrades[key];
  if (level >= def.maxLevel) return { ok: false, state: current };

  const cost = def.costs[level];
  if (current.bloodCrystals < cost) return { ok: false, state: current };

  current.bloodCrystals -= cost;
  current.upgrades[key] = level + 1;
  current.unlockedTitles = reconcileAutomaticTitles(current);
  return { ok: true, state: saveMetaProgression(current) };
}

export function getSlayerRankProgress(totalSlain: number): {
  current: SlayerRankDef;
  next: SlayerRankDef | null;
  progressPct: number;
} {
  let idx = 0;
  for (let i = 0; i < SLAYER_RANKS.length; i++) {
    if (totalSlain >= SLAYER_RANKS[i].minSlain) {
      idx = i;
    }
  }
  const current = SLAYER_RANKS[idx];
  const next = idx < SLAYER_RANKS.length - 1 ? SLAYER_RANKS[idx + 1] : null;
  const progressPct = next
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((totalSlain - current.minSlain) / (next.minSlain - current.minSlain)) * 100
          )
        )
      )
    : 100;

  return { current, next, progressPct };
}
