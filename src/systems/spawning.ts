function spawnEnemy(kind: EnemyKind = "shade"): void {
  const player = getPlayer();
  if (kind === "boss" && state.enemies.filter((enemy) => enemy.kind === "boss").length >= MAX_BOSSES) return;
  if (!makeRoomForEnemy(kind, player)) return;

  const side = Math.floor(Math.random() * 4);
  const margin = 90;
  const camera = {
    left: player.x - width / 2,
    right: player.x + width / 2,
    top: player.y - height / 2,
    bottom: player.y + height / 2,
  };

  let x = 0;
  let y = 0;
  if (side === 0) {
    x = randomRange(camera.left, camera.right);
    y = camera.top - margin;
  } else if (side === 1) {
    x = camera.right + margin;
    y = randomRange(camera.top, camera.bottom);
  } else if (side === 2) {
    x = randomRange(camera.left, camera.right);
    y = camera.bottom + margin;
  } else {
    x = camera.left - margin;
    y = randomRange(camera.top, camera.bottom);
  }

  const scaling = getEnemyStatScaling();
  const minute = scaling.minute;
  const enemy: Enemy = {
    id: nextEnemyId,
    x,
    y,
    r: 15,
    hp: 28 * scaling.hpMultiplier,
    maxHp: 28 * scaling.hpMultiplier,
    speed: 72 + minute * 7,
    damage: 8 * scaling.damageMultiplier,
    color: "#c83f53",
    xp: 4 * scaling.xpMultiplier,
    hitFlash: 0,
    kind,
    slowTimer: 0,
    slowFactor: 1,
    hitCooldowns: {},
    bonusXp: 0,
  };
  nextEnemyId += 1;

  if (kind === "runner") {
    enemy.r = 12;
    enemy.hp = 18 * scaling.hpMultiplier;
    enemy.maxHp = enemy.hp;
    enemy.speed = 122 + minute * 9;
    enemy.damage = 6 * scaling.damageMultiplier;
    enemy.color = "#d8b65f";
    enemy.xp = 3 * scaling.xpMultiplier;
  }

  if (kind === "brute") {
    enemy.r = 24;
    enemy.hp = 92 * scaling.hpMultiplier;
    enemy.maxHp = enemy.hp;
    enemy.speed = 48 + minute * 5;
    enemy.damage = 16 * scaling.damageMultiplier;
    enemy.color = "#7867c8";
    enemy.xp = 12 * scaling.xpMultiplier;
  }

  if (kind === "boss") {
    enemy.r = 38;
    enemy.hp = 520 * scaling.hpMultiplier;
    enemy.maxHp = enemy.hp;
    enemy.speed = 36 + minute * 3.5;
    enemy.damage = 24 * scaling.damageMultiplier;
    enemy.color = "#ff7a45";
    enemy.xp = 40 * scaling.xpMultiplier;
  }

  state.enemies.push(enemy);
}

function getMoveVector(): NormalizedVector {
  let dx = 0;
  let dy = 0;

  if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) dx += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) dy -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) dy += 1;

  if (pointer.active) {
    const joy = normalize(pointer.x - pointer.startX, pointer.y - pointer.startY);
    if (joy.len > 8) {
      dx += joy.x;
      dy += joy.y;
    }
  }

  return normalize(dx, dy);
}

function update(dt: number): void {
  if (state.mode !== "playing") return;

  state.time = Math.min(RUN_DURATION_SECONDS, state.time + dt);
  if (state.time >= RUN_DURATION_SECONDS) {
    updateHud();
    endRun();
    return;
  }

  state.shake = Math.max(0, state.shake - dt * 18);
  updatePlayer(dt);
  updateSpawns(dt);
  updateChests(dt);
  updateWeapons(dt);
  updateProjectiles(dt);
  updateZones(dt);
  updateMines(dt);
  updateScythes(dt);
  updateLooseVisuals(dt);
  updateEnemies(dt);
  updateGems(dt);
  updateParticles(dt);
  enforceEntityBudgets();
  updateHud();

  if (getPlayer().hp <= 0) {
    endRun();
  }
}

function updatePlayer(dt: number): void {
  const player = getPlayer();
  const move = getMoveVector();
  player.x += move.x * player.speed * dt;
  player.y += move.y * player.speed * dt;
  player.hurtFlash = Math.max(0, player.hurtFlash - dt * 5);
}

