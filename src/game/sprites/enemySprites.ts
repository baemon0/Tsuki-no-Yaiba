import type { BossId } from '../storyStages';
import { compilePixelSprite, type CompiledSprite, type PixelPalette } from './pixelSprite';

const KAGE_PALETTE: PixelPalette = {
  o: '#05060b',
  D: '#171326',
  P: '#2b2147',
  L: '#473873',
  E: '#ff2e54',
  e: '#ff9eb5',
  C: '#94a3b8',
  W: '#e2e8f0',
};

const ONI_PALETTE: PixelPalette = {
  o: '#07080d',
  R: '#6e1924',
  r: '#a32938',
  A: '#242c3d',
  a: '#43516b',
  G: '#b88c3e',
  Y: '#ebd08a',
  E: '#ffae38',
  M: '#161b24',
  m: '#64748b',
};

const BOSS_PALETTES: Record<BossId, PixelPalette> = {
  demon_moon: {
    o: '#05050a',
    K: '#12101d',
    k: '#28223d',
    C: '#881337',
    c: '#be123c',
    M: '#f43f5e',
    W: '#ffe4e6',
    Y: '#fbbf24',
    S: '#4a3548',
    E: '#ff1e4d',
    B: '#fda4af',
  },
  hand_demon: {
    o: '#050705',
    K: '#364a2e',
    k: '#516e43',
    C: '#1f291c',
    c: '#4d7c0f',
    M: '#84cc16',
    W: '#ecfccb',
    Y: '#a3e635',
    S: '#617a53',
    E: '#facc15',
    B: '#d9f99d',
  },
  swamp_demon: {
    o: '#04080f',
    K: '#132436',
    k: '#1e3a54',
    C: '#0f172a',
    c: '#0284c7',
    M: '#38bdf8',
    W: '#e0f2fe',
    Y: '#7dd3fc',
    S: '#355166',
    E: '#22d3ee',
    B: '#bae6fd',
  },
  kyogai: {
    o: '#070605',
    K: '#29221d',
    k: '#4a3c32',
    C: '#57361c',
    c: '#92400e',
    M: '#f59e0b',
    W: '#fef3c7',
    Y: '#d97706',
    S: '#9ca3af',
    E: '#f59e0b',
    B: '#fde68a',
  },
  rui: {
    o: '#07060b',
    K: '#e2e8f0',
    k: '#cbd5e1',
    C: '#881337',
    c: '#e11d48',
    M: '#fb7185',
    W: '#fff1f2',
    Y: '#f8fafc',
    S: '#f1f5f9',
    E: '#e11d48',
    B: '#ffe4e6',
  },
  enmu: {
    o: '#06050c',
    K: '#171429',
    k: '#2e264d',
    C: '#4c1d95',
    c: '#7c3aed',
    M: '#c084fc',
    W: '#f3e8ff',
    Y: '#38bdf8',
    S: '#e2d9f3',
    E: '#22d3ee',
    B: '#e879f9',
  },
  akaza: {
    o: '#09060d',
    K: '#242942',
    k: '#4338ca',
    C: '#9f1239',
    c: '#e11d48',
    M: '#f43f5e',
    W: '#ffe4e6',
    Y: '#ec4899',
    S: '#e2d7e6',
    E: '#facc15',
    B: '#fda4af',
  },
  gyutaro: {
    o: '#050806',
    K: '#14261c',
    k: '#264533',
    C: '#831843',
    c: '#db2777',
    M: '#22c55e',
    W: '#dcfce7',
    Y: '#4ade80',
    S: '#647c6e',
    E: '#fbbf24',
    B: '#fb7185',
  },
  hantengu: {
    o: '#080705',
    K: '#362712',
    k: '#78350f',
    C: '#991b1b',
    c: '#dc2626',
    M: '#facc15',
    W: '#fef9c3',
    Y: '#fbbf24',
    S: '#d6d3d1',
    E: '#facc15',
    B: '#fde047',
  },
  kokushibo: {
    o: '#07040c',
    K: '#1e102e',
    k: '#3b1d5e',
    C: '#581c87',
    c: '#7e22ce',
    M: '#c084fc',
    W: '#f3e8ff',
    Y: '#f43f5e',
    S: '#d8b4fe',
    E: '#ef4444',
    B: '#f43f5e',
  },
  muzan: {
    o: '#040406',
    K: '#0f111a',
    k: '#232638',
    C: '#7f1d1d',
    c: '#b91c1c',
    M: '#ef4444',
    W: '#fee2e2',
    Y: '#f8fafc',
    S: '#e2e8f0',
    E: '#ef4444',
    B: '#f87171',
  },
};

