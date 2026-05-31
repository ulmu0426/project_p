function mustElement<T extends HTMLElement>(id: string, ctor: { new (): T }): T {
  const element = document.getElementById(id);
  if (!(element instanceof ctor)) {
    throw new Error(`Missing required element: #${id}`);
  }
  return element;
}

function mustQuery<T extends Element>(root: ParentNode, selector: string, ctor: { new (): T }): T {
  const element = root.querySelector(selector);
  if (!(element instanceof ctor)) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
}

function raiseWeaponLevel(weapon: WeaponInstance): boolean {
  if (weapon.level >= weapon.maxLevel) return false;
  weapon.level += 1;
  return true;
}

function createWeapon(id: WeaponId): WeaponInstance {
  const definition = weaponDefinitionMap.get(id);
  if (!definition) {
    throw new Error(`Missing weapon definition: ${id}`);
  }
  return definition.create();
}

function createDefaultPassiveStats(): PassiveStats {
  return {
    cooldownMultiplier: 1,
    damageMultiplier: 1,
    amountBonus: 0,
    attackSpeedMultiplier: 1,
    areaMultiplier: 1,
    blastRadiusMultiplier: 1,
    pierceBonus: 0,
    criticalChance: 0,
    criticalDamageMultiplier: 1.5,
    echoChance: 0,
  };
}

function getPlayer(): Player {
  if (!state.player) {
    throw new Error("Player is not initialized.");
  }
  return state.player;
}

function getSelectedCharacter(): CharacterDefinition {
  return characterDefinitionMap.get(state.selectedCharacterId) ?? characterDefinitions[0];
}

function loadProfile(): ProfileState {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return { gold: 0, shopLevels: {} };
    const parsed = JSON.parse(raw) as Partial<ProfileState>;
    const shopLevels: ShopLevelMap = {};
    shopUpgradeDefinitions.forEach((definition) => {
      const rawLevel = parsed.shopLevels?.[definition.id] ?? 0;
      shopLevels[definition.id] = clamp(Math.floor(Number(rawLevel) || 0), 0, definition.maxLevel);
    });

    return {
      gold: Math.max(0, Math.floor(Number(parsed.gold) || 0)),
      shopLevels,
    };
  } catch {
    return { gold: 0, shopLevels: {} };
  }
}

