function addParticles(x: number, y: number, color: string, count: number, radius = 20): void {
  const spawnCount = reserveListSpace(state.particles, MAX_PARTICLES, count);
  for (let i = 0; i < spawnCount; i += 1) {
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

function endRun(): void {
  hideDetailTooltip();
  const bankedGold = bankRunGold();
  state.mode = "gameover";
  ui.finalTime.textContent = formatTime(state.time);
  ui.finalLevel.textContent = `Lv ${state.level}`;
  ui.finalKills.textContent = `${state.kills} KO`;
  ui.finalGold.textContent = `+${bankedGold}g banked | ${profile.gold}g total`;
  ui.gameOver.classList.add("is-visible");
}

function bankRunGold(): number {
  if (!state.runGoldBanked) {
    state.bankedGoldReward = state.bankableGold;
    profile.gold += state.bankedGoldReward;
    state.runGoldBanked = true;
    saveProfile();
    renderWallets();
  }
  return state.bankedGoldReward;
}

function togglePause(): void {
  hideDetailTooltip();
  if (state.mode === "playing") {
    state.previousMode = "playing";
    state.mode = "paused";
    ui.menu.classList.add("is-visible");
    showMenuView("pause");
  } else if (state.mode === "paused") {
    state.mode = state.previousMode;
    ui.menu.classList.remove("is-visible");
    showMenuView("main");
  }
}

function updateHud(forceRail = false): void {
  if (!state.player) return;
  ui.time.textContent = formatTime(state.time);
  ui.level.textContent = `Lv ${state.level}`;
  ui.kills.textContent = `${state.kills} KO | ${state.gold}g | ${state.relics.length} Relic`;
  ui.health.style.width = `${clamp((state.player.hp / state.player.maxHp) * 100, 0, 100)}%`;
  ui.xp.style.width = `${clamp((state.xp / state.nextXp) * 100, 0, 100)}%`;

  if (forceRail) {
    hideDetailTooltip();
    const weaponPills = state.weapons.map((weapon) => {
      const evolvedClass = weapon.evolved ? " is-evolved" : "";
      const tooltip = weaponTooltip(weapon);
      const spriteStyle = weaponEffectSpriteInlineStyle(weapon.id);
      return `<span class="weapon-pill${evolvedClass}" style="--skill-color:${weapon.color};${spriteStyle}" data-tooltip="${tooltip}" title="${tooltip}" aria-label="${tooltip}"><i class="weapon-sprite" aria-hidden="true"></i><b class="weapon-level-badge" aria-hidden="true">${weapon.level}</b></span>`;
    });
    const passivePills = passiveCatalog
      .filter((passive) => getPassiveLevel(passive.id) > 0)
      .map(
        (passive) =>
          `<span class="passive-pill" data-tooltip="${passiveTooltip(passive)}" title="${passiveTooltip(passive)}" aria-label="${passiveTooltip(passive)}"><i class="passive-dot"></i>${escapeHtml(passive.title)} ${getPassiveLevel(passive.id)}/${passive.maxLevel}</span>`,
      );
    const relicCards = state.relics
      .map((relicId) => relicCatalog.find((relic) => relic.id === relicId))
      .filter((relic): relic is RelicDefinition => Boolean(relic))
      .map(
        (relic) =>
          `<span class="relic-pill" style="--relic-color:${relic.color}" data-tooltip="${relicTooltip(relic)}" title="${relicTooltip(relic)}" aria-label="${relicTooltip(relic)}"><i class="relic-dot" style="color:${relic.color}"></i><strong>${escapeHtml(relic.title)}</strong><em>${escapeHtml(relic.text)}</em></span>`,
      );
    ui.rail.innerHTML = weaponPills.join("");
    ui.passiveRail.innerHTML = passivePills.join("");
    ui.relicRail.innerHTML = relicCards.join("");
    ui.relicRail.classList.toggle("is-visible", relicCards.length > 0);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function weaponTooltip(weapon: WeaponInstance): string {
  const requiredPassive = getPassiveUpgrade(weapon.evolution.requiredPassive);
  const evolutionText = weapon.evolved
    ? `Evolved: ${weapon.evolution.name}`
    : `Evolution: ${weapon.evolution.name} requires ${requiredPassive.title}`;
  return escapeHtml(`${weapon.name} Lv ${weapon.level}/${weapon.maxLevel}. ${weapon.getDescription()} ${evolutionText}.`);
}

function passiveTooltip(passive: PassiveUpgrade): string {
  return escapeHtml(`${passive.title} Lv ${getPassiveLevel(passive.id)}/${passive.maxLevel}. ${passive.text}`);
}

function relicTooltip(relic: RelicDefinition): string {
  return escapeHtml(`${relic.title}. ${relic.text}`);
}

function render(): void {
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

function drawMenuBackdrop(): void {
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

function drawWorld(camera: Camera): void {
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

  const firstMarkCellX = Math.floor(camera.x / FLOOR_REPEAT_SIZE) - 1;
  const lastMarkCellX = Math.floor((camera.x + width) / FLOOR_REPEAT_SIZE) + 1;
  const firstMarkCellY = Math.floor(camera.y / FLOOR_REPEAT_SIZE) - 1;
  const lastMarkCellY = Math.floor((camera.y + height) / FLOOR_REPEAT_SIZE) + 1;

  for (let cellX = firstMarkCellX; cellX <= lastMarkCellX; cellX += 1) {
    for (let cellY = firstMarkCellY; cellY <= lastMarkCellY; cellY += 1) {
      const offsetX = cellX * FLOOR_REPEAT_SIZE;
      const offsetY = cellY * FLOOR_REPEAT_SIZE;
      floorMarks.forEach((mark) => {
        const sx = offsetX + mark.x - camera.x;
        const sy = offsetY + mark.y - camera.y;
        if (sx < -80 || sy < -80 || sx > width + 80 || sy > height + 80) return;
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
        } else {
          ctx.fillStyle = "rgba(238,221,178,0.045)";
          ctx.fillRect(-mark.size / 2, -2, mark.size, 4);
        }
        ctx.restore();
      });
    }
  }
}

function drawZones(camera: Camera): void {
  state.zones.forEach((zone) => {
    if (!isVisibleCircle(zone, camera, zone.radius)) return;
    const visibleRatio = clamp(zone.life / zone.maxLife, 0, 1);
    ctx.save();
    ctx.translate(zone.x - camera.x, zone.y - camera.y);
    drawWeaponEffectSprite(zone.sourceWeaponId, zone.radius * 1.35, zone.evolved, 0.26 + visibleRatio * 0.18);
    ctx.globalAlpha = zone.delay > 0 ? 0.22 : 0.14 + visibleRatio * 0.22;
    ctx.strokeStyle = zone.color;
    ctx.fillStyle = zone.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, zone.radius, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha *= 0.12;
    ctx.beginPath();
    ctx.arc(0, 0, zone.radius, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.24 + visibleRatio * 0.18;
    for (let i = 0; i < 6; i += 1) {
      const angle = zone.life * 1.4 + (TAU / 6) * i;
      const inner = zone.radius * 0.52;
      const outer = zone.radius * 0.88;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle + 0.18) * outer, Math.sin(angle + 0.18) * outer);
      ctx.stroke();
    }
    ctx.restore();
  });
}

function drawMines(camera: Camera): void {
  state.mines.forEach((mine) => {
    if (!isVisibleCircle(mine, camera, mine.triggerRadius)) return;
    ctx.save();
    ctx.translate(mine.x - camera.x, mine.y - camera.y);
    drawWeaponEffectSprite(mine.sourceWeaponId, Math.max(42, mine.triggerRadius * 1.15), mine.evolved, mine.armedAfter > 0 ? 0.38 : 0.58);
    ctx.strokeStyle = mine.color;
    ctx.fillStyle = mine.armedAfter > 0 ? "rgba(110,207,119,0.24)" : "rgba(110,207,119,0.48)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = (TAU / 6) * i + mine.life * 0.8;
      ctx.moveTo(Math.cos(angle) * 6, Math.sin(angle) * 6);
      ctx.lineTo(Math.cos(angle) * 14, Math.sin(angle) * 14);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(0, 0, mine.triggerRadius, 0, TAU);
    ctx.stroke();
    ctx.restore();
  });
}

function drawChests(camera: Camera): void {
  state.chests.forEach((chest) => {
    if (!isVisibleCircle(chest, camera, chest.unlockRadius + 28)) return;
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

function drawPlayer(camera: Camera): void {
  const player = getPlayer();
  const x = player.x - camera.x;
  const y = player.y - camera.y;
  const character = getSelectedCharacter();
  ctx.save();
  ctx.translate(x, y);
  drawCharacterAsset(player, character);
  ctx.restore();
}

function drawCharacterAsset(player: Player, character: CharacterDefinition): void {
  const hurtColor = player.hurtFlash > 0 ? "#f6b3a5" : character.color;
  const radius = player.r;

  ctx.shadowBlur = 22;
  ctx.shadowColor = player.hurtFlash > 0 ? "#c83f53" : character.color;
  ctx.fillStyle = "rgba(12,10,8,0.72)";
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.82, radius * 1.08, radius * 0.28, 0, 0, TAU);
  ctx.fill();

  if (drawAtlasCell(characterAtlas, characterSpriteCells[character.id], 0, 0, radius * 4.2, radius * 4.2)) {
    if (player.hurtFlash > 0) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(246,179,165,0.72)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.36, 0, TAU);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    return;
  }

  ctx.fillStyle = hurtColor;
  ctx.strokeStyle = "rgba(246,238,220,0.72)";
  ctx.lineWidth = 2;

  if (character.id === "hunter") {
    ctx.beginPath();
    ctx.moveTo(0, -radius * 1.2);
    ctx.lineTo(radius * 0.9, radius * 0.65);
    ctx.lineTo(0, radius);
    ctx.lineTo(-radius * 0.9, radius * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#c83f53";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-radius * 1.05, radius * 0.12);
    ctx.lineTo(radius * 0.76, -radius * 0.34);
    ctx.moveTo(radius * 0.2, -radius * 0.62);
    ctx.lineTo(radius * 0.98, -radius * 0.36);
    ctx.stroke();
  } else if (character.id === "vessel") {
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.96, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#33150c";
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.48, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#ffd0a3";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.58, -radius * 0.74);
    ctx.lineTo(-radius * 0.86, -radius * 1.16);
    ctx.moveTo(radius * 0.58, -radius * 0.74);
    ctx.lineTo(radius * 0.86, -radius * 1.16);
    ctx.stroke();
  } else if (character.id === "archivist") {
    ctx.beginPath();
    ctx.roundRect(-radius * 0.7, -radius * 0.92, radius * 1.4, radius * 1.76, 7);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#f6eedc";
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-radius * 0.42, i * radius * 0.28);
      ctx.lineTo(radius * 0.42, i * radius * 0.18);
      ctx.stroke();
    }
  } else if (character.id === "bellkeeper") {
    ctx.beginPath();
    ctx.moveTo(-radius * 0.86, radius * 0.62);
    ctx.quadraticCurveTo(0, -radius * 1.22, radius * 0.86, radius * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#e7f7ff";
    ctx.beginPath();
    ctx.arc(0, radius * 0.24, radius * 0.38, 0, Math.PI);
    ctx.stroke();
  } else if (character.id === "duelist") {
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(radius * 0.78, radius * 0.32);
    ctx.lineTo(0, radius * 0.9);
    ctx.lineTo(-radius * 0.78, radius * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#fff4b8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-radius * 1.06, radius * 0.56);
    ctx.lineTo(radius * 1.16, -radius * 0.82);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.roundRect(-radius * 0.82, -radius * 0.82, radius * 1.64, radius * 1.64, 5);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#26331e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.64);
    ctx.lineTo(radius * 0.5, -radius * 0.28);
    ctx.lineTo(radius * 0.36, radius * 0.54);
    ctx.lineTo(0, radius * 0.82);
    ctx.lineTo(-radius * 0.36, radius * 0.54);
    ctx.lineTo(-radius * 0.5, -radius * 0.28);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#19130d";
  ctx.beginPath();
  ctx.arc(radius * 0.32, -radius * 0.18, radius * 0.16, 0, TAU);
  ctx.fill();
}

function drawEnemies(camera: Camera): void {
  state.enemies.forEach((enemy) => {
    if (!isVisibleCircle(enemy, camera, enemy.r + 18)) return;
    const x = enemy.x - camera.x;
    const y = enemy.y - camera.y;
    ctx.save();
    ctx.translate(x, y);
    drawEnemyAsset(enemy);
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

function drawEnemyAsset(enemy: Enemy): void {
  const radius = enemy.r;
  const fill = enemy.hitFlash > 0 ? "#f6eedc" : enemy.color;
  ctx.shadowBlur = enemy.kind === "boss" ? 28 : 14;
  ctx.shadowColor = enemy.color;
  ctx.fillStyle = fill;
  ctx.strokeStyle = "rgba(12,10,8,0.74)";
  ctx.lineWidth = enemy.kind === "boss" ? 4 : 2;

  const spriteScale = enemy.kind === "boss" ? 3.1 : enemy.kind === "brute" ? 3.25 : 3.55;
  if (drawAtlasCell(characterAtlas, enemySpriteCells[enemy.kind], 0, 0, radius * spriteScale, radius * spriteScale)) {
    if (enemy.hitFlash > 0) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(246,238,220,0.82)";
      ctx.lineWidth = enemy.kind === "boss" ? 4 : 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.16, 0, TAU);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    return;
  }

  if (enemy.kind === "runner") {
    ctx.beginPath();
    ctx.moveTo(radius * 1.08, 0);
    ctx.lineTo(-radius * 0.72, -radius * 0.78);
    ctx.lineTo(-radius * 0.34, 0);
    ctx.lineTo(-radius * 0.72, radius * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(246,238,220,0.62)";
    ctx.beginPath();
    ctx.moveTo(-radius * 0.88, -radius * 0.52);
    ctx.lineTo(-radius * 1.28, -radius * 0.82);
    ctx.moveTo(-radius * 0.88, radius * 0.52);
    ctx.lineTo(-radius * 1.28, radius * 0.82);
    ctx.stroke();
  } else if (enemy.kind === "brute") {
    roundedPoly(radius, 7);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#d8b65f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.12, -0.25, Math.PI + 0.25);
    ctx.stroke();
    for (let i = 0; i < 4; i += 1) {
      const angle = -Math.PI * 0.85 + i * 0.56;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * radius * 0.78, Math.sin(angle) * radius * 0.78);
      ctx.lineTo(Math.cos(angle) * radius * 1.16, Math.sin(angle) * radius * 1.16);
      ctx.stroke();
    }
  } else if (enemy.kind === "boss") {
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.92, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#f6eedc";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.16, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "#19130d";
    for (let i = 0; i < 8; i += 1) {
      const angle = (TAU / 8) * i + enemy.hitFlash * 0.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * radius * 0.96, Math.sin(angle) * radius * 0.96);
      ctx.lineTo(Math.cos(angle + 0.16) * radius * 1.35, Math.sin(angle + 0.16) * radius * 1.35);
      ctx.lineTo(Math.cos(angle - 0.16) * radius * 1.35, Math.sin(angle - 0.16) * radius * 1.35);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#ffe69a";
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.42, radius * 0.18, 0, 0, TAU);
    ctx.fill();
  } else {
    roundedPoly(radius, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(12,10,8,0.62)";
    ctx.beginPath();
    ctx.arc(-radius * 0.22, -radius * 0.08, radius * 0.12, 0, TAU);
    ctx.arc(radius * 0.28, -radius * 0.08, radius * 0.12, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(200,63,83,0.76)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.5, radius * 0.62);
    ctx.lineTo(0, radius * 1.05);
    ctx.lineTo(radius * 0.5, radius * 0.62);
    ctx.stroke();
  }
}

function roundedPoly(radius: number, sides: number): void {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const angle = -Math.PI / 2 + (TAU / sides) * i;
    const r = radius * (i % 2 ? 0.82 : 1);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawProjectiles(camera: Camera): void {
  state.projectiles.forEach((bullet) => {
    if (!isVisibleCircle(bullet, camera, bullet.r + 16)) return;
    const x = bullet.x - camera.x;
    const y = bullet.y - camera.y;
    ctx.save();
    ctx.translate(x, y);
    drawProjectileAsset(bullet);
    ctx.restore();
  });
}

function drawProjectileAsset(bullet: Projectile): void {
  const angle = Math.atan2(bullet.vy, bullet.vx);
  ctx.rotate(angle);
  ctx.shadowBlur = bullet.evolved ? 24 : 16;
  ctx.shadowColor = bullet.color;
  ctx.fillStyle = bullet.color;
  ctx.strokeStyle = bullet.evolved ? "#f6eedc" : "rgba(246,238,220,0.5)";
  ctx.lineWidth = bullet.evolved ? 2 : 1.5;

  if (drawProjectileSprite(bullet.sourceWeaponId, Math.max(34, bullet.r * (bullet.evolved ? 8.2 : 6.8)))) {
    if (bullet.evolved) {
      ctx.globalAlpha = 0.42;
      ctx.beginPath();
      ctx.arc(0, 0, bullet.r * 2.35, 0, TAU);
      ctx.stroke();
    }
    return;
  }

  if (bullet.sourceWeaponId === "bloodBats") {
    ctx.beginPath();
    ctx.moveTo(bullet.r * 1.1, 0);
    ctx.quadraticCurveTo(bullet.r * 0.2, -bullet.r * 0.9, -bullet.r * 0.6, -bullet.r * 0.2);
    ctx.quadraticCurveTo(-bullet.r * 0.25, 0, -bullet.r * 0.6, bullet.r * 0.2);
    ctx.quadraticCurveTo(bullet.r * 0.2, bullet.r * 0.9, bullet.r * 1.1, 0);
    ctx.fill();
  } else if (bullet.sourceWeaponId === "ricochetCrossbow") {
    ctx.beginPath();
    ctx.moveTo(bullet.r * 1.6, 0);
    ctx.lineTo(-bullet.r * 0.6, -bullet.r * 0.7);
    ctx.lineTo(-bullet.r * 0.25, 0);
    ctx.lineTo(-bullet.r * 0.6, bullet.r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (bullet.sourceWeaponId === "silverBolt") {
    ctx.beginPath();
    ctx.moveTo(bullet.r * 1.8, 0);
    ctx.lineTo(0, -bullet.r * 0.58);
    ctx.lineTo(-bullet.r * 1.2, 0);
    ctx.lineTo(0, bullet.r * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, bullet.r, 0, TAU);
    ctx.fill();
  }

  if (bullet.evolved) {
    ctx.globalAlpha = 0.42;
    ctx.beginPath();
    ctx.arc(0, 0, bullet.r * 1.8, 0, TAU);
    ctx.stroke();
  }
}

function drawScythes(camera: Camera): void {
  state.scythes.forEach((scythe) => {
    if (!isVisibleCircle(scythe, camera, scythe.r + 24)) return;
    ctx.save();
    ctx.translate(scythe.x - camera.x, scythe.y - camera.y);
    ctx.rotate(scythe.angle);
    if (drawProjectileSprite(scythe.sourceWeaponId, Math.max(54, scythe.r * 3.4))) {
      if (scythe.evolved) {
        ctx.globalAlpha = 0.42;
        ctx.strokeStyle = "#f6eedc";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, scythe.r * 1.7, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    ctx.rotate(scythe.spin);
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

function drawBeams(camera: Camera): void {
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
    ctx.globalAlpha = alpha * 0.48;
    ctx.lineWidth = Math.max(2, beam.width * 0.28);
    ctx.strokeStyle = "#f6eedc";
    ctx.beginPath();
    ctx.moveTo(beam.x - camera.x, beam.y - camera.y);
    ctx.lineTo(beam.x + beam.dx * beam.length - camera.x, beam.y + beam.dy * beam.length - camera.y);
    ctx.stroke();
    ctx.save();
    ctx.translate(beam.x + beam.dx * beam.length * 0.74 - camera.x, beam.y + beam.dy * beam.length * 0.74 - camera.y);
    ctx.rotate(Math.atan2(beam.dy, beam.dx));
    drawWeaponEffectSprite(beam.sourceWeaponId, Math.max(64, beam.width * 3.8), beam.evolved, alpha * 0.72);
    ctx.restore();
    ctx.restore();
  });
}

function drawStrikes(camera: Camera): void {
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
    ctx.translate(strike.toX - camera.x, strike.toY - camera.y);
    drawWeaponEffectSprite(strike.sourceWeaponId, strike.evolved ? 54 : 42, strike.evolved, alpha * 0.68);
    ctx.restore();
  });
}

function drawWeaponEffectSprite(weaponId: WeaponId | undefined, size: number, evolved = false, alpha = 1): boolean {
  if (!weaponId) return false;
  const cell = weaponEffectSpriteCells[weaponId];
  if (!cell) return false;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const drew = drawAtlasCell(weaponEffectAtlas, cell, 0, 0, size, size);
  if (drew && evolved) {
    ctx.globalAlpha = Math.min(0.48, alpha * 0.54);
    ctx.strokeStyle = "#f6eedc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.42, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  return drew;
}

function drawGems(camera: Camera): void {
  state.gems.forEach((gem) => {
    if (!isVisibleCircle(gem, camera, gem.r + 18)) return;
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

function drawWeapons(camera: Camera): void {
  state.weapons.forEach((weapon) => {
    weapon.draw?.(ctx, camera, game);
  });
}

function drawParticles(camera: Camera): void {
  state.particles.forEach((particle) => {
    if (!isVisibleCircle(particle, camera, particle.r)) return;
    const alpha = clamp(particle.life / (particle.maxLife ?? 0.72), 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x - camera.x, particle.y - camera.y, particle.r, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawFloaters(camera: Camera): void {
  ctx.save();
  ctx.font = "800 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  state.floaters.forEach((floater) => {
    if (!isVisibleCircle(floater, camera, 24)) return;
    ctx.globalAlpha = clamp(floater.life / 0.55, 0, 1);
    ctx.fillStyle = floater.color ?? "#f6eedc";
    ctx.fillText(String(floater.value), floater.x - camera.x, floater.y - camera.y);
  });
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawVignette(): void {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.28,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.72,
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