function makeWhitePalette(palette: PixelPalette): PixelPalette {
  const white: PixelPalette = {};
  for (const key of Object.keys(palette)) {
    white[key] = '#ffffff';
  }
  return white;
}

export interface EnemySpritePair {
  normal: CompiledSprite;
  flash: CompiledSprite;
}

export interface BossSpriteGroup {
  move: EnemySpritePair[];
  telegraph: EnemySpritePair;
  attack: EnemySpritePair;
  slamWindup: EnemySpritePair;
  anchorX: number;
  anchorY: number;
}

export interface EnemySpriteSet {
  kage: {
    move: EnemySpritePair[];
    telegraph: EnemySpritePair;
    attack: EnemySpritePair;
    anchorX: number;
    anchorY: number;
  };
  oni: {
    move: EnemySpritePair[];
    telegraph: EnemySpritePair;
    attack: EnemySpritePair;
    anchorX: number;
    anchorY: number;
  };
  boss: BossSpriteGroup;
  getBoss: (bossId: BossId) => BossSpriteGroup;
}

function compilePair(rows: string[], palette: PixelPalette): EnemySpritePair {
  return {
    normal: compilePixelSprite(rows, palette),
    flash: compilePixelSprite(rows, makeWhitePalette(palette)),
  };
}

// KAGE (Fast Shadow Demon) - 26x26
const KAGE_MOVE_0 = [
  '..........................',
  '..........................',
  '..........ooooo...........',
  '........ooLPPLPo..........',
  '.......oLPPPPPPPo.........',
  '......oPPDDDDDDPPo........',
  '......oPDDEePDDEeo........',
  '.....oPPDDDDDDDDPo........',
  '....oLPPDDDDDDDDPPo.......',
  '...oLPPDDDPPPDDDDPo.......',
  '..oPPo.oPDDDDDDPPoCWo.....',
  '.oPo...oPDDDDDDPPoCCo.....',
  '......oPPDDDDDDPPo.o......',
  '.....oPPDDDDDDDDPo........',
  '....oPPoPDDDDDDPPo........',
  '...oPo..oPDDDDDPPo........',
  '........oPDo.oDPPo........',
  '.......oPDo...oDPo........',
  '......oPPo.....oPPo.......',
  '.....oPPo.......oPo.......',
  '.....ooo........oo........',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
];

const KAGE_MOVE_1 = [
  '..........................',
  '..........................',
  '..........................',
  '..........ooooo...........',
  '........ooLPPLPo..........',
  '.......oLPPPPPPPo.........',
  '......oPPDDDDDDPPo........',
  '......oPDDEePDDEeo........',
  '.....oPPDDDDDDDDPo........',
  '....oLPPDDDDDDDDPPo.......',
  '...oLPPDDDPPPDDDDPo.......',
  '..oPPo.oPDDDDDDPPoCWo.....',
  '.oPo...oPDDDDDDPPoCCo.....',
  '......oPPDDDDDDPPo.o......',
  '.....oPPDDDDDDDDPo........',
  '....oPo.oPDDDDDPPo........',
  '........oPDo.oDPPo........',
  '........oPPo.oPPo.........',
  '.........oPPoPPo..........',
  '.........oPPoPPo..........',
  '.........oooooo...........',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
];

const KAGE_TELEGRAPH = [
  '..........................',
  '..........................',
  '..........................',
  '.........ooooo............',
  '.......ooLPPLPo...........',
  '......oLPPPPPPPo..........',
  '.....oPPDDDDDDPPo.........',
  '.....oPDDEePDDEeo.........',
  '....oPPDDDDDDDDPo.........',
  '...oLPPDDDDDDDDPPo........',
  '..oLPPDDDPPPDDDDPo........',
  '.oPPo.oPDDDDDDPPo.........',
  '.oo..oCCoPDDDDDPPo........',
  '....oWWo.oPDDDDDPo........',
  '....ooo..oPDDDDDPPo.......',
  '........oPPo..oDPPo.......',
  '.......oPPo....oDPo.......',
  '......oPPo......oPPo......',
  '......ooo........ooo......',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
];

