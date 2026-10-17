import * as THREE from 'three';
import type { Team, UnitType } from './types.ts';
import { UNIT_CONFIGS } from './rules.ts';

// Shared reusable materials & geometries for lossless performance
const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x071108,
  transparent: true,
  opacity: 0.38,
  depthWrite: false
});
const shadowGeo = new THREE.CircleGeometry(0.85, 16);

// Floating health bar billboard
function createBillboardHealthBar(team: Team, width = 1.4, height = 0.16) {
  const group = new THREE.Group();

  const bgGeo = new THREE.PlaneGeometry(width, height);
  const bgMat = new THREE.MeshBasicMaterial({ color: 0x111827, depthTest: true });
  const bgMesh = new THREE.Mesh(bgGeo, bgMat);

  const fgGeo = new THREE.PlaneGeometry(width - 0.04, height - 0.04);
  const fgMat = new THREE.MeshBasicMaterial({
    color: team === 'player' ? 0x22c55e : 0xef4444,
    depthTest: true
  });
  const fgMesh = new THREE.Mesh(fgGeo, fgMat);
  fgMesh.position.z = 0.01;
  // Pivot from left so scale.x shrinks neatly from right to left
  fgMesh.geometry.translate((width - 0.04) / 2, 0, 0);
  fgMesh.position.x = -(width - 0.04) / 2;

  group.add(bgMesh);
  group.add(fgMesh);

  // Golden Level Stars (Diamond Octahedrons) displayed above HP bar
  const starGeo = new THREE.OctahedronGeometry(0.12);
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.8,
    metalness: 0.9,
    roughness: 0.2
  });

  const star1 = new THREE.Mesh(starGeo, starMat);
  star1.position.set(-0.16, height + 0.16, 0.02);
  star1.visible = false;

  const star2 = new THREE.Mesh(starGeo, starMat);
  star2.position.set(0.16, height + 0.16, 0.02);
  star2.visible = false;

  group.add(star1);
  group.add(star2);

  return { group, fgMesh, star1, star2 };
}

