"use strict";
const canvas = mustElement("game", HTMLCanvasElement);
const renderContext = canvas.getContext("2d");
if (!renderContext) {
    throw new Error("2D canvas context is not available.");
}
const ctx = renderContext;
const menuPanel = mustElement("menuPanel", HTMLElement);
const touchStick = mustElement("touchStick", HTMLDivElement);
const ui = {
    time: mustElement("timeValue", HTMLSpanElement),
    level: mustElement("levelValue", HTMLSpanElement),
    kills: mustElement("killValue", HTMLSpanElement),
    health: mustElement("healthFill", HTMLSpanElement),
    xp: mustElement("xpFill", HTMLSpanElement),
    rail: mustElement("weaponRail", HTMLDivElement),
    menu: menuPanel,
    mainMenuView: mustElement("mainMenuView", HTMLDivElement),
    characterMenuView: mustElement("characterMenuView", HTMLDivElement),
    pauseMenuView: mustElement("pauseMenuView", HTMLDivElement),
    shopView: mustElement("shopView", HTMLElement),
    menuEyebrow: mustQuery(menuPanel, ".eyebrow", HTMLElement),
    menuHeading: mustQuery(menuPanel, "h1", HTMLElement),
    walletGold: mustElement("walletGold", HTMLElement),
    shopGold: mustElement("shopGold", HTMLElement),
    shopTabs: mustElement("shopTabs", HTMLDivElement),
    shopSummary: mustElement("shopSummary", HTMLElement),
    shopUpgradeList: mustElement("shopUpgradeList", HTMLDivElement),
    shopUpgradeDetail: mustElement("shopUpgradeDetail", HTMLElement),
    characterGrid: mustElement("characterGrid", HTMLDivElement),
    gameOverCharacterGrid: mustElement("gameOverCharacterGrid", HTMLDivElement),
    gameOver: mustElement("gameOverPanel", HTMLElement),
    upgrade: mustElement("upgradePanel", HTMLElement),
    upgradeGrid: mustElement("upgradeGrid", HTMLDivElement),
    reroll: mustElement("rerollButton", HTMLButtonElement),
    finalTime: mustElement("finalTime", HTMLElement),
    finalLevel: mustElement("finalLevel", HTMLElement),
    finalKills: mustElement("finalKills", HTMLElement),
    finalGold: mustElement("finalGold", HTMLElement),
    openCharacter: mustElement("openCharacterButton", HTMLButtonElement),
    openShop: mustElement("openShopButton", HTMLButtonElement),
    characterBack: mustElement("characterBackButton", HTMLButtonElement),
    shopBack: mustElement("shopBackButton", HTMLButtonElement),
    resume: mustElement("resumeButton", HTMLButtonElement),
    start: mustElement("startButton", HTMLButtonElement),
    restart: mustElement("restartButton", HTMLButtonElement),
    pause: mustElement("pauseButton", HTMLButtonElement),
    touchStick,
    touchStickKnob: mustQuery(touchStick, "span", HTMLSpanElement),
};
const TAU = Math.PI * 2;
const WORLD = 5200;
const BASE_MAX_HP = 100;
const BASE_MOVE_SPEED = 235;
const keys = new Set();
let width = 0;
let height = 0;
let dpr = 1;
let last = performance.now();
let floorMarks = [];
let nextEnemyId = 1;
let nextChestId = 1;
const pointer = {
    active: false,
    id: null,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
};
const state = {
    mode: "menu",
    previousMode: "menu",
    selectedCharacterId: "hunter",
    time: 0,
    level: 1,
    xp: 0,
    nextXp: 12,
    kills: 0,
    gold: 0,
    bankableGold: 0,
    bankedGoldReward: 0,
    runGoldBanked: false,
    goldMultiplier: 1,
    rerolls: 0,
    spawnTimer: 0,
    eliteTimer: 18,
    bossTimer: 60,
    chestSpawnTimer: 0,
    shake: 0,
    player: null,
    maxWeapons: 6,
    maxPassives: 6,
    weapons: [],
    enemies: [],
    projectiles: [],
    gems: [],
    particles: [],
    floaters: [],
    zones: [],
    mines: [],
    beams: [],
    strikes: [],
    scythes: [],
    chests: [],
    relics: [],
    passiveLevels: {},
    upgradesTaken: [],
};
const characterDefinitions = [
    {
        id: "hunter",
        name: "Hunter",
        title: "Baseline survivor",
        text: "Silver Bolt start. No stat shifts.",
        color: "#f6eedc",
        weaponId: "silverBolt",
        baseHealthMultiplier: 1,
        moveSpeedMultiplier: 1,
    },
    {
        id: "vessel",
        name: "Vessel",
        title: "Slow explosive core",
        text: "Ember Rite start. HP 150%, speed -10%, blast +8%.",
        color: "#ff7a45",
        weaponId: "emberRite",
        baseHealthMultiplier: 1.5,
        moveSpeedMultiplier: 0.9,
        blastRadiusMultiplierBonus: 0.08,
    },
    {
        id: "archivist",
        name: "Archivist",
        title: "Stable low ceiling",
        text: "Grave Lantern start. No stat penalties.",
        color: "#b88cff",
        weaponId: "graveLantern",
        baseHealthMultiplier: 1,
        moveSpeedMultiplier: 1,
    },
    {
        id: "bellkeeper",
        name: "Bellkeeper",
        title: "Wide late scaler",
        text: "Void Bell start. HP -20%, speed -8%, damage +10%, area +10%.",
        color: "#80d8ff",
        weaponId: "voidBell",
        baseHealthMultiplier: 0.8,
        moveSpeedMultiplier: 0.92,
        damageMultiplierBonus: 0.1,
        areaMultiplierBonus: 0.1,
    },
    {
        id: "duelist",
        name: "Duelist",
        title: "Fast critical line",
        text: "Sun Spear start. HP -15%, damage -10%, speed +10%, crit +10%.",
        color: "#f9dc5c",
        weaponId: "sunSpear",
        baseHealthMultiplier: 0.85,
        moveSpeedMultiplier: 1.1,
        damageMultiplierBonus: -0.1,
        criticalChanceBonus: 0.1,
    },
    {
        id: "warden",
        name: "Warden",
        title: "Armored close guard",
        text: "Moon Knives start. HP +10%, damage +10%, speed -12%, armor +4.",
        color: "#9bea82",
        weaponId: "moonKnives",
        baseHealthMultiplier: 1.1,
        moveSpeedMultiplier: 0.88,
        damageMultiplierBonus: 0.1,
        armor: 4,
    },
];
const characterDefinitionMap = new Map(characterDefinitions.map((character) => [character.id, character]));
const PROFILE_STORAGE_KEY = "nightfall-survivors-profile-v1";
const shopCategoryLabels = {
    corePercent: "Core %",
    flatBonus: "Flat Bonus",
    utility: "Utility",
    unlocks: "Unlocks",
    runPrep: "Run Prep",
};
const shopCategorySummary = {
    corePercent: "Permanent percentage bonuses applied to character base stats before a run starts.",
    flatBonus: "Absolute bonuses added after character and percentage modifiers.",
    utility: "Run tools and shop conveniences purchased with banked gold.",
    unlocks: "Future character, weapon, relic, and evolution unlocks.",
    runPrep: "Future one-run consumables for pre-run planning.",
};
const shopUpgradeDefinitions = [
    {
        id: "vitalityTraining",
        category: "corePercent",
        title: "Vitality Training",
        text: "Increases character base health.",
        applyLabel: "Base health",
        maxLevel: 10,
        baseCost: 140,
        costScale: 1.32,
        valuePerLevel: 0.02,
        valueFormat: "percent",
    },
    {
        id: "mightTraining",
        category: "corePercent",
        title: "Might Training",
        text: "Increases base weapon damage.",
        applyLabel: "Base damage",
        maxLevel: 10,
        baseCost: 160,
        costScale: 1.34,
        valuePerLevel: 0.02,
        valueFormat: "percent",
    },
    {
        id: "fleetBoots",
        category: "corePercent",
        title: "Fleet Boots",
        text: "Increases character move speed.",
        applyLabel: "Move speed",
        maxLevel: 8,
        baseCost: 150,
        costScale: 1.35,
        valuePerLevel: 0.02,
        valueFormat: "percent",
    },
    {
        id: "scholarInk",
        category: "corePercent",
        title: "Scholar Ink",
        text: "Increases experience gained from gems.",
        applyLabel: "XP gain",
        maxLevel: 8,
        baseCost: 170,
        costScale: 1.36,
        valuePerLevel: 0.04,
        valueFormat: "percent",
    },
    {
        id: "magnetCharm",
        category: "corePercent",
        title: "Magnet Charm",
        text: "Increases pickup range.",
        applyLabel: "Pickup range",
        maxLevel: 8,
        baseCost: 130,
        costScale: 1.32,
        valuePerLevel: 0.04,
        valueFormat: "percent",
    },
    {
        id: "fortuneSeal",
        category: "corePercent",
        title: "Fortune Seal",
        text: "Increases gold gained during a run.",
        applyLabel: "Gold gain",
        maxLevel: 8,
        baseCost: 190,
        costScale: 1.38,
        valuePerLevel: 0.04,
        valueFormat: "percent",
    },
    {
        id: "ironSkin",
        category: "flatBonus",
        title: "Iron Skin",
        text: "Adds flat character armor.",
        applyLabel: "Armor",
        maxLevel: 5,
        baseCost: 260,
        costScale: 1.45,
        valuePerLevel: 1,
        valueFormat: "flat",
    },
    {
        id: "startingPurse",
        category: "flatBonus",
        title: "Starting Purse",
        text: "Starts each run with non-bankable run gold.",
        applyLabel: "Start gold",
        maxLevel: 5,
        baseCost: 220,
        costScale: 1.42,
        valuePerLevel: 15,
        valueFormat: "gold",
    },
    {
        id: "rerollPermit",
        category: "utility",
        title: "Reroll Permit",
        text: "Adds level-up choice rerolls each run.",
        applyLabel: "Rerolls",
        maxLevel: 3,
        baseCost: 420,
        costScale: 1.75,
        valuePerLevel: 1,
        valueFormat: "count",
    },
    {
        id: "bargainLedger",
        category: "utility",
        title: "Bargain Ledger",
        text: "Reduces future shop prices.",
        applyLabel: "Shop prices",
        maxLevel: 5,
        baseCost: 360,
        costScale: 1.48,
        valuePerLevel: 0.03,
        valueFormat: "discount",
    },
];
const shopDefinitionMap = new Map(shopUpgradeDefinitions.map((upgrade) => [upgrade.id, upgrade]));
const profile = loadProfile();
let currentMenuView = "main";
let currentShopCategory = "corePercent";
let selectedShopUpgradeId = "vitalityTraining";
const game = {
    state,
    player: getPlayer,
    randomRange,
    normalize,
    rotate: rotateVector,
    findEnemyById,
    findNearestEnemies,
    spawnProjectile,
    spawnZone,
    spawnMine,
    spawnBeam,
    spawnStrike,
    spawnScythe,
    grantGold,
    grantRelic,
    cooldown: scaleCooldown,
    amount: scaleAmount,
    attackSpeed: scaleAttackSpeed,
    area: scaleArea,
    blastArea: scaleBlastArea,
    hasPassive,
    withEcho,
    damageEnemy,
    areaDamage,
    damageEnemiesAlongLine,
    applySlow,
    addParticles,
};
const weaponEvolutions = {
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
const weaponDefinitions = [
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
const weaponDefinitionMap = new Map(weaponDefinitions.map((definition) => [definition.id, definition]));
const passiveCatalog = [
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
            activeGame.player().passives.cooldownMultiplier = Math.max(0.66, activeGame.player().passives.cooldownMultiplier * 0.92);
        },
    },
    {
        id: "damage",
        title: "Ruin Brand",
        text: "Raises all weapon damage.",
        maxLevel: 5,
        apply(activeGame) {
            activeGame.player().passives.damageMultiplier = Math.min(1.6, activeGame.player().passives.damageMultiplier + 0.12);
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
            activeGame.player().passives.attackSpeedMultiplier = Math.min(1.7, activeGame.player().passives.attackSpeedMultiplier + 0.14);
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
            activeGame.player().passives.criticalChance = Math.min(0.4, activeGame.player().passives.criticalChance + 0.08);
        },
    },
    {
        id: "critDamage",
        title: "Execution Mark",
        text: "Raises critical strike damage.",
        maxLevel: 4,
        apply(activeGame) {
            activeGame.player().passives.criticalDamageMultiplier = Math.min(2.5, activeGame.player().passives.criticalDamageMultiplier + 0.25);
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
const relicCatalog = [
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
function createSilverBoltDefinition() {
    return {
        id: "silverBolt",
        name: "Silver Bolt",
        color: "#d8b65f",
        maxLevel: 7,
        evolution: weaponEvolutions.silverBolt,
        create() {
            const stats = {
                cooldown: 0.55,
                timer: 0.08,
                damage: 15,
                count: 1,
                speed: 560,
            };
            const weapon = {
                id: "silverBolt",
                name: "Silver Bolt",
                color: "#d8b65f",
                level: 1,
                maxLevel: 7,
                evolved: false,
                evolution: {
                    ...weaponEvolutions.silverBolt,
                    evolve(evolvedWeapon) {
                        evolvedWeapon.name = weaponEvolutions.silverBolt.name;
                        evolvedWeapon.color = weaponEvolutions.silverBolt.color;
                        stats.damage += 18;
                        stats.count += 2;
                        stats.cooldown = Math.max(0.12, stats.cooldown - 0.08);
                        stats.speed += 120;
                    },
                },
                update(dt, activeGame) {
                    stats.timer -= dt;
                    if (stats.timer > 0 || activeGame.state.enemies.length === 0)
                        return;
                    activeGame.withEcho(() => {
                        const player = activeGame.player();
                        const targets = activeGame.findNearestEnemies(player, activeGame.amount(stats.count, 10));
                        targets.forEach((target, index) => {
                            const aim = activeGame.normalize(target.x - player.x, target.y - player.y);
                            const spread = (index - (targets.length - 1) / 2) * 0.12;
                            const velocity = activeGame.rotate(aim.x, aim.y, spread);
                            activeGame.spawnProjectile({
                                x: player.x + velocity.x * 20,
                                y: player.y + velocity.y * 20,
                                vx: velocity.x * stats.speed,
                                vy: velocity.y * stats.speed,
                                r: weapon.evolved ? 7 : 6,
                                damage: weapon.evolved ? stats.damage * 1.12 : stats.damage,
                                life: weapon.evolved ? 1.45 : 1.25,
                                pierce: weapon.evolved ? 2 : weapon.level >= 5 ? 1 : 0,
                                color: weapon.color,
                                onHit: weapon.evolved
                                    ? (enemy, projectile, gameOnHit) => {
                                        const shardTargets = gameOnHit.findNearestEnemies(enemy, 2, projectile.hitEnemyIds, gameOnHit.area(280));
                                        shardTargets.forEach((shardTarget, shardIndex) => {
                                            const shardAim = gameOnHit.normalize(shardTarget.x - enemy.x, shardTarget.y - enemy.y);
                                            const shardVelocity = gameOnHit.rotate(shardAim.x, shardAim.y, (shardIndex - 0.5) * 0.18);
                                            gameOnHit.spawnProjectile({
                                                x: enemy.x,
                                                y: enemy.y,
                                                vx: shardVelocity.x * (stats.speed * 0.86),
                                                vy: shardVelocity.y * (stats.speed * 0.86),
                                                r: 4,
                                                damage: stats.damage * 0.55,
                                                life: 0.7,
                                                pierce: 0,
                                                color: weapon.color,
                                                hitEnemyIds: [enemy.id],
                                            });
                                        });
                                    }
                                    : undefined,
                            });
                        });
                    });
                    stats.timer = activeGame.cooldown(stats.cooldown);
                },
                upgrade(_activeGame) {
                    if (!raiseWeaponLevel(weapon))
                        return;
                    stats.damage += 5;
                    stats.cooldown = Math.max(0.18, stats.cooldown - 0.045);
                    if (weapon.level === 2 || weapon.level === 4 || weapon.level === 6) {
                        stats.count += 1;
                    }
                },
                getDescription() {
                    return `Fires ${stats.count} silver shot${stats.count > 1 ? "s" : ""} at nearby enemies.`;
                },
            };
            return weapon;
        },
    };
}
function createMoonKnivesDefinition() {
    return {
        id: "moonKnives",
        name: "Moon Knives",
        color: "#42b99a",
        maxLevel: 7,
        evolution: weaponEvolutions.moonKnives,
        create() {
            const stats = {
                count: 1,
                damage: 13,
                radius: 72,
                speed: 2.4,
                angle: 0,
                bladeSize: 13,
                expansion: 0,
            };
            const weapon = {
                id: "moonKnives",
                name: "Moon Knives",
                color: "#42b99a",
                level: 1,
                maxLevel: 7,
                evolved: false,
                evolution: {
                    ...weaponEvolutions.moonKnives,
                    evolve(evolvedWeapon) {
                        evolvedWeapon.name = weaponEvolutions.moonKnives.name;
                        evolvedWeapon.color = weaponEvolutions.moonKnives.color;
                        stats.count = Math.min(9, stats.count + 2);
                        stats.damage += 14;
                        stats.radius += 28;
                        stats.speed += 1.9;
                        stats.bladeSize = 18;
                    },
                },
                update(dt, activeGame) {
                    const player = activeGame.player();
                    const count = activeGame.amount(stats.count, 10);
                    stats.expansion = weapon.evolved ? (stats.expansion + dt * activeGame.attackSpeed(3.4)) % TAU : 0;
                    const expansionScale = weapon.evolved ? 1 + Math.sin(stats.expansion) * 0.18 : 1;
                    const radius = activeGame.area(stats.radius * expansionScale);
                    stats.angle += activeGame.attackSpeed(stats.speed) * dt;
                    activeGame.state.enemies.forEach((enemy) => {
                        const cooldown = enemy.hitCooldowns[weapon.id] ?? 0;
                        if (cooldown > 0 || enemy.hp <= 0)
                            return;
                        for (let i = 0; i < count; i += 1) {
                            const angle = stats.angle + (TAU / count) * i;
                            const blade = {
                                x: player.x + Math.cos(angle) * radius,
                                y: player.y + Math.sin(angle) * radius,
                            };
                            if (Math.hypot(enemy.x - blade.x, enemy.y - blade.y) < enemy.r + stats.bladeSize) {
                                activeGame.damageEnemy(enemy, stats.damage);
                                enemy.hitCooldowns[weapon.id] = activeGame.cooldown(weapon.evolved ? 0.38 : 0.55);
                                activeGame.addParticles(enemy.x, enemy.y, weapon.color, 5);
                                break;
                            }
                        }
                    });
                },
                draw(drawContext, camera, activeGame) {
                    const player = activeGame.player();
                    const count = activeGame.amount(stats.count, 10);
                    const expansionScale = weapon.evolved ? 1 + Math.sin(stats.expansion) * 0.18 : 1;
                    const radius = activeGame.area(stats.radius * expansionScale);
                    drawContext.save();
                    drawContext.strokeStyle = weapon.evolved ? "rgba(183,255,232,0.26)" : "rgba(66,185,154,0.16)";
                    drawContext.lineWidth = 2;
                    drawContext.beginPath();
                    drawContext.arc(player.x - camera.x, player.y - camera.y, radius, 0, TAU);
                    drawContext.stroke();
                    drawContext.restore();
                    for (let i = 0; i < count; i += 1) {
                        const angle = stats.angle + (TAU / count) * i;
                        const x = player.x + Math.cos(angle) * radius - camera.x;
                        const y = player.y + Math.sin(angle) * radius - camera.y;
                        drawContext.save();
                        drawContext.translate(x, y);
                        drawContext.rotate(angle);
                        drawContext.shadowBlur = 14;
                        drawContext.shadowColor = weapon.color;
                        drawContext.fillStyle = weapon.evolved ? "#e6fff7" : "#9ef0d7";
                        drawContext.beginPath();
                        drawContext.moveTo(stats.bladeSize + 1, 0);
                        drawContext.lineTo(-8, -6);
                        drawContext.lineTo(-4, 0);
                        drawContext.lineTo(-8, 6);
                        drawContext.closePath();
                        drawContext.fill();
                        drawContext.restore();
                    }
                },
                upgrade(_activeGame) {
                    if (!raiseWeaponLevel(weapon))
                        return;
                    stats.count = Math.min(7, stats.count + 1);
                    stats.damage += 5;
                    stats.radius += 8;
                },
                getDescription() {
                    return `${stats.count} circling blade${stats.count > 1 ? "s" : ""} cut enemies around you.`;
                },
            };
            return weapon;
        },
    };
}
function createEmberRiteDefinition() {
    return {
        id: "emberRite",
        name: "Ember Rite",
        color: "#d96547",
        maxLevel: 6,
        evolution: weaponEvolutions.emberRite,
        create() {
            const stats = {
                cooldown: 4.8,
                timer: 2.2,
                damage: 22,
                radius: 96,
                pulse: 0,
            };
            const weapon = {
                id: "emberRite",
                name: "Ember Rite",
                color: "#d96547",
                level: 1,
                maxLevel: 6,
                evolved: false,
                evolution: {
                    ...weaponEvolutions.emberRite,
                    evolve(evolvedWeapon) {
                        evolvedWeapon.name = weaponEvolutions.emberRite.name;
                        evolvedWeapon.color = weaponEvolutions.emberRite.color;
                        stats.damage += 22;
                        stats.radius += 34;
                        stats.cooldown = Math.max(1.35, stats.cooldown - 0.85);
                    },
                },
                update(dt, activeGame) {
                    stats.timer -= dt;
                    stats.pulse = Math.max(0, stats.pulse - dt * 1.6);
                    if (stats.timer > 0)
                        return;
                    const player = activeGame.player();
                    const radius = activeGame.blastArea(stats.radius);
                    activeGame.withEcho(() => {
                        activeGame.areaDamage(player, radius, stats.damage, { particleColor: weapon.color });
                        activeGame.addParticles(player.x, player.y, weapon.color, 26, radius * 0.7);
                        if (weapon.evolved) {
                            activeGame.spawnZone({
                                x: player.x,
                                y: player.y,
                                radius: stats.radius * 0.72,
                                damage: stats.damage * 0.32,
                                life: 2.0,
                                maxLife: 2.0,
                                tick: activeGame.cooldown(0.28),
                                tickTimer: 0,
                                delay: 0,
                                color: weapon.color,
                            });
                        }
                    });
                    stats.pulse = 1;
                    stats.timer = activeGame.cooldown(stats.cooldown);
                    activeGame.state.shake = Math.max(activeGame.state.shake, 3);
                },
                draw(drawContext, camera, activeGame) {
                    if (stats.pulse <= 0)
                        return;
                    const player = activeGame.player();
                    const radius = activeGame.blastArea(stats.radius) * (1.15 - stats.pulse * 0.15);
                    drawContext.save();
                    drawContext.globalAlpha = stats.pulse;
                    drawContext.strokeStyle = weapon.color;
                    drawContext.lineWidth = 5;
                    drawContext.shadowBlur = 28;
                    drawContext.shadowColor = weapon.color;
                    drawContext.beginPath();
                    drawContext.arc(player.x - camera.x, player.y - camera.y, radius, 0, TAU);
                    drawContext.stroke();
                    drawContext.restore();
                },
                upgrade(_activeGame) {
                    if (!raiseWeaponLevel(weapon))
                        return;
                    stats.damage += 8;
                    stats.radius += 18;
                    stats.cooldown = Math.max(2.2, stats.cooldown - 0.22);
                },
                getDescription() {
                    return `Burns nearby enemies every ${stats.cooldown.toFixed(1)}s.`;
                },
            };
            return weapon;
        },
    };
}
function createGraveLanternDefinition() {
    return {
        id: "graveLantern",
        name: "Grave Lantern",
        color: "#86c7ff",
        maxLevel: 7,
        evolution: weaponEvolutions.graveLantern,
        create() {
            const stats = {
                radius: 92,
                damage: 5,
                tick: 0.45,
                pulse: 0,
                rampDamage: 0,
                maxRampDamage: 0,
            };
            const exposureByEnemyId = new Map();
            const weapon = {
                id: "graveLantern",
                name: "Grave Lantern",
                color: "#86c7ff",
                level: 1,
                maxLevel: 7,
                evolved: false,
                evolution: {
                    ...weaponEvolutions.graveLantern,
                    evolve(evolvedWeapon) {
                        evolvedWeapon.name = weaponEvolutions.graveLantern.name;
                        evolvedWeapon.color = weaponEvolutions.graveLantern.color;
                        stats.radius += 44;
                        stats.damage += 5;
                        stats.tick = Math.max(0.18, stats.tick - 0.08);
                        stats.rampDamage = 4.2;
                        stats.maxRampDamage = 22;
                    },
                },
                update(dt, activeGame) {
                    const player = activeGame.player();
                    const radius = activeGame.area(stats.radius);
                    stats.pulse = (stats.pulse + dt * 1.7) % TAU;
                    const seenEnemyIds = new Set();
                    activeGame.state.enemies.forEach((enemy) => {
                        const cooldown = enemy.hitCooldowns[weapon.id] ?? 0;
                        if (enemy.hp <= 0)
                            return;
                        const inAura = Math.hypot(enemy.x - player.x, enemy.y - player.y) < radius + enemy.r;
                        if (!inAura) {
                            exposureByEnemyId.delete(enemy.id);
                            return;
                        }
                        if (weapon.evolved) {
                            const nextExposure = (exposureByEnemyId.get(enemy.id) ?? 0) + dt;
                            exposureByEnemyId.set(enemy.id, nextExposure);
                            seenEnemyIds.add(enemy.id);
                        }
                        if (cooldown <= 0) {
                            const ramp = weapon.evolved
                                ? Math.min(stats.maxRampDamage, (exposureByEnemyId.get(enemy.id) ?? 0) * stats.rampDamage)
                                : 0;
                            activeGame.damageEnemy(enemy, stats.damage + ramp);
                            enemy.hitCooldowns[weapon.id] = activeGame.cooldown(stats.tick);
                        }
                    });
                    if (weapon.evolved) {
                        Array.from(exposureByEnemyId.keys()).forEach((enemyId) => {
                            if (!seenEnemyIds.has(enemyId))
                                exposureByEnemyId.delete(enemyId);
                        });
                    }
                },
                draw(drawContext, camera, activeGame) {
                    const player = activeGame.player();
                    const radius = activeGame.area(stats.radius);
                    const alpha = 0.16 + Math.sin(stats.pulse) * 0.04;
                    drawContext.save();
                    drawContext.globalAlpha = alpha;
                    drawContext.strokeStyle = weapon.color;
                    drawContext.lineWidth = 3;
                    drawContext.beginPath();
                    drawContext.arc(player.x - camera.x, player.y - camera.y, radius, 0, TAU);
                    drawContext.stroke();
                    drawContext.restore();
                },
                upgrade(_activeGame) {
                    if (!raiseWeaponLevel(weapon))
                        return;
                    stats.radius += 11;
                    stats.damage += 2.5;
                    stats.tick = Math.max(0.24, stats.tick - 0.025);
                },
                getDescription() {
                    return `A lantern aura deals steady damage within ${Math.round(stats.radius)}px.`;
                },
            };
            return weapon;
        },
    };
}
function createRicochetCrossbowDefinition() {
    return {
        id: "ricochetCrossbow",
        name: "Ricochet Crossbow",
        color: "#b88cff",
        maxLevel: 7,
        evolution: weaponEvolutions.ricochetCrossbow,
        create() {
            const stats = {
                cooldown: 1.05,
                timer: 0.5,
                damage: 18,
                speed: 520,
                bounces: 2,
                count: 1,
                range: 260,
            };
            const weapon = {
                id: "ricochetCrossbow",
                name: "Ricochet Crossbow",
                color: "#b88cff",
                level: 1,
                maxLevel: 7,
                evolved: false,
                evolution: {
                    ...weaponEvolutions.ricochetCrossbow,
                    evolve(evolvedWeapon) {
                        evolvedWeapon.name = weaponEvolutions.ricochetCrossbow.name;
                        evolvedWeapon.color = weaponEvolutions.ricochetCrossbow.color;
                        stats.damage += 15;
                        stats.bounces += 3;
                        stats.count += 2;
                        stats.range += 150;
                        stats.cooldown = Math.max(0.48, stats.cooldown - 0.16);
                    },
                },
                update(dt, activeGame) {
                    stats.timer -= dt;
                    if (stats.timer > 0)
                        return;
                    activeGame.withEcho(() => {
                        const player = activeGame.player();
                        const targets = activeGame.findNearestEnemies(player, activeGame.amount(stats.count, 8));
                        targets.forEach((target, index) => {
                            const aim = activeGame.normalize(target.x - player.x, target.y - player.y);
                            const velocity = activeGame.rotate(aim.x, aim.y, (index - (targets.length - 1) / 2) * 0.18);
                            activeGame.spawnProjectile({
                                x: player.x + velocity.x * 22,
                                y: player.y + velocity.y * 22,
                                vx: velocity.x * stats.speed,
                                vy: velocity.y * stats.speed,
                                r: 5,
                                damage: stats.damage,
                                life: 2.2,
                                pierce: 0,
                                bounces: weapon.evolved ? stats.bounces + 1 : stats.bounces,
                                bounceRange: stats.range,
                                color: weapon.color,
                                onHit: weapon.evolved
                                    ? (enemy, projectile, gameOnHit) => {
                                        const mirrorTargets = gameOnHit.findNearestEnemies(enemy, 2, projectile.hitEnemyIds, stats.range);
                                        mirrorTargets.forEach((mirrorTarget, mirrorIndex) => {
                                            const aim = gameOnHit.normalize(mirrorTarget.x - enemy.x, mirrorTarget.y - enemy.y);
                                            const velocity = gameOnHit.rotate(aim.x, aim.y, (mirrorIndex - 0.5) * 0.2);
                                            gameOnHit.spawnProjectile({
                                                x: enemy.x,
                                                y: enemy.y,
                                                vx: velocity.x * (stats.speed * 0.92),
                                                vy: velocity.y * (stats.speed * 0.92),
                                                r: 4,
                                                damage: stats.damage * 0.72,
                                                life: 1.2,
                                                pierce: 0,
                                                bounces: 1,
                                                bounceRange: stats.range * 0.65,
                                                color: weapon.color,
                                                hitEnemyIds: [enemy.id],
                                            });
                                        });
                                    }
                                    : undefined,
                            });
                        });
                    });
                    stats.timer = activeGame.cooldown(stats.cooldown);
                },
                upgrade(_activeGame) {
                    if (!raiseWeaponLevel(weapon))
                        return;
                    stats.damage += 4;
                    stats.cooldown = Math.max(0.62, stats.cooldown - 0.055);
                    if (weapon.level === 3 || weapon.level === 6)
                        stats.bounces += 1;
                    if (weapon.level === 4)
                        stats.count += 1;
                },
                getDescription() {
                    return `Bolts bounce ${stats.bounces} times between enemies.`;
                },
            };
            return weapon;
        },
    };
}
function createFrostSigilDefinition() {
    return {
        id: "frostSigil",
        name: "Frost Sigil",
        color: "#78d7ff",
        maxLevel: 7,
        evolution: weaponEvolutions.frostSigil,
        create() {
            const stats = {
                cooldown: 3.8,
                timer: 1.0,
                radius: 74,
                damage: 10,
                duration: 2.1,
                tick: 0.48,
                slowFactor: 0.55,
                slowDuration: 1.0,
                bonusXp: 2.5,
            };
            const weapon = {
                id: "frostSigil",
                name: "Frost Sigil",
                color: "#78d7ff",
                level: 1,
                maxLevel: 7,
                evolved: false,
                evolution: {
                    ...weaponEvolutions.frostSigil,
                    evolve(evolvedWeapon) {
                        evolvedWeapon.name = weaponEvolutions.frostSigil.name;
                        evolvedWeapon.color = weaponEvolutions.frostSigil.color;
                        stats.radius += 26;
                        stats.damage += 10;
                        stats.duration += 1.0;
                        stats.slowFactor = 0.38;
                        stats.bonusXp += 5.5;
                        stats.cooldown = Math.max(1.75, stats.cooldown - 0.38);
                    },
                },
                update(dt, activeGame) {
                    stats.timer -= dt;
                    if (stats.timer > 0)
                        return;
                    activeGame.withEcho(() => {
                        const target = activeGame.findNearestEnemies(activeGame.player(), 1)[0];
                        if (target) {
                            activeGame.spawnZone({
                                x: target.x,
                                y: target.y,
                                radius: stats.radius,
                                damage: stats.damage,
                                life: stats.duration,
                                maxLife: stats.duration,
                                tick: activeGame.cooldown(stats.tick),
                                delay: 0.28,
                                color: weapon.color,
                                slowFactor: stats.slowFactor,
                                slowDuration: stats.slowDuration,
                                onHit: weapon.evolved
                                    ? (enemy) => {
                                        enemy.bonusXp = Math.max(enemy.bonusXp, stats.bonusXp);
                                    }
                                    : undefined,
                            });
                            activeGame.addParticles(target.x, target.y, weapon.color, 12, activeGame.area(stats.radius) * 0.45);
                        }
                    });
                    stats.timer = activeGame.cooldown(stats.cooldown);
                },
                upgrade(_activeGame) {
                    if (!raiseWeaponLevel(weapon))
                        return;
                    stats.radius += 8;
                    stats.damage += 3;
                    stats.duration += 0.12;
                    stats.cooldown = Math.max(2.2, stats.cooldown - 0.16);
                },
                getDescription() {
                    return `Creates slowing sigils that tick for ${stats.damage} damage.`;
                },
            };
            return weapon;
        },
    };
}
function createThunderCharmDefinition() {
    return {
        id: "thunderCharm",
        name: "Thunder Charm",
        color: "#f2d57a",
        maxLevel: 7,
        evolution: weaponEvolutions.thunderCharm,
        create() {
            const stats = {
                cooldown: 2.25,
                timer: 0.9,
                damage: 20,
                chains: 3,
                range: 170,
            };
            const weapon = {
                id: "thunderCharm",
                name: "Thunder Charm",
                color: "#f2d57a",
                level: 1,
                maxLevel: 7,
                evolved: false,
                evolution: {
                    ...weaponEvolutions.thunderCharm,
                    evolve(evolvedWeapon) {
                        evolvedWeapon.name = weaponEvolutions.thunderCharm.name;
                        evolvedWeapon.color = weaponEvolutions.thunderCharm.color;
                        stats.damage += 18;
                        stats.chains += 3;
                        stats.range += 70;
                        stats.cooldown = Math.max(0.92, stats.cooldown - 0.32);
                    },
                },
                update(dt, activeGame) {
                    stats.timer -= dt;
                    if (stats.timer > 0)
                        return;
                    activeGame.withEcho(() => {
                        const player = activeGame.player();
                        let origin = player;
                        const hitIds = [];
                        for (let i = 0; i < activeGame.amount(stats.chains, 10); i += 1) {
                            const next = activeGame.findNearestEnemies(origin, 1, hitIds, i === 0 ? Infinity : activeGame.area(stats.range))[0];
                            if (!next)
                                break;
                            activeGame.spawnStrike({
                                fromX: origin.x,
                                fromY: origin.y,
                                toX: next.x,
                                toY: next.y,
                                life: 0.18,
                                maxLife: 0.18,
                                color: weapon.color,
                            });
                            activeGame.damageEnemy(next, stats.damage);
                            activeGame.addParticles(next.x, next.y, weapon.color, 8);
                            hitIds.push(next.id);
                            if (weapon.evolved && Math.random() < Math.min(0.88, activeGame.player().passives.criticalChance + 0.24)) {
                                const bonusTarget = activeGame.findNearestEnemies(next, 1, hitIds, activeGame.area(stats.range * 1.25))[0] ?? next;
                                activeGame.spawnStrike({
                                    fromX: next.x,
                                    fromY: next.y,
                                    toX: bonusTarget.x,
                                    toY: bonusTarget.y,
                                    life: 0.16,
                                    maxLife: 0.16,
                                    color: weapon.color,
                                });
                                activeGame.damageEnemy(bonusTarget, stats.damage * 0.72);
                                activeGame.addParticles(bonusTarget.x, bonusTarget.y, weapon.color, 6);
                            }
                            origin = next;
                        }
                    });
                    stats.timer = activeGame.cooldown(stats.cooldown);
                },
                upgrade(_activeGame) {
                    if (!raiseWeaponLevel(weapon))
                        return;
                    stats.damage += 6;
                    stats.cooldown = Math.max(1.15, stats.cooldown - 0.11);
                    if (weapon.level === 2 || weapon.level === 5)
                        stats.chains += 1;
                    stats.range += 8;
                },
                getDescription() {
                    return `Chains lightning through ${stats.chains} enemies.`;
                },
            };
            return weapon;
        },
    };
}
function createBloodBatsDefinition() {
    return {
        id: "bloodBats",
        name: "Blood Bats",
        color: "#e05b7a",
        maxLevel: 7,
        evolution: weaponEvolutions.bloodBats,
        create() {
            const stats = {
                cooldown: 1.8,
                timer: 0.4,
                count: 2,
                damage: 12,
                speed: 340,
                life: 3.0,
                homing: 7,
            };
            const weapon = {
                id: "bloodBats",
                name: "Blood Bats",
                color: "#e05b7a",
                level: 1,
                maxLevel: 7,
                evolved: false,
                evolution: {
                    ...weaponEvolutions.bloodBats,
                    evolve(evolvedWeapon) {
                        evolvedWeapon.name = weaponEvolutions.bloodBats.name;
                        evolvedWeapon.color = weaponEvolutions.bloodBats.color;
                        stats.damage += 12;
                        stats.count += 3;
                        stats.speed += 90;
                        stats.life += 1.0;
                        stats.homing += 3;
                        stats.cooldown = Math.max(0.72, stats.cooldown - 0.22);
                    },
                },
                update(dt, activeGame) {
                    stats.timer -= dt;
                    if (stats.timer > 0)
                        return;
                    activeGame.withEcho(() => {
                        const player = activeGame.player();
                        for (let i = 0; i < activeGame.amount(stats.count, 12); i += 1) {
                            const target = activeGame.findNearestEnemies(player, 1)[0];
                            const angle = target
                                ? Math.atan2(target.y - player.y, target.x - player.x) + activeGame.randomRange(-0.45, 0.45)
                                : activeGame.randomRange(0, TAU);
                            activeGame.spawnProjectile({
                                x: player.x + Math.cos(angle) * 18,
                                y: player.y + Math.sin(angle) * 18,
                                vx: Math.cos(angle) * stats.speed,
                                vy: Math.sin(angle) * stats.speed,
                                r: 7,
                                damage: stats.damage,
                                life: stats.life,
                                pierce: 0,
                                targetId: target?.id,
                                homing: stats.homing,
                                color: weapon.color,
                                onHit: weapon.evolved
                                    ? (enemy, _projectile, gameOnHit, result) => {
                                        const player = gameOnHit.player();
                                        player.hp = Math.min(player.maxHp, player.hp + 1.8);
                                        if (result.killed) {
                                            const nextTarget = gameOnHit.findNearestEnemies(enemy, 1, [enemy.id])[0];
                                            const angle = nextTarget
                                                ? Math.atan2(nextTarget.y - enemy.y, nextTarget.x - enemy.x)
                                                : gameOnHit.randomRange(0, TAU);
                                            gameOnHit.spawnProjectile({
                                                x: enemy.x,
                                                y: enemy.y,
                                                vx: Math.cos(angle) * stats.speed,
                                                vy: Math.sin(angle) * stats.speed,
                                                r: 6,
                                                damage: stats.damage * 0.62,
                                                life: stats.life * 0.65,
                                                pierce: 0,
                                                targetId: nextTarget?.id,
                                                homing: stats.homing,
                                                color: weapon.color,
                                            });
                                        }
                                    }
                                    : undefined,
                            });
                        }
                    });
                    stats.timer = activeGame.cooldown(stats.cooldown);
                },
                upgrade(_activeGame) {
                    if (!raiseWeaponLevel(weapon))
                        return;
                    stats.damage += 4;
                    stats.cooldown = Math.max(0.92, stats.cooldown - 0.09);
                    if (weapon.level === 2 || weapon.level === 4 || weapon.level === 6)
                        stats.count += 1;
                    stats.life += 0.12;
                },
                getDescription() {
                    return `Summons ${stats.count} homing bat${stats.count > 1 ? "s" : ""}.`;
                },
            };
            return weapon;
        },
    };
}
function createSunSpearDefinition() {
    return {
        id: "sunSpear",
        name: "Sun Spear",
        color: "#ffcf70",
        maxLevel: 7,
        evolution: weaponEvolutions.sunSpear,
        create() {
            const stats = {
                cooldown: 4.4,
                timer: 1.6,
                damage: 42,
                length: 820,
                width: 28,
                count: 1,
            };
            const weapon = {
                id: "sunSpear",
                name: "Sun Spear",
                color: "#ffcf70",
                level: 1,
                maxLevel: 7,
                evolved: false,
                evolution: {
                    ...weaponEvolutions.sunSpear,
                    evolve(evolvedWeapon) {
                        evolvedWeapon.name = weaponEvolutions.sunSpear.name;
                        evolvedWeapon.color = weaponEvolutions.sunSpear.color;
                        stats.damage += 70;
                        stats.length += 260;
                        stats.width += 20;
                        stats.count += 1;
                        stats.cooldown = Math.max(1.9, stats.cooldown - 0.65);
                    },
                },
                update(dt, activeGame) {
                    stats.timer -= dt;
                    if (stats.timer > 0)
                        return;
                    activeGame.withEcho(() => {
                        const player = activeGame.player();
                        const target = activeGame.findNearestEnemies(player, 1)[0];
                        const base = target
                            ? activeGame.normalize(target.x - player.x, target.y - player.y)
                            : activeGame.normalize(1, 0);
                        const count = activeGame.amount(stats.count, 6);
                        for (let i = 0; i < count; i += 1) {
                            const spread = (i - (count - 1) / 2) * 0.18;
                            const direction = activeGame.rotate(base.x, base.y, spread);
                            activeGame.damageEnemiesAlongLine(player, direction, stats.length, stats.width, stats.damage, {
                                particleColor: weapon.color,
                                damageMultiplier: weapon.evolved
                                    ? (enemy) => {
                                        const highHealthBonus = enemy.hp / enemy.maxHp > 0.55 ? 1.22 : 1;
                                        const bruteBonus = enemy.kind === "brute" ? 1.65 : 1;
                                        return highHealthBonus * bruteBonus;
                                    }
                                    : undefined,
                            });
                            activeGame.spawnBeam({
                                x: player.x,
                                y: player.y,
                                dx: direction.x,
                                dy: direction.y,
                                length: stats.length,
                                width: stats.width,
                                life: 0.22,
                                maxLife: 0.22,
                                color: weapon.color,
                            });
                        }
                    });
                    activeGame.state.shake = Math.max(activeGame.state.shake, 2);
                    stats.timer = activeGame.cooldown(stats.cooldown);
                },
                upgrade(_activeGame) {
                    if (!raiseWeaponLevel(weapon))
                        return;
                    stats.damage += 12;
                    stats.width += 2;
                    stats.cooldown = Math.max(2.5, stats.cooldown - 0.22);
                    if (weapon.level === 4)
                        stats.count += 1;
                },
                getDescription() {
                    return `Pierces a long line for ${stats.damage} damage.`;
                },
            };
            return weapon;
        },
    };
}
function createThornMinesDefinition() {
    return {
        id: "thornMines",
        name: "Thorn Mines",
        color: "#6ecf77",
        maxLevel: 7,
        evolution: weaponEvolutions.thornMines,
        create() {
            const stats = {
                cooldown: 1.2,
                timer: 0.2,
                damage: 24,
                radius: 68,
                triggerRadius: 46,
                life: 9,
            };
            const weapon = {
                id: "thornMines",
                name: "Thorn Mines",
                color: "#6ecf77",
                level: 1,
                maxLevel: 7,
                evolved: false,
                evolution: {
                    ...weaponEvolutions.thornMines,
                    evolve(evolvedWeapon) {
                        evolvedWeapon.name = weaponEvolutions.thornMines.name;
                        evolvedWeapon.color = weaponEvolutions.thornMines.color;
                        stats.damage += 24;
                        stats.radius += 26;
                        stats.triggerRadius += 20;
                        stats.life += 6;
                        stats.cooldown = Math.max(0.48, stats.cooldown - 0.18);
                    },
                },
                update(dt, activeGame) {
                    stats.timer -= dt;
                    if (stats.timer > 0)
                        return;
                    activeGame.withEcho(() => {
                        const player = activeGame.player();
                        activeGame.spawnMine({
                            x: player.x + activeGame.randomRange(-14, 14),
                            y: player.y + activeGame.randomRange(-14, 14),
                            radius: stats.radius,
                            triggerRadius: stats.triggerRadius,
                            damage: stats.damage,
                            life: stats.life,
                            armedAfter: 0.18,
                            color: weapon.color,
                            gemVacuumRadius: weapon.evolved ? stats.radius * 2.4 : undefined,
                            gemBonusDamage: weapon.evolved ? 7 : undefined,
                        });
                    });
                    stats.timer = activeGame.cooldown(stats.cooldown);
                },
                upgrade(_activeGame) {
                    if (!raiseWeaponLevel(weapon))
                        return;
                    stats.damage += 6;
                    stats.radius += 5;
                    stats.triggerRadius += 3;
                    stats.cooldown = Math.max(0.62, stats.cooldown - 0.07);
                },
                getDescription() {
                    return `Drops armed mines that explode in a ${Math.round(stats.radius)}px radius.`;
                },
            };
            return weapon;
        },
    };
}
function createVoidBellDefinition() {
    return {
        id: "voidBell",
        name: "Void Bell",
        color: "#8e7dff",
        maxLevel: 7,
        evolution: weaponEvolutions.voidBell,
        create() {
            const stats = {
                cooldown: 5.2,
                timer: 2.4,
                pullRadius: 230,
                explosionRadius: 125,
                damage: 36,
                pulse: 0,
            };
            const weapon = {
                id: "voidBell",
                name: "Void Bell",
                color: "#8e7dff",
                level: 1,
                maxLevel: 7,
                evolved: false,
                evolution: {
                    ...weaponEvolutions.voidBell,
                    evolve(evolvedWeapon) {
                        evolvedWeapon.name = weaponEvolutions.voidBell.name;
                        evolvedWeapon.color = weaponEvolutions.voidBell.color;
                        stats.damage += 28;
                        stats.pullRadius += 80;
                        stats.explosionRadius += 44;
                        stats.cooldown = Math.max(2.25, stats.cooldown - 0.7);
                    },
                },
                update(dt, activeGame) {
                    stats.timer -= dt;
                    stats.pulse = Math.max(0, stats.pulse - dt * 1.45);
                    if (stats.timer > 0)
                        return;
                    const player = activeGame.player();
                    const pullRadius = activeGame.area(stats.pullRadius);
                    const explosionRadius = activeGame.area(stats.explosionRadius);
                    activeGame.withEcho(() => {
                        activeGame.state.enemies.forEach((enemy) => {
                            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
                            if (dist > pullRadius || enemy.hp <= 0)
                                return;
                            const pull = activeGame.normalize(player.x - enemy.x, player.y - enemy.y);
                            const strength = 0.18 + (1 - dist / pullRadius) * 0.16;
                            enemy.x += pull.x * pullRadius * strength;
                            enemy.y += pull.y * pullRadius * strength;
                        });
                        activeGame.areaDamage(player, explosionRadius, stats.damage, { particleColor: weapon.color });
                        activeGame.addParticles(player.x, player.y, weapon.color, 34, pullRadius * 0.55);
                        if (weapon.evolved) {
                            activeGame.spawnZone({
                                x: player.x,
                                y: player.y,
                                radius: stats.explosionRadius * 1.35,
                                damage: stats.damage * 0.72,
                                life: 0.9,
                                maxLife: 0.9,
                                tick: 99,
                                tickTimer: 0,
                                delay: 0.34,
                                color: weapon.color,
                                onHit: (enemy, gameOnHit) => {
                                    const pull = gameOnHit.normalize(player.x - enemy.x, player.y - enemy.y);
                                    enemy.x += pull.x * 36;
                                    enemy.y += pull.y * 36;
                                },
                            });
                        }
                    });
                    activeGame.state.shake = Math.max(activeGame.state.shake, 4);
                    stats.pulse = 1;
                    stats.timer = activeGame.cooldown(stats.cooldown);
                },
                draw(drawContext, camera, activeGame) {
                    if (stats.pulse <= 0)
                        return;
                    const player = activeGame.player();
                    drawContext.save();
                    drawContext.globalAlpha = stats.pulse * 0.55;
                    drawContext.strokeStyle = weapon.color;
                    drawContext.lineWidth = 4;
                    drawContext.beginPath();
                    drawContext.arc(player.x - camera.x, player.y - camera.y, activeGame.area(stats.pullRadius) * (1.05 - stats.pulse * 0.2), 0, TAU);
                    drawContext.stroke();
                    drawContext.restore();
                },
                upgrade(_activeGame) {
                    if (!raiseWeaponLevel(weapon))
                        return;
                    stats.damage += 9;
                    stats.pullRadius += 14;
                    stats.explosionRadius += 8;
                    stats.cooldown = Math.max(3.0, stats.cooldown - 0.2);
                },
                getDescription() {
                    return `Pulls enemies inward, then detonates for ${stats.damage} damage.`;
                },
            };
            return weapon;
        },
    };
}
function createReaperScytheDefinition() {
    return {
        id: "reaperScythe",
        name: "Reaper Scythe",
        color: "#f0f0f0",
        maxLevel: 7,
        evolution: weaponEvolutions.reaperScythe,
        create() {
            const stats = {
                cooldown: 3.1,
                timer: 1.3,
                damage: 26,
                speed: 430,
                count: 1,
                size: 19,
                life: 1.7,
            };
            const weapon = {
                id: "reaperScythe",
                name: "Reaper Scythe",
                color: "#f0f0f0",
                level: 1,
                maxLevel: 7,
                evolved: false,
                evolution: {
                    ...weaponEvolutions.reaperScythe,
                    evolve(evolvedWeapon) {
                        evolvedWeapon.name = weaponEvolutions.reaperScythe.name;
                        evolvedWeapon.color = weaponEvolutions.reaperScythe.color;
                        stats.damage += 26;
                        stats.size += 8;
                        stats.count += 2;
                        stats.speed += 90;
                        stats.life += 0.55;
                        stats.cooldown = Math.max(1.18, stats.cooldown - 0.36);
                    },
                },
                update(dt, activeGame) {
                    stats.timer -= dt;
                    if (stats.timer > 0)
                        return;
                    activeGame.withEcho(() => {
                        const player = activeGame.player();
                        const target = activeGame.findNearestEnemies(player, 1)[0];
                        const aim = target
                            ? activeGame.normalize(target.x - player.x, target.y - player.y)
                            : activeGame.normalize(1, 0);
                        const count = activeGame.amount(stats.count, 8);
                        for (let i = 0; i < count; i += 1) {
                            const direction = activeGame.rotate(aim.x, aim.y, (i - (count - 1) / 2) * 0.26);
                            activeGame.spawnScythe({
                                x: player.x + direction.x * 24,
                                y: player.y + direction.y * 24,
                                vx: direction.x * stats.speed,
                                vy: direction.y * stats.speed,
                                speed: stats.speed,
                                r: stats.size,
                                damage: stats.damage,
                                life: stats.life,
                                maxLife: stats.life,
                                returning: false,
                                angle: Math.atan2(direction.y, direction.x),
                                spin: 0,
                                color: weapon.color,
                                hitEnemyIds: [],
                                markDamage: weapon.evolved ? stats.damage * 0.36 : undefined,
                            });
                        }
                    });
                    stats.timer = activeGame.cooldown(stats.cooldown);
                },
                upgrade(_activeGame) {
                    if (!raiseWeaponLevel(weapon))
                        return;
                    stats.damage += 7;
                    stats.size += 1.5;
                    stats.cooldown = Math.max(1.65, stats.cooldown - 0.13);
                    if (weapon.level === 3 || weapon.level === 6)
                        stats.count += 1;
                },
                getDescription() {
                    return `Throws ${stats.count} returning scythe${stats.count > 1 ? "s" : ""}.`;
                },
            };
            return weapon;
        },
    };
}
function mustElement(id, ctor) {
    const element = document.getElementById(id);
    if (!(element instanceof ctor)) {
        throw new Error(`Missing required element: #${id}`);
    }
    return element;
}
function mustQuery(root, selector, ctor) {
    const element = root.querySelector(selector);
    if (!(element instanceof ctor)) {
        throw new Error(`Missing required element: ${selector}`);
    }
    return element;
}
function raiseWeaponLevel(weapon) {
    if (weapon.level >= weapon.maxLevel)
        return false;
    weapon.level += 1;
    return true;
}
function createWeapon(id) {
    const definition = weaponDefinitionMap.get(id);
    if (!definition) {
        throw new Error(`Missing weapon definition: ${id}`);
    }
    return definition.create();
}
function createDefaultPassiveStats() {
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
function getPlayer() {
    if (!state.player) {
        throw new Error("Player is not initialized.");
    }
    return state.player;
}
function getSelectedCharacter() {
    return characterDefinitionMap.get(state.selectedCharacterId) ?? characterDefinitions[0];
}
function loadProfile() {
    try {
        const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
        if (!raw)
            return { gold: 0, shopLevels: {} };
        const parsed = JSON.parse(raw);
        const shopLevels = {};
        shopUpgradeDefinitions.forEach((definition) => {
            const rawLevel = parsed.shopLevels?.[definition.id] ?? 0;
            shopLevels[definition.id] = clamp(Math.floor(Number(rawLevel) || 0), 0, definition.maxLevel);
        });
        return {
            gold: Math.max(0, Math.floor(Number(parsed.gold) || 0)),
            shopLevels,
        };
    }
    catch {
        return { gold: 0, shopLevels: {} };
    }
}
function saveProfile() {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}
function getShopDefinition(id) {
    const definition = shopDefinitionMap.get(id);
    if (!definition) {
        throw new Error(`Missing shop upgrade definition: ${id}`);
    }
    return definition;
}
function getShopLevel(id) {
    return profile.shopLevels[id] ?? 0;
}
function getShopValue(id) {
    const definition = getShopDefinition(id);
    return getShopLevel(id) * definition.valuePerLevel;
}
function getShopCostMultiplier() {
    return Math.max(0.78, 1 - getShopValue("bargainLedger"));
}
function getShopCost(definition) {
    const level = getShopLevel(definition.id);
    return Math.max(1, Math.round(definition.baseCost * Math.pow(definition.costScale, level) * getShopCostMultiplier()));
}
function formatShopValue(definition, level) {
    const value = definition.valuePerLevel * level;
    if (definition.valueFormat === "percent")
        return `+${Math.round(value * 100)}%`;
    if (definition.valueFormat === "discount")
        return `-${Math.round(value * 100)}%`;
    if (definition.valueFormat === "gold")
        return `+${Math.round(value)}g`;
    if (definition.valueFormat === "count")
        return `+${Math.round(value)}`;
    return `+${Math.round(value)}`;
}
function renderWallets() {
    ui.walletGold.textContent = String(profile.gold);
    ui.shopGold.textContent = String(profile.gold);
}
function showMenuView(view) {
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
function renderShop() {
    renderWallets();
    Array.from(ui.shopTabs.querySelectorAll("button[data-shop-category]")).forEach((tab) => {
        const category = tab.getAttribute("data-shop-category");
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
function renderEmptyShopDetail() {
    ui.shopUpgradeDetail.replaceChildren();
    const title = document.createElement("h3");
    const text = document.createElement("p");
    title.textContent = "Locked";
    text.textContent = "This shop category is reserved for later unlock and run-prep systems.";
    ui.shopUpgradeDetail.append(title, text);
}
function renderShopDetail(upgrade) {
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
    stats.append(createShopStat("Current", `${upgrade.applyLabel} ${formatShopValue(upgrade, level)}`), createShopStat("Next", maxed ? "Max level reached" : `${upgrade.applyLabel} ${formatShopValue(upgrade, level + 1)}`), createShopStat("Applied as", upgrade.category === "flatBonus" ? "Added after % modifiers" : "Applied before run start"), createShopStat("Price", maxed ? "Max" : `${cost} gold`));
    buy.className = "shop-buy";
    buy.type = "button";
    buy.disabled = !canBuy;
    buy.textContent = maxed ? "Max Level" : canBuy ? "Buy Upgrade" : "Not Enough Gold";
    buy.addEventListener("click", () => purchaseShopUpgrade(upgrade.id));
    ui.shopUpgradeDetail.append(tag, title, text, stats, buy);
}
function createShopStat(label, value) {
    const row = document.createElement("div");
    const labelElement = document.createElement("span");
    const valueElement = document.createElement("strong");
    row.className = "shop-stat";
    labelElement.textContent = label;
    valueElement.textContent = value;
    row.append(labelElement, valueElement);
    return row;
}
function purchaseShopUpgrade(id) {
    const definition = getShopDefinition(id);
    const level = getShopLevel(id);
    if (level >= definition.maxLevel)
        return;
    const cost = getShopCost(definition);
    if (profile.gold < cost)
        return;
    profile.gold -= cost;
    profile.shopLevels[id] = level + 1;
    saveProfile();
    renderShop();
}
function getPassiveStats() {
    return getPlayer().passives;
}
function hasPassive(passiveId) {
    return (state.passiveLevels[passiveId] ?? 0) > 0;
}
function getPassiveLevel(passiveId) {
    return state.passiveLevels[passiveId] ?? 0;
}
function getPassiveUpgrade(passiveId) {
    const passive = passiveCatalog.find((item) => item.id === passiveId);
    if (!passive) {
        throw new Error(`Missing passive definition: ${passiveId}`);
    }
    return passive;
}
function getOwnedPassiveKindCount() {
    return passiveCatalog.filter((passive) => getPassiveLevel(passive.id) > 0).length;
}
function canChoosePassive(passive) {
    const level = getPassiveLevel(passive.id);
    if (level >= passive.maxLevel)
        return false;
    return level > 0 || getOwnedPassiveKindCount() < state.maxPassives;
}
function recordPassive(passiveId) {
    const passive = getPassiveUpgrade(passiveId);
    if (!canChoosePassive(passive))
        return false;
    state.passiveLevels[passiveId] = getPassiveLevel(passiveId) + 1;
    return true;
}
function evolveReadyWeapons() {
    let evolvedAny = false;
    state.weapons.forEach((weapon) => {
        if (weapon.evolved || weapon.level < weapon.maxLevel || !hasPassive(weapon.evolution.requiredPassive))
            return;
        weapon.evolved = true;
        weapon.name = weapon.evolution.name;
        weapon.color = weapon.evolution.color;
        weapon.evolution.evolve(weapon, game);
        evolvedAny = true;
        const player = state.player;
        if (player) {
            addParticles(player.x, player.y, weapon.color, 44, 96);
            state.shake = Math.max(state.shake, 5);
        }
    });
    return evolvedAny;
}
function scaleCooldown(base) {
    return Math.max(0.05, base * getPassiveStats().cooldownMultiplier);
}
function scaleAmount(base, max = Infinity) {
    return Math.min(max, Math.max(1, Math.floor(base + getPassiveStats().amountBonus)));
}
function scaleAttackSpeed(base) {
    return base * getPassiveStats().attackSpeedMultiplier;
}
function scaleArea(base) {
    return base * getPassiveStats().areaMultiplier;
}
function scaleBlastArea(base) {
    return scaleArea(base) * getPassiveStats().blastRadiusMultiplier;
}
function withEcho(effect) {
    effect();
    if (Math.random() < getPassiveStats().echoChance) {
        effect();
    }
}
function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function buildFloorMarks() {
    floorMarks = [];
    for (let i = 0; i < 340; i += 1) {
        floorMarks.push({
            x: randomRange(-WORLD / 2, WORLD / 2),
            y: randomRange(-WORLD / 2, WORLD / 2),
            size: randomRange(8, 36),
            rot: randomRange(0, TAU),
            kind: Math.random() > 0.72 ? "rune" : "stone",
        });
    }
}
function renderCharacterSelect() {
    renderCharacterGrid(ui.characterGrid);
    renderCharacterGrid(ui.gameOverCharacterGrid);
}
function renderCharacterGrid(container) {
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
function resetRun() {
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
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
function randomRange(min, max) {
    return min + Math.random() * (max - min);
}
function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function normalize(dx, dy) {
    const len = Math.hypot(dx, dy);
    if (len < 0.001) {
        return { x: 0, y: 0, len: 0 };
    }
    return { x: dx / len, y: dy / len, len };
}
function rotateVector(x, y, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: x * cos - y * sin,
        y: x * sin + y * cos,
    };
}
function getCamera() {
    const player = state.player;
    const shakeX = state.shake > 0 ? randomRange(-state.shake, state.shake) : 0;
    const shakeY = state.shake > 0 ? randomRange(-state.shake, state.shake) : 0;
    return {
        x: player ? player.x - width / 2 + shakeX : -width / 2,
        y: player ? player.y - height / 2 + shakeY : -height / 2,
    };
}
function findEnemyById(id) {
    return state.enemies.find((enemy) => enemy.id === id && enemy.hp > 0);
}
function findNearestEnemies(origin, count, excludeIds = [], maxDistance = Infinity) {
    return state.enemies
        .filter((enemy) => enemy.hp > 0 && !excludeIds.includes(enemy.id) && distance(enemy, origin) <= maxDistance)
        .sort((a, b) => distance(a, origin) - distance(b, origin))
        .slice(0, count);
}
function spawnProjectile(projectile) {
    const speedMultiplier = getPassiveStats().attackSpeedMultiplier;
    state.projectiles.push({
        ...projectile,
        vx: projectile.vx * speedMultiplier,
        vy: projectile.vy * speedMultiplier,
        r: projectile.r * getPassiveStats().areaMultiplier,
        pierce: projectile.pierce + getPassiveStats().pierceBonus,
        hitEnemyIds: projectile.hitEnemyIds ?? [],
    });
}
function spawnZone(zone) {
    state.zones.push({
        ...zone,
        radius: scaleArea(zone.radius),
        tickTimer: zone.tickTimer ?? zone.delay,
    });
}
function spawnMine(mine) {
    state.mines.push({
        ...mine,
        radius: scaleArea(mine.radius),
        triggerRadius: scaleArea(mine.triggerRadius),
    });
}
function spawnBeam(beam) {
    state.beams.push({
        ...beam,
        length: scaleArea(beam.length),
        width: scaleArea(beam.width),
    });
}
function spawnStrike(strike) {
    state.strikes.push(strike);
}
function spawnScythe(scythe) {
    const speedMultiplier = getPassiveStats().attackSpeedMultiplier;
    state.scythes.push({
        ...scythe,
        vx: scythe.vx * speedMultiplier,
        vy: scythe.vy * speedMultiplier,
        speed: scythe.speed * speedMultiplier,
        r: scaleArea(scythe.r),
    });
}
function grantGold(amount, origin) {
    const finalAmount = Math.max(0, Math.round(amount * state.goldMultiplier));
    state.gold += finalAmount;
    state.bankableGold += finalAmount;
    if (origin) {
        addTextFloater(origin.x, origin.y - 20, `+${finalAmount}g`, "#ffcf70");
    }
}
function grantRelic(origin, chance = 1) {
    if (Math.random() > chance)
        return false;
    const available = relicCatalog.filter((relic) => !state.relics.includes(relic.id));
    if (available.length === 0)
        return false;
    const relic = available[Math.floor(Math.random() * available.length)];
    state.relics.push(relic.id);
    relic.apply(game);
    addTextFloater(origin.x, origin.y - 34, relic.title, relic.color);
    addParticles(origin.x, origin.y, relic.color, 34, 76);
    return true;
}
function addTextFloater(x, y, value, color = "#f6eedc") {
    state.floaters.push({
        x,
        y,
        vx: randomRange(-10, 10),
        vy: randomRange(-42, -26),
        life: 1.25,
        value,
        color,
    });
}
function applySlow(enemy, factor, duration) {
    enemy.slowFactor = Math.min(enemy.slowFactor, factor);
    enemy.slowTimer = Math.max(enemy.slowTimer, duration);
}
function damageEnemy(enemy, amount) {
    if (enemy.hp <= 0) {
        return { amount: 0, critical: false, killed: false };
    }
    const passives = getPassiveStats();
    const isCritical = Math.random() < passives.criticalChance;
    const finalAmount = amount * passives.damageMultiplier * (isCritical ? passives.criticalDamageMultiplier : 1);
    enemy.hp -= finalAmount;
    enemy.hitFlash = 1;
    state.floaters.push({
        x: enemy.x,
        y: enemy.y - enemy.r,
        vx: randomRange(-8, 8),
        vy: randomRange(-32, -18),
        life: 0.55,
        value: Math.round(finalAmount),
    });
    if (isCritical) {
        addParticles(enemy.x, enemy.y, "#f6eedc", 6, enemy.r + 8);
    }
    return { amount: finalAmount, critical: isCritical, killed: enemy.hp <= 0 };
}
function areaDamage(origin, radius, damage, options = {}) {
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
function damageEnemiesAlongLine(origin, direction, length, beamWidth, damage, options = {}) {
    const dir = normalize(direction.x, direction.y);
    const effectiveLength = scaleArea(length);
    const effectiveWidth = scaleArea(beamWidth);
    state.enemies.forEach((enemy) => {
        if (enemy.hp <= 0)
            return;
        const dx = enemy.x - origin.x;
        const dy = enemy.y - origin.y;
        const projection = dx * dir.x + dy * dir.y;
        if (projection < 0 || projection > effectiveLength)
            return;
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
function spawnEnemy(kind = "shade") {
    const player = getPlayer();
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
    }
    else if (side === 1) {
        x = camera.right + margin;
        y = randomRange(camera.top, camera.bottom);
    }
    else if (side === 2) {
        x = randomRange(camera.left, camera.right);
        y = camera.bottom + margin;
    }
    else {
        x = camera.left - margin;
        y = randomRange(camera.top, camera.bottom);
    }
    const minute = state.time / 60;
    const scale = 1 + minute * 0.42;
    const enemy = {
        id: nextEnemyId,
        x,
        y,
        r: 15,
        hp: 28 * scale,
        maxHp: 28 * scale,
        speed: 72 + minute * 7,
        damage: 8 + minute * 1.6,
        color: "#c83f53",
        xp: 4,
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
        enemy.hp = 18 * scale;
        enemy.maxHp = enemy.hp;
        enemy.speed = 122 + minute * 9;
        enemy.damage = 6 + minute * 1.4;
        enemy.color = "#d8b65f";
        enemy.xp = 3;
    }
    if (kind === "brute") {
        enemy.r = 24;
        enemy.hp = 92 * scale;
        enemy.maxHp = enemy.hp;
        enemy.speed = 48 + minute * 5;
        enemy.damage = 16 + minute * 2;
        enemy.color = "#7867c8";
        enemy.xp = 12;
    }
    if (kind === "boss") {
        enemy.r = 38;
        enemy.hp = 520 * scale;
        enemy.maxHp = enemy.hp;
        enemy.speed = 36 + minute * 3.5;
        enemy.damage = 24 + minute * 3;
        enemy.color = "#ff7a45";
        enemy.xp = 40;
    }
    state.enemies.push(enemy);
}
function getMoveVector() {
    let dx = 0;
    let dy = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft"))
        dx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight"))
        dx += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp"))
        dy -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown"))
        dy += 1;
    if (pointer.active) {
        const joy = normalize(pointer.x - pointer.startX, pointer.y - pointer.startY);
        if (joy.len > 8) {
            dx += joy.x;
            dy += joy.y;
        }
    }
    return normalize(dx, dy);
}
function update(dt) {
    if (state.mode !== "playing")
        return;
    state.time += dt;
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
    updateHud();
    if (getPlayer().hp <= 0) {
        endRun();
    }
}
function updatePlayer(dt) {
    const player = getPlayer();
    const move = getMoveVector();
    player.x = clamp(player.x + move.x * player.speed * dt, -WORLD / 2, WORLD / 2);
    player.y = clamp(player.y + move.y * player.speed * dt, -WORLD / 2, WORLD / 2);
    player.hurtFlash = Math.max(0, player.hurtFlash - dt * 5);
}
function updateSpawns(dt) {
    const minute = state.time / 60;
    const cap = Math.min(240, 55 + Math.floor(state.time * 1.1));
    state.spawnTimer -= dt;
    state.eliteTimer -= dt;
    state.bossTimer -= dt;
    state.chestSpawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.enemies.length < cap) {
        const interval = Math.max(0.08, 0.62 - minute * 0.11);
        const wave = 1 + Math.floor(minute * 2.4);
        for (let i = 0; i < wave; i += 1) {
            const roll = Math.random();
            if (roll > 0.78)
                spawnEnemy("runner");
            else
                spawnEnemy("shade");
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
function spawnInitialChests() {
    const kinds = ["cache", "blood", "hunt", "astral"];
    kinds.forEach((kind) => {
        spawnChestAt(randomRange(-WORLD / 2 + 380, WORLD / 2 - 380), randomRange(-WORLD / 2 + 380, WORLD / 2 - 380), kind, "map", 1);
    });
}
function spawnRandomMapChest() {
    if (state.chests.filter((chest) => chest.source === "map").length >= 4)
        return;
    const player = getPlayer();
    const kinds = ["cache", "blood", "hunt", "astral"];
    const angle = randomRange(0, TAU);
    const distanceFromPlayer = randomRange(520, 1100);
    const x = clamp(player.x + Math.cos(angle) * distanceFromPlayer, -WORLD / 2 + 240, WORLD / 2 - 240);
    const y = clamp(player.y + Math.sin(angle) * distanceFromPlayer, -WORLD / 2 + 240, WORLD / 2 - 240);
    spawnChestAt(x, y, kinds[Math.floor(Math.random() * kinds.length)], "map", 1);
}
function spawnRewardChest(x, y, source, tier) {
    const kind = source === "boss" ? "astral" : Math.random() > 0.5 ? "hunt" : "cache";
    spawnChestAt(x, y, kind, source, tier);
}
function spawnChestAt(x, y, kind, source, rewardTier) {
    const requirements = {
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
}
function updateChests(dt) {
    const player = getPlayer();
    for (let i = state.chests.length - 1; i >= 0; i -= 1) {
        const chest = state.chests[i];
        chest.pulse = (chest.pulse + dt * 2.4) % TAU;
        const dist = Math.hypot(player.x - chest.x, player.y - chest.y);
        const near = dist < chest.unlockRadius;
        if (chest.kind === "cache") {
            chest.progress = near ? Math.min(chest.required, chest.progress + dt) : Math.max(0, chest.progress - dt * 0.65);
        }
        else if (chest.kind === "blood" && near && player.hp > chest.required + 8) {
            player.hp -= chest.required;
            chest.progress = chest.required;
        }
        else if (chest.kind === "astral" && near && state.xp > 0) {
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
function pullGemsToChest(chest, dt) {
    if (chest.kind !== "astral")
        return;
    state.gems.forEach((gem) => {
        const dist = Math.hypot(chest.x - gem.x, chest.y - gem.y);
        if (dist > 160)
            return;
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
function creditChestKill(enemy) {
    state.chests.forEach((chest) => {
        if (chest.kind !== "hunt")
            return;
        if (Math.hypot(enemy.x - chest.x, enemy.y - chest.y) < chest.unlockRadius + enemy.r) {
            chest.progress = Math.min(chest.required, chest.progress + (enemy.kind === "brute" ? 2 : enemy.kind === "boss" ? 5 : 1));
            addParticles(chest.x, chest.y, chestColor(chest.kind), 5, 34);
        }
    });
}
function openChest(index, chest) {
    state.chests.splice(index, 1);
    grantChestReward(chest);
    state.shake = Math.max(state.shake, 3);
    addParticles(chest.x, chest.y, chestColor(chest.kind), 30 + chest.rewardTier * 8, 82);
}
function grantChestReward(chest) {
    const tier = chest.rewardTier;
    const origin = { x: chest.x, y: chest.y };
    if (chest.kind === "cache") {
        grantGold(randomRange(35, 70) * tier, origin);
        gainXp(state.nextXp * (0.2 + tier * 0.08));
        if (Math.random() < 0.35 + tier * 0.12)
            upgradeRandomWeapon();
    }
    else if (chest.kind === "blood") {
        grantGold(randomRange(20, 46) * tier, origin);
        grantRelic(origin, 0.72 + tier * 0.08);
        const player = getPlayer();
        player.hp = Math.min(player.maxHp, player.hp + 26 + tier * 10);
    }
    else if (chest.kind === "hunt") {
        grantGold(randomRange(55, 100) * tier, origin);
        if (!evolveReadyWeapons())
            upgradeRandomWeapon();
        grantRelic(origin, 0.18 + tier * 0.1);
    }
    else {
        grantGold(randomRange(45, 88) * tier, origin);
        grantRelic(origin, 0.58 + tier * 0.12);
        if (Math.random() < 0.45)
            upgradeRandomPassive();
    }
}
function upgradeRandomWeapon() {
    const candidates = state.weapons.filter((weapon) => weapon.level < weapon.maxLevel);
    if (candidates.length === 0)
        return evolveReadyWeapons();
    const weapon = candidates[Math.floor(Math.random() * candidates.length)];
    weapon.upgrade(game);
    addTextFloater(getPlayer().x, getPlayer().y - 42, `${weapon.name} Lv ${weapon.level}`, weapon.color);
    evolveReadyWeapons();
    updateHud(true);
    return true;
}
function upgradeRandomPassive() {
    const candidates = passiveCatalog.filter((passive) => getPassiveLevel(passive.id) > 0 && canChoosePassive(passive));
    if (candidates.length === 0)
        return false;
    const passive = candidates[Math.floor(Math.random() * candidates.length)];
    if (!recordPassive(passive.id))
        return false;
    passive.apply(game);
    addTextFloater(getPlayer().x, getPlayer().y - 58, `${passive.title} Lv ${getPassiveLevel(passive.id)}`, "#d8b65f");
    evolveReadyWeapons();
    return true;
}
function chestColor(kind) {
    if (kind === "blood")
        return "#e05b7a";
    if (kind === "hunt")
        return "#9bea82";
    if (kind === "astral")
        return "#b88cff";
    return "#d8b65f";
}
function chestLabel(kind) {
    if (kind === "blood")
        return "HP";
    if (kind === "hunt")
        return "KO";
    if (kind === "astral")
        return "XP";
    return "HOLD";
}
function updateWeapons(dt) {
    state.weapons.forEach((weapon) => {
        weapon.update(dt, game);
    });
}
function updateProjectiles(dt) {
    for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
        const bullet = state.projectiles[i];
        if (typeof bullet.targetId === "number" && bullet.homing) {
            const target = findEnemyById(bullet.targetId);
            if (target) {
                const aim = normalize(target.x - bullet.x, target.y - bullet.y);
                const speed = Math.hypot(bullet.vx, bullet.vy);
                const turn = clamp(bullet.homing * dt, 0, 1);
                bullet.vx = bullet.vx * (1 - turn) + aim.x * speed * turn;
                bullet.vy = bullet.vy * (1 - turn) + aim.y * speed * turn;
            }
        }
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        bullet.life -= dt;
        let remove = bullet.life <= 0;
        for (let j = state.enemies.length - 1; j >= 0 && !remove; j -= 1) {
            const enemy = state.enemies[j];
            if (enemy.hp <= 0 || bullet.hitEnemyIds.includes(enemy.id))
                continue;
            if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < bullet.r + enemy.r) {
                bullet.hitEnemyIds.push(enemy.id);
                const result = damageEnemy(enemy, bullet.damage);
                bullet.onHit?.(enemy, bullet, game, result);
                addParticles(bullet.x, bullet.y, bullet.color, 4);
                if (bullet.slowFactor && bullet.slowDuration) {
                    applySlow(enemy, bullet.slowFactor, bullet.slowDuration);
                }
                if ((bullet.bounces ?? 0) > 0) {
                    const next = findNearestEnemies(bullet, 1, bullet.hitEnemyIds, bullet.bounceRange ?? Infinity)[0];
                    if (next) {
                        const aim = normalize(next.x - bullet.x, next.y - bullet.y);
                        const speed = Math.hypot(bullet.vx, bullet.vy);
                        bullet.vx = aim.x * speed;
                        bullet.vy = aim.y * speed;
                        bullet.targetId = next.id;
                        bullet.bounces = (bullet.bounces ?? 0) - 1;
                        continue;
                    }
                }
                if (bullet.pierce > 0) {
                    bullet.pierce -= 1;
                }
                else {
                    remove = true;
                }
            }
        }
        if (remove)
            state.projectiles.splice(i, 1);
    }
}
function updateZones(dt) {
    for (let i = state.zones.length - 1; i >= 0; i -= 1) {
        const zone = state.zones[i];
        zone.life -= dt;
        zone.delay = Math.max(0, zone.delay - dt);
        if (zone.delay <= 0) {
            zone.tickTimer -= dt;
            if (zone.tickTimer <= 0) {
                areaDamage(zone, zone.radius, zone.damage, {
                    slowFactor: zone.slowFactor,
                    slowDuration: zone.slowDuration,
                    particleColor: zone.color,
                    onHit(enemy, result) {
                        zone.onHit?.(enemy, game, result);
                    },
                });
                zone.tickTimer = zone.tick;
            }
        }
        if (zone.life <= 0)
            state.zones.splice(i, 1);
    }
}
function updateMines(dt) {
    const player = getPlayer();
    for (let i = state.mines.length - 1; i >= 0; i -= 1) {
        const mine = state.mines[i];
        mine.life -= dt;
        mine.armedAfter = Math.max(0, mine.armedAfter - dt);
        const gemVacuumRadius = mine.gemVacuumRadius;
        if (gemVacuumRadius) {
            state.gems.forEach((gem) => {
                const gemDistance = Math.hypot(gem.x - mine.x, gem.y - mine.y);
                if (gemDistance > gemVacuumRadius)
                    return;
                const pull = normalize(player.x - gem.x, player.y - gem.y);
                const force = 120 + (1 - gemDistance / gemVacuumRadius) * 360;
                gem.x += pull.x * force * dt;
                gem.y += pull.y * force * dt;
            });
        }
        const triggered = mine.armedAfter <= 0 &&
            state.enemies.some((enemy) => enemy.hp > 0 && Math.hypot(enemy.x - mine.x, enemy.y - mine.y) < mine.triggerRadius + enemy.r);
        if (triggered) {
            const gemBonusCount = mine.gemBonusDamage
                ? state.gems.filter((gem) => Math.hypot(gem.x - mine.x, gem.y - mine.y) < mine.radius).length
                : 0;
            const gemBonusDamage = Math.min(6, gemBonusCount) * (mine.gemBonusDamage ?? 0);
            areaDamage(mine, mine.radius, mine.damage + gemBonusDamage, { particleColor: mine.color });
            addParticles(mine.x, mine.y, mine.color, 24, mine.radius);
            state.shake = Math.max(state.shake, 2);
            state.mines.splice(i, 1);
        }
        else if (mine.life <= 0) {
            state.mines.splice(i, 1);
        }
    }
}
function updateScythes(dt) {
    const player = getPlayer();
    for (let i = state.scythes.length - 1; i >= 0; i -= 1) {
        const scythe = state.scythes[i];
        scythe.life -= dt;
        scythe.spin += dt * 14;
        scythe.returning = scythe.returning || scythe.life < scythe.maxLife * 0.48;
        if (scythe.returning) {
            const aim = normalize(player.x - scythe.x, player.y - scythe.y);
            scythe.vx = aim.x * scythe.speed;
            scythe.vy = aim.y * scythe.speed;
        }
        scythe.x += scythe.vx * dt;
        scythe.y += scythe.vy * dt;
        scythe.angle = Math.atan2(scythe.vy, scythe.vx);
        state.enemies.forEach((enemy) => {
            if (enemy.hp <= 0 || scythe.hitEnemyIds.includes(enemy.id))
                return;
            if (Math.hypot(enemy.x - scythe.x, enemy.y - scythe.y) < enemy.r + scythe.r) {
                scythe.hitEnemyIds.push(enemy.id);
                const result = damageEnemy(enemy, scythe.damage);
                if (scythe.markDamage && !result.killed && enemy.hp > 0) {
                    damageEnemy(enemy, scythe.markDamage);
                    state.strikes.push({
                        fromX: enemy.x - scythe.vx * 0.04,
                        fromY: enemy.y - scythe.vy * 0.04,
                        toX: enemy.x,
                        toY: enemy.y,
                        life: 0.14,
                        maxLife: 0.14,
                        color: scythe.color,
                    });
                }
                addParticles(enemy.x, enemy.y, scythe.color, 6);
            }
        });
        if (scythe.life <= 0 || (scythe.returning && Math.hypot(player.x - scythe.x, player.y - scythe.y) < player.r + scythe.r)) {
            state.scythes.splice(i, 1);
        }
    }
}
function updateLooseVisuals(dt) {
    for (let i = state.beams.length - 1; i >= 0; i -= 1) {
        const beam = state.beams[i];
        beam.life -= dt;
        if (beam.life <= 0)
            state.beams.splice(i, 1);
    }
    for (let i = state.strikes.length - 1; i >= 0; i -= 1) {
        const strike = state.strikes[i];
        strike.life -= dt;
        if (strike.life <= 0)
            state.strikes.splice(i, 1);
    }
}
function updateEnemies(dt) {
    const player = getPlayer();
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
        const enemy = state.enemies[i];
        updateEnemyStatus(enemy, dt);
        const aim = normalize(player.x - enemy.x, player.y - enemy.y);
        enemy.x += aim.x * enemy.speed * enemy.slowFactor * dt;
        enemy.y += aim.y * enemy.speed * enemy.slowFactor * dt;
        enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 7);
        const touchDistance = player.r + enemy.r;
        if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < touchDistance) {
            player.hp -= Math.max(1, enemy.damage - player.armor) * dt;
            player.hurtFlash = 1;
            state.shake = Math.max(state.shake, 2);
            const push = normalize(enemy.x - player.x, enemy.y - player.y);
            enemy.x += push.x * 30 * dt;
            enemy.y += push.y * 30 * dt;
        }
        if (enemy.hp <= 0) {
            killEnemy(i, enemy);
        }
    }
}
function updateEnemyStatus(enemy, dt) {
    enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
    if (enemy.slowTimer <= 0) {
        enemy.slowFactor = 1;
    }
    Object.keys(enemy.hitCooldowns).forEach((key) => {
        const weaponId = key;
        const next = Math.max(0, (enemy.hitCooldowns[weaponId] ?? 0) - dt);
        if (next <= 0) {
            delete enemy.hitCooldowns[weaponId];
        }
        else {
            enemy.hitCooldowns[weaponId] = next;
        }
    });
}
function updateGems(dt) {
    const player = getPlayer();
    for (let i = state.gems.length - 1; i >= 0; i -= 1) {
        const gem = state.gems[i];
        const dx = player.x - gem.x;
        const dy = player.y - gem.y;
        const dist = Math.hypot(dx, dy);
        if (dist < player.pickup) {
            const pull = normalize(dx, dy);
            const force = 180 + (1 - dist / player.pickup) * 520;
            gem.x += pull.x * force * dt;
            gem.y += pull.y * force * dt;
        }
        gem.bob += dt * 5;
        if (dist < player.r + gem.r + 8) {
            gainXp(gem.value);
            state.gems.splice(i, 1);
            addParticles(gem.x, gem.y, "#42b99a", 6);
        }
    }
}
function updateParticles(dt) {
    updateLooseList(state.particles, dt);
    updateLooseList(state.floaters, dt);
}
function updateLooseList(list, dt) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
        const item = list[i];
        item.x += item.vx * dt;
        item.y += item.vy * dt;
        item.vy += (item.gravity ?? 0) * dt;
        item.life -= dt;
        if (item.life <= 0)
            list.splice(i, 1);
    }
}
function killEnemy(index, enemy) {
    state.enemies.splice(index, 1);
    state.kills += 1;
    creditChestKill(enemy);
    const gemCount = enemy.kind === "boss" ? 10 : enemy.kind === "brute" ? 4 : 1;
    for (let i = 0; i < gemCount; i += 1) {
        state.gems.push({
            x: enemy.x + randomRange(-12, 12),
            y: enemy.y + randomRange(-12, 12),
            r: enemy.kind === "brute" ? 7 : 5,
            value: enemy.xp / gemCount,
            bob: randomRange(0, TAU),
        });
    }
    if (enemy.bonusXp > 0) {
        const bonusGemCount = enemy.kind === "brute" ? 2 : 1;
        for (let i = 0; i < bonusGemCount; i += 1) {
            state.gems.push({
                x: enemy.x + randomRange(-18, 18),
                y: enemy.y + randomRange(-18, 18),
                r: enemy.kind === "brute" ? 7 : 5,
                value: enemy.bonusXp / bonusGemCount,
                bob: randomRange(0, TAU),
            });
        }
    }
    if (enemy.kind === "brute" && Math.random() < 0.42) {
        spawnRewardChest(enemy.x, enemy.y, "elite", 1.35);
    }
    if (enemy.kind === "boss") {
        spawnRewardChest(enemy.x - 30, enemy.y, "boss", 2.2);
        spawnRewardChest(enemy.x + 30, enemy.y, "boss", 2.2);
        grantGold(120, enemy);
    }
    addParticles(enemy.x, enemy.y, enemy.color, enemy.kind === "brute" ? 18 : 8);
}
function gainXp(base) {
    state.xp += base * getPlayer().xpGain;
    while (state.xp >= state.nextXp) {
        state.xp -= state.nextXp;
        state.level += 1;
        state.nextXp = Math.floor(state.nextXp * 1.24 + 8);
        openUpgradePanel();
        break;
    }
}
function openUpgradePanel() {
    state.mode = "levelup";
    ui.upgrade.hidden = false;
    renderUpgradeChoices();
}
function renderUpgradeChoices() {
    ui.upgradeGrid.innerHTML = "";
    const choices = makeUpgradeChoices();
    choices.forEach((choice) => {
        const button = document.createElement("button");
        button.className = "upgrade-card";
        button.type = "button";
        button.innerHTML = `
      <small>${choice.tag}</small>
      <strong>${choice.title}</strong>
      <p>${choice.text}</p>
    `;
        button.addEventListener("click", () => {
            choice.apply();
            evolveReadyWeapons();
            state.upgradesTaken.push(choice.id);
            ui.upgrade.hidden = true;
            state.mode = "playing";
            updateHud(true);
        });
        ui.upgradeGrid.appendChild(button);
    });
    updateUpgradeActions();
}
function updateUpgradeActions() {
    ui.reroll.textContent = `Reroll ${state.rerolls}`;
    ui.reroll.disabled = state.rerolls <= 0;
}
function makeUpgradeChoices() {
    const ownedIds = new Set(state.weapons.map((weapon) => weapon.id));
    const choices = [];
    state.weapons
        .filter((weapon) => weapon.level < weapon.maxLevel)
        .forEach((weapon) => {
        choices.push({
            id: weapon.id,
            title: weapon.name,
            tag: "Weapon",
            text: weapon.getDescription(),
            apply() {
                weapon.upgrade(game);
            },
        });
    });
    if (state.weapons.length < state.maxWeapons) {
        weaponDefinitions
            .filter((definition) => !ownedIds.has(definition.id))
            .forEach((definition) => {
            choices.push({
                id: definition.id,
                title: definition.name,
                tag: "New Weapon",
                text: definition.create().getDescription(),
                apply() {
                    state.weapons.push(createWeapon(definition.id));
                },
            });
        });
    }
    passiveCatalog.filter(canChoosePassive).forEach((passive) => {
        const nextLevel = getPassiveLevel(passive.id) + 1;
        choices.push({
            id: passive.id,
            title: passive.title,
            tag: "Passive",
            text: `${passive.text} Lv ${nextLevel}/${passive.maxLevel}.`,
            apply() {
                if (recordPassive(passive.id)) {
                    passive.apply(game);
                }
            },
        });
    });
    return [...choices].sort(() => Math.random() - 0.5).slice(0, 3);
}
function addParticles(x, y, color, count, radius = 20) {
    for (let i = 0; i < count; i += 1) {
        const angle = randomRange(0, TAU);
        const speed = randomRange(30, 180);
        state.particles.push({
            x: x + Math.cos(angle) * randomRange(0, radius),
            y: y + Math.sin(angle) * randomRange(0, radius),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: randomRange(1.5, 4.5),
            color,
            life: randomRange(0.28, 0.72),
            maxLife: 0.72,
        });
    }
}
function endRun() {
    const bankedGold = bankRunGold();
    state.mode = "gameover";
    ui.finalTime.textContent = formatTime(state.time);
    ui.finalLevel.textContent = `Lv ${state.level}`;
    ui.finalKills.textContent = `${state.kills} KO`;
    ui.finalGold.textContent = `+${bankedGold}g banked | ${profile.gold}g total`;
    ui.gameOver.classList.add("is-visible");
}
function bankRunGold() {
    if (!state.runGoldBanked) {
        state.bankedGoldReward = state.bankableGold;
        profile.gold += state.bankedGoldReward;
        state.runGoldBanked = true;
        saveProfile();
        renderWallets();
    }
    return state.bankedGoldReward;
}
function togglePause() {
    if (state.mode === "playing") {
        state.previousMode = "playing";
        state.mode = "paused";
        ui.menu.classList.add("is-visible");
        showMenuView("pause");
    }
    else if (state.mode === "paused") {
        state.mode = state.previousMode;
        ui.menu.classList.remove("is-visible");
        showMenuView("main");
    }
}
function updateHud(forceRail = false) {
    if (!state.player)
        return;
    ui.time.textContent = formatTime(state.time);
    ui.level.textContent = `Lv ${state.level}`;
    ui.kills.textContent = `${state.kills} KO | ${state.gold}g | ${state.relics.length} Relic`;
    ui.health.style.width = `${clamp((state.player.hp / state.player.maxHp) * 100, 0, 100)}%`;
    ui.xp.style.width = `${clamp((state.xp / state.nextXp) * 100, 0, 100)}%`;
    if (forceRail) {
        ui.rail.innerHTML = state.weapons
            .map((weapon) => `<span class="weapon-pill"><i class="weapon-dot" style="color:${weapon.color}"></i>${weapon.name} ${weapon.level}</span>`)
            .join("");
    }
}
function render() {
    ctx.clearRect(0, 0, width, height);
    if (!state.player) {
        drawMenuBackdrop();
        return;
    }
    const camera = getCamera();
    drawWorld(camera);
    drawZones(camera);
    drawMines(camera);
    drawChests(camera);
    drawGems(camera);
    drawProjectiles(camera);
    drawScythes(camera);
    drawBeams(camera);
    drawStrikes(camera);
    drawWeapons(camera);
    drawEnemies(camera);
    drawPlayer(camera);
    drawParticles(camera);
    drawFloaters(camera);
    drawVignette();
}
function drawMenuBackdrop() {
    ctx.fillStyle = "#11100d";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    for (let i = 0; i < 32; i += 1) {
        const angle = (TAU / 32) * i + performance.now() * 0.00012;
        const radius = Math.min(width, height) * 0.28 + (i % 5) * 12;
        ctx.strokeStyle = i % 2 ? "rgba(216,182,95,0.18)" : "rgba(66,185,154,0.16)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * radius * 0.22, Math.sin(angle) * radius * 0.22);
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        ctx.stroke();
    }
    ctx.restore();
}
function drawWorld(camera) {
    ctx.fillStyle = "#11100d";
    ctx.fillRect(0, 0, width, height);
    const tile = 88;
    const startX = Math.floor(camera.x / tile) * tile;
    const startY = Math.floor(camera.y / tile) * tile;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(238,221,178,0.055)";
    for (let x = startX; x < camera.x + width + tile; x += tile) {
        ctx.beginPath();
        ctx.moveTo(Math.floor(x - camera.x), 0);
        ctx.lineTo(Math.floor(x - camera.x), height);
        ctx.stroke();
    }
    for (let y = startY; y < camera.y + height + tile; y += tile) {
        ctx.beginPath();
        ctx.moveTo(0, Math.floor(y - camera.y));
        ctx.lineTo(width, Math.floor(y - camera.y));
        ctx.stroke();
    }
    floorMarks.forEach((mark) => {
        const sx = mark.x - camera.x;
        const sy = mark.y - camera.y;
        if (sx < -80 || sy < -80 || sx > width + 80 || sy > height + 80)
            return;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(mark.rot);
        if (mark.kind === "rune") {
            ctx.strokeStyle = "rgba(66,185,154,0.11)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, mark.size * 0.55, 0, TAU);
            ctx.moveTo(-mark.size * 0.32, 0);
            ctx.lineTo(mark.size * 0.32, 0);
            ctx.moveTo(0, -mark.size * 0.32);
            ctx.lineTo(0, mark.size * 0.32);
            ctx.stroke();
        }
        else {
            ctx.fillStyle = "rgba(238,221,178,0.045)";
            ctx.fillRect(-mark.size / 2, -2, mark.size, 4);
        }
        ctx.restore();
    });
}
function drawZones(camera) {
    state.zones.forEach((zone) => {
        const visibleRatio = clamp(zone.life / zone.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = zone.delay > 0 ? 0.28 : 0.18 + visibleRatio * 0.22;
        ctx.strokeStyle = zone.color;
        ctx.fillStyle = zone.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(zone.x - camera.x, zone.y - camera.y, zone.radius, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha *= 0.12;
        ctx.beginPath();
        ctx.arc(zone.x - camera.x, zone.y - camera.y, zone.radius, 0, TAU);
        ctx.fill();
        ctx.restore();
    });
}
function drawMines(camera) {
    state.mines.forEach((mine) => {
        ctx.save();
        ctx.translate(mine.x - camera.x, mine.y - camera.y);
        ctx.strokeStyle = mine.color;
        ctx.fillStyle = mine.armedAfter > 0 ? "rgba(110,207,119,0.24)" : "rgba(110,207,119,0.48)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.arc(0, 0, mine.triggerRadius, 0, TAU);
        ctx.stroke();
        ctx.restore();
    });
}
function drawChests(camera) {
    state.chests.forEach((chest) => {
        const x = chest.x - camera.x;
        const y = chest.y - camera.y;
        const color = chestColor(chest.kind);
        const ratio = clamp(chest.progress / chest.required, 0, 1);
        const bob = Math.sin(chest.pulse) * 2;
        ctx.save();
        ctx.translate(x, y + bob);
        ctx.shadowBlur = 18;
        ctx.shadowColor = color;
        ctx.fillStyle = "rgba(20,18,15,0.92)";
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(-chest.r, -chest.r * 0.75, chest.r * 2, chest.r * 1.5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(-chest.r, -3, chest.r * 2, 6);
        ctx.fillRect(-3, -chest.r * 0.75, 6, chest.r * 1.5);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        ctx.arc(0, 0, chest.unlockRadius, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#f6eedc";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, chest.r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * ratio);
        ctx.stroke();
        ctx.fillStyle = "#f6eedc";
        ctx.font = "800 10px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(chestLabel(chest.kind), 0, chest.r + 20);
        ctx.restore();
    });
}
function drawPlayer(camera) {
    const player = getPlayer();
    const x = player.x - camera.x;
    const y = player.y - camera.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 20;
    ctx.shadowColor = player.hurtFlash > 0 ? "#c83f53" : player.color;
    ctx.fillStyle = player.hurtFlash > 0 ? "#f6b3a5" : player.color;
    ctx.beginPath();
    ctx.arc(0, 0, player.r, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#19130d";
    ctx.beginPath();
    ctx.arc(5, -4, 4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#c83f53";
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(-18, 10);
    ctx.lineTo(-6, 13);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}
function drawEnemies(camera) {
    state.enemies.forEach((enemy) => {
        const x = enemy.x - camera.x;
        const y = enemy.y - camera.y;
        ctx.save();
        ctx.translate(x, y);
        ctx.shadowBlur = 14;
        ctx.shadowColor = enemy.color;
        ctx.fillStyle = enemy.hitFlash > 0 ? "#f6eedc" : enemy.color;
        if (enemy.kind === "boss") {
            roundedPoly(enemy.r, 9);
        }
        else if (enemy.kind === "brute") {
            roundedPoly(enemy.r, 7);
        }
        else if (enemy.kind === "runner") {
            roundedPoly(enemy.r, 3);
        }
        else {
            roundedPoly(enemy.r, 5);
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        const hpRatio = clamp(enemy.hp / enemy.maxHp, 0, 1);
        if (hpRatio < 0.96) {
            ctx.fillStyle = "rgba(0,0,0,0.42)";
            ctx.fillRect(-enemy.r, enemy.r + 8, enemy.r * 2, 4);
            ctx.fillStyle = "#d8b65f";
            ctx.fillRect(-enemy.r, enemy.r + 8, enemy.r * 2 * hpRatio, 4);
        }
        if (enemy.slowTimer > 0) {
            ctx.strokeStyle = "rgba(120,215,255,0.65)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, enemy.r + 4, 0, TAU);
            ctx.stroke();
        }
        ctx.restore();
    });
}
function roundedPoly(radius, sides) {
    ctx.beginPath();
    for (let i = 0; i < sides; i += 1) {
        const angle = -Math.PI / 2 + (TAU / sides) * i;
        const r = radius * (i % 2 ? 0.82 : 1);
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y);
    }
    ctx.closePath();
}
function drawProjectiles(camera) {
    state.projectiles.forEach((bullet) => {
        const x = bullet.x - camera.x;
        const y = bullet.y - camera.y;
        ctx.save();
        ctx.translate(x, y);
        ctx.shadowBlur = 16;
        ctx.shadowColor = bullet.color;
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(0, 0, bullet.r, 0, TAU);
        ctx.fill();
        ctx.restore();
    });
}
function drawScythes(camera) {
    state.scythes.forEach((scythe) => {
        ctx.save();
        ctx.translate(scythe.x - camera.x, scythe.y - camera.y);
        ctx.rotate(scythe.angle + scythe.spin);
        ctx.shadowBlur = 16;
        ctx.shadowColor = scythe.color;
        ctx.strokeStyle = scythe.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, scythe.r, -0.4, Math.PI + 0.4);
        ctx.stroke();
        ctx.fillStyle = scythe.color;
        ctx.beginPath();
        ctx.moveTo(scythe.r, -3);
        ctx.lineTo(scythe.r + 10, 1);
        ctx.lineTo(scythe.r, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    });
}
function drawBeams(camera) {
    state.beams.forEach((beam) => {
        const alpha = clamp(beam.life / beam.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = beam.color;
        ctx.lineWidth = beam.width;
        ctx.lineCap = "round";
        ctx.shadowBlur = 24;
        ctx.shadowColor = beam.color;
        ctx.beginPath();
        ctx.moveTo(beam.x - camera.x, beam.y - camera.y);
        ctx.lineTo(beam.x + beam.dx * beam.length - camera.x, beam.y + beam.dy * beam.length - camera.y);
        ctx.stroke();
        ctx.restore();
    });
}
function drawStrikes(camera) {
    state.strikes.forEach((strike) => {
        const alpha = clamp(strike.life / strike.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = strike.color;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 18;
        ctx.shadowColor = strike.color;
        ctx.beginPath();
        ctx.moveTo(strike.fromX - camera.x, strike.fromY - camera.y);
        const midX = (strike.fromX + strike.toX) / 2 + randomRange(-8, 8);
        const midY = (strike.fromY + strike.toY) / 2 + randomRange(-8, 8);
        ctx.lineTo(midX - camera.x, midY - camera.y);
        ctx.lineTo(strike.toX - camera.x, strike.toY - camera.y);
        ctx.stroke();
        ctx.restore();
    });
}
function drawGems(camera) {
    state.gems.forEach((gem) => {
        const x = gem.x - camera.x;
        const y = gem.y - camera.y + Math.sin(gem.bob) * 3;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.shadowBlur = 14;
        ctx.shadowColor = "#42b99a";
        ctx.fillStyle = "#42b99a";
        ctx.fillRect(-gem.r, -gem.r, gem.r * 2, gem.r * 2);
        ctx.restore();
    });
}
function drawWeapons(camera) {
    state.weapons.forEach((weapon) => {
        weapon.draw?.(ctx, camera, game);
    });
}
function drawParticles(camera) {
    state.particles.forEach((particle) => {
        const alpha = clamp(particle.life / (particle.maxLife ?? 0.72), 0, 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x - camera.x, particle.y - camera.y, particle.r, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}
function drawFloaters(camera) {
    ctx.save();
    ctx.font = "800 12px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    state.floaters.forEach((floater) => {
        ctx.globalAlpha = clamp(floater.life / 0.55, 0, 1);
        ctx.fillStyle = floater.color ?? "#f6eedc";
        ctx.fillText(String(floater.value), floater.x - camera.x, floater.y - camera.y);
    });
    ctx.restore();
    ctx.globalAlpha = 1;
}
function drawVignette() {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.28, width / 2, height / 2, Math.max(width, height) * 0.72);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}
function loop(now = performance.now()) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
}
function setPointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    const dx = pointer.x - pointer.startX;
    const dy = pointer.y - pointer.startY;
    const joy = normalize(dx, dy);
    const knobDistance = Math.min(32, joy.len);
    ui.touchStick.style.left = `${pointer.startX}px`;
    ui.touchStick.style.top = `${pointer.startY}px`;
    ui.touchStickKnob.style.transform = `translate(${joy.x * knobDistance}px, ${joy.y * knobDistance}px)`;
}
canvas.addEventListener("pointerdown", (event) => {
    if (state.mode !== "playing")
        return;
    canvas.setPointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    pointer.active = true;
    pointer.id = event.pointerId;
    pointer.startX = event.clientX - rect.left;
    pointer.startY = event.clientY - rect.top;
    pointer.x = pointer.startX;
    pointer.y = pointer.startY;
    ui.touchStick.classList.add("is-active");
    setPointerPosition(event);
});
canvas.addEventListener("pointermove", (event) => {
    if (!pointer.active || pointer.id !== event.pointerId)
        return;
    setPointerPosition(event);
});
canvas.addEventListener("pointerup", (event) => {
    if (pointer.id !== event.pointerId)
        return;
    pointer.active = false;
    pointer.id = null;
    ui.touchStick.classList.remove("is-active");
});
canvas.addEventListener("pointercancel", () => {
    pointer.active = false;
    pointer.id = null;
    ui.touchStick.classList.remove("is-active");
});
window.addEventListener("keydown", (event) => {
    keys.add(event.code);
    if (event.code === "Escape" && state.mode === "menu" && currentMenuView !== "main") {
        showMenuView("main");
        return;
    }
    if (event.code === "KeyP" || event.code === "Escape") {
        togglePause();
    }
});
window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
});
ui.openCharacter.addEventListener("click", () => showMenuView("character"));
ui.openShop.addEventListener("click", () => showMenuView("shop"));
ui.characterBack.addEventListener("click", () => showMenuView("main"));
ui.shopBack.addEventListener("click", () => showMenuView("main"));
ui.resume.addEventListener("click", togglePause);
ui.start.addEventListener("click", resetRun);
ui.restart.addEventListener("click", resetRun);
ui.pause.addEventListener("click", togglePause);
ui.reroll.addEventListener("click", () => {
    if (state.mode !== "levelup" || state.rerolls <= 0)
        return;
    state.rerolls -= 1;
    renderUpgradeChoices();
});
Array.from(ui.shopTabs.querySelectorAll("button[data-shop-category]")).forEach((tab) => {
    tab.addEventListener("click", () => {
        currentShopCategory = tab.getAttribute("data-shop-category");
        renderShop();
    });
});
window.addEventListener("resize", resize);
resize();
buildFloorMarks();
renderCharacterSelect();
showMenuView("main");
renderShop();
loop();