const KAGE_ATTACK = [
  '..........................',
  '..........................',
  '............ooooo.........',
  '..........ooLPPLPo........',
  '.........oLPPPPPPPo.......',
  '........oPPDDDDDDPPo......',
  '........oPDDEePDDEeo......',
  '.......oPPDDDDDDDDPo......',
  '......oLPPDDDDDDDDPPoWWCo.',
  '....ooLPPDDDPPPDDDDPoCCCWo',
  '..ooPPo.oPDDDDDDPPoooWWCo.',
  '.oPPo...oPDDDDDDPPo..ooo..',
  '.oo....oPPDDDDDDPPo.......',
  '......oPPDDDDDDDDPo.......',
  '.....oPPoPDDDDDDPPo.......',
  '....oPo..oPDo..oDPPo......',
  '........oPDo....oDPo......',
  '.......oPPo......oPPo.....',
  '.......ooo........ooo.....',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
];

// ONI (Heavy Armored Demon) - 34x36
const ONI_MOVE_0 = [
  '..................................',
  '........oo........oo..............',
  '.......oYYo......oYYo.............',
  '.......oGYo.oooo.oYGo.............',
  '........oGoorrrrooGo..............',
  '........oRRRRRRRRRRo..............',
  '.......oRRREERRRREERo.............',
  '.......oRRRRRRRRRRRRo.............',
  '.......oRYYRRRRRRYYRo.............',
  '......ooAAaaAAAAaaAAoo............',
  '.....oAAAaaAAAAAAaaAAAo...........',
  '....oAAAAGGAAAAAAAGGAAAo..........',
  '....oAAaAAAAAAAAAAAAaAAo..........',
  '...oAAoAAAAAAAAAAAAAAoAAo.........',
  '...oRRoAAAGGGGGGGGAAAoRRo.........',
  '...oRRoAAAAAAAAAAAAAAoRMMo........',
  '...oYYo.oAAAAAAAAAAo.omMMmo.......',
  '........oAAaaAAaaAAo..oMMMo.......',
  '........oAAAAAAAAAAo..oMMmMo......',
  '........oAAAAooAAAAo..oMMMo.......',
  '........oAAao..oAAao..oMMmMo......',
  '........oAAo....oAAo..oMMMo.......',
  '........oRRo....oRRo...ooo........',
  '.......oRRRo....oRRRo.............',
  '.......oAAao....oAAao.............',
  '.......ooooo....ooooo.............',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
];

const ONI_MOVE_1 = [
  '..................................',
  '..................................',
  '........oo........oo..............',
  '.......oYYo......oYYo.............',
  '.......oGYo.oooo.oYGo.............',
  '........oGoorrrrooGo..............',
  '........oRRRRRRRRRRo..............',
  '.......oRRREERRRREERo.............',
  '.......oRRRRRRRRRRRRo.............',
  '.......oRYYRRRRRRYYRo.............',
  '......ooAAaaAAAAaaAAoo............',
  '.....oAAAaaAAAAAAaaAAAo...........',
  '....oAAAAGGAAAAAAAGGAAAo..........',
  '....oAAaAAAAAAAAAAAAaAAo..........',
  '...oAAoAAAAAAAAAAAAAAoAAo.........',
  '...oRRoAAAGGGGGGGGAAAoRRo.........',
  '...oRRoAAAAAAAAAAAAAAoRMMo........',
  '...oYYo.oAAAAAAAAAAo.omMMmo.......',
  '........oAAaaAAaaAAo..oMMMo.......',
  '........oAAAAAAAAAAo..oMMmMo......',
  '........oAAAAooAAAAo..oMMMo.......',
  '.........oAAaooAAao...oMMmMo......',
  '.........oAAo..oAAo...oMMMo.......',
  '.........oRRo..oRRo....ooo........',
  '.........oAAao.oAAao..............',
  '.........ooooo.ooooo..............',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
];

