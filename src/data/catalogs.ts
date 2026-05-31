const weaponEvolutions: Record<WeaponId, WeaponEvolutionMetadata> = {
  silverBolt: {
    requiredPassive: "pierce",
    name: "Silver Tempest",
    color: "#f6eedc",
  },
  moonKnives: {
    requiredPassive: "attackSpeed",
    name: "Lunar Chakram",
    color: "#b7ffe8",
  },
  emberRite: {
    requiredPassive: "cooldown",
    name: "Infernal Rite",
    color: "#ff7a45",
  },
  graveLantern: {
    requiredPassive: "area",
    name: "Pale Cathedral",
    color: "#bfe5ff",
  },
  ricochetCrossbow: {
    requiredPassive: "amount",
    name: "Mirror Arbalest",
    color: "#d7bcff",
  },
  frostSigil: {
    requiredPassive: "focus",
    name: "Frozen Grimoire",
    color: "#a9f0ff",
  },
  thunderCharm: {
    requiredPassive: "critChance",
    name: "Storm Fang",
    color: "#fff19a",
  },
  bloodBats: {
    requiredPassive: "vitality",
    name: "Crimson Swarm",
    color: "#ff6f91",
  },
  sunSpear: {
    requiredPassive: "critDamage",
    name: "Judgment Ray",
    color: "#ffe69a",
  },
  thornMines: {
    requiredPassive: "magnet",
    name: "Briar Field",
    color: "#9bea82",
  },
  voidBell: {
    requiredPassive: "echo",
    name: "Abyssal Bell",
    color: "#b3a7ff",
  },
  reaperScythe: {
    requiredPassive: "damage",
    name: "Death Crescent",
    color: "#ffffff",
  },
};

const weaponDefinitions: WeaponDefinition[] = [
  createSilverBoltDefinition(),
  createMoonKnivesDefinition(),
  createEmberRiteDefinition(),
  createGraveLanternDefinition(),
  createRicochetCrossbowDefinition(),
  createFrostSigilDefinition(),
  createThunderCharmDefinition(),
  createBloodBatsDefinition(),
  createSunSpearDefinition(),
  createThornMinesDefinition(),
  createVoidBellDefinition(),
  createReaperScytheDefinition(),
];

const weaponDefinitionMap = new Map<WeaponId, WeaponDefinition>(
  weaponDefinitions.map((definition) => [definition.id, definition]),
);

const passiveCatalog: PassiveUpgrade[] = [
  {
    id: "speed",
    title: "Quickstep",
    text: "Raises movement speed and makes tight escapes easier.",
    maxLevel: 5,
    apply(activeGame) {
      activeGame.player().speed = Math.min(375, activeGame.player().speed + 28);
    },
  },
  {
    id: "vitality",
    title: "Blood Pact",
    text: "Raises maximum health and restores a chunk of health.",
    maxLevel: 5,
    apply(activeGame) {
      const player = activeGame.player();
      player.maxHp += 22;
      player.hp = Math.min(player.maxHp, player.hp + 38);
    },
  },
  {
    id: "magnet",
    title: "Grave Magnet",
    text: "Pulls experience gems from farther away.",
    maxLevel: 5,
    apply(activeGame) {
      activeGame.player().pickup = Math.min(278, activeGame.player().pickup + 34);
    },
  },
  {
    id: "focus",
    title: "Witch Focus",
    text: "Experience gems become more valuable.",
    maxLevel: 5,
    apply(activeGame) {
      activeGame.player().xpGain = Math.min(1.9, activeGame.player().xpGain + 0.18);
    },
  },
  {
    id: "cooldown",
    title: "Cursed Hourglass",
    text: "Reduces the delay before each weapon fires again.",
    maxLevel: 5,
    apply(activeGame) {
      activeGame.player().passives.cooldownMultiplier = Math.max(
        0.66,
        activeGame.player().passives.cooldownMultiplier * 0.92,
      );
    },
  },
  {
    id: "damage",
    title: "Ruin Brand",
    text: "Raises all weapon damage.",
    maxLevel: 5,
    apply(activeGame) {
      activeGame.player().passives.damageMultiplier = Math.min(
        1.6,
        activeGame.player().passives.damageMultiplier + 0.12,
      );
    },
  },
  {
    id: "amount",
    title: "Twin Relic",
    text: "Adds one extra generated attack where a weapon supports it.",
    maxLevel: 3,
    apply(activeGame) {
      activeGame.player().passives.amountBonus = Math.min(3, activeGame.player().passives.amountBonus + 1);
    },
  },
  {
    id: "attackSpeed",
    title: "Swift Mechanism",
    text: "Makes fired projectiles and moving weapons travel faster.",
    maxLevel: 5,
    apply(activeGame) {
      activeGame.player().passives.attackSpeedMultiplier = Math.min(
        1.7,
        activeGame.player().passives.attackSpeedMultiplier + 0.14,
      );
    },
  },
  {
    id: "area",
    title: "Widened Circle",
    text: "Increases weapon area, blast radius, beams, and traps.",
    maxLevel: 5,
    apply(activeGame) {
      activeGame.player().passives.areaMultiplier = Math.min(1.6, activeGame.player().passives.areaMultiplier + 0.12);
    },
  },
  {
    id: "pierce",
    title: "Piercing Oath",
    text: "Adds extra pierce to projectile attacks.",
    maxLevel: 3,
    apply(activeGame) {
      activeGame.player().passives.pierceBonus = Math.min(3, activeGame.player().passives.pierceBonus + 1);
    },
  },
  {
    id: "critChance",
    title: "Lucky Fang",
    text: "Raises the chance for weapon hits to critically strike.",
    maxLevel: 5,
    apply(activeGame) {
      activeGame.player().passives.criticalChance = Math.min(
        0.4,
        activeGame.player().passives.criticalChance + 0.08,
      );
    },
  },
  {
    id: "critDamage",
    title: "Execution Mark",
    text: "Raises critical strike damage.",
    maxLevel: 4,
    apply(activeGame) {
      activeGame.player().passives.criticalDamageMultiplier = Math.min(
        2.5,
        activeGame.player().passives.criticalDamageMultiplier + 0.25,
      );
    },
  },
  {
    id: "echo",
    title: "Second Echo",
    text: "Gives weapon activations a chance to repeat once.",
    maxLevel: 5,
    apply(activeGame) {
      activeGame.player().passives.echoChance = Math.min(0.3, activeGame.player().passives.echoChance + 0.06);
    },
  },
];

