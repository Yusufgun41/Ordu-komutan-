import type { UnitType, UnitConfig, UpgradeLevels, Difficulty, GameStats } from './types.ts';

export const UNIT_CONFIGS: Record<UnitType, UnitConfig> = {
  infantry: {
    name: 'Piyade',
    role: 'Hızlı & Dengeli Ön Hat',
    cost: 25,
    hp: 140,
    damage: 18,
    range: 2.4,
    speed: 4.8,
    attackRate: 0.85,
    color: 0x3b82f6,
    scale: 0.9,
    description: 'Kılıç ve kalkanlı çevik savaşçı. Hızlı üretilir ve ön safları tutar.'
  },
  archer: {
    name: 'Okçu',
    role: 'Uzun Menzilli Saldırı',
    cost: 40,
    hp: 80,
    damage: 22,
    range: 14.0,
    speed: 4.2,
    attackRate: 1.3,
    color: 0x10b981,
    scale: 0.85,
    description: 'Uzaktan ölümcül ok yağmuru. Önünde koruma olduğunda son derece etkilidir.'
  },
  knight: {
    name: 'Şövalye',
    role: 'Ağır Zırhlı Tank',
    cost: 80,
    hp: 340,
    damage: 32,
    range: 2.6,
    speed: 3.2,
    attackRate: 1.15,
    color: 0x8b5cf6,
    scale: 1.15,
    description: 'Çelik zırhlı ve devasa kalkanlı muhafız. Düşman hasarını üzerine çeker.'
  },
  catapult: {
    name: 'Mancınık',
    role: 'Alan Etkili Kuşatma Silahı',
    cost: 130,
    hp: 160,
    damage: 65,
    range: 18.0,
    speed: 2.2,
    attackRate: 2.6,
    aoeRadius: 4.5,
    color: 0xd97706,
    scale: 1.25,
    description: 'Dev kaya fırlatan kuşatma makinesi. Kalelere ve kalabalıklara alan hasarı vurur.'
  },
  mage: {
    name: 'Büyücü',
    role: 'Büyüsel Alan Hasarı',
    cost: 95,
    hp: 95,
    damage: 38,
    range: 11.0,
    speed: 3.8,
    attackRate: 1.5,
    aoeRadius: 3.2,
    color: 0xec4899,
    scale: 0.95,
    description: 'Ateş ve şimşek büyüleri fırlatarak düşman gruplarını dağıtır.'
  }
};

export const UPGRADE_CONFIGS = {
  goldMine: {
    name: 'Altın Madeni',
    icon: '⛏️',
    description: 'Saniye başına altın gelirini artırır',
    baseCost: 60,
    costMultiplier: 1.6,
    baseIncome: 5,
    incomePerLevel: 3,
    maxLevel: 5
  },
  weaponForge: {
    name: 'Demirhane',
    icon: '⚔️',
    description: 'Birliklerin saldırı gücünü %15 artırır',
    baseCost: 75,
    costMultiplier: 1.7,
    damageBoostPerLevel: 0.15,
    maxLevel: 5
  },
  armorPlating: {
    name: 'Zırh Atölyesi',
    icon: '🛡️',
    description: 'Birliklerin maksimum canını %15 artırır',
    baseCost: 80,
    costMultiplier: 1.7,
    hpBoostPerLevel: 0.15,
    maxLevel: 5
  },
  towerDefense: {
    name: 'Sur Savunması',
    icon: '🏰',
    description: 'Üs savunma kulelerinin hasarını ve menzilini artırır',
    baseCost: 90,
    costMultiplier: 1.75,
    towerBonusPerLevel: 0.25,
    maxLevel: 4
  }
};

/**
 * Calculates upgrade cost based on current level
 */
export function getUpgradeCost(type: keyof UpgradeLevels, currentLevel: number): number {
  const config = UPGRADE_CONFIGS[type];
  if (currentLevel >= config.maxLevel) return -1; // Maxed
  return Math.round(config.baseCost * Math.pow(config.costMultiplier, currentLevel));
}

/**
 * Calculates current gold per second based on mine level
 */
export function getGoldPerSecond(mineLevel: number): number {
  return UPGRADE_CONFIGS.goldMine.baseIncome + (mineLevel * UPGRADE_CONFIGS.goldMine.incomePerLevel);
}

export const MAX_UNIT_LEVEL = 3;

export const XP_TABLE: Record<number, number> = {
  1: 0,
  2: 60,
  3: 160
};

export const KILL_XP_BY_TYPE: Record<UnitType, number> = {
  infantry: 40,
  archer: 45,
  knight: 70,
  mage: 60,
  catapult: 85
};

/**
 * Calculates current unit level from cumulative XP
 */
export function getLevelFromXp(xp: number): number {
  if (xp >= XP_TABLE[3]) return 3;
  if (xp >= XP_TABLE[2]) return 2;
  return 1;
}

/**
 * Returns XP needed to reach next level, or -1 if maxed
 */