const ONI_TELEGRAPH = [
  '.................ooo..............',
  '................oMMmo.............',
  '...............oMMMMo.............',
  '........oo....oMMmMMo.............',
  '.......oYYo...oMMMMMo.............',
  '.......oGYo.ooorMMMo..............',
  '........oGoorrrrRRo...............',
  '........oRRRRRRRRRRo..............',
  '.......oRRREERRRREERo.............',
  '.......oRRRRRRRRRRRRo.............',
  '.......oRYYRRRRRRYYRo.............',
  '......ooAAaaAAAAaaAAoo............',
  '.....oAAAaaAAAAAAaaAAAo...........',
  '....oAAAAGGAAAAAAAGGAAAo..........',
  '....oAAaAAAAAAAAAAAAaAAo..........',
  '...oAAoAAAAAAAAAAAAAAoAAo.........',
  '...oRRoAAAGGGGGGGGAAAoRRo.........',
  '...oRRoAAAAAAAAAAAAAAoRRo.........',
  '........oAAAAAAAAAAo..............',
  '........oAAaaAAaaAAo..............',
  '........oAAAAooAAAAo..............',
  '........oAAao..oAAao..............',
  '........oAAo....oAAo..............',
  '.......oRRRo....oRRRo.............',
  '.......oAAao....oAAao.............',
  '.......ooooo....ooooo.............',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
];

const ONI_ATTACK = [
  '..................................',
  '..................................',
  '..................................',
  '.........oo........oo.............',
  '........oYYo......oYYo............',
  '........oGYo.oooo.oYGo............',
  '.........oGoorrrrooGo.............',
  '.........oRRRRRRRRRRo.............',
  '........oRRREERRRREERo............',
  '........oRRRRRRRRRRRRo............',
  '........oRYYRRRRRRYYRo............',
  '.......ooAAaaAAAAaaAAoo...........',
  '......oAAAaaAAAAAAaaAAAo..........',
  '.....oAAAAGGAAAAAAAGGAAAo.........',
  '.....oAAaAAAAAAAAAAAAaAAo.........',
  '....oAAoAAAAAAAAAAAAAAoAAo........',
  '....oRRoAAAGGGGGGGGAAAoRRo........',
  '....oRRoAAAAAAAAAAAAAAoRRo........',
  '........oAAAAAAAAAAo..oRRo........',
  '........oAAaaAAaaAAo...oMMoooo....',
  '........oAAAAooAAAAo...oMMmMMMmo..',
  '........oAAao..oAAao....oMMMMMMMo.',
  '.......oAAao....oAAao....oMMmMMMo.',
  '.......oRRo......oRRo.....oooooo..',
  '......oAAao......oAAao............',
  '......ooooo......ooooo............',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
];

// BOSS BASE TEMPLATES - 44x44
const BOSS_MOVE_0 = [
  '............................................',
  '...............oo..........oo...............',
  '..............oYYo........oYYo..............',
  '.............oYMWYo......oYWMYo.............',
  '..............oYYYo.oooo.oYYYo..............',
  '...............oYYoKKKKKKoYYo...............',
  '...............oKKKKkYYkKKKKo...............',
  '..............oKKKSSSSSSSSKKKo..............',
  '..............oKKSEESSSSEESKKo..............',
  '..............oKKSSSSSSSSSSKKo..............',
  '.............ooKKkSSSSSSSSkKKoo.............',
  '............oCCCkKKKKKKKKKKkCCCo............',
  '..........ooCCcKKkKKMMMMKKkKKcCCoo..........',
  '.........oCCcKKKKKMMWWWWMMKKKKKcCCo.........',
  '........oCCcKKKKKKKMMMMMMKKKKKKKcCCo........',
  '.......oCCoKKKKKKKKKKKKKKKKKKKKKKoCCo.......',
  '......oCCo.oKKKKkKKKKKKKKKKkKKKKo.oCCo......',
  '.....oCCo..oKKKKkKKkYYYYkKKkKKKKo..oBBo.....',
  '....oCCo...oKKKKKKKkKKKKkKKKKKKKo...oBBo....',
  '...oCCo....oKKKKKKKKKKKKKKKKKKKKo....oBBo...',
  '...ooo.....oCCcKKKKKKKKKKKKKKcCCo.....oBBo..',
  '..........oCCcKKKKKKKKKKKKKKKKcCCo.....oMo..',
  '.........oCCo.oKKKKKooooKKKKKo.oCCo.........',
  '........oCCo..oKKKKo....oKKKKo..oCCo........',
  '........ooo...oKKKKo....oKKKKo...ooo........',
  '..............oKKkKo....oKkKKo..............',
  '..............oKKkKo....oKkKKo..............',
  '..............oKKkKo....oKkKKo..............',
  '.............oKKKKo......oKKKKo.............',
  '.............oooooo......oooooo.............',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
];

