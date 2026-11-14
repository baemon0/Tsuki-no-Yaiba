export type GameMode = 'endless' | 'story';

export type StageTheme =
  | 'bamboo_night'
  | 'wisteria'
  | 'swamp_town'
  | 'tsuzumi_mansion'
  | 'natagumo'
  | 'mugen_train'
  | 'train_wreckage'
  | 'entertainment_district'
  | 'swordsmith_village'
  | 'infinity_gate'
  | 'infinity_throne';

export type BossId =
  | 'demon_moon'
  | 'hand_demon'
  | 'swamp_demon'
  | 'kyogai'
  | 'rui'
  | 'enmu'
  | 'akaza'
  | 'gyutaro'
  | 'hantengu'
  | 'kokushibo'
  | 'muzan';

export interface StoryStageDef {
  stageNumber: number;
  name: string;
  arabicName: string;
  theme: StageTheme;
  bossId: BossId;
  bossName: string;
  bossArabicName: string;
  bossTitle: string;
  bossBaseHp: number;
  bossSpeed: number;
  bossDamage: number;
  bossColor: string;
  bossBrightColor: string;
}

export const STORY_STAGES: StoryStageDef[] = [
  {
    stageNumber: 1,
    name: 'Final Selection',
    arabicName: 'الاختبار النهائي',
    theme: 'wisteria',
    bossId: 'hand_demon',
    bossName: 'Hand Demon',
    bossArabicName: 'شيطان الأيدي',
    bossTitle: 'Mt. Fujikasane Terror',
    bossBaseHp: 210,
    bossSpeed: 54,
    bossDamage: 20,
    bossColor: '#84cc16',
    bossBrightColor: '#ecfccb',
  },
  {
    stageNumber: 2,
    name: 'Swamp Town',
    arabicName: 'المدينة الليلية',
    theme: 'swamp_town',
    bossId: 'swamp_demon',
    bossName: 'Swamp Demon',
    bossArabicName: 'شيطان المستنقع',
    bossTitle: 'Midnight Alley Stalker',
    bossBaseHp: 245,
    bossSpeed: 68,
    bossDamage: 22,
    bossColor: '#38bdf8',
    bossBrightColor: '#e0f2fe',
  },
  {
    stageNumber: 3,
    name: 'Tsuzumi Mansion',
    arabicName: 'قصر الطبول',
    theme: 'tsuzumi_mansion',
    bossId: 'kyogai',
    bossName: 'Kyogai',
    bossArabicName: 'كيوغاي',
    bossTitle: 'Former Lower Moon 6',
    bossBaseHp: 280,
    bossSpeed: 62,
    bossDamage: 24,
    bossColor: '#f59e0b',
    bossBrightColor: '#fef3c7',
  },
  {
    stageNumber: 4,
    name: 'Mt. Natagumo',
    arabicName: 'جبل ناتاغومو',
    theme: 'natagumo',
    bossId: 'rui',
    bossName: 'Rui',
    bossArabicName: 'روي',
    bossTitle: 'Lower Moon 5',
    bossBaseHp: 320,
    bossSpeed: 74,
    bossDamage: 25,
    bossColor: '#e11d48',
    bossBrightColor: '#ffe4e6',
  },
  {
    stageNumber: 5,
    name: 'Mugen Train',
    arabicName: 'قطار اللانهاية',
    theme: 'mugen_train',
    bossId: 'enmu',
    bossName: 'Enmu',
    bossArabicName: 'إنمو',
    bossTitle: 'Lower Moon 1',
    bossBaseHp: 360,
    bossSpeed: 72,
    bossDamage: 26,
    bossColor: '#a855f7',
    bossBrightColor: '#f3e8ff',
  },
  {
    stageNumber: 6,
    name: 'Train Wreckage',
    arabicName: 'حطام القطار',
    theme: 'train_wreckage',
    bossId: 'akaza',
    bossName: 'Akaza',
    bossArabicName: 'أكازا',
    bossTitle: 'Upper Moon 3',
    bossBaseHp: 420,
    bossSpeed: 88,
    bossDamage: 29,
    bossColor: '#f43f5e',
    bossBrightColor: '#fecdd3',
  },
  {
    stageNumber: 7,
    name: 'Entertainment District',
    arabicName: 'حي الترفيه',
    theme: 'entertainment_district',
    bossId: 'gyutaro',
    bossName: 'Gyutaro & Daki',
    bossArabicName: 'غيوتارو وداكي',
    bossTitle: 'Upper Moon 6',
    bossBaseHp: 470,
    bossSpeed: 86,
    bossDamage: 30,
    bossColor: '#22c55e',
    bossBrightColor: '#dcfce7',
  },
  {
    stageNumber: 8,
    name: 'Swordsmith Village',
    arabicName: 'قرية صانعي السيوف',
    theme: 'swordsmith_village',
    bossId: 'hantengu',
    bossName: 'Hantengu',
    bossArabicName: 'هانتينغو',
    bossTitle: 'Upper Moon 4',
    bossBaseHp: 520,
    bossSpeed: 82,
    bossDamage: 31,
    bossColor: '#eab308',
    bossBrightColor: '#fef9c3',
  },
  {
    stageNumber: 9,
    name: 'Infinity Castle Gate',
    arabicName: 'بوابة قلعة اللانهاية',
    theme: 'infinity_gate',
    bossId: 'kokushibo',
    bossName: 'Kokushibo',
    bossArabicName: 'كوكوشيبو',
    bossTitle: 'Upper Moon 1',
    bossBaseHp: 580,
    bossSpeed: 94,
    bossDamage: 34,
    bossColor: '#c084fc',
    bossBrightColor: '#f3e8ff',
  },
  {
    stageNumber: 10,
    name: 'Infinity Castle Throne',
    arabicName: 'عرش قلعة اللانهاية',
    theme: 'infinity_throne',
    bossId: 'muzan',
    bossName: 'Demon King Muzan',
    bossArabicName: 'موزان كيبوتسوجي',
    bossTitle: 'Progenitor of Demons',
    bossBaseHp: 680,
    bossSpeed: 98,
    bossDamage: 36,
    bossColor: '#dc2626',
    bossBrightColor: '#fee2e2',
  },
];
