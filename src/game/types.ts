export type UnitType = 'infantry' | 'archer' | 'knight' | 'catapult' | 'mage';
export type Team = 'player' | 'enemy';
export type ArmyCommand = 'attack' | 'defend' | 'rally';
export type GameStatus = 'title' | 'playing' | 'paused' | 'gameover';
export type GameResult = 'victory' | 'defeat' | null;
export type Difficulty = 'normal' | 'hard' | 'epic';

export interface UnitConfig {
  name: string;
  role: string;
  cost: number;
  hp: number;
  damage: number;
  range: number;
  speed: number;
  attackRate: number; // seconds between attacks
  aoeRadius?: number;
  color: number;
  scale: number;
  description: string;
}

export interface UnitData {
  id: string;
  type: UnitType;
  team: Team;
  level: number;
  xp: number;
  kills: number;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  speed: number;
  attackRate: number;
  lastAttack: number;
  aoeRadius?: number;
  position: { x: number; y: number; z: number };
  targetId: string | null;
  targetBase: boolean;
  isAttacking: boolean;
  attackAnimationProgress: number;
}

export interface Projectile {
  id: string;
  type: 'arrow' | 'boulder' | 'magic';
  team: Team;
  shooterUnitId?: string;
  startPos: { x: number; y: number; z: number };
  currentPos: { x: number; y: number; z: number };
  targetPos: { x: number; y: number; z: number };
  progress: number;
  speed: number;
  damage: number;
  aoeRadius: number;
  arcHeight: number;
}

export interface UpgradeLevels {
  goldMine: number;
  weaponForge: number;
  armorPlating: number;
  towerDefense: number;
}

export interface GameStats {
  kills: number;
  playerUnitsLost: number;
  playerUnitsSpawned: number;
  enemyUnitsKilled: number;
  totalGoldEarned: number;
  totalGoldSpent: number;
  battleDurationSeconds: number;
  starsEarned: number;
  totalLevelUps: number;
  topHeroUnit: { name: string; type: UnitType; level: number; kills: number } | null;
}

export interface BattlefieldSnapshot {
  playerCount: number;
  enemyCount: number;
  playerBaseHp: number;
  enemyBaseHp: number;
  maxBaseHp: number;
  gold: number;
  goldPerSecond: number;
  armyCommand: ArmyCommand;
  timeRemainingOrElapsed: number;
  currentWave: number;
  veteranCount: number;
  topHero: { name: string; type: UnitType; level: number; kills: number } | null;
}