const BOSS_MOVE_1 = [
  '............................................',
  '............................................',
  '...............oo..........oo...............',
  '..............oYYo........oYYo..............',
  '.............oYMWYo......oYWMYo.............',
  '..............oYYYo.oooo.oYYYo..............',
  '...............oYYoKKKKKKoYYo...............',
  '...............oKKKKkYYkKKKKo...............',
  '..............oKKKSSSSSSSSKKKo..............',
  '..............oKKSEESSSSEESKKo..............',
  '..............oKKSSSSSSSSSSKKo..............',
  '.............ooKKkSSSSSSSSkKKoo.............',
  '............oCCCkKKKKKKKKKKkCCCo............',
  '..........ooCCcKKkKKMMMMKKkKKcCCoo..........',
  '.........oCCcKKKKKMMWWWWMMKKKKKcCCo.........',
  '........oCCcKKKKKKKMMMMMMKKKKKKKcCCo........',
  '.......oCCoKKKKKKKKKKKKKKKKKKKKKKoCCo.......',
  '......oCCo.oKKKKkKKKKKKKKKKkKKKKo.oCCo......',
  '.....oCCo..oKKKKkKKkYYYYkKKkKKKKo..oBBo.....',
  '....oCCo...oKKKKKKKkKKKKkKKKKKKKo...oBBo....',
  '...oCCo....oKKKKKKKKKKKKKKKKKKKKo....oBBo...',
  '...ooo.....oCCcKKKKKKKKKKKKKKcCCo.....oBBo..',
  '..........oCCcKKKKKKKKKKKKKKKKcCCo.....oMo..',
  '.........oCCo.oKKKKKooooKKKKKo.oCCo.........',
  '........oCCo..oKKKKo....oKKKKo..oCCo........',
  '........ooo...oKKKKo....oKKKKo...ooo........',
  '..............oKKkKo....oKkKKo..............',
  '..............oKKkKo....oKkKKo..............',
  '.............oKKKKo......oKKKKo.............',
  '.............oooooo......oooooo.............',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
];

const BOSS_TELEGRAPH = [
  '............................................',
  '............................................',
  '............................................',
  '.............oo..........oo.................',
  '............oYYo........oYYo................',
  '...........oYMWYo......oYWMYo...............',
  '............oYYYo.oooo.oYYYo................',
  '.............oYYoKKKKKKoYYo.................',
  '.............oKKKKkYYkKKKKo.................',
  '............oKKKSSSSSSSSKKKo................',
  '............oKKSEESSSSEESKKo................',
  '............oKKSSSSSSSSSSKKo................',
  '...........ooKKkSSSSSSSSkKKoo...............',
  '.........ooCCCkKKKKKKKKKKkCCCoo.............',
  '........oCCcKKkKKMMMMMMKKkKKcCCo............',
  '.......oCCcKKKKKMMWWWWMMKKKKKcCCo...........',
  '......oCCoKKKKKKKMMMMMMKKKKKKKoCCo..........',
  '.....oCCo.oKKKKkKKKKKKKKKKkKKKKoCCo.........',
  '....oCCo..oKKKKkKKkYYYYkKKkKKKKo.oCCo.......',
  '...oCCo..oBBoKKKKKKKKKKKKKKKKo....ooo.......',
  '...ooo..oBBo.oCCcKKKKKKKKcCCo...............',
  '.......oBBo..oCCcKKKKKKKKcCCo...............',
  '......oMBo...oKKKKKooooKKKKKo...............',
  '......ooo...oKKKKo......oKKKKo..............',
  '...........oKKKKo........oKKKKo.............',
  '...........oKKkKo........oKkKKo.............',
  '..........oKKKKo..........oKKKKo............',
  '..........oooooo..........oooooo............',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
];