const relicCatalog: RelicDefinition[] = [
  {
    id: "starPrism",
    title: "Star Prism",
    text: "Critical hits become rarer but far sharper.",
    color: "#f6eedc",
    apply(activeGame) {
      const passives = activeGame.player().passives;
      passives.criticalChance = Math.min(0.58, passives.criticalChance + 0.1);
      passives.criticalDamageMultiplier += 0.45;
    },
  },
  {
    id: "overclockCore",
    title: "Overclock Core",
    text: "Weapons cycle and travel faster.",
    color: "#78d7ff",
    apply(activeGame) {
      const passives = activeGame.player().passives;
      passives.cooldownMultiplier = Math.max(0.58, passives.cooldownMultiplier * 0.9);
      passives.attackSpeedMultiplier += 0.18;
    },
  },
  {
    id: "giantsRing",
    title: "Giant's Ring",
    text: "Area and maximum health surge.",
    color: "#9bea82",
    apply(activeGame) {
      const player = activeGame.player();
      player.maxHp += 36;
      player.hp = Math.min(player.maxHp, player.hp + 36);
      player.passives.areaMultiplier += 0.18;
    },
  },
  {
    id: "scholarsCrown",
    title: "Scholar's Crown",
    text: "Experience and pickup range increase.",
    color: "#d8b65f",
    apply(activeGame) {
      const player = activeGame.player();
      player.xpGain += 0.32;
      player.pickup += 48;
    },
  },
  {
    id: "blackCandle",
    title: "Black Candle",
    text: "Damage and echo chance increase.",
    color: "#b88cff",
    apply(activeGame) {
      const passives = activeGame.player().passives;
      passives.damageMultiplier += 0.2;
      passives.echoChance = Math.min(0.42, passives.echoChance + 0.08);
    },
  },
  {
    id: "midasThread",
    title: "Midas Thread",
    text: "Grants gold now and improves future chest gold.",
    color: "#ffcf70",
    apply(activeGame) {
      activeGame.grantGold(160, activeGame.player());
      activeGame.state.goldMultiplier *= 1.25;
    },
  },
  {
    id: "phoenixAsh",
    title: "Phoenix Ash",
    text: "Restores a deep reserve of health.",
    color: "#ff7a45",
    apply(activeGame) {
      const player = activeGame.player();
      player.maxHp += 18;
      player.hp = Math.min(player.maxHp, player.hp + 90);
    },
  },
  {
    id: "stormLens",
    title: "Storm Lens",
    text: "Projectile pierce and attack speed increase.",
    color: "#fff19a",
    apply(activeGame) {
      const passives = activeGame.player().passives;
      passives.pierceBonus += 1;
      passives.attackSpeedMultiplier += 0.16;
    },
  },
];
