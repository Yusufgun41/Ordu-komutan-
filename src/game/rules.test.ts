import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getUpgradeCost,
  getGoldPerSecond,
  getEffectiveUnitStats,
  calculateBattleStars,
  decideEnemySpawn,
  getDistance2D,
  getLevelFromXp,
  getNextLevelXpRequired,
  getLevelTitle
} from './rules.ts';

test('gold income scales with mine level', () => {
  assert.equal(getGoldPerSecond(0), 5);
  assert.equal(getGoldPerSecond(1), 8);
  assert.equal(getGoldPerSecond(3), 14);
});

test('upgrade cost increases with level and caps at maxLevel', () => {
  const level0Cost = getUpgradeCost('goldMine', 0);
  const level1Cost = getUpgradeCost('goldMine', 1);
  assert.ok(level1Cost > level0Cost);
  assert.equal(getUpgradeCost('goldMine', 5), -1); // Max level capped
});

test('unit stats scale with weapon and armor upgrades', () => {
  const baseStats = getEffectiveUnitStats('infantry', {
    goldMine: 0,
    weaponForge: 0,
    armorPlating: 0,
    towerDefense: 0
  });

  const upgradedStats = getEffectiveUnitStats('infantry', {
    goldMine: 0,
    weaponForge: 2, // +30% damage
    armorPlating: 2, // +30% HP
    towerDefense: 0
  });

  assert.ok(upgradedStats.damage > baseStats.damage);
  assert.ok(upgradedStats.hp > baseStats.hp);
  assert.equal(upgradedStats.damage, Math.round(baseStats.damage * 1.3));
});

test('2D distance calculation is accurate', () => {
  const dist = getDistance2D(0, 0, 3, 4);
  assert.equal(dist, 5);
});

test('battle star rating rewards castle health and casualties', () => {
  // Defeat gives 0 stars
  assert.equal(calculateBattleStars(0, 1000, 120, 20), 0);

  // Victory with low HP gives 1 star
  assert.equal(calculateBattleStars(300, 1000, 180, 25), 1);

  // Victory with > 50% HP gives 2 stars
  assert.equal(calculateBattleStars(600, 1000, 150, 18), 2);

  // Flawless victory with > 80% HP and <= 15 losses gives 3 stars
  assert.equal(calculateBattleStars(900, 1000, 60, 5), 3);
});

test('enemy spawn decision respects gold budget', () => {
  // If enemy has only 10 gold, nothing is affordable
  const decisionNoGold = decideEnemySpawn(10, 30, 'normal');
  assert.equal(decisionNoGold, null);

  // If enemy has 30 gold, can afford infantry
  const decisionInfantry = decideEnemySpawn(30, 0, 'normal');
  assert.equal(decisionInfantry, 'infantry');
});

test('xp calculation and level transitions function correctly', () => {
  assert.equal(getLevelFromXp(0), 1);
  assert.equal(getLevelFromXp(59), 1);
  assert.equal(getLevelFromXp(60), 2);
  assert.equal(getLevelFromXp(159), 2);
  assert.equal(getLevelFromXp(160), 3);
  assert.equal(getLevelFromXp(300), 3);

  assert.equal(getNextLevelXpRequired(1), 60);
  assert.equal(getNextLevelXpRequired(2), 160);
  assert.equal(getNextLevelXpRequired(3), -1);

  assert.equal(getLevelTitle(1), 'Çaylak');
  assert.equal(getLevelTitle(2), 'Kıdemli ★');
  assert.equal(getLevelTitle(3), 'Şampiyon ★★');
});

test('unit level up significantly boosts damage, hp, and scale', () => {
  const zeroUpgrades = { goldMine: 0, weaponForge: 0, armorPlating: 0, towerDefense: 0 };
  const lvl1 = getEffectiveUnitStats('knight', zeroUpgrades, 1);
  const lvl2 = getEffectiveUnitStats('knight', zeroUpgrades, 2);
  const lvl3 = getEffectiveUnitStats('knight', zeroUpgrades, 3);

  // Level 2 has +30% damage and HP
  assert.ok(lvl2.damage > lvl1.damage);
  assert.ok(lvl2.hp > lvl1.hp);
  assert.equal(lvl2.damage, Math.round(lvl1.damage * 1.3));
  assert.equal(lvl2.hp, Math.round(lvl1.hp * 1.3));

  // Level 3 has +65% damage and HP
  assert.ok(lvl3.damage > lvl2.damage);
  assert.ok(lvl3.hp > lvl2.hp);
  assert.equal(lvl3.damage, Math.round(lvl1.damage * 1.65));
});