const BOSS_ATTACK = [
  '............................................',
  '............................................',
  '................oo..........oo..............',
  '...............oYYo........oYYo.............',
  '..............oYMWYo......oYWMYo............',
  '...............oYYYo.oooo.oYYYo.............',
  '................oYYoKKKKKKoYYo..............',
  '................oKKKKkYYkKKKKo..............',
  '...............oKKKSSSSSSSSKKKo.............',
  '...............oKKSEESSSSEESKKo.............',
  '...............oKKSSSSSSSSSSKKo.............',
  '..............ooKKkSSSSSSSSkKKoo............',
  '............ooCCCkKKKKKKKKKKkCCCoo..........',
  '..........ooCCcKKkKKMMMMMMKKkKKcCCo.........',
  '........ooCCcKKKKKMMWWWWMMKKKKKcCCo.........',
  '......ooCCcKKKKKKKMMMMMMKKKKKKKoCCo.........',
  '.....oCCo..oKKKKKKKKKKKKKKKKKKKKo.oo........',
  '....oCCo...oKKKKkKKKKKKKKKKkKKKKoMMMMBBBBBB.',
  '...oCCo....oKKKKkKKkYYYYkKKkKKKKoWWWWBBBBBo.',
  '..oCCo.....oKKKKKKKKKKKKKKKKKKKKoMMMMMMMoo..',
  '..ooo......oCCcKKKKKKKKKKKKKKcCCo...........',
  '..........oCCcKKKKKKKKKKKKKKKKcCCo..........',
  '.........oCCo.oKKKKKooooKKKKKo.oCCo.........',
  '........oCCo..oKKKKo....oKKKKo..oCCo........',
  '........ooo..oKKKKo......oKKKKo..ooo........',
  '.............oKKkKo......oKkKKo.............',
  '............oKKKKo........oKKKKo............',
  '............oooooo........oooooo............',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
];

const BOSS_SLAM_WINDUP = [
  '.........oo.................................',
  '........oBBo...................oo...........',
  '.........oBBo.................oBBo..........',
  '..........oBBo....oo......oo.oBBo...........',
  '...........oMBo..oYYo....oYYoBBo............',
  '............oYYooYMWYo..oYWMYo..............',
  '.............oYYYoYYYo..oYYYo...............',
  '..............oKKKKKKoYYoKKo................',
  '..............oKKKKkYYkKKKKo................',
  '.............oKKKSSSSSSSSKKKo...............',
  '.............oKKSEESSSSEESKKo...............',
  '.............oKKSSSSSSSSSSKKo...............',
  '............ooKKkSSSSSSSSkKKoo..............',
  '...........oCCCkKKKKKKKKKKkCCCo.............',
  '..........oCCcKKkKKMMMMMMKKkKKcCCo..........',
  '.........oCCcKKKKKMMWWWWMMKKKKKcCCo.........',
  '........oCCoKKKKKKKMMMMMMKKKKKKKoCCo........',
  '.......oCCo.oKKKKkKKKKKKKKKKkKKKKoCCo.......',
  '......oCCo..oKKKKkKKkYYYYkKKkKKKKo.oCCo.....',
  '.....oCCo...oKKKKKKKKKKKKKKKKKKKKo..ooo.....',
  '.....ooo....oCCcKKKKKKKKKKKKKKcCCo..........',
  '............oKKKKKKooooKKKKKKo..............',
  '............oKKKKo......oKKKKo..............',
  '............oKKKKo......oKKKKo..............',
  '............oKKkKo......oKkKKo..............',
  '...........oKKKKo........oKKKKo.............',
  '...........oooooo........oooooo.............',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
];

function padEnemyRows(rows: string[], targetHeight: number, padBottom: number): string[] {
  const width = rows[0]?.length ?? 26;
  const empty = '.'.repeat(width);
  const sliced = rows.slice(0, targetHeight);
  let lastNonEmpty = sliced.length - 1;
  while (lastNonEmpty >= 0 && !sliced[lastNonEmpty].includes('o')) {
    lastNonEmpty--;
  }
  const desiredFootRow = targetHeight - 1 - padBottom;
  const shift = desiredFootRow - lastNonEmpty;
  if (shift <= 0) return sliced;
  const result: string[] = [];
  for (let i = 0; i < shift; i++) result.push(empty);
  for (let i = 0; i < sliced.length - shift; i++) result.push(sliced[i]);
  return result;
}

/**
 * Adds bespoke visual details per Story Boss (Akaza's pink hair & tattoos,
 * Muzan's white fedora & crimson blood whips, Kyogai's drums, Hand Demon's
 * extra arms, Hantengu's lightning drum ring, Kokushibo's 6 eyes & crescent blade, etc.).
 */
