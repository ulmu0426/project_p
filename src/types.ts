type GameMode = "menu" | "playing" | "paused" | "levelup" | "gameover";
type EnemyKind = "shade" | "runner" | "brute" | "boss";
type FloorMarkKind = "rune" | "stone";
type ChestKind = "cache" | "blood" | "hunt" | "astral";
type ChestSource = "map" | "elite" | "boss";
type RelicId =
  | "starPrism"
  | "overclockCore"
  | "giantsRing"
  | "scholarsCrown"
  | "blackCandle"
  | "midasThread"
  | "phoenixAsh"
  | "stormLens";

type WeaponId =
  | "silverBolt"
  | "moonKnives"
  | "emberRite"
  | "graveLantern"
  | "ricochetCrossbow"
  | "frostSigil"
  | "thunderCharm"
  | "bloodBats"
  | "sunSpear"
  | "thornMines"
  | "voidBell"
  | "reaperScythe";

type PassiveId =
  | "speed"
  | "vitality"
  | "magnet"
  | "focus"
  | "cooldown"
  | "damage"
  | "amount"
  | "attackSpeed"
  | "area"
  | "pierce"
  | "critChance"
  | "critDamage"
  | "echo";
type UpgradeChoiceId = WeaponId | PassiveId;
type UpgradeTag = "New Weapon" | "Weapon" | "Passive";
type PassiveLevelMap = Partial<Record<PassiveId, number>>;
type CharacterId = "hunter" | "vessel" | "archivist" | "bellkeeper" | "duelist" | "warden";
type MenuView = "main" | "character" | "shop" | "pause";
type ShopCategory = "corePercent" | "flatBonus" | "utility" | "unlocks" | "runPrep";
type ShopUpgradeId =
  | "vitalityTraining"
  | "mightTraining"
  | "fleetBoots"
  | "scholarInk"
  | "magnetCharm"
  | "fortuneSeal"
  | "ironSkin"
  | "startingPurse"
  | "rerollPermit"
  | "bargainLedger";
type ShopValueFormat = "percent" | "flat" | "gold" | "count" | "discount";
type ShopLevelMap = Partial<Record<ShopUpgradeId, number>>;

interface VectorLike {
  x: number;
  y: number;
}

interface NormalizedVector extends VectorLike {
  len: number;
}

interface Camera extends VectorLike {}

interface Player extends VectorLike {
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  armor: number;
  color: string;
  pickup: number;
  xpGain: number;
  hurtFlash: number;
  passives: PassiveStats;
}

interface PassiveStats {
  cooldownMultiplier: number;
  damageMultiplier: number;
  amountBonus: number;
  attackSpeedMultiplier: number;
  areaMultiplier: number;
  blastRadiusMultiplier: number;
  pierceBonus: number;
  criticalChance: number;
  criticalDamageMultiplier: number;
  echoChance: number;
}

interface CharacterDefinition {
  id: CharacterId;
  name: string;
  title: string;
  text: string;
  color: string;
  weaponId: WeaponId;
  baseHealthMultiplier: number;
  moveSpeedMultiplier: number;
  damageMultiplierBonus?: number;
  areaMultiplierBonus?: number;
  blastRadiusMultiplierBonus?: number;
  criticalChanceBonus?: number;
  armor?: number;
}

interface ShopUpgradeDefinition {
  id: ShopUpgradeId;
  category: ShopCategory;
  title: string;
  text: string;
  applyLabel: string;
  maxLevel: number;
  baseCost: number;
  costScale: number;
  valuePerLevel: number;
  valueFormat: ShopValueFormat;
}

interface ProfileState {
  gold: number;
  shopLevels: ShopLevelMap;
}

interface Enemy extends VectorLike {
  id: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  color: string;
  xp: number;
  hitFlash: number;
  kind: EnemyKind;
  slowTimer: number;
  slowFactor: number;
  hitCooldowns: Partial<Record<WeaponId, number>>;
  bonusXp: number;
}

interface DamageResult {
  amount: number;
  critical: boolean;
  killed: boolean;
}

interface Projectile extends VectorLike {
  vx: number;
  vy: number;
  r: number;
  damage: number;
  life: number;
  pierce: number;
  color: string;
  hitEnemyIds: number[];
  bounces?: number;
  bounceRange?: number;
  targetId?: number;
  homing?: number;
  slowFactor?: number;
  slowDuration?: number;
  sourceWeaponId?: WeaponId;
  evolved?: boolean;
  onHit?: (enemy: Enemy, projectile: Projectile, game: GameContext, result: DamageResult) => void;
}

