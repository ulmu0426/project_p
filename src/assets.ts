const characterAtlas = createSpriteAtlas("assets/sprite-atlas-characters.png", 4, 3);
const weaponEffectAtlasSource = "assets/sprite-atlas-weapons.png";
const projectileAtlasSource = "assets/sprite-atlas-projectiles.png";
const weaponEffectAtlas = createSpriteAtlas(weaponEffectAtlasSource, 4, 3);
const projectileAtlas = createSpriteAtlas(projectileAtlasSource, 4, 3);

const characterSpriteCells: Record<CharacterId, AtlasCell> = {
  hunter: { col: 0, row: 0 },
  vessel: { col: 1, row: 0 },
  archivist: { col: 2, row: 0 },
  bellkeeper: { col: 3, row: 0 },
  duelist: { col: 0, row: 1 },
  warden: { col: 1, row: 1 },
};

const enemySpriteCells: Record<EnemyKind, AtlasCell> = {
  shade: { col: 2, row: 1 },
  runner: { col: 3, row: 1 },
  brute: { col: 0, row: 2 },
  boss: { col: 1, row: 2 },
};

const weaponEffectSpriteCells: Record<WeaponId, AtlasCell> = {
  silverBolt: { col: 0, row: 0 },
  moonKnives: { col: 1, row: 0 },
  emberRite: { col: 2, row: 0 },
  graveLantern: { col: 3, row: 0 },
  ricochetCrossbow: { col: 0, row: 1 },
  frostSigil: { col: 1, row: 1 },
  thunderCharm: { col: 2, row: 1 },
  bloodBats: { col: 3, row: 1 },
  sunSpear: { col: 0, row: 2 },
  thornMines: { col: 1, row: 2 },
  voidBell: { col: 2, row: 2 },
  reaperScythe: { col: 3, row: 2 },
};

const projectileSpriteCells: Partial<Record<WeaponId, AtlasCell>> = {
  silverBolt: { col: 0, row: 0 },
  ricochetCrossbow: { col: 0, row: 1 },
  bloodBats: { col: 3, row: 1 },
  reaperScythe: { col: 3, row: 2 },
};

function hasWeaponEffectSprite(id: UpgradeChoiceId): id is WeaponId {
  return id in weaponEffectSpriteCells;
}

function weaponEffectSpriteInlineStyle(weaponId: WeaponId): string {
  return atlasSpriteInlineStyle(weaponEffectAtlasSource, weaponEffectAtlas, weaponEffectSpriteCells[weaponId]);
}

function applyWeaponEffectSpriteStyle(element: HTMLElement, weaponId: WeaponId): void {
  applyAtlasSpriteStyle(element, weaponEffectAtlasSource, weaponEffectAtlas, weaponEffectSpriteCells[weaponId]);
}

function createSpriteAtlas(src: string, columns: number, rows: number): SpriteAtlas {
  const image = new Image();
  const atlas: SpriteAtlas = {
    image,
    columns,
    rows,
    loaded: false,
  };

  image.addEventListener("load", () => {
    atlas.loaded = true;
  });
  image.src = src;
  return atlas;
}

function canDrawAtlas(atlas: SpriteAtlas): boolean {
  return atlas.loaded && atlas.image.naturalWidth > 0 && atlas.image.naturalHeight > 0;
}

function atlasSpritePosition(atlas: SpriteAtlas, cell: AtlasCell): string {
  const x = atlas.columns <= 1 ? 0 : (cell.col / (atlas.columns - 1)) * 100;
  const y = atlas.rows <= 1 ? 0 : (cell.row / (atlas.rows - 1)) * 100;
  return `${x}% ${y}%`;
}

function atlasSpriteInlineStyle(source: string, atlas: SpriteAtlas, cell: AtlasCell): string {
  return `--sprite-image:url(${source});--sprite-position:${atlasSpritePosition(atlas, cell)};`;
}

function applyAtlasSpriteStyle(element: HTMLElement, source: string, atlas: SpriteAtlas, cell: AtlasCell): void {
  element.style.setProperty("--sprite-image", `url(${source})`);
  element.style.setProperty("--sprite-position", atlasSpritePosition(atlas, cell));
}

function drawAtlasCell(atlas: SpriteAtlas, cell: AtlasCell, x: number, y: number, width: number, height: number): boolean {
  if (!canDrawAtlas(atlas)) return false;
  const cellWidth = atlas.image.naturalWidth / atlas.columns;
  const cellHeight = atlas.image.naturalHeight / atlas.rows;
  ctx.drawImage(
    atlas.image,
    cell.col * cellWidth,
    cell.row * cellHeight,
    cellWidth,
    cellHeight,
    x - width / 2,
    y - height / 2,
    width,
    height,
  );
  return true;
}

function drawProjectileSprite(weaponId: WeaponId | undefined, size: number): boolean {
  if (!weaponId) return false;
  const cell = projectileSpriteCells[weaponId];
  if (!cell) return false;
  return drawAtlasCell(projectileAtlas, cell, 0, 0, size, size);
}