function customizeBossPair(base: EnemySpritePair, bossId: BossId): EnemySpritePair {
  if (bossId === 'demon_moon') return base;

  const w = base.normal.width;
  const h = base.normal.height;

  const right = document.createElement('canvas');
  right.width = w;
  right.height = h;
  const ctx = right.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(base.normal.right, 0, 0);

  const px = (x: number, y: number, color: string, pw = 1, ph = 1) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, pw, ph);
  };
  const clear = (x: number, y: number, pw = 1, ph = 1) => {
    ctx.clearRect(x, y, pw, ph);
  };

  if (bossId === 'hand_demon') {
    // Remove horns & overlay sprawling extra green-grey demon hands
    clear(12, 10, 18, 5);
    px(15, 13, '#516e43', 13, 8);
    px(7, 15, '#617a53', 5, 4);
    px(6, 13, '#84cc16', 2, 3);
    px(28, 13, '#617a53', 6, 4);
    px(33, 11, '#ecfccb', 2, 3);
    px(10, 20, '#364a2e', 5, 5);
  } else if (bossId === 'kyogai') {
    // 3 Bronze Tsuzumi Drums mounted on shoulders & chest
    px(11, 20, '#92400e', 5, 5);
    px(12, 21, '#fde68a', 3, 3);
    px(26, 20, '#92400e', 5, 5);
    px(27, 21, '#fde68a', 3, 3);
    px(19, 24, '#b45309', 5, 5);
    px(20, 25, '#fef3c7', 3, 3);
  } else if (bossId === 'rui') {
    // Ghost-white spiky hair & floating crimson web threads
    clear(12, 10, 18, 5);
    px(16, 13, '#f8fafc', 11, 5);
    px(15, 16, '#f1f5f9', 3, 4);
    px(25, 16, '#f1f5f9', 3, 4);
    px(6, 19, '#fb7185', 5, 1);
    px(32, 17, '#e11d48', 7, 1);
    px(34, 21, '#ffe4e6', 6, 1);
  } else if (bossId === 'enmu') {
    // Dream-eye crest & eerie purple train-flesh tendrils
    clear(12, 10, 18, 5);
    px(16, 14, '#2e264d', 11, 4);
    px(18, 22, '#22d3ee', 2, 2);
    px(23, 22, '#e879f9', 2, 2);
    px(7, 22, '#7c3aed', 5, 2);
  } else if (bossId === 'akaza') {
    // Short spiky pink hair, indigo martial tattoos & glowing rose fists
    clear(12, 10, 18, 6);
    px(16, 13, '#f43f5e', 11, 4);
    px(15, 14, '#ec4899', 2, 2);
    px(26, 14, '#ec4899', 2, 2);
    // Blue martial tattoos across chest/face
    px(17, 22, '#4338ca', 2, 6);
    px(23, 22, '#4338ca', 2, 6);
    px(19, 20, '#4338ca', 4, 2);
    // Glowing crimson fist aura
    px(31, 25, '#ffe4e6', 3, 3);
  } else if (bossId === 'gyutaro') {
    // Messy black-green hair + floating pink/magenta Daki obi sash + curved crimson sickles
    clear(12, 10, 18, 5);
    px(15, 13, '#14261c', 12, 5);
    px(16, 16, '#22c55e', 2, 2);
    px(25, 16, '#22c55e', 2, 2);
    // Floating pink obi sash arcing behind shoulder
    px(7, 14, '#db2777', 4, 3);
    px(5, 17, '#f472b6', 4, 5);
    // Blood sickle edge
    px(32, 22, '#fb7185', 5, 2);
    px(35, 24, '#be123c', 2, 4);
  } else if (bossId === 'hantengu') {
    // Ring of 4 wooden lightning drums behind shoulders (Zohakuten)
    px(9, 13, '#78350f', 4, 4);
    px(10, 14, '#facc15', 2, 2);
    px(29, 13, '#78350f', 4, 4);
    px(30, 14, '#facc15', 2, 2);
    px(13, 8, '#78350f', 4, 4);
    px(14, 9, '#fef9c3', 2, 2);
    px(25, 8, '#78350f', 4, 4);
    px(26, 9, '#fef9c3', 2, 2);
  } else if (bossId === 'kokushibo') {
    // 6 piercing crimson eyes + sweeping purple ponytail + crimson moon flesh blade
    clear(12, 10, 18, 5);
    px(16, 13, '#1e102e', 11, 4);
    px(11, 15, '#3b1d5e', 4, 8);
    // 6 glowing eyes
    px(18, 17, '#ef4444', 1, 1);
    px(20, 18, '#ef4444', 1, 1);
    px(18, 19, '#ef4444', 1, 1);
    px(24, 17, '#ef4444', 1, 1);
    px(22, 18, '#ef4444', 1, 1);
    px(24, 19, '#ef4444', 1, 1);
  } else if (bossId === 'muzan') {
    // Iconic White Fedora Hat + Crimson Eyes + Whipping Crimson Blood Tendrils!
    clear(12, 10, 18, 6);
    px(13, 12, '#f8fafc', 17, 2); // fedora brim
    px(16, 9, '#e2e8f0', 11, 3); // fedora crown
    px(16, 11, '#0f111a', 11, 1); // black hat ribbon
    px(18, 17, '#ef4444', 2, 1); // piercing crimson eye
    px(23, 17, '#ef4444', 2, 1); // piercing crimson eye
    // Crimson blood biokinesis tendrils erupting from back
    px(4, 16, '#b91c1c', 6, 2);
    px(2, 18, '#ef4444', 5, 2);
    px(5, 22, '#dc2626', 6, 2);
    px(31, 15, '#ef4444', 6, 2);
    px(35, 17, '#fee2e2', 3, 2);
  }

  // Left-facing mirror
  const left = document.createElement('canvas');
  left.width = w;
  left.height = h;
  const lCtx = left.getContext('2d')!;
  lCtx.imageSmoothingEnabled = false;
  lCtx.save();
  lCtx.translate(w, 0);
  lCtx.scale(-1, 1);
  lCtx.drawImage(right, 0, 0);
  lCtx.restore();

  return {
    normal: { width: w, height: h, right, left },
    flash: base.flash,
  };
}

