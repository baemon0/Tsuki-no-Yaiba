import type { MetaProgressionState } from './metaProgression';

export type UpgradeId =
  | 'vampiric_blade'
  | 'storm_step'
  | 'solar_focus'
  | 'sekiro_edge'
  | 'crimson_temper'
  | 'thunder_tempo'
  | 'iron_resolve'
  | 'soul_resonance'
  | 'shadow_execution';

export interface UpgradeCardDef {
  id: UpgradeId;
  name: string;
  arabicName: string;
  summary: string;
  arabicSummary: string;
  color: string;
  brightColor: string;
  bgTint: string;
  icon: 'fang' | 'bolt' | 'sun' | 'katana' | 'flame' | 'wind' | 'shield' | 'orb' | 'skull';
}

export const UPGRADE_CARDS: UpgradeCardDef[] = [
  {
    id: 'vampiric_blade',
    name: 'Vampiric Blade',
    arabicName: 'نصل مصاص الدماء',
    summary: 'Heal +5% Max HP on every demon kill',
    arabicSummary: 'استعادة 5% صحة عند كل قتل',
    color: '#f43f5e',
    brightColor: '#fda4af',
    bgTint: '#3b0a18',
    icon: 'fang',
  },
  {
    id: 'storm_step',
    name: 'Storm Step',
    arabicName: 'خطوة العاصفة',
    summary: '+30% Dash speed & range, -20% Dash cooldown',
    arabicSummary: 'سرعة ومدى اندفاع +30%',
    color: '#38bdf8',
    brightColor: '#bae6fd',
    bgTint: '#092438',
    icon: 'bolt',
  },
  {
    id: 'solar_focus',
    name: 'Solar Focus',
    arabicName: 'تركيز الشمس',
    summary: 'Wider Breath sweet spot & +1.2s Charged aura',
    arabicSummary: 'نطاق نفس أوسع + شحن أطول',
    color: '#f59e0b',
    brightColor: '#fde68a',
    bgTint: '#382206',
    icon: 'sun',
  },
  {
    id: 'sekiro_edge',
    name: "Shinobi's Edge",
    arabicName: 'حد الصدّ القاطع',
    summary: '+45% Posture damage & wider Perfect Parry window',
    arabicSummary: 'كسر توازن أسرع وصدّ أسهل',
    color: '#eab308',
    brightColor: '#fef08a',
    bgTint: '#332805',
    icon: 'katana',
  },
  {
    id: 'crimson_temper',
    name: 'Crimson Temper',
    arabicName: 'فولاذ قرمزي',
    summary: '+24% Katana slash & Ultimate damage',
    arabicSummary: 'ضرر السيف والتقنية القاضية +24%',
    color: '#ef4444',
    brightColor: '#fecaca',
    bgTint: '#3b0c0c',
    icon: 'flame',
  },
  {
    id: 'thunder_tempo',
    name: 'Gale Tempo',
    arabicName: 'إيقاع الإعصار',
    summary: '+18% Slash speed & +15% Movement speed',
    arabicSummary: 'سرعة الضرب والحركة',
    color: '#22c55e',
    brightColor: '#bbf7d0',
    bgTint: '#082e18',
    icon: 'wind',
  },
  {
    id: 'iron_resolve',
    name: 'Iron Resolve',
    arabicName: 'عزيمة حديدية',
    summary: '+25 Max HP (healed now) & 15% less damage taken',
    arabicSummary: '+25 صحة قصوى وتقليل الضرر',
    color: '#94a3b8',
    brightColor: '#e2e8f0',
    bgTint: '#1b2433',
    icon: 'shield',
  },
  {
    id: 'soul_resonance',
    name: 'Soul Resonance',
    arabicName: 'صدى الأرواح',
    summary: '+50% faster Ultimate gauge fill on hits & parries',
    arabicSummary: 'شحن التقنية القاضية أسرع بـ 50%',
    color: '#a855f7',
    brightColor: '#e9d5ff',
    bgTint: '#290d42',
    icon: 'orb',
  },
  {
    id: 'shadow_execution',
    name: 'Deathblow Mastery',
    arabicName: 'إتقان الإعدام',
    summary: 'Finishers heal +15% HP & deal +35% Boss damage',
    arabicSummary: 'الضربة القاضية تعالج +15% صحة',
    color: '#ec4899',
    brightColor: '#fbcfe8',
    bgTint: '#380b26',
    icon: 'skull',
  },
];

export const UPGRADE_CARD_MAP: Record<UpgradeId, UpgradeCardDef> = Object.fromEntries(
  UPGRADE_CARDS.map((u) => [u.id, u])
) as Record<UpgradeId, UpgradeCardDef>;

export interface RunModifiers {
  vampiricStacks: number;
  dashSpeedMult: number;
  dashCooldownMult: number;
  sweetSpotBonus: number;
  chargeDurationBonus: number;
  postureDamageMult: number;
  parryWindowBonus: number;
  damageMult: number;
  attackSpeedMult: number;
  moveSpeedMult: number;
  bonusMaxHp: number;
  damageTakenMult: number;
  ultimateChargeMult: number;
  finisherHealPct: number;
  finisherBossMult: number;
}

export function computeRunModifiers(
  pickedIds: UpgradeId[],
  meta?: MetaProgressionState
): RunModifiers {
  const bladeLvl = meta?.upgrades.bladeSharpness ?? 0;
  const defenseLvl = meta?.upgrades.uniformDefense ?? 0;
  const lungLvl = meta?.upgrades.lungCapacity ?? 0;

  const mods: RunModifiers = {
    vampiricStacks: 0,
    dashSpeedMult: 1,
    dashCooldownMult: 1,
    sweetSpotBonus: 0,
    chargeDurationBonus: lungLvl * 0.5,
    postureDamageMult: 1,
    parryWindowBonus: 0,
    damageMult: 1 + bladeLvl * 0.15,
    attackSpeedMult: 1,
    moveSpeedMult: 1,
    bonusMaxHp: defenseLvl * 20,
    damageTakenMult: 1,
    ultimateChargeMult: 1,
    finisherHealPct: 0,
    finisherBossMult: 1,
  };

  for (const id of pickedIds) {
    switch (id) {
      case 'vampiric_blade':
        mods.vampiricStacks += 1;
        break;
      case 'storm_step':
        mods.dashSpeedMult += 0.3;
        mods.dashCooldownMult *= 0.8;
        break;
      case 'solar_focus':
        mods.sweetSpotBonus += 0.08;
        mods.chargeDurationBonus += 1.2;
        break;
      case 'sekiro_edge':
        mods.postureDamageMult += 0.45;
        mods.parryWindowBonus += 0.075;
        break;
      case 'crimson_temper':
        mods.damageMult += 0.24;
        break;
      case 'thunder_tempo':
        mods.attackSpeedMult += 0.18;
        mods.moveSpeedMult += 0.15;
        break;
      case 'iron_resolve':
        mods.bonusMaxHp += 25;
        mods.damageTakenMult *= 0.85;
        break;
      case 'soul_resonance':
        mods.ultimateChargeMult += 0.5;
        break;
      case 'shadow_execution':
        mods.finisherHealPct += 0.15;
        mods.finisherBossMult += 0.35;
        break;
    }
  }

  return mods;
}

export function rollUpgradeChoices(pickedIds: UpgradeId[], count = 3): UpgradeCardDef[] {
  const unpicked = UPGRADE_CARDS.filter((c) => !pickedIds.includes(c.id));
  const pool = unpicked.length >= count ? [...unpicked] : [...UPGRADE_CARDS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
