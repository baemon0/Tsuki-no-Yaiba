export type DifficultyId = 'mizunoto' | 'kinoe' | 'hashira';

export interface DifficultyConfig {
  id: DifficultyId;
  name: string;
  arabicName: string;
  tierLabel: string;
  summary: string;
  color: string;
  brightColor: string;
  darkColor: string;
  enemySpeedMult: number;
  enemyDamageMult: number;
  enemyHpMult: number;
  spawnDelayMult: number;
  extraEnemiesPerWave: number;
  telegraphScale: number;
  sweetSpotMin: number;
  sweetSpotMax: number;
  oscillationSpeedMult: number;
}

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: 'mizunoto',
    name: 'Mizunoto',
    arabicName: 'ميزونوتو',
    tierLabel: 'Easy',
    summary: 'Slower demons · Lower damage · Wide Breath sweet spot',
    color: '#34d399',
    brightColor: '#a7f3d0',
    darkColor: '#065f46',
    enemySpeedMult: 0.78,
    enemyDamageMult: 0.65,
    enemyHpMult: 0.85,
    spawnDelayMult: 1.2,
    extraEnemiesPerWave: 0,
    telegraphScale: 1.25,
    sweetSpotMin: 0.29,
    sweetSpotMax: 0.71,
    oscillationSpeedMult: 0.88,
  },
  {
    id: 'kinoe',
    name: 'Kinoe',
    arabicName: 'كينوي',
    tierLabel: 'Normal',
    summary: 'Balanced demons · Standard damage & Breath sweet spot',
    color: '#38bdf8',
    brightColor: '#bae6fd',
    darkColor: '#075985',
    enemySpeedMult: 1.0,
    enemyDamageMult: 1.0,
    enemyHpMult: 1.0,
    spawnDelayMult: 1.0,
    extraEnemiesPerWave: 0,
    telegraphScale: 1.0,
    sweetSpotMin: 0.37,
    sweetSpotMax: 0.63,
    oscillationSpeedMult: 1.0,
  },
  {
    id: 'hashira',
    name: 'Hashira',
    arabicName: 'هاشيرا',
    tierLabel: 'Hard',
    summary: 'Fast aggressive demons · High spawn rate · Narrow sweet spot',
    color: '#fb7185',
    brightColor: '#ffe4e6',
    darkColor: '#9f1239',
    enemySpeedMult: 1.26,
    enemyDamageMult: 1.45,
    enemyHpMult: 1.2,
    spawnDelayMult: 0.68,
    extraEnemiesPerWave: 2,
    telegraphScale: 0.78,
    sweetSpotMin: 0.43,
    sweetSpotMax: 0.57,
    oscillationSpeedMult: 1.18,
  },
];

export const DIFFICULTY_MAP: Record<DifficultyId, DifficultyConfig> = Object.fromEntries(
  DIFFICULTIES.map((d) => [d.id, d])
) as Record<DifficultyId, DifficultyConfig>;
