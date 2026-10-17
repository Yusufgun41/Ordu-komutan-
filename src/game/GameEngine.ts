import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {
  UnitType,
  Team,
  ArmyCommand,
  Difficulty,
  UpgradeLevels,
  GameStats,
  BattlefieldSnapshot,
  Projectile
} from './types.ts';
import {
  UNIT_CONFIGS,
  UPGRADE_CONFIGS,
  getGoldPerSecond,
  getEffectiveUnitStats,
  calculateDamage,
  getDistance2D,
  decideEnemySpawn,
  calculateBattleStars,
  KILL_XP_BY_TYPE,
  getLevelFromXp,
  getLevelTitle,
  MAX_UNIT_LEVEL
} from './rules.ts';
import { soundSystem } from './audio.ts';
import {
  createUnitMesh,
  createCastleBase,
  createBattlefieldEnvironment
} from './models.ts';

interface ActiveUnit {
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
  mesh: THREE.Group;
  hpBarFg: THREE.Mesh;
  hpBarGroup: THREE.Group;
  star1: THREE.Mesh | null;
  star2: THREE.Mesh | null;
  weaponGroup: THREE.Group | null;
  targetUnit: ActiveUnit | null;
  targetBase: boolean;
  attackAnimTimer: number;
  isDying: boolean;
  deathTimer: number;
}

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

export class GameEngine {
  private container: HTMLDivElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private animFrameId: number | null = null;

  // Game state
  public isRunning: boolean = false;
  public isPaused: boolean = false;
  public difficulty: Difficulty = 'normal';
  public armyCommand: ArmyCommand = 'attack';
  public upgrades: UpgradeLevels = {
    goldMine: 0,
    weaponForge: 0,
    armorPlating: 0,
    towerDefense: 0
  };

  public gold: number = 60;
  public enemyGold: number = 50;
  public playerBaseHp: number = 1200;
  public enemyBaseHp: number = 1200;
  public readonly maxBaseHp: number = 1200;

  public units: ActiveUnit[] = [];
  public projectiles: Projectile[] = [];
  private projectileMeshes: Map<string, THREE.Mesh> = new Map();

  // Stats
  public stats: GameStats = {
    kills: 0,
    playerUnitsLost: 0,
    playerUnitsSpawned: 0,
    enemyUnitsKilled: 0,
    totalGoldEarned: 60,
    totalGoldSpent: 0,
    battleDurationSeconds: 0,
    starsEarned: 0,
    totalLevelUps: 0,
    topHeroUnit: null
  };

  // Base meshes
  private playerBaseMesh!: THREE.Group;
  private enemyBaseMesh!: THREE.Group;

  // Turret timers
  private playerTurretLastShot: number = 0;
  private enemyTurretLastShot: number = 0;

  // Enemy AI timer
  private enemyAiTimer: number = 0;

  // HUD callback
  public onSnapshotUpdate?: (snapshot: BattlefieldSnapshot) => void;
  public onGameOver?: (result: 'victory' | 'defeat', stats: GameStats) => void;

  // Camera navigation & touch handling
  private camTargetX: number = 0;
  private camTargetZ: number = 24;
  private camZoom: number = 42;
  private isPointerDown: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;
  private initialPinchDistance: number | null = null;
  private initialPinchZoom: number = 42;

  // Pooled particle ring buffer
  private particlePool: Particle[] = [];
  private readonly MAX_PARTICLES = 120;

