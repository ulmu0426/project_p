const TAU = Math.PI * 2;
const FLOOR_REPEAT_SIZE = 5200;
const INITIAL_CHEST_SPREAD = 2200;
const MAX_ENEMIES = 190;
const MAX_BOSSES = 3;
const MAX_PROJECTILES = 360;
const MAX_GEMS = 320;
const MAX_PARTICLES = 460;
const MAX_FLOATERS = 140;
const MAX_ZONES = 60;
const MAX_MINES = 80;
const MAX_BEAMS = 48;
const MAX_STRIKES = 90;
const MAX_SCYTHES = 26;
const MAX_CHESTS = 14;
const DRAW_CULL_PADDING = 140;
const ENEMY_DESPAWN_PADDING = 1500;
const MAP_CHEST_DESPAWN_DISTANCE = 3200;
const RUN_DURATION_SECONDS = 15 * 60;
const BASE_MAX_HP = 100;
const BASE_MOVE_SPEED = 235;
const keys = new Set<string>();
let width = 0;
let height = 0;
let dpr = 1;
let last = performance.now();
let floorMarks: FloorMark[] = [];
let nextEnemyId = 1;
let nextChestId = 1;

const pointer: PointerState = {
  active: false,
  id: null,
  startX: 0,
  startY: 0,
  x: 0,
  y: 0,
};

const state: GameState = {
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