type ProjectileInput = Omit<Projectile, "hitEnemyIds"> & {
  hitEnemyIds?: number[];
};

interface Gem extends VectorLike {
  r: number;
  value: number;
  bob: number;
}

interface LooseItem extends VectorLike {
  vx: number;
  vy: number;
  life: number;
  gravity?: number;
}

interface Particle extends LooseItem {
  r: number;
  color: string;
  maxLife?: number;
}

interface Floater extends LooseItem {
  value: number | string;
  color?: string;
}

interface Chest extends VectorLike {
  id: number;
  kind: ChestKind;
  source: ChestSource;
  r: number;
  unlockRadius: number;
  progress: number;
  required: number;
  rewardTier: number;
  pulse: number;
}

interface FloorMark extends VectorLike {
  size: number;
  rot: number;
  kind: FloorMarkKind;
}

interface Zone extends VectorLike {
  radius: number;
  damage: number;
  life: number;
  maxLife: number;
  tick: number;
  tickTimer: number;
  delay: number;
  color: string;
  slowFactor?: number;
  slowDuration?: number;
  sourceWeaponId?: WeaponId;
  evolved?: boolean;
  onHit?: (enemy: Enemy, game: GameContext, result: DamageResult) => void;
}

interface ZoneInput extends Omit<Zone, "tickTimer"> {
  tickTimer?: number;
}

interface Mine extends VectorLike {
  radius: number;
  triggerRadius: number;
  damage: number;
  life: number;
  armedAfter: number;
  color: string;
  gemVacuumRadius?: number;
  gemBonusDamage?: number;
  sourceWeaponId?: WeaponId;
  evolved?: boolean;
}

interface Beam extends VectorLike {
  dx: number;
  dy: number;
  length: number;
  width: number;
  life: number;
  maxLife: number;
  color: string;
  sourceWeaponId?: WeaponId;
  evolved?: boolean;
}

interface StrikeEffect {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  life: number;
  maxLife: number;
  color: string;
  sourceWeaponId?: WeaponId;
  evolved?: boolean;
}

interface Scythe extends VectorLike {
  vx: number;
  vy: number;
  speed: number;
  r: number;
  damage: number;
  life: number;
  maxLife: number;
  returning: boolean;
  angle: number;
  spin: number;
  color: string;
  hitEnemyIds: number[];
  markDamage?: number;
  sourceWeaponId?: WeaponId;
  evolved?: boolean;
}

interface WeaponEvolutionMetadata {
  requiredPassive: PassiveId;
  name: string;
  color: string;
}

interface WeaponEvolution extends WeaponEvolutionMetadata {
  evolve: (weapon: WeaponInstance, game: GameContext) => void;
}

interface WeaponInstance {
  id: WeaponId;
  name: string;
  color: string;
  level: number;
  maxLevel: number;
  evolved: boolean;
  evolution: WeaponEvolution;
  update: (dt: number, game: GameContext) => void;
  upgrade: (game: GameContext) => void;
  getDescription: () => string;
  draw?: (ctx: CanvasRenderingContext2D, camera: Camera, game: GameContext) => void;
}

interface WeaponDefinition {
  id: WeaponId;
  name: string;
  color: string;
  maxLevel: number;
  evolution: WeaponEvolutionMetadata;
  create: () => WeaponInstance;
}

interface RelicDefinition {
  id: RelicId;
  title: string;
  text: string;
  color: string;
  apply: (game: GameContext) => void;
}

interface PassiveUpgrade {
  id: PassiveId;
  title: string;
  text: string;
  maxLevel: number;
  apply: (game: GameContext) => void;
}

interface UpgradeChoice {
  id: UpgradeChoiceId;
  title: string;
  tag: UpgradeTag;
  text: string;
  weaponId?: WeaponId;
  apply: () => void;
}

interface PointerState {
  active: boolean;
  id: number | null;
  startX: number;
  startY: number;
  x: number;
  y: number;
}

interface GameState {
  mode: GameMode;
  previousMode: GameMode;
  selectedCharacterId: CharacterId;
  time: number;
  level: number;
  xp: number;
  nextXp: number;
  kills: number;
  gold: number;
  bankableGold: number;
  bankedGoldReward: number;
  runGoldBanked: boolean;
  goldMultiplier: number;
  rerolls: number;
  spawnTimer: number;
  eliteTimer: number;
  bossTimer: number;
  chestSpawnTimer: number;
  shake: number;
  player: Player | null;
  maxWeapons: number;
  maxPassives: number;
  weapons: WeaponInstance[];
  enemies: Enemy[];
  projectiles: Projectile[];
  gems: Gem[];
  particles: Particle[];
  floaters: Floater[];
  zones: Zone[];
  mines: Mine[];
  beams: Beam[];
  strikes: StrikeEffect[];
  scythes: Scythe[];
  chests: Chest[];
  relics: RelicId[];
  passiveLevels: PassiveLevelMap;
  upgradesTaken: UpgradeChoiceId[];
}