// Procedural contact shadow generator
function createGroundShadow(radius = 0.8) {
  const mesh = new THREE.Mesh(shadowGeo, shadowMat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  mesh.scale.set(radius, radius, 1);
  return mesh;
}

/**
 * Creates 3-12 part procedural unit mesh based on type and team
 */
export function createUnitMesh(type: UnitType, team: Team): THREE.Group {
  const root = new THREE.Group();
  const cfg = UNIT_CONFIGS[type];
  const isPlayer = team === 'player';

  // Distinct team palette
  const teamColor = isPlayer ? 0x2563eb : 0xdc2626;
  const accentColor = isPlayer ? 0x60a5fa : 0xf87171;
  const trimGold = 0xf59e0b;
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.25 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.35 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  const teamClothMat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.6 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.5 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });

  // Contact shadow
  root.add(createGroundShadow(cfg.scale * 0.75));

  // Dynamic visual parts based on archetype
  if (type === 'infantry') {
    // 1. Torso / Tunics
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.45), teamClothMat);
    torso.position.y = 0.9;
    torso.castShadow = true;
    root.add(torso);

    // 2. Leather belt with gold buckle
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.47), leatherMat);
    belt.position.y = 0.65;
    root.add(belt);

    // 3. Head & Helmet with Crest
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), skinMat);
    head.position.y = 1.48;
    root.add(head);

    const helmet = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.32, 12), steelMat);
    helmet.position.y = 1.62;
    helmet.castShadow = true;
    root.add(helmet);

    // Plume
    const plume = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.35), new THREE.MeshStandardMaterial({ color: accentColor }));
    plume.position.set(0, 1.72, -0.05);
    root.add(plume);

    // 4. Legs
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5), darkMetalMat);
    leftLeg.position.set(-0.2, 0.25, 0);
    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.2;
    root.add(leftLeg, rightLeg);

    // 5. Shield (in left hand)
    const shieldGroup = new THREE.Group();
    shieldGroup.position.set(-0.45, 0.9, 0.15);
    const shieldBody = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 16), teamClothMat);
    shieldBody.rotation.z = Math.PI / 2;
    shieldBody.rotation.y = Math.PI / 2;
    const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), steelMat);
    shieldBoss.position.set(-0.05, 0, 0);
    shieldGroup.add(shieldBody, shieldBoss);
    root.add(shieldGroup);

    // 6. Sword (in right hand)
    const swordGroup = new THREE.Group();
    swordGroup.name = 'weaponGroup';
    swordGroup.position.set(0.48, 0.85, 0.1);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.04), steelMat);
    blade.position.y = 0.35;
    blade.rotation.x = 0.3;
    const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: trimGold, metalness: 0.9 }));
    crossguard.position.y = 0.02;
    swordGroup.add(blade, crossguard);
    root.add(swordGroup);

  } else if (type === 'archer') {
    // 1. Cloak / Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.85, 10), teamClothMat);
    torso.position.y = 0.85;
    torso.castShadow = true;
    root.add(torso);

    // 2. Leather Hood / Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skinMat);
    head.position.y = 1.42;
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.45, 8), leatherMat);
    hood.position.y = 1.54;
    hood.rotation.x = -0.15;
    root.add(head, hood);

    // 3. Quiver with arrows
    const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.6, 8), leatherMat);
    quiver.position.set(-0.15, 1.0, -0.28);
    quiver.rotation.z = -0.3;
    root.add(quiver);

    // 4. Bow in hand
    const bowGroup = new THREE.Group();
    bowGroup.name = 'weaponGroup';
    bowGroup.position.set(0.4, 0.85, 0.25);
    const bowArc = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 12, Math.PI), woodMat);
    bowArc.rotation.y = Math.PI / 2;
    bowArc.rotation.z = Math.PI / 4;
    bowGroup.add(bowArc);
    root.add(bowGroup);

    // Legs
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.25), leatherMat);
    legs.position.y = 0.25;
    root.add(legs);

  } else if (type === 'knight') {
    // Heavy Plated Armored Tank
    // 1. Steel chestplate with gilded trim
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.05, 0.6), steelMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    root.add(torso);

    // 2. Heavy Spaulders (Shoulders)
    const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), darkMetalMat);
    leftShoulder.position.set(-0.55, 1.35, 0);
    const rightShoulder = leftShoulder.clone();
    rightShoulder.position.x = 0.55;
    root.add(leftShoulder, rightShoulder);

    // 3. Greathelm
    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.55, 10), steelMat);
    helm.position.y = 1.75;
    helm.castShadow = true;
    // Eye slit
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.12), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    visor.position.set(0, 1.76, 0.24);
    // Majestic crest
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.5), new THREE.MeshStandardMaterial({ color: teamColor }));
    crest.position.set(0, 2.05, 0);
    root.add(helm, visor, crest);

    // 4. Large Kite Shield
    const kiteShield = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.65), teamClothMat);
    kiteShield.position.set(-0.6, 1.0, 0.25);
    kiteShield.rotation.y = 0.2;
    const shieldTrim = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.12, 0.08), new THREE.MeshStandardMaterial({ color: trimGold, metalness: 0.9 }));
    shieldTrim.position.set(-0.6, 1.0, 0.25);
    root.add(kiteShield, shieldTrim);

    // 5. Heavy Broadsword
    const swordGroup = new THREE.Group();
    swordGroup.name = 'weaponGroup';
    swordGroup.position.set(0.6, 0.95, 0.2);
    const bigBlade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.06), steelMat);
    bigBlade.position.y = 0.5;
    bigBlade.rotation.x = 0.3;
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), leatherMat);
    hilt.position.y = -0.08;
    swordGroup.add(bigBlade, hilt);
    root.add(swordGroup);

    // Armored legs
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.45), darkMetalMat);
    legs.position.y = 0.28;
    root.add(legs);

  } else if (type === 'catapult') {
    // Siege engine
    // 1. Timber chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 2.2), woodMat);
    chassis.position.y = 0.5;
    chassis.castShadow = true;
    root.add(chassis);

    // 2. 4 Heavy wheels
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.18, 12);
    const wheelMat = darkMetalMat;
    const wheelPositions = [
      [-0.85, 0.38, 0.75],
      [0.85, 0.38, 0.75],
      [-0.85, 0.38, -0.75],
      [0.85, 0.38, -0.75]
    ];
    wheelPositions.forEach(([x, y, z]) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, y, z);
      root.add(w);
    });

    // 3. Side frames
    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), woodMat);
    leftPost.position.set(-0.6, 1.0, 0);
    const rightPost = leftPost.clone();
    rightPost.position.x = 0.6;
    root.add(leftPost, rightPost);

    // 4. Throwing Arm & Loaded Boulder
    const armGroup = new THREE.Group();
    armGroup.name = 'catapultArm';
    armGroup.position.set(0, 1.2, -0.2);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.8), woodMat);
    beam.position.z = 0.4;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.18, 0.2, 8), darkMetalMat);
    cup.position.set(0, 0.15, 1.25);
    const loadedRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24), darkMetalMat);
    loadedRock.position.set(0, 0.32, 1.25);
    armGroup.add(beam, cup, loadedRock);
    root.add(armGroup);

    // Banner
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.8), teamClothMat);
    flag.position.set(0.65, 1.8, -0.6);
    root.add(flag);

  } else if (type === 'mage') {
    // Wizard archetype
    // 1. Flowing wizard robe
    const robe = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 12), teamClothMat);
    robe.position.y = 0.7;
    robe.castShadow = true;
    root.add(robe);

    // 2. Wizard Hat
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 12), teamClothMat);
    hatBrim.position.y = 1.48;
    const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 10), teamClothMat);
    hatCone.position.set(0, 1.8, -0.1);
    hatCone.rotation.x = -0.25;
    root.add(hatBrim, hatCone);

    // 3. Magic Staff with glowing crystal
    const staffGroup = new THREE.Group();
    staffGroup.name = 'weaponGroup';
    staffGroup.position.set(0.45, 0.8, 0.2);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8), woodMat);
    shaft.position.y = 0.5;
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18),
      new THREE.MeshStandardMaterial({
        color: isPlayer ? 0x67e8f9 : 0xf43f5e,
        emissive: isPlayer ? 0x06b6d4 : 0xe11d48,
        emissiveIntensity: 0.9,
        roughness: 0.2
      })
    );
    crystal.position.y = 1.35;
    staffGroup.add(shaft, crystal);
    root.add(staffGroup);
  }

  // Floating Health Bar with Level Stars
  const { group: hpGroup, fgMesh, star1, star2 } = createBillboardHealthBar(team, 1.3 * cfg.scale, 0.16);
  hpGroup.position.y = 2.2 * cfg.scale;
  root.add(hpGroup);

  // Store reference to health bar and level stars for dynamic updates
  const metaRoot = root as unknown as {
    hpBarFg: THREE.Mesh;
    hpBarGroup: THREE.Group;
    star1: THREE.Mesh;
    star2: THREE.Mesh;
  };
  metaRoot.hpBarFg = fgMesh;
  metaRoot.hpBarGroup = hpGroup;
  metaRoot.star1 = star1;
  metaRoot.star2 = star2;

  root.scale.setScalar(cfg.scale);
  return root;
}