function saveProfile(): void {
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function getShopDefinition(id: ShopUpgradeId): ShopUpgradeDefinition {
  const definition = shopDefinitionMap.get(id);
  if (!definition) {
    throw new Error(`Missing shop upgrade definition: ${id}`);
  }
  return definition;
}

function getShopLevel(id: ShopUpgradeId): number {
  return profile.shopLevels[id] ?? 0;
}

function getShopValue(id: ShopUpgradeId): number {
  const definition = getShopDefinition(id);
  return getShopLevel(id) * definition.valuePerLevel;
}

function getShopCostMultiplier(): number {
  return Math.max(0.78, 1 - getShopValue("bargainLedger"));
}

function getShopCost(definition: ShopUpgradeDefinition): number {
  const level = getShopLevel(definition.id);
  return Math.max(1, Math.round(definition.baseCost * Math.pow(definition.costScale, level) * getShopCostMultiplier()));
}

function formatShopValue(definition: ShopUpgradeDefinition, level: number): string {
  const value = definition.valuePerLevel * level;
  if (definition.valueFormat === "percent") return `+${Math.round(value * 100)}%`;
  if (definition.valueFormat === "discount") return `-${Math.round(value * 100)}%`;
  if (definition.valueFormat === "gold") return `+${Math.round(value)}g`;
  if (definition.valueFormat === "count") return `+${Math.round(value)}`;
  return `+${Math.round(value)}`;
}

function renderWallets(): void {
  ui.walletGold.textContent = String(profile.gold);
  ui.shopGold.textContent = String(profile.gold);
}

function showMenuView(view: MenuView): void {
  hideDetailTooltip();
  currentMenuView = view;
  ui.mainMenuView.hidden = view !== "main";
  ui.characterMenuView.hidden = view !== "character";
  ui.shopView.hidden = view !== "shop";
  ui.pauseMenuView.hidden = view !== "pause";
  renderWallets();
  if (view === "shop") {
    renderShop();
  }
}

function renderShop(): void {
  renderWallets();
  Array.from(ui.shopTabs.querySelectorAll("button[data-shop-category]")).forEach((tab) => {
    const category = tab.getAttribute("data-shop-category") as ShopCategory;
    tab.setAttribute("aria-selected", String(category === currentShopCategory));
  });

  ui.shopSummary.textContent = shopCategorySummary[currentShopCategory];
  ui.shopUpgradeList.replaceChildren();
  const upgrades = shopUpgradeDefinitions.filter((upgrade) => upgrade.category === currentShopCategory);
  const selectedInCategory = upgrades.some((upgrade) => upgrade.id === selectedShopUpgradeId);
  if (upgrades.length > 0 && !selectedInCategory) {
    selectedShopUpgradeId = upgrades[0].id;
  }

  if (upgrades.length === 0) {
    const empty = document.createElement("div");
    empty.className = "shop-upgrade";
    empty.textContent = `${shopCategoryLabels[currentShopCategory]} upgrades are not available yet.`;
    ui.shopUpgradeList.appendChild(empty);
    renderEmptyShopDetail();
    return;
  }

  upgrades.forEach((upgrade) => {
    const level = getShopLevel(upgrade.id);
    const maxed = level >= upgrade.maxLevel;
    const button = document.createElement("button");
    const copy = document.createElement("span");
    const title = document.createElement("strong");
    const meta = document.createElement("small");
    const text = document.createElement("span");
    const price = document.createElement("span");

    button.type = "button";
    button.className = `shop-upgrade${upgrade.id === selectedShopUpgradeId ? " is-selected" : ""}`;
    title.textContent = upgrade.title;
    meta.textContent = `Lv ${level}/${upgrade.maxLevel} - ${upgrade.applyLabel} ${formatShopValue(upgrade, level)}`;
    text.textContent = upgrade.text;
    price.className = "shop-upgrade-price";
    price.textContent = maxed ? "Max" : `${getShopCost(upgrade)}g`;
    copy.append(title, meta, text);
    button.append(copy, price);
    button.addEventListener("click", () => {
      selectedShopUpgradeId = upgrade.id;
      renderShop();
    });
    ui.shopUpgradeList.appendChild(button);
  });

  renderShopDetail(getShopDefinition(selectedShopUpgradeId));
}

function renderEmptyShopDetail(): void {
  ui.shopUpgradeDetail.replaceChildren();
  const title = document.createElement("h3");
  const text = document.createElement("p");
  title.textContent = "Locked";
  text.textContent = "This shop category is reserved for later unlock and run-prep systems.";
  ui.shopUpgradeDetail.append(title, text);
}

function renderShopDetail(upgrade: ShopUpgradeDefinition): void {
  ui.shopUpgradeDetail.replaceChildren();
  const level = getShopLevel(upgrade.id);
  const maxed = level >= upgrade.maxLevel;
  const cost = getShopCost(upgrade);
  const canBuy = !maxed && profile.gold >= cost;
  const tag = document.createElement("small");
  const title = document.createElement("h3");
  const text = document.createElement("p");
  const stats = document.createElement("div");
  const buy = document.createElement("button");

  tag.textContent = shopCategoryLabels[upgrade.category];
  title.textContent = upgrade.title;
  text.textContent = upgrade.text;
  stats.className = "shop-stats";
  stats.append(
    createShopStat("Current", `${upgrade.applyLabel} ${formatShopValue(upgrade, level)}`),
    createShopStat("Next", maxed ? "Max level reached" : `${upgrade.applyLabel} ${formatShopValue(upgrade, level + 1)}`),
    createShopStat("Applied as", upgrade.category === "flatBonus" ? "Added after % modifiers" : "Applied before run start"),
    createShopStat("Price", maxed ? "Max" : `${cost} gold`),
  );
  buy.className = "shop-buy";
  buy.type = "button";
  buy.disabled = !canBuy;
  buy.textContent = maxed ? "Max Level" : canBuy ? "Buy Upgrade" : "Not Enough Gold";
  buy.addEventListener("click", () => purchaseShopUpgrade(upgrade.id));
  ui.shopUpgradeDetail.append(tag, title, text, stats, buy);
}

function createShopStat(label: string, value: string): HTMLDivElement {
  const row = document.createElement("div");
  const labelElement = document.createElement("span");
  const valueElement = document.createElement("strong");
  row.className = "shop-stat";
  labelElement.textContent = label;
  valueElement.textContent = value;
  row.append(labelElement, valueElement);
  return row;
}

function purchaseShopUpgrade(id: ShopUpgradeId): void {
  const definition = getShopDefinition(id);
  const level = getShopLevel(id);
  if (level >= definition.maxLevel) return;
  const cost = getShopCost(definition);
  if (profile.gold < cost) return;
  profile.gold -= cost;
  profile.shopLevels[id] = level + 1;
  saveProfile();
  renderShop();
}

function getPassiveStats(): PassiveStats {
  return getPlayer().passives;
}

function hasPassive(passiveId: PassiveId): boolean {
  return (state.passiveLevels[passiveId] ?? 0) > 0;
}

function getPassiveLevel(passiveId: PassiveId): number {
  return state.passiveLevels[passiveId] ?? 0;
}

function getPassiveUpgrade(passiveId: PassiveId): PassiveUpgrade {
  const passive = passiveCatalog.find((item) => item.id === passiveId);
  if (!passive) {
    throw new Error(`Missing passive definition: ${passiveId}`);
  }
  return passive;
}

function getOwnedPassiveKindCount(): number {
  return passiveCatalog.filter((passive) => getPassiveLevel(passive.id) > 0).length;
}

function canChoosePassive(passive: PassiveUpgrade): boolean {
  const level = getPassiveLevel(passive.id);
  if (level >= passive.maxLevel) return false;
  return level > 0 || getOwnedPassiveKindCount() < state.maxPassives;
}

function recordPassive(passiveId: PassiveId): boolean {
  const passive = getPassiveUpgrade(passiveId);
  if (!canChoosePassive(passive)) return false;
  state.passiveLevels[passiveId] = getPassiveLevel(passiveId) + 1;
  return true;
}

function hasReadyWeaponEvolution(): boolean {
  return state.weapons.some(
    (weapon) => !weapon.evolved && weapon.level >= weapon.maxLevel && hasPassive(weapon.evolution.requiredPassive),
  );
}

function getReadyEvolutionWeapons(): WeaponInstance[] {
  return state.weapons.filter(
    (weapon) => !weapon.evolved && weapon.level >= weapon.maxLevel && hasPassive(weapon.evolution.requiredPassive),
  );
}

function evolveWeapon(weapon: WeaponInstance, origin?: VectorLike): void {
  weapon.evolved = true;
  weapon.name = weapon.evolution.name;
  weapon.color = weapon.evolution.color;
  weapon.evolution.evolve(weapon, game);

  const effectOrigin = origin ?? state.player;
  if (effectOrigin) {
    addParticles(effectOrigin.x, effectOrigin.y, weapon.color, 44, 96);
    addTextFloater(effectOrigin.x, effectOrigin.y - 34, `${weapon.name} Awakened`, weapon.color);
    state.shake = Math.max(state.shake, 5);
  }
}

function evolveRandomReadyWeapon(origin?: VectorLike): boolean {
  const candidates = getReadyEvolutionWeapons();
  if (candidates.length === 0) return false;
  const weapon = candidates[Math.floor(Math.random() * candidates.length)];
  evolveWeapon(weapon, origin);
  updateHud(true);
  return true;
}

function evolveReadyWeapons(): boolean {
  let evolvedAny = false;
  getReadyEvolutionWeapons().forEach((weapon) => {
    evolveWeapon(weapon);
    evolvedAny = true;
  });
  if (evolvedAny) updateHud(true);
  return evolvedAny;
}

function scaleCooldown(base: number): number {
  return Math.max(0.05, base * getPassiveStats().cooldownMultiplier);
}

function scaleAmount(base: number, max = Infinity): number {
  return Math.min(max, Math.max(1, Math.floor(base + getPassiveStats().amountBonus)));
}

function scaleAttackSpeed(base: number): number {
  return base * getPassiveStats().attackSpeedMultiplier;
}

function scaleArea(base: number): number {
  return base * getPassiveStats().areaMultiplier;
}

function scaleBlastArea(base: number): number {
  return scaleArea(base) * getPassiveStats().blastRadiusMultiplier;
}

function withEcho(effect: () => void): void {
  effect();
  if (Math.random() < getPassiveStats().echoChance) {
    effect();
  }
}

function resize(): void {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.max(1, Math.floor(rect.width));
  height = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function buildFloorMarks(): void {
  floorMarks = [];
  for (let i = 0; i < 240; i += 1) {
    floorMarks.push({
      x: randomRange(0, FLOOR_REPEAT_SIZE),
      y: randomRange(0, FLOOR_REPEAT_SIZE),
      size: randomRange(8, 36),
      rot: randomRange(0, TAU),
      kind: Math.random() > 0.72 ? "rune" : "stone",
    });
  }
}

function renderCharacterSelect(): void {
  renderCharacterGrid(ui.characterGrid);
  renderCharacterGrid(ui.gameOverCharacterGrid);
}

function renderCharacterGrid(container: HTMLDivElement): void {
  container.replaceChildren();

  characterDefinitions.forEach((character) => {
    const weaponName = weaponDefinitionMap.get(character.weaponId)?.name ?? character.weaponId;
    const isSelected = character.id === state.selectedCharacterId;
    const button = document.createElement("button");
    const swatch = document.createElement("span");
    const copy = document.createElement("span");
    const name = document.createElement("strong");
    const weapon = document.createElement("small");
    const text = document.createElement("span");

    button.type = "button";
    button.className = `character-option${isSelected ? " is-selected" : ""}`;
    button.setAttribute("aria-pressed", String(isSelected));
    button.setAttribute("aria-selected", String(isSelected));
    button.style.setProperty("--character-color", character.color);

    swatch.className = "character-swatch";
    copy.className = "character-copy";
    name.textContent = character.name;
    weapon.textContent = `${character.title} - ${weaponName}`;
    text.textContent = character.text;

    copy.append(name, weapon, text);
    button.append(swatch, copy);
    button.addEventListener("click", () => {
      state.selectedCharacterId = character.id;
      renderCharacterSelect();
    });

    container.appendChild(button);
  });
}

function resetRun(): void {
  hideDetailTooltip();
  const character = getSelectedCharacter();
  const baseMaxHp = Math.round(BASE_MAX_HP * character.baseHealthMultiplier * (1 + getShopValue("vitalityTraining")));
  const passives = createDefaultPassiveStats();
  passives.damageMultiplier += (character.damageMultiplierBonus ?? 0) + getShopValue("mightTraining");
  passives.areaMultiplier += character.areaMultiplierBonus ?? 0;
  passives.blastRadiusMultiplier += character.blastRadiusMultiplierBonus ?? 0;
  passives.criticalChance += character.criticalChanceBonus ?? 0;

  nextEnemyId = 1;
  nextChestId = 1;
  state.mode = "playing";
  state.previousMode = "playing";
  state.time = 0;
  state.level = 1;
  state.xp = 0;
  state.nextXp = 12;
  state.kills = 0;
  state.gold = Math.round(getShopValue("startingPurse"));
  state.bankableGold = 0;
  state.bankedGoldReward = 0;
  state.runGoldBanked = false;
  state.goldMultiplier = 1 + getShopValue("fortuneSeal");
  state.rerolls = Math.round(getShopValue("rerollPermit"));
  state.spawnTimer = 0.2;
  state.eliteTimer = 18;
  state.bossTimer = 60;
  state.chestSpawnTimer = 12;
  state.shake = 0;
  state.player = {
    x: 0,
    y: 0,
    r: 17,
    hp: baseMaxHp,
    maxHp: baseMaxHp,
    speed: BASE_MOVE_SPEED * character.moveSpeedMultiplier * (1 + getShopValue("fleetBoots")),
    armor: (character.armor ?? 0) + Math.round(getShopValue("ironSkin")),
    color: character.color,
    pickup: 108 * (1 + getShopValue("magnetCharm")),
    xpGain: 1 + getShopValue("scholarInk"),
    hurtFlash: 0,
    passives,
  };
  state.weapons = [createWeapon(character.weaponId)];
  state.enemies = [];
  state.projectiles = [];
  state.gems = [];
  state.particles = [];
  state.floaters = [];
  state.zones = [];
  state.mines = [];
  state.beams = [];
  state.strikes = [];
  state.scythes = [];
  state.chests = [];
  state.relics = [];
  state.passiveLevels = {};
  state.upgradesTaken = [];
  spawnInitialChests();
  ui.menu.classList.remove("is-visible");
  showMenuView("main");
  ui.gameOver.classList.remove("is-visible");
  ui.upgrade.hidden = true;
  updateHud(true);
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function distance(a: VectorLike, b: VectorLike): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getEnemyStatScaling(): { hpMultiplier: number; damageMultiplier: number; xpMultiplier: number; minute: number } {
  const progress = clamp(state.time / RUN_DURATION_SECONDS, 0, 1);
  const lateCurve = progress * progress;
  return {
    hpMultiplier: 1 + progress * 0.55 + lateCurve * 3.4,
    damageMultiplier: 1 + progress * 0.22,
    xpMultiplier: 1 + progress * 0.18 + lateCurve * 0.12,
    minute: progress * (RUN_DURATION_SECONDS / 60),
  };
}

function isVisibleCircle(entity: VectorLike, camera: Camera, radius: number, padding = DRAW_CULL_PADDING): boolean {
  const x = entity.x - camera.x;
  const y = entity.y - camera.y;
  return x > -radius - padding && x < width + radius + padding && y > -radius - padding && y < height + radius + padding;
}

function activeCullDistance(): number {
  return Math.max(width, height) + ENEMY_DESPAWN_PADDING;
}

function trimListFromFront<T>(list: T[], max: number): void {
  if (list.length > max) {
    list.splice(0, list.length - max);
  }
}

function pushBounded<T>(list: T[], item: T, max: number): void {
  if (list.length >= max) {
    list.splice(0, list.length - max + 1);
  }
  list.push(item);
}

function reserveListSpace<T>(list: T[], max: number, incoming: number): number {
  const allowed = Math.min(Math.max(0, Math.floor(incoming)), max);
  const overflow = list.length + allowed - max;
  if (overflow > 0) {
    list.splice(0, overflow);
  }
  return allowed;
}

function removeFarthestEnemy(origin: VectorLike, predicate: (enemy: Enemy) => boolean): boolean {
  let removeIndex = -1;
  let farthest = -Infinity;

  state.enemies.forEach((enemy, index) => {
    if (!predicate(enemy)) return;
    const dist = distance(enemy, origin);
    if (dist > farthest) {
      farthest = dist;
      removeIndex = index;
    }
  });

  if (removeIndex < 0) return false;
  state.enemies.splice(removeIndex, 1);
  return true;
}

function makeRoomForEnemy(kind: EnemyKind, origin: VectorLike): boolean {
  if (state.enemies.length < MAX_ENEMIES) return true;
  if (kind === "shade" || kind === "runner") return false;
  removeFarthestEnemy(origin, (enemy) => enemy.kind !== "boss");
  return state.enemies.length < MAX_ENEMIES;
}

function spawnGem(gem: Gem): void {
  state.gems.push(gem);
  compactGemsToBudget();
}

function compactGemsToBudget(): void {
  const overflow = state.gems.length - MAX_GEMS;
  if (overflow <= 0) return;

  const mergeCount = Math.min(state.gems.length, overflow + 1);
  const merged = state.gems.splice(0, mergeCount);
  const totalValue = merged.reduce((sum, gem) => sum + gem.value, 0);
  const anchor = merged[0];
  const x = totalValue > 0 ? merged.reduce((sum, gem) => sum + gem.x * gem.value, 0) / totalValue : anchor.x;
  const y = totalValue > 0 ? merged.reduce((sum, gem) => sum + gem.y * gem.value, 0) / totalValue : anchor.y;

  state.gems.unshift({
    x,
    y,
    r: Math.min(11, Math.max(...merged.map((gem) => gem.r)) + 2),
    value: totalValue,
    bob: randomRange(0, TAU),
  });
}

function trimChestsToBudget(): void {
  while (state.chests.length > MAX_CHESTS) {
    const player = getPlayer();
    let removeIndex = -1;
    let worstScore = -Infinity;

    state.chests.forEach((chest, index) => {
      const sourceScore = chest.source === "map" ? 2 : chest.source === "elite" ? 1 : 0;
      const score = sourceScore * 1_000_000 + distance(chest, player);
      if (score > worstScore) {
        worstScore = score;
        removeIndex = index;
      }
    });

    if (removeIndex < 0) return;
    state.chests.splice(removeIndex, 1);
  }
}

function pruneDistantMapChests(): void {
  const player = getPlayer();
  for (let i = state.chests.length - 1; i >= 0; i -= 1) {
    const chest = state.chests[i];
    if (chest.source === "map" && distance(chest, player) > MAP_CHEST_DESPAWN_DISTANCE) {
      state.chests.splice(i, 1);
    }
  }
}

function enforceEntityBudgets(): void {
  const player = getPlayer();
  const enemyCullDistance = activeCullDistance();

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    if (enemy.kind !== "boss" && distance(enemy, player) > enemyCullDistance) {
      state.enemies.splice(i, 1);
    }
  }

  while (state.enemies.filter((enemy) => enemy.kind === "boss").length > MAX_BOSSES) {
    if (!removeFarthestEnemy(player, (enemy) => enemy.kind === "boss")) break;
  }

  trimListFromFront(state.projectiles, MAX_PROJECTILES);
  compactGemsToBudget();
  trimListFromFront(state.particles, MAX_PARTICLES);
  trimListFromFront(state.floaters, MAX_FLOATERS);
  trimListFromFront(state.zones, MAX_ZONES);
  trimListFromFront(state.mines, MAX_MINES);
  trimListFromFront(state.beams, MAX_BEAMS);
  trimListFromFront(state.strikes, MAX_STRIKES);
  trimListFromFront(state.scythes, MAX_SCYTHES);
  pruneDistantMapChests();
  trimChestsToBudget();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(dx: number, dy: number): NormalizedVector {
  const len = Math.hypot(dx, dy);
  if (len < 0.001) {
    return { x: 0, y: 0, len: 0 };
  }
  return { x: dx / len, y: dy / len, len };
}

function rotateVector(x: number, y: number, angle: number): VectorLike {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

function getCamera(): Camera {
  const player = state.player;
  const shakeX = state.shake > 0 ? randomRange(-state.shake, state.shake) : 0;
  const shakeY = state.shake > 0 ? randomRange(-state.shake, state.shake) : 0;
  return {
    x: player ? player.x - width / 2 + shakeX : -width / 2,
    y: player ? player.y - height / 2 + shakeY : -height / 2,
  };
}

function findEnemyById(id: number): Enemy | undefined {
  return state.enemies.find((enemy) => enemy.id === id && enemy.hp > 0);
}

function findNearestEnemies(
  origin: VectorLike,
  count: number,
  excludeIds: number[] = [],
  maxDistance = Infinity,
): Enemy[] {
  return state.enemies
    .filter((enemy) => enemy.hp > 0 && !excludeIds.includes(enemy.id) && distance(enemy, origin) <= maxDistance)
    .sort((a, b) => distance(a, origin) - distance(b, origin))
    .slice(0, count);
}

function spawnProjectile(projectile: ProjectileInput): void {
  const speedMultiplier = getPassiveStats().attackSpeedMultiplier;
  pushBounded(
    state.projectiles,
    {
      ...projectile,
      vx: projectile.vx * speedMultiplier,
      vy: projectile.vy * speedMultiplier,
      r: projectile.r * getPassiveStats().areaMultiplier,
      pierce: projectile.pierce + getPassiveStats().pierceBonus,
      hitEnemyIds: projectile.hitEnemyIds ?? [],
    },
    MAX_PROJECTILES,
  );
}

function spawnZone(zone: ZoneInput): void {
  pushBounded(
    state.zones,
    {
      ...zone,
      radius: scaleArea(zone.radius),
      tickTimer: zone.tickTimer ?? zone.delay,
    },
    MAX_ZONES,
  );
}

function spawnMine(mine: Mine): void {
  pushBounded(
    state.mines,
    {
      ...mine,
      radius: scaleArea(mine.radius),
      triggerRadius: scaleArea(mine.triggerRadius),
    },
    MAX_MINES,
  );
}

function spawnBeam(beam: Beam): void {
  pushBounded(
    state.beams,
    {
      ...beam,
      length: scaleArea(beam.length),
      width: scaleArea(beam.width),
    },
    MAX_BEAMS,
  );
}

function spawnStrike(strike: StrikeEffect): void {
  pushBounded(state.strikes, strike, MAX_STRIKES);
}

function spawnScythe(scythe: Scythe): void {
  const speedMultiplier = getPassiveStats().attackSpeedMultiplier;
  pushBounded(
    state.scythes,
    {
      ...scythe,
      vx: scythe.vx * speedMultiplier,
      vy: scythe.vy * speedMultiplier,
      speed: scythe.speed * speedMultiplier,
      r: scaleArea(scythe.r),
    },
    MAX_SCYTHES,
  );
}

function grantGold(amount: number, origin?: VectorLike): void {
  const finalAmount = Math.max(0, Math.round(amount * state.goldMultiplier));
  state.gold += finalAmount;
  state.bankableGold += finalAmount;
  if (origin) {
    addTextFloater(origin.x, origin.y - 20, `+${finalAmount}g`, "#ffcf70");
  }
}

function grantRelic(origin: VectorLike, chance = 1): boolean {
  if (Math.random() > chance) return false;
  const available = relicCatalog.filter((relic) => !state.relics.includes(relic.id));
  if (available.length === 0) return false;
  const relic = available[Math.floor(Math.random() * available.length)];
  state.relics.push(relic.id);
  relic.apply(game);
  addTextFloater(origin.x, origin.y - 34, relic.title, relic.color);
  addParticles(origin.x, origin.y, relic.color, 34, 76);
  updateHud(true);
  return true;
}

function addTextFloater(x: number, y: number, value: string, color = "#f6eedc"): void {
  pushBounded(
    state.floaters,
    {
      x,
      y,
      vx: randomRange(-10, 10),
      vy: randomRange(-42, -26),
      life: 1.25,
      value,
      color,
    },
    MAX_FLOATERS,
  );
}

function applySlow(enemy: Enemy, factor: number, duration: number): void {
  enemy.slowFactor = Math.min(enemy.slowFactor, factor);
  enemy.slowTimer = Math.max(enemy.slowTimer, duration);
}

function damageEnemy(enemy: Enemy, amount: number): DamageResult {
  if (enemy.hp <= 0) {
    return { amount: 0, critical: false, killed: false };
  }
  const passives = getPassiveStats();
  const isCritical = Math.random() < passives.criticalChance;
  const finalAmount = amount * passives.damageMultiplier * (isCritical ? passives.criticalDamageMultiplier : 1);
  enemy.hp -= finalAmount;
  enemy.hitFlash = 1;
  pushBounded(
    state.floaters,
    {
      x: enemy.x,
      y: enemy.y - enemy.r,
      vx: randomRange(-8, 8),
      vy: randomRange(-32, -18),
      life: 0.55,
      value: Math.round(finalAmount),
    },
    MAX_FLOATERS,
  );
  if (isCritical) {
    addParticles(enemy.x, enemy.y, "#f6eedc", 6, enemy.r + 8);
  }
  return { amount: finalAmount, critical: isCritical, killed: enemy.hp <= 0 };
}

function areaDamage(origin: VectorLike, radius: number, damage: number, options: AreaDamageOptions = {}): void {
  const targets = state.enemies
    .filter((enemy) => enemy.hp > 0 && Math.hypot(enemy.x - origin.x, enemy.y - origin.y) < radius + enemy.r)
    .sort((a, b) => distance(a, origin) - distance(b, origin));
  const limitedTargets = typeof options.maxTargets === "number" ? targets.slice(0, options.maxTargets) : targets;

  limitedTargets.forEach((enemy) => {
    const result = damageEnemy(enemy, damage);
    options.onHit?.(enemy, result);
    if (options.slowFactor && options.slowDuration) {
      applySlow(enemy, options.slowFactor, options.slowDuration);
    }
    if (options.particleColor) {
      addParticles(enemy.x, enemy.y, options.particleColor, 4);
    }
  });
}

function damageEnemiesAlongLine(
  origin: VectorLike,
  direction: VectorLike,
  length: number,
  beamWidth: number,
  damage: number,
  options: LineDamageOptions = {},
): void {
  const dir = normalize(direction.x, direction.y);
  const effectiveLength = scaleArea(length);
  const effectiveWidth = scaleArea(beamWidth);
  state.enemies.forEach((enemy) => {
    if (enemy.hp <= 0) return;
    const dx = enemy.x - origin.x;
    const dy = enemy.y - origin.y;
    const projection = dx * dir.x + dy * dir.y;
    if (projection < 0 || projection > effectiveLength) return;
    const closestX = origin.x + dir.x * projection;
    const closestY = origin.y + dir.y * projection;
    const perpendicular = Math.hypot(enemy.x - closestX, enemy.y - closestY);
    if (perpendicular <= effectiveWidth / 2 + enemy.r) {
      const damageMultiplier = options.damageMultiplier?.(enemy) ?? 1;
      const result = damageEnemy(enemy, damage * damageMultiplier);
      options.onHit?.(enemy, result);
      addParticles(enemy.x, enemy.y, options.particleColor ?? "#ffcf70", 7);
    }
  });
}