function updateSpawns(dt: number): void {
  const minute = state.time / 60;
  const cap = Math.min(MAX_ENEMIES, 55 + Math.floor(state.time * 1.1));
  state.spawnTimer -= dt;
  state.eliteTimer -= dt;
  state.bossTimer -= dt;
  state.chestSpawnTimer -= dt;

  if (state.spawnTimer <= 0 && state.enemies.length < cap) {
    const interval = Math.max(0.08, 0.62 - minute * 0.11);
    const wave = 1 + Math.floor(minute * 2.4);
    for (let i = 0; i < wave; i += 1) {
      const roll = Math.random();
      if (roll > 0.78) spawnEnemy("runner");
      else spawnEnemy("shade");
    }
    state.spawnTimer = interval;
  }

  if (state.eliteTimer <= 0) {
    spawnEnemy("brute");
    state.eliteTimer = Math.max(10, 21 - minute * 2);
  }

  if (state.bossTimer <= 0) {
    spawnEnemy("boss");
    state.bossTimer = Math.max(55, 95 - minute * 4);
  }

  if (state.chestSpawnTimer <= 0) {
    spawnRandomMapChest();
    state.chestSpawnTimer = randomRange(18, 30);
  }
}

function spawnInitialChests(): void {
  const kinds: ChestKind[] = ["cache", "blood", "hunt", "astral"];
  kinds.forEach((kind) => {
    spawnChestAt(randomRange(-INITIAL_CHEST_SPREAD, INITIAL_CHEST_SPREAD), randomRange(-INITIAL_CHEST_SPREAD, INITIAL_CHEST_SPREAD), kind, "map", 1);
  });
}

function spawnRandomMapChest(): void {
  pruneDistantMapChests();
  if (state.chests.filter((chest) => chest.source === "map").length >= 4) return;
  const player = getPlayer();
  const kinds: ChestKind[] = ["cache", "blood", "hunt", "astral"];
  const angle = randomRange(0, TAU);
  const distanceFromPlayer = randomRange(520, 1100);
  const x = player.x + Math.cos(angle) * distanceFromPlayer;
  const y = player.y + Math.sin(angle) * distanceFromPlayer;
  spawnChestAt(x, y, kinds[Math.floor(Math.random() * kinds.length)], "map", 1);
}

function spawnRewardChest(x: number, y: number, source: ChestSource, tier: number): void {
  const kind: ChestKind = source === "boss" ? "astral" : Math.random() > 0.5 ? "hunt" : "cache";
  spawnChestAt(x, y, kind, source, tier);
}

function spawnChestAt(x: number, y: number, kind: ChestKind, source: ChestSource, rewardTier: number): void {
  const requirements: Record<ChestKind, number> = {
    cache: 1.25,
    blood: 18,
    hunt: source === "boss" ? 16 : 9,
    astral: source === "boss" ? 24 : 14,
  };
  state.chests.push({
    id: nextChestId,
    x,
    y,
    kind,
    source,
    r: source === "boss" ? 22 : 18,
    unlockRadius: kind === "hunt" ? 190 : 74,
    progress: 0,
    required: requirements[kind],
    rewardTier,
    pulse: randomRange(0, TAU),
  });
  nextChestId += 1;
  trimChestsToBudget();
}

function updateChests(dt: number): void {
  const player = getPlayer();
  for (let i = state.chests.length - 1; i >= 0; i -= 1) {
    const chest = state.chests[i];
    chest.pulse = (chest.pulse + dt * 2.4) % TAU;
    const dist = Math.hypot(player.x - chest.x, player.y - chest.y);
    const near = dist < chest.unlockRadius;

    if (chest.kind === "cache") {
      chest.progress = near ? Math.min(chest.required, chest.progress + dt) : Math.max(0, chest.progress - dt * 0.65);
    } else if (chest.kind === "blood" && near && player.hp > chest.required + 8) {
      player.hp -= chest.required;
      chest.progress = chest.required;
    } else if (chest.kind === "astral" && near && state.xp > 0) {
      const feed = Math.min(state.xp, dt * 8, chest.required - chest.progress);
      state.xp -= feed;
      chest.progress += feed;
    }

    pullGemsToChest(chest, dt);

    if (chest.progress >= chest.required) {
      openChest(i, chest);
    }
  }
}