/**
 * Creates 3D Castle Base with walls, turrets, gatehouse and banners
 */
export function createCastleBase(team: Team, zPos: number): THREE.Group {
  const group = new THREE.Group();
  const isPlayer = team === 'player';
  const factionColor = isPlayer ? 0x2563eb : 0xdc2626;

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85, metalness: 0.15 });
  const trimStoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const bannerMat = new THREE.MeshStandardMaterial({ color: factionColor, roughness: 0.5 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });

  // 1. Central Bastion
  const keep = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 8), stoneMat);
  keep.position.y = 3.5;
  keep.castShadow = true;
  keep.receiveShadow = true;
  group.add(keep);

  // Crenellations along central roof
  for (let x = -6.5; x <= 6.5; x += 1.8) {
    const cren = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.6), trimStoneMat);
    cren.position.set(x, 7.5, 3.8);
    group.add(cren);
  }

  // 2. Gateway Arch
  const gateArch = new THREE.Mesh(new THREE.BoxGeometry(4.2, 5.0, 8.4), trimStoneMat);
  gateArch.position.set(0, 2.5, 0);
  const gateDoor = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.4, 0.4), woodMat);
  gateDoor.position.set(0, 2.2, isPlayer ? -4.1 : 4.1);
  group.add(gateArch, gateDoor);

  // 3. Flanking Watchtowers (Left & Right)
  [-7.5, 7.5].forEach(x => {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 12, 12), stoneMat);
    tower.position.set(x, 6, 0);
    tower.castShadow = true;
    group.add(tower);

    // Tower battlements ring
    const topCap = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.4, 1.2, 12), trimStoneMat);
    topCap.position.set(x, 12.4, 0);
    group.add(topCap);

    // Conical Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.0, 3.5, 12), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 }));
    roof.position.set(x, 14.5, 0);
    roof.castShadow = true;
    group.add(roof);

    // Flagpole and Faction Banner
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.5, 8), goldMat);
    pole.position.set(x, 17, 0);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 2.2), bannerMat);
    flag.position.set(x, 17.2, 1.1);
    group.add(pole, flag);
  });

  // 4. Center Defense Turret / Ballista on Castle Roof
  const turretGroup = new THREE.Group();
  turretGroup.name = 'castleDefenseTurret';
  turretGroup.position.set(0, 7.8, 0);
  const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.8, 12), trimStoneMat);
  const turretCannon = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 2.4), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 }));
  turretCannon.position.set(0, 0.6, isPlayer ? -1.0 : 1.0);
  turretGroup.add(turretBase, turretCannon);
  group.add(turretGroup);

  group.position.set(0, 0, zPos);
  // Rotate enemy castle 180 degrees to face player
  if (!isPlayer) {
    group.rotation.y = Math.PI;
  }

  return group;
}