  // Snapshot throttle
  private lastSnapshotTime: number = 0;

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.initThree();
    this.initSceneObjects();
    this.initParticlePool();
    this.setupInputListeners();
  }

  private initThree() {
    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x93c5fd);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0x93c5fd, 0.012);

    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.5,
      250
    );
    this.camera.position.set(0, 34, 46);
    this.camera.lookAt(0, 0, 18);

    // Environment reflections
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // Fallback
    }

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x166534, 0.55);
    hemi.position.set(0, 40, 0);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfffbeb, 0.9);
    sun.position.set(28, 48, 22);
    if (!isHeadless) {
      sun.castShadow = true;
      sun.shadow.mapSize.width = 1024;
      sun.shadow.mapSize.height = 1024;
      sun.shadow.camera.near = 5;
      sun.shadow.camera.far = 140;
      sun.shadow.camera.left = -40;
      sun.shadow.camera.right = 40;
      sun.shadow.camera.top = 40;
      sun.shadow.camera.bottom = -40;
      sun.shadow.bias = -0.0005;
    }
    this.scene.add(sun);
  }

  private initSceneObjects() {
    createBattlefieldEnvironment(this.scene);

    // Player base (Z = 46) and Enemy base (Z = -46)
    this.playerBaseMesh = createCastleBase('player', 46);
    this.scene.add(this.playerBaseMesh);

    this.enemyBaseMesh = createCastleBase('enemy', -46);
    this.scene.add(this.enemyBaseMesh);
  }

  private initParticlePool() {
    const geo = new THREE.DodecahedronGeometry(0.18);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.particlePool.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        active: false
      });
    }
  }

  public emitParticles(x: number, y: number, z: number, color: number, count = 8, spread = 2.5) {
    let spawned = 0;
    for (const p of this.particlePool) {
      if (!p.active) {
        p.active = true;
        p.mesh.visible = true;
        (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
        p.mesh.position.set(x, y, z);
        p.vel.set(
          (Math.random() - 0.5) * spread,
          Math.random() * spread * 0.8 + 1.2,
          (Math.random() - 0.5) * spread
        );
        p.life = 0;
        p.maxLife = 0.35 + Math.random() * 0.25;
        p.mesh.scale.setScalar(0.8 + Math.random() * 0.5);

        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  private setupInputListeners() {
    const dom = this.renderer.domElement;

    // Pointer events for smooth mobile touch & mouse drag pan
    dom.addEventListener('pointerdown', (e: PointerEvent) => {
      this.isPointerDown = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.isPointerDown) return;
      const dx = (e.clientX - this.lastPointerX) * 0.08;
      const dy = (e.clientY - this.lastPointerY) * 0.08;

      this.camTargetX -= dx;
      this.camTargetZ -= dy;

      // Restrict camera boundaries within arena
      this.camTargetX = Math.max(-20, Math.min(20, this.camTargetX));
      this.camTargetZ = Math.max(-36, Math.min(36, this.camTargetZ));

      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    });

    const endPointer = () => {
      this.isPointerDown = false;
      this.initialPinchDistance = null;
    };
    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', endPointer);

    // Multi-touch Pinch to Zoom on Mobile
    dom.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.initialPinchDistance = Math.hypot(dx, dy);
        this.initialPinchZoom = this.camZoom;
      }
    }, { passive: true });

    dom.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length === 2 && this.initialPinchDistance !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = this.initialPinchDistance / dist;
        this.camZoom = Math.max(20, Math.min(60, this.initialPinchZoom * factor));
      }
    }, { passive: true });

    // Mouse wheel zoom
    dom.addEventListener('wheel', (e: WheelEvent) => {
      this.camZoom = Math.max(20, Math.min(60, this.camZoom + e.deltaY * 0.04));
    }, { passive: true });

    // Handle Resize
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  /**
   * Jump camera to tactical landmark presets
   */
  public jumpToCamera(preset: 'playerBase' | 'midfield' | 'enemyBase') {
    if (preset === 'playerBase') {
      this.camTargetX = 0;
      this.camTargetZ = 28;
    } else if (preset === 'midfield') {
      this.camTargetX = 0;
      this.camTargetZ = 0;
    } else if (preset === 'enemyBase') {
      this.camTargetX = 0;
      this.camTargetZ = -28;
    }
  }

  /**
   * Start a new battle
   */
  public startBattle(difficulty: Difficulty = 'normal') {
    this.difficulty = difficulty;
    this.isRunning = true;
    this.isPaused = false;
    this.gold = 70;
    this.enemyGold = difficulty === 'hard' ? 90 : difficulty === 'epic' ? 120 : 60;
    this.playerBaseHp = this.maxBaseHp;
    this.enemyBaseHp = this.maxBaseHp;
    this.armyCommand = 'attack';
    this.upgrades = { goldMine: 0, weaponForge: 0, armorPlating: 0, towerDefense: 0 };
    this.stats = {
      kills: 0,
      playerUnitsLost: 0,
      playerUnitsSpawned: 0,
      enemyUnitsKilled: 0,
      totalGoldEarned: this.gold,
      totalGoldSpent: 0,
      battleDurationSeconds: 0,
      starsEarned: 0,
      totalLevelUps: 0,
      topHeroUnit: null
    };

    // Clean existing units
    this.clearAllUnits();
    this.clearAllProjectiles();

    // Spawn 2 initial guard infantry for both sides to make the scene immediately lively
    this.spawnUnit('infantry', 'player', true);
    this.spawnUnit('infantry', 'enemy', true);

    this.jumpToCamera('playerBase');

    if (!this.animFrameId) {
      this.clock.start();
      this.animate();
    }
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (!paused) {
      this.clock.getDelta(); // flush delta
    }
  }

  public setCommand(cmd: ArmyCommand) {
    this.armyCommand = cmd;
    soundSystem.playCommandHorn();
  }

  /**
   * Spawns a unit if player has enough gold
   */
  public spawnPlayerUnit(type: UnitType): boolean {
    const stats = getEffectiveUnitStats(type, this.upgrades);
    if (this.gold < stats.cost) return false;

    // Check army cap (max 25 player units)
    const playerCount = this.units.filter(u => u.team === 'player' && !u.isDying).length;
    if (playerCount >= 25) return false;

    this.gold -= stats.cost;
    this.stats.totalGoldSpent += stats.cost;
    this.stats.playerUnitsSpawned++;

    soundSystem.playSpawn(type);
    this.spawnUnit(type, 'player', false);
    return true;
  }

  /**
   * Internal spawn unit method
   */
  private spawnUnit(type: UnitType, team: Team, isFree = false) {
    const stats = getEffectiveUnitStats(type, team === 'player' ? this.upgrades : {
      goldMine: 0,
      weaponForge: this.difficulty === 'epic' ? 2 : this.difficulty === 'hard' ? 1 : 0,
      armorPlating: this.difficulty === 'epic' ? 2 : this.difficulty === 'hard' ? 1 : 0,
      towerDefense: 0
    });

    const mesh = createUnitMesh(type, team);
    const spawnZ = team === 'player' ? 38 + (Math.random() * 4) : -38 - (Math.random() * 4);
    const spawnX = (Math.random() - 0.5) * 8.5;
    mesh.position.set(spawnX, 0, spawnZ);
    this.scene.add(mesh);

    const weaponGroup = (mesh.getObjectByName('weaponGroup') as THREE.Group) || null;
    const meshAny = mesh as unknown as {
      hpBarFg: THREE.Mesh;
      hpBarGroup: THREE.Group;
      star1?: THREE.Mesh;
      star2?: THREE.Mesh;
    };
    const hpBarFg = meshAny.hpBarFg;
    const hpBarGroup = meshAny.hpBarGroup;
    const star1 = meshAny.star1 || null;
    const star2 = meshAny.star2 || null;

    const unit: ActiveUnit = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      team,
      level: 1,
      xp: 0,
      kills: 0,
      hp: stats.hp,
      maxHp: stats.hp,
      damage: stats.damage,
      range: stats.range,
      speed: stats.speed,
      attackRate: stats.attackRate,
      lastAttack: this.clock.getElapsedTime() + Math.random() * 0.4,
      aoeRadius: stats.aoeRadius,
      mesh,
      hpBarFg,
      hpBarGroup,
      star1,
      star2,
      weaponGroup,
      targetUnit: null,
      targetBase: false,
      attackAnimTimer: 0,
      isDying: false,
      deathTimer: 0
    };

    this.units.push(unit);
  }

  /**
   * Buy an upgrade for the player
   */
  public buyUpgrade(upgradeKey: keyof UpgradeLevels): boolean {
    const currentLvl = this.upgrades[upgradeKey];
    const cost = UPGRADE_CONFIGS[upgradeKey].baseCost * Math.pow(UPGRADE_CONFIGS[upgradeKey].costMultiplier, currentLvl);
    if (currentLvl >= UPGRADE_CONFIGS[upgradeKey].maxLevel || this.gold < cost) return false;

    this.gold -= Math.round(cost);
    this.stats.totalGoldSpent += Math.round(cost);
    this.upgrades[upgradeKey]++;
    soundSystem.playCoin();
    return true;
  }

  /**
   * Clear all units & dispose meshes
   */
  private clearAllUnits() {
    for (const u of this.units) {
      this.scene.remove(u.mesh);
    }
    this.units = [];
  }

  private clearAllProjectiles() {
    for (const p of this.projectiles) {
      const mesh = this.projectileMeshes.get(p.id);
      if (mesh) this.scene.remove(mesh);
    }
    this.projectiles = [];
    this.projectileMeshes.clear();
  }

  /**
   * Main game animation loop
   */
  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05); // Clamp dt for physical stability
    const time = this.clock.getElapsedTime();

    if (this.isRunning && !this.isPaused) {
      this.updateSimulation(dt, time);
    }

    // Camera exponential damp follow
    const targetCamY = (this.camZoom * 0.8) + 4;
    const targetCamZ = this.camTargetZ + this.camZoom;

    this.camera.position.x += (this.camTargetX - this.camera.position.x) * 0.1;
    this.camera.position.y += (targetCamY - this.camera.position.y) * 0.1;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.1;
    this.camera.lookAt(this.camera.position.x, 0, this.camTargetZ);

    // Billboards face camera
    this.updateBillboards();

    // Update active particles
    this.updateParticles(dt);

    this.renderer.render(this.scene, this.camera);
  };

  private updateBillboards() {
    for (const u of this.units) {
      if (u.hpBarGroup) {
        u.hpBarGroup.quaternion.copy(this.camera.quaternion);
      }
    }
  }

  private updateParticles(dt: number) {
    for (const p of this.particlePool) {
      if (p.active) {
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          p.mesh.visible = false;
        } else {
          p.vel.y -= 9.8 * dt; // gravity
          p.mesh.position.addScaledVector(p.vel, dt);
          const scale = Math.max(0.01, 1 - (p.life / p.maxLife));
          p.mesh.scale.setScalar(scale * 0.7);
        }
      }
    }
  }

  private updateSimulation(dt: number, time: number) {
    this.stats.battleDurationSeconds += dt;

    // Passive gold income
    const playerIncome = getGoldPerSecond(this.upgrades.goldMine);
    this.gold += playerIncome * dt;
    this.stats.totalGoldEarned += playerIncome * dt;

    const enemyIncomeRate = (this.difficulty === 'epic' ? 10 : this.difficulty === 'hard' ? 7.5 : 5.5);
    this.enemyGold += enemyIncomeRate * dt;

    // Enemy AI decision cycle
    this.enemyAiTimer += dt;
    if (this.enemyAiTimer >= 2.4) {
      this.enemyAiTimer = 0;
      const enemyCount = this.units.filter(u => u.team === 'enemy' && !u.isDying).length;
      if (enemyCount < 25) {
        const decision = decideEnemySpawn(this.enemyGold, this.stats.battleDurationSeconds, this.difficulty);
        if (decision) {
          const cfg = UNIT_CONFIGS[decision];
          this.enemyGold -= cfg.cost;
          this.spawnUnit(decision, 'enemy', false);
        }
      }
    }

    // Castle defense turrets
    this.updateCastleTurrets(dt, time);

    // Update units combat and movement
    this.updateUnits(dt, time);

    // Update projectiles
    this.updateProjectiles(dt);

    // Check win/defeat conditions
    if (this.playerBaseHp <= 0 || this.enemyBaseHp <= 0) {
      this.handleEndGame();
    }

    // Send throttled snapshot to UI (~10Hz)
    if (time - this.lastSnapshotTime > 0.1) {
      this.lastSnapshotTime = time;
      this.publishSnapshot();
    }
  }

  private updateCastleTurrets(dt: number, time: number) {
    const turretRange = 16.0;
    const turretDamage = 25 + (this.upgrades.towerDefense * 10);
    const turretCooldown = 1.6;

    // Player Castle Turret
    if (time - this.playerTurretLastShot > turretCooldown) {
      const target = this.findClosestUnitInRadius(0, 42, turretRange, 'player');
      if (target) {
        this.playerTurretLastShot = time;
        this.fireProjectile('arrow', 'player', { x: 0, y: 8, z: 42 }, target.mesh.position, turretDamage, 0);
        soundSystem.playArrowWhoosh();
      }
    }

    // Enemy Castle Turret
    if (time - this.enemyTurretLastShot > turretCooldown) {
      const target = this.findClosestUnitInRadius(0, -42, turretRange, 'enemy');
      if (target) {
        this.enemyTurretLastShot = time;
        this.fireProjectile('arrow', 'enemy', { x: 0, y: 8, z: -42 }, target.mesh.position, turretDamage, 0);
        soundSystem.playArrowWhoosh();
      }
    }
  }

  private findClosestUnitInRadius(x: number, z: number, radius: number, teamShooter: Team): ActiveUnit | null {
    let closest: ActiveUnit | null = null;
    let minDist = radius;

    for (const u of this.units) {
      if (u.team !== teamShooter && !u.isDying && u.hp > 0) {
        const d = getDistance2D(x, z, u.mesh.position.x, u.mesh.position.z);
        if (d < minDist) {
          minDist = d;
          closest = u;
        }
      }
    }
    return closest;
  }

  private updateUnits(dt: number, time: number) {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];

      // Dying state animation
      if (u.isDying) {
        u.deathTimer += dt;
        u.mesh.position.y -= dt * 1.5;
        u.mesh.rotation.x += dt * 2;
        if (u.deathTimer >= 0.5) {
          this.scene.remove(u.mesh);
          this.units.splice(i, 1);
        }
        continue;
      }

      // Check dead
      if (u.hp <= 0) {
        u.isDying = true;
        u.deathTimer = 0;
        this.emitParticles(u.mesh.position.x, 1, u.mesh.position.z, u.team === 'player' ? 0x3b82f6 : 0xef4444, 10);
        if (u.team === 'enemy') {
          this.stats.kills++;
          this.stats.enemyUnitsKilled++;
          // Bounty gold
          const bounty = Math.round(UNIT_CONFIGS[u.type].cost * 0.45);
          this.gold += bounty;
          this.stats.totalGoldEarned += bounty;
        } else {
          this.stats.playerUnitsLost++;
        }
        continue;
      }

      // Update unit health bar
      u.hpBarFg.scale.x = Math.max(0.01, u.hp / u.maxHp);

      // Weapon attack animation swing
      if (u.weaponGroup && u.attackAnimTimer > 0) {
        u.attackAnimTimer -= dt * 4;
        u.weaponGroup.rotation.x = 0.3 + Math.sin(u.attackAnimTimer * Math.PI) * 0.8;
      }

      // Find closest opposing unit
      let closestEnemy: ActiveUnit | null = null;
      let minEnemyDist = 999;

      for (const other of this.units) {
        if (other.team !== u.team && !other.isDying && other.hp > 0) {
          const d = getDistance2D(
            u.mesh.position.x,
            u.mesh.position.z,
            other.mesh.position.x,
            other.mesh.position.z
          );
          if (d < minEnemyDist) {
            minEnemyDist = d;
            closestEnemy = other;
          }
        }
      }

      // Target determination
      const enemyCastleZ = u.team === 'player' ? -42 : 42;
      const distToCastle = Math.abs(u.mesh.position.z - enemyCastleZ);

      // In attack range of enemy unit?
      if (closestEnemy && minEnemyDist <= u.range) {
        // Attack Enemy Unit
        u.mesh.lookAt(closestEnemy.mesh.position.x, 0, closestEnemy.mesh.position.z);
        if (time - u.lastAttack >= u.attackRate) {
          u.lastAttack = time;
          u.attackAnimTimer = 1.0;
          this.performUnitAttack(u, closestEnemy);
        }
      } else if (distToCastle <= u.range + 4.5 && (u.team === 'enemy' || this.armyCommand === 'attack')) {
        // Attack Castle Base
        u.mesh.lookAt(0, 0, enemyCastleZ);
        if (time - u.lastAttack >= u.attackRate) {
          u.lastAttack = time;
          u.attackAnimTimer = 1.0;
          this.attackBase(u);
        }
      } else {
        // Movement navigation
        let destX = 0;
        let destZ = 0;

        if (closestEnemy && minEnemyDist < 18) {
          // Move towards closest enemy unit to engage
          destX = closestEnemy.mesh.position.x;
          destZ = closestEnemy.mesh.position.z;
        } else {
          // Move according to strategic command
          if (u.team === 'player') {
            if (this.armyCommand === 'attack') {
              destX = (u.mesh.position.x * 0.8);
              destZ = -42;
            } else if (this.armyCommand === 'defend') {
              destX = u.mesh.position.x;
              destZ = 12; // Defensive bridgehead line
            } else {
              // Rally around player castle
              destX = u.mesh.position.x * 0.5;
              destZ = 34;
            }
          } else {
            // Enemy always marches forward aggressively
            destX = u.mesh.position.x * 0.8;
            destZ = 42;
          }
        }

        this.moveUnitTowards(u, destX, destZ, dt);
      }
    }
  }

  private moveUnitTowards(unit: ActiveUnit, targetX: number, targetZ: number, dt: number) {
    const dx = targetX - unit.mesh.position.x;
    const dz = targetZ - unit.mesh.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.2) {
      const nx = dx / dist;
      const nz = dz / dist;

      // Slight avoidance of crowding
      unit.mesh.position.x += nx * unit.speed * dt;
      unit.mesh.position.z += nz * unit.speed * dt;

      // Keep within battlefield bounds
      unit.mesh.position.x = Math.max(-14, Math.min(14, unit.mesh.position.x));

      // Walking bobbing motion
      unit.mesh.position.y = Math.abs(Math.sin(this.clock.getElapsedTime() * unit.speed * 3.5)) * 0.12;

      // Look in direction of travel
      unit.mesh.lookAt(unit.mesh.position.x + nx, 0, unit.mesh.position.z + nz);
    }
  }

  private findUnitById(id: string): ActiveUnit | null {
    return this.units.find(u => u.id === id && !u.isDying) || null;
  }

  private awardKill(killer: ActiveUnit, victim: ActiveUnit) {
    killer.kills++;
    const xp = KILL_XP_BY_TYPE[victim.type] || 40;
    this.awardUnitXp(killer, xp);

    // Nearby ally assist XP (within 7.5 radius)
    const assistXp = Math.round(xp * 0.35);
    for (const other of this.units) {
      if (other.team === killer.team && other.id !== killer.id && !other.isDying && other.hp > 0) {
        const d = getDistance2D(
          killer.mesh.position.x,
          killer.mesh.position.z,
          other.mesh.position.x,
          other.mesh.position.z
        );
        if (d <= 7.5) {
          this.awardUnitXp(other, assistXp);
        }
      }
    }
  }

  private awardUnitXp(unit: ActiveUnit, amount: number) {
    if (unit.isDying || unit.hp <= 0) return;
    unit.xp += amount;
    const newLevel = getLevelFromXp(unit.xp);

    if (newLevel > unit.level) {
      unit.level = newLevel;
      if (unit.team === 'player') {
        this.stats.totalLevelUps++;
        soundSystem.playLevelUp();
      }

      // Recalculate stats based on upgrades and new level!
      const enemyUpgrades = {
        goldMine: 0,
        weaponForge: this.difficulty === 'epic' ? 2 : this.difficulty === 'hard' ? 1 : 0,
        armorPlating: this.difficulty === 'epic' ? 2 : this.difficulty === 'hard' ? 1 : 0,
        towerDefense: 0
      };
      const newStats = getEffectiveUnitStats(
        unit.type,
        unit.team === 'player' ? this.upgrades : enemyUpgrades,
        unit.level
      );

      unit.damage = newStats.damage;
      unit.maxHp = newStats.hp;
      unit.speed = newStats.speed;
      unit.attackRate = newStats.attackRate;
      // Heal bonus on level up: restore 50% of the new max HP
      unit.hp = Math.min(unit.maxHp, unit.hp + Math.round(unit.maxHp * 0.5));

      // Scale up mesh visually to reflect veteran status
      unit.mesh.scale.setScalar(newStats.scale);

      // Show Level Stars above HP bar
      if (unit.star1) {
        unit.star1.visible = unit.level >= 2;
      }
      if (unit.star2) {
        unit.star2.visible = unit.level >= 3;
      }

      // Golden Level Up particle burst
      this.emitParticles(
        unit.mesh.position.x,
        2.2,
        unit.mesh.position.z,
        unit.team === 'player' ? 0xfacc15 : 0xf43f5e,
        22,
        3.0
      );
    }
  }

  private performUnitAttack(attacker: ActiveUnit, target: ActiveUnit) {
    if (attacker.type === 'archer') {
      soundSystem.playArrowWhoosh();
      this.fireProjectile('arrow', attacker.team, attacker.mesh.position, target.mesh.position, attacker.damage, 0, attacker.id);
    } else if (attacker.type === 'catapult') {
      soundSystem.playExplosion();
      this.fireProjectile('boulder', attacker.team, attacker.mesh.position, target.mesh.position, attacker.damage, attacker.aoeRadius || 4.0, attacker.id);
    } else if (attacker.type === 'mage') {
      soundSystem.playMagicBlast();
      this.fireProjectile('magic', attacker.team, attacker.mesh.position, target.mesh.position, attacker.damage, attacker.aoeRadius || 3.0, attacker.id);
    } else {
      // Melee (Infantry / Knight)
      const dmg = calculateDamage(attacker.damage);
      const wasAlive = target.hp > 0;
      target.hp -= dmg;
      soundSystem.playSwordClash();
      this.emitParticles(target.mesh.position.x, 1.2, target.mesh.position.z, 0xffffff, 4, 1.5);

      if (wasAlive && target.hp <= 0) {
        this.awardKill(attacker, target);
      }
    }
  }

  private attackBase(attacker: ActiveUnit) {
    const isTargetingEnemyBase = attacker.team === 'player';
    const dmg = calculateDamage(attacker.damage);

    if (isTargetingEnemyBase) {
      this.enemyBaseHp = Math.max(0, this.enemyBaseHp - dmg);
      this.emitParticles(0, 4, -42, 0xdc2626, 6, 3);
    } else {
      this.playerBaseHp = Math.max(0, this.playerBaseHp - dmg);
      this.emitParticles(0, 4, 42, 0x2563eb, 6, 3);
    }

    if (attacker.type === 'catapult') {
      soundSystem.playExplosion();
    } else {
      soundSystem.playSwordClash();
    }
  }

  private fireProjectile(
    type: 'arrow' | 'boulder' | 'magic',
    team: Team,
    startPos: { x: number; y: number; z: number },
    targetPos: { x: number; y: number; z: number },
    damage: number,
    aoeRadius: number,
    shooterUnitId?: string
  ) {
    const id = Math.random().toString(36).substring(2, 9);
    const speed = type === 'arrow' ? 24 : type === 'boulder' ? 14 : 18;
    const arcHeight = type === 'boulder' ? 6.5 : type === 'arrow' ? 3.5 : 1.0;

    let mesh: THREE.Mesh;
    if (type === 'arrow') {
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.8),
        new THREE.MeshBasicMaterial({ color: 0x1e293b })
      );
    } else if (type === 'boulder') {
      mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.4),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 })
      );
    } else {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshBasicMaterial({ color: team === 'player' ? 0x38bdf8 : 0xf43f5e })
      );
    }

    mesh.position.set(startPos.x, startPos.y + 1, startPos.z);
    this.scene.add(mesh);
    this.projectileMeshes.set(id, mesh);

    this.projectiles.push({
      id,
      type,
      team,
      shooterUnitId,
      startPos: { x: startPos.x, y: startPos.y + 1, z: startPos.z },
      currentPos: { x: startPos.x, y: startPos.y + 1, z: startPos.z },
      targetPos: { x: targetPos.x, y: targetPos.y + 0.8, z: targetPos.z },
      progress: 0,
      speed,
      damage,
      aoeRadius,
      arcHeight
    });
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const mesh = this.projectileMeshes.get(p.id);
      if (!mesh) continue;

      const totalDist = getDistance2D(p.startPos.x, p.startPos.z, p.targetPos.x, p.targetPos.z);
      const step = (p.speed * dt) / Math.max(1, totalDist);
      p.progress += step;

      if (p.progress >= 1.0) {
        // Projectile Landed
        this.handleProjectileImpact(p);
        this.scene.remove(mesh);
        this.projectileMeshes.delete(p.id);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Parabolic flight
      const currentX = p.startPos.x + (p.targetPos.x - p.startPos.x) * p.progress;
      const currentZ = p.startPos.z + (p.targetPos.z - p.startPos.z) * p.progress;
      const parabolicArc = Math.sin(p.progress * Math.PI) * p.arcHeight;
      const currentY = p.startPos.y + (p.targetPos.y - p.startPos.y) * p.progress + parabolicArc;

      mesh.position.set(currentX, currentY, currentZ);
      mesh.lookAt(p.targetPos.x, currentY - 0.2, p.targetPos.z);
    }
  }

  private handleProjectileImpact(p: Projectile) {
    const shooter = p.shooterUnitId ? this.findUnitById(p.shooterUnitId) : null;

    if (p.aoeRadius > 0) {
      // Area of Effect Blast
      soundSystem.playExplosion();
      this.emitParticles(p.targetPos.x, 1, p.targetPos.z, p.type === 'magic' ? 0xec4899 : 0xf97316, 16, 3);

      for (const u of this.units) {
        if (u.team !== p.team && !u.isDying && u.hp > 0) {
          const d = getDistance2D(p.targetPos.x, p.targetPos.z, u.mesh.position.x, u.mesh.position.z);
          if (d <= p.aoeRadius) {
            const falloff = 1 - (d / p.aoeRadius) * 0.4;
            const wasAlive = u.hp > 0;
            u.hp -= calculateDamage(p.damage * falloff);
            if (wasAlive && u.hp <= 0 && shooter) {
              this.awardKill(shooter, u);
            }
          }
        }
      }
    } else {
      // Direct Single-Target Hit
      this.emitParticles(p.targetPos.x, p.targetPos.y, p.targetPos.z, 0xffffff, 5, 1.2);
      for (const u of this.units) {
        if (u.team !== p.team && !u.isDying && u.hp > 0) {
          const d = getDistance2D(p.targetPos.x, p.targetPos.z, u.mesh.position.x, u.mesh.position.z);
          if (d < 1.4) {
            const wasAlive = u.hp > 0;
            u.hp -= calculateDamage(p.damage);
            if (wasAlive && u.hp <= 0 && shooter) {
              this.awardKill(shooter, u);
            }
            break;
          }
        }
      }
    }
  }

  private handleEndGame() {
    this.isRunning = false;
    const isVictory = this.enemyBaseHp <= 0;
    const result = isVictory ? 'victory' : 'defeat';

    if (isVictory) {
      soundSystem.playVictoryFanfare();
      this.emitParticles(0, 8, -42, 0xfacc15, 40, 6);
    } else {
      soundSystem.playDefeat();
      this.emitParticles(0, 8, 42, 0xef4444, 40, 6);
    }

    this.stats.starsEarned = calculateBattleStars(
      this.playerBaseHp,
      this.maxBaseHp,
      this.stats.battleDurationSeconds,
      this.stats.playerUnitsLost
    );

    if (this.onGameOver) {
      this.onGameOver(result, this.stats);
    }
  }

  private publishSnapshot() {
    if (!this.onSnapshotUpdate) return;
    const playerUnits = this.units.filter(u => u.team === 'player' && !u.isDying);
    const enemyCount = this.units.filter(u => u.team === 'enemy' && !u.isDying).length;
    const veteranCount = playerUnits.filter(u => u.level >= 2).length;

    let topHeroUnit: ActiveUnit | null = null;
    for (const u of playerUnits) {
      if (!topHeroUnit) {
        topHeroUnit = u;
      } else if (u.level > topHeroUnit.level || (u.level === topHeroUnit.level && u.kills > topHeroUnit.kills)) {
        topHeroUnit = u;
      }
    }

    const topHero = topHeroUnit ? {
      name: UNIT_CONFIGS[topHeroUnit.type].name,
      type: topHeroUnit.type,
      level: topHeroUnit.level,
      kills: topHeroUnit.kills
    } : null;

    if (topHero) {
      if (!this.stats.topHeroUnit || topHero.level > this.stats.topHeroUnit.level || (topHero.level === this.stats.topHeroUnit.level && topHero.kills > this.stats.topHeroUnit.kills)) {
        this.stats.topHeroUnit = topHero;
      }
    }

    this.onSnapshotUpdate({
      playerCount: playerUnits.length,
      enemyCount,
      playerBaseHp: Math.round(this.playerBaseHp),
      enemyBaseHp: Math.round(this.enemyBaseHp),
      maxBaseHp: this.maxBaseHp,
      gold: Math.floor(this.gold),
      goldPerSecond: getGoldPerSecond(this.upgrades.goldMine),
      armyCommand: this.armyCommand,
      timeRemainingOrElapsed: Math.floor(this.stats.battleDurationSeconds),
      currentWave: 1 + Math.floor(this.stats.battleDurationSeconds / 45),
      veteranCount,
      topHero
    });
  }

  public destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    this.clearAllUnits();
    this.clearAllProjectiles();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