function pullGemsToChest(chest: Chest, dt: number): void {
  if (chest.kind !== "astral") return;
  state.gems.forEach((gem) => {
    const dist = Math.hypot(chest.x - gem.x, chest.y - gem.y);
    if (dist > 160) return;
    const pull = normalize(chest.x - gem.x, chest.y - gem.y);
    gem.x += pull.x * 220 * dt;
    gem.y += pull.y * 220 * dt;
    if (dist < chest.r + gem.r + 6) {
      chest.progress = Math.min(chest.required, chest.progress + gem.value);
      gem.value = 0;
    }
  });
  state.gems = state.gems.filter((gem) => gem.value > 0);
}

function creditChestKill(enemy: Enemy): void {
  state.chests.forEach((chest) => {
    if (chest.kind !== "hunt") return;
    if (Math.hypot(enemy.x - chest.x, enemy.y - chest.y) < chest.unlockRadius + enemy.r) {
      chest.progress = Math.min(chest.required, chest.progress + (enemy.kind === "brute" ? 2 : enemy.kind === "boss" ? 5 : 1));
      addParticles(chest.x, chest.y, chestColor(chest.kind), 5, 34);
    }
  });
}

function openChest(index: number, chest: Chest): void {
  state.chests.splice(index, 1);
  grantChestReward(chest);
  state.shake = Math.max(state.shake, 3);
  addParticles(chest.x, chest.y, chestColor(chest.kind), 30 + chest.rewardTier * 8, 82);
}

function grantChestReward(chest: Chest): void {
  const tier = chest.rewardTier;
  const origin = { x: chest.x, y: chest.y };
  const isBossChest = chest.source === "boss";
  const bossEvolutionReady = isBossChest && hasReadyWeaponEvolution();
  const bossEvolutionWon = bossEvolutionReady && Math.random() < 0.6;
  if (chest.kind === "cache") {
    grantGold(randomRange(35, 70) * tier, origin);
    gainXp(state.nextXp * (0.2 + tier * 0.08));
    if (Math.random() < 0.35 + tier * 0.12) upgradeRandomWeapon();
  } else if (chest.kind === "blood") {
    grantGold(randomRange(20, 46) * tier, origin);
    grantRelic(origin, 0.72 + tier * 0.08);
    const player = getPlayer();
    player.hp = Math.min(player.maxHp, player.hp + 26 + tier * 10);
  } else if (chest.kind === "hunt") {
    grantGold(randomRange(55, 100) * tier, origin);
    if (bossEvolutionWon && evolveRandomReadyWeapon(origin)) {
      grantRelic(origin, 0.3);
    } else {
      upgradeRandomWeapon();
    }
    grantRelic(origin, 0.18 + tier * 0.1);
  } else {
    grantGold(randomRange(45, 88) * tier, origin);
    if (bossEvolutionReady) {
      if (bossEvolutionWon && evolveRandomReadyWeapon(origin)) {
        grantRelic(origin, 0.3);
      } else {
        grantRelic(origin, 0.58 + tier * 0.12);
      }
    } else {
      grantRelic(origin, 0.58 + tier * 0.12);
      if (Math.random() < 0.45) upgradeRandomPassive();
    }
  }
}

function upgradeRandomWeapon(): boolean {
  const candidates = state.weapons.filter((weapon) => weapon.level < weapon.maxLevel);
  if (candidates.length === 0) return false;
  const weapon = candidates[Math.floor(Math.random() * candidates.length)];
  weapon.upgrade(game);
  addTextFloater(getPlayer().x, getPlayer().y - 42, `${weapon.name} Lv ${weapon.level}`, weapon.color);
  updateHud(true);
  return true;
}

function upgradeRandomPassive(): boolean {
  const candidates = passiveCatalog.filter((passive) => getPassiveLevel(passive.id) > 0 && canChoosePassive(passive));
  if (candidates.length === 0) return false;
  const passive = candidates[Math.floor(Math.random() * candidates.length)];
  if (!recordPassive(passive.id)) return false;
  passive.apply(game);
  addTextFloater(getPlayer().x, getPlayer().y - 58, `${passive.title} Lv ${getPassiveLevel(passive.id)}`, "#d8b65f");
  updateHud(true);
  return true;
}

function chestColor(kind: ChestKind): string {
  if (kind === "blood") return "#e05b7a";
  if (kind === "hunt") return "#9bea82";
  if (kind === "astral") return "#b88cff";
  return "#d8b65f";
}

function chestLabel(kind: ChestKind): string {
  if (kind === "blood") return "HP";
  if (kind === "hunt") return "KO";
  if (kind === "astral") return "XP";
  return "HOLD";
}