/**
 * Creates rich battlefield terrain, central river, wooden bridge, rocks, pine trees, and campfire
 */
export function createBattlefieldEnvironment(scene: THREE.Scene) {
  // 1. Rolling Grassy Ground
  const groundGeo = new THREE.PlaneGeometry(120, 180, 24, 36);
  // Add subtle terrain elevation around the borders
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getY(i); // In plane geo before rotation, Y is Z
    const distFromCenter = Math.abs(x);
    if (distFromCenter > 18) {
      pos.setZ(i, Math.pow((distFromCenter - 18) * 0.25, 1.4));
    }
  }
  groundGeo.computeVertexNormals();

  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x3d7a44,
    roughness: 0.9,
    metalness: 0.05
  });
  const ground = new THREE.Mesh(groundGeo, grassMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // 2. Central Marching Cobblestone Road (linking player base at z=44 to enemy base at z=-44)
  const roadGeo = new THREE.PlaneGeometry(12, 110);
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x857560,
    roughness: 0.92,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.03;
  road.receiveShadow = true;
  scene.add(road);

  // 3. Central River Trench at Z = 0
  const riverGeo = new THREE.PlaneGeometry(120, 10);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.15,
    metalness: 0.4,
    transparent: true,
    opacity: 0.85
  });
  const river = new THREE.Mesh(riverGeo, waterMat);
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, 0.04, 0);
  scene.add(river);

  // 4. Wooden Bridge over the central river
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(0, 0.35, 0);
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x673c1c, roughness: 0.85 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });

  const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 12), woodMat);
  bridgeDeck.receiveShadow = true;
  bridgeDeck.castShadow = true;
  bridgeGroup.add(bridgeDeck);

  // Guardrails
  [-6.8, 6.8].forEach(x => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 12), railMat);
    rail.position.set(x, 0.75, 0);
    rail.castShadow = true;
    bridgeGroup.add(rail);
  });
  scene.add(bridgeGroup);

  // 5. Procedural Pine Trees along the flanks
  const treeWoodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
  const treeFoliageMat1 = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.85 });
  const treeFoliageMat2 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.85 });

  function spawnPineTree(x: number, z: number, scale = 1) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale, 0.5 * scale, 3 * scale, 8), treeWoodMat);
    trunk.position.y = 1.5 * scale;
    trunk.castShadow = true;
    tree.add(trunk);

    const levels = [
      { y: 3.2, r: 2.2, h: 2.8, mat: treeFoliageMat1 },
      { y: 4.8, r: 1.7, h: 2.5, mat: treeFoliageMat2 },
      { y: 6.2, r: 1.1, h: 2.0, mat: treeFoliageMat1 }
    ];

    levels.forEach(lvl => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(lvl.r * scale, lvl.h * scale, 8), lvl.mat);
      cone.position.y = lvl.y * scale;
      cone.castShadow = true;
      cone.receiveShadow = true;
      tree.add(cone);
    });

    tree.position.set(x, 0, z);
    scene.add(tree);
  }

  // Scatter trees naturally on the sides (leaving central lane clear)
  const treeCoords = [
    [-18, -35], [-24, -20], [-16, -10], [-22, 15], [-17, 30], [-25, 40],
    [18, -32], [23, -18], [17, -5], [21, 12], [16, 28], [24, 38],
    [-28, -5], [-32, 8], [29, -8], [33, 10]
  ];
  treeCoords.forEach(([x, z]) => {
    const s = 0.85 + Math.random() * 0.45;
    spawnPineTree(x, z, s);
  });

  // 6. Perimeter Boulders & Rocks
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95 });
  const rockCoords = [
    [-14, -25], [-15, 22], [14, -20], [15, 26], [-19, 0], [19, 0],
    [-28, -30], [28, -30], [-29, 35], [29, 35]
  ];
  rockCoords.forEach(([x, z]) => {
    const rockGeo = new THREE.DodecahedronGeometry(1.4 + Math.random() * 1.2, 1);
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, 0.8, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  });

  // 7. Base Guardwatch Braziers / Campfires with warm glow
  function createBrazier(x: number, z: number) {
    const brazier = new THREE.Group();
    const stoneBase = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 1.2, 8), rockMat);
    stoneBase.position.y = 0.6;
    const fireMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    fireMesh.position.y = 1.3;
    brazier.add(stoneBase, fireMesh);
    brazier.position.set(x, 0, z);
    scene.add(brazier);
  }

  createBrazier(-9, 36);
  createBrazier(9, 36);
  createBrazier(-9, -36);
  createBrazier(9, -36);
}