export function getNextLevelXpRequired(level: number): number {
  if (level >= MAX_UNIT_LEVEL) return -1;
  return XP_TABLE[level + 1];
}

/**
 * Returns stat multipliers based on unit level
 */
export function getLevelMultipliers(level: number) {
  switch (level) {
    case 3:
      return { damageMult: 1.65, hpMult: 1.65, attackRateMult: 0.85, scaleMult: 1.16 };
    case 2:
      return { damageMult: 1.30, hpMult: 1.30, attackRateMult: 0.92, scaleMult: 1.08 };
    case 1:
    default:
      return { damageMult: 1.0, hpMult: 1.0, attackRateMult: 1.0, scaleMult: 1.0 };
  }
}

/**
 * Returns Turkish rank title based on level
 */
export function getLevelTitle(level: number): string {
  switch (level) {
    case 3:
      return 'Şampiyon ★★';
    case 2:
      return 'Kıdemli ★';
    case 1:
    default:
      return 'Çaylak';
  }
}

/**
 * Calculates modified unit stats with active upgrades and unit level
 */
export function getEffectiveUnitStats(type: UnitType, upgrades: UpgradeLevels, level: number = 1) {
  const base = UNIT_CONFIGS[type];
  const forgeMult = 1 + (upgrades.weaponForge * UPGRADE_CONFIGS.weaponForge.damageBoostPerLevel);
  const armorMult = 1 + (upgrades.armorPlating * UPGRADE_CONFIGS.armorPlating.hpBoostPerLevel);
  const levelMult = getLevelMultipliers(level);

  return {
    ...base,
    damage: Math.round(base.damage * forgeMult * levelMult.damageMult),
    hp: Math.round(base.hp * armorMult * levelMult.hpMult),
    maxHp: Math.round(base.hp * armorMult * levelMult.hpMult),
    attackRate: Number((base.attackRate * levelMult.attackRateMult).toFixed(2)),
    scale: Number((base.scale * levelMult.scaleMult).toFixed(2))
  };
}

/**
 * Calculates combat damage with slight RNG variance (±10%)
 */
export function calculateDamage(baseDamage: number, variance: number = 0.1): number {
  const multiplier = 1 + (Math.random() * (variance * 2) - variance);
  return Math.max(1, Math.round(baseDamage * multiplier));
}

/**
 * Calculates distance in 2D plane (XZ)
 */
export function getDistance2D(x1: number, z1: number, x2: number, z2: number): number {
  const dx = x1 - x2;
  const dz = z1 - z2;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Evaluates star rating at the end of the match
 */
export function calculateBattleStars(
  playerBaseHp: number,
  maxBaseHp: number,
  durationSeconds: number,
  playerUnitsLost: number
): number {
  if (playerBaseHp <= 0) return 0;
  
  let stars = 1; // 1 star for victory
  const hpPercent = (playerBaseHp / maxBaseHp) * 100;

  // 2nd star: Castle survived with > 50% HP or fast clear
  if (hpPercent >= 50 || durationSeconds < 90) {
    stars++;
  }

  // 3rd star: Castle survived with > 80% HP and reasonable casualties
  if (hpPercent >= 80 && playerUnitsLost <= 15) {
    stars = 3;
  }

  return Math.min(3, Math.max(1, stars));
}

/**
 * Generates an enemy spawn decision based on difficulty, elapsed time and current gold
 */
export function decideEnemySpawn(
  enemyGold: number,
  elapsedSeconds: number,
  difficulty: Difficulty
): UnitType | null {
  const difficultyMult = difficulty === 'hard' ? 1.3 : difficulty === 'epic' ? 1.6 : 1.0;
  const weightedTime = elapsedSeconds * difficultyMult;

  // Available roster unlocks over time
  const options: Array<{ type: UnitType; cost: number; weight: number }> = [
    { type: 'infantry', cost: UNIT_CONFIGS.infantry.cost, weight: 40 }
  ];

  if (weightedTime > 10) {
    options.push({ type: 'archer', cost: UNIT_CONFIGS.archer.cost, weight: 35 });
  }
  if (weightedTime > 25) {
    options.push({ type: 'knight', cost: UNIT_CONFIGS.knight.cost, weight: 25 });
  }
  if (weightedTime > 45) {
    options.push({ type: 'mage', cost: UNIT_CONFIGS.mage.cost, weight: 20 });
  }
  if (weightedTime > 65) {
    options.push({ type: 'catapult', cost: UNIT_CONFIGS.catapult.cost, weight: 15 });
  }

  // Filter affordable
  const affordable = options.filter(opt => enemyGold >= opt.cost);
  if (affordable.length === 0) return null;

  // Pick weighted random
  const totalWeight = affordable.reduce((sum, item) => sum + item.weight, 0);
  let randomVal = Math.random() * totalWeight;

  for (const item of affordable) {
    if (randomVal <= item.weight) {
      return item.type;
    }
    randomVal -= item.weight;
  }

  return affordable[affordable.length - 1].type;
}