export function createEnemySprites(): EnemySpriteSet {
  const kNorm = (r: string[]) => padEnemyRows(r, 26, 2);
  const oNorm = (r: string[]) => padEnemyRows(r, 36, 2);
  const bNorm = (r: string[]) => padEnemyRows(r, 44, 2);

  const bossCache = new Map<BossId, BossSpriteGroup>();

  const buildBossGroup = (bossId: BossId): BossSpriteGroup => {
    const existing = bossCache.get(bossId);
    if (existing) return existing;

    const pal = BOSS_PALETTES[bossId];
    const group: BossSpriteGroup = {
      move: [
        customizeBossPair(compilePair(bNorm(BOSS_MOVE_0), pal), bossId),
        customizeBossPair(compilePair(bNorm(BOSS_MOVE_1), pal), bossId),
      ],
      telegraph: customizeBossPair(compilePair(bNorm(BOSS_TELEGRAPH), pal), bossId),
      attack: customizeBossPair(compilePair(bNorm(BOSS_ATTACK), pal), bossId),
      slamWindup: customizeBossPair(compilePair(bNorm(BOSS_SLAM_WINDUP), pal), bossId),
      anchorX: 20,
      anchorY: 42,
    };
    bossCache.set(bossId, group);
    return group;
  };

  return {
    kage: {
      move: [
        compilePair(kNorm(KAGE_MOVE_0), KAGE_PALETTE),
        compilePair(kNorm(KAGE_MOVE_1), KAGE_PALETTE),
      ],
      telegraph: compilePair(kNorm(KAGE_TELEGRAPH), KAGE_PALETTE),
      attack: compilePair(kNorm(KAGE_ATTACK), KAGE_PALETTE),
      anchorX: 12,
      anchorY: 24,
    },
    oni: {
      move: [
        compilePair(oNorm(ONI_MOVE_0), ONI_PALETTE),
        compilePair(oNorm(ONI_MOVE_1), ONI_PALETTE),
      ],
      telegraph: compilePair(oNorm(ONI_TELEGRAPH), ONI_PALETTE),
      attack: compilePair(oNorm(ONI_ATTACK), ONI_PALETTE),
      anchorX: 14,
      anchorY: 34,
    },
    boss: buildBossGroup('demon_moon'),
    getBoss: buildBossGroup,
  };
}

const bossPreviewCache = new Map<string, string>();
let sharedSpriteSet: EnemySpriteSet | null = null;

export function getBossPreviewDataUrl(bossId: BossId, silhouette = false): string {
  const cacheKey = `${bossId}:${silhouette ? 'sil' : 'full'}`;
  const cached = bossPreviewCache.get(cacheKey);
  if (cached) return cached;

  if (!sharedSpriteSet) {
    sharedSpriteSet = createEnemySprites();
  }
  const sprite = sharedSpriteSet.getBoss(bossId).move[0].normal.right;
  const canvas = document.createElement('canvas');
  canvas.width = sprite.width;
  canvas.height = sprite.height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, 0, 0);

  if (silhouette) {
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#090e1c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }

  const url = canvas.toDataURL();
  bossPreviewCache.set(cacheKey, url);
  return url;
}