interface UiElements {
  time: HTMLSpanElement;
  level: HTMLSpanElement;
  kills: HTMLSpanElement;
  health: HTMLSpanElement;
  xp: HTMLSpanElement;
  rail: HTMLDivElement;
  passiveRail: HTMLDivElement;
  relicRail: HTMLElement;
  detailTooltip: HTMLDivElement;
  menu: HTMLElement;
  mainMenuView: HTMLDivElement;
  characterMenuView: HTMLDivElement;
  pauseMenuView: HTMLDivElement;
  shopView: HTMLElement;
  menuEyebrow: HTMLElement;
  menuHeading: HTMLElement;
  walletGold: HTMLElement;
  shopGold: HTMLElement;
  shopTabs: HTMLDivElement;
  shopSummary: HTMLElement;
  shopUpgradeList: HTMLDivElement;
  shopUpgradeDetail: HTMLElement;
  characterGrid: HTMLDivElement;
  gameOverCharacterGrid: HTMLDivElement;
  gameOver: HTMLElement;
  upgrade: HTMLElement;
  upgradeGrid: HTMLDivElement;
  reroll: HTMLButtonElement;
  finalTime: HTMLElement;
  finalLevel: HTMLElement;
  finalKills: HTMLElement;
  finalGold: HTMLElement;
  openCharacter: HTMLButtonElement;
  openShop: HTMLButtonElement;
  characterBack: HTMLButtonElement;
  shopBack: HTMLButtonElement;
  resume: HTMLButtonElement;
  start: HTMLButtonElement;
  restart: HTMLButtonElement;
  pause: HTMLButtonElement;
  touchStick: HTMLDivElement;
  touchStickKnob: HTMLSpanElement;
}

interface AreaDamageOptions {
  slowFactor?: number;
  slowDuration?: number;
  particleColor?: string;
  maxTargets?: number;
  onHit?: (enemy: Enemy, result: DamageResult) => void;
}

interface AtlasCell {
  col: number;
  row: number;
}

interface SpriteAtlas {
  image: HTMLImageElement;
  columns: number;
  rows: number;
  loaded: boolean;
}

interface LineDamageOptions {
  particleColor?: string;
  damageMultiplier?: (enemy: Enemy) => number;
  onHit?: (enemy: Enemy, result: DamageResult) => void;
}

interface GameContext {
  state: GameState;
  player: () => Player;
  randomRange: (min: number, max: number) => number;
  normalize: (dx: number, dy: number) => NormalizedVector;
  rotate: (x: number, y: number, angle: number) => VectorLike;
  findEnemyById: (id: number) => Enemy | undefined;
  findNearestEnemies: (
    origin: VectorLike,
    count: number,
    excludeIds?: number[],
    maxDistance?: number,
  ) => Enemy[];
  spawnProjectile: (projectile: ProjectileInput) => void;
  spawnZone: (zone: ZoneInput) => void;
  spawnMine: (mine: Mine) => void;
  spawnBeam: (beam: Beam) => void;
  spawnStrike: (strike: StrikeEffect) => void;
  spawnScythe: (scythe: Scythe) => void;
  grantGold: (amount: number, origin?: VectorLike) => void;
  grantRelic: (origin: VectorLike, chance?: number) => boolean;
  cooldown: (base: number) => number;
  amount: (base: number, max?: number) => number;
  attackSpeed: (base: number) => number;
  area: (base: number) => number;
  blastArea: (base: number) => number;
  hasPassive: (passiveId: PassiveId) => boolean;
  withEcho: (effect: () => void) => void;
  damageEnemy: (enemy: Enemy, amount: number) => DamageResult;
  areaDamage: (origin: VectorLike, radius: number, damage: number, options?: AreaDamageOptions) => void;
  damageEnemiesAlongLine: (
    origin: VectorLike,
    direction: VectorLike,
    length: number,
    width: number,
    damage: number,
    options?: LineDamageOptions,
  ) => void;
  applySlow: (enemy: Enemy, factor: number, duration: number) => void;
  addParticles: (x: number, y: number, color: string, count: number, radius?: number) => void;
}
