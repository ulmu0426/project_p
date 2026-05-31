function updateWeapons(dt: number): void {
  state.weapons.forEach((weapon) => {
    weapon.update(dt, game);
  });
}

function updateProjectiles(dt: number): void {
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
      if (enemy.hp <= 0 || bullet.hitEnemyIds.includes(enemy.id)) continue;

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
        } else {
          remove = true;
        }
      }
    }

    if (remove) state.projectiles.splice(i, 1);
  }
}

function updateZones(dt: number): void {
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
    if (zone.life <= 0) state.zones.splice(i, 1);
  }
}

function updateMines(dt: number): void {
  const player = getPlayer();
  for (let i = state.mines.length - 1; i >= 0; i -= 1) {
    const mine = state.mines[i];
    mine.life -= dt;
    mine.armedAfter = Math.max(0, mine.armedAfter - dt);

    const gemVacuumRadius = mine.gemVacuumRadius;
    if (gemVacuumRadius) {
      state.gems.forEach((gem) => {
        const gemDistance = Math.hypot(gem.x - mine.x, gem.y - mine.y);
        if (gemDistance > gemVacuumRadius) return;
        const pull = normalize(player.x - gem.x, player.y - gem.y);
        const force = 120 + (1 - gemDistance / gemVacuumRadius) * 360;
        gem.x += pull.x * force * dt;
        gem.y += pull.y * force * dt;
      });
    }

    const triggered =
      mine.armedAfter <= 0 &&
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
    } else if (mine.life <= 0) {
      state.mines.splice(i, 1);
    }
  }
}

function updateScythes(dt: number): void {
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
      if (enemy.hp <= 0 || scythe.hitEnemyIds.includes(enemy.id)) return;
      if (Math.hypot(enemy.x - scythe.x, enemy.y - scythe.y) < enemy.r + scythe.r) {
        scythe.hitEnemyIds.push(enemy.id);
        const result = damageEnemy(enemy, scythe.damage);
        if (scythe.markDamage && !result.killed && enemy.hp > 0) {
          damageEnemy(enemy, scythe.markDamage);
          spawnStrike({
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

function updateLooseVisuals(dt: number): void {
  for (let i = state.beams.length - 1; i >= 0; i -= 1) {
    const beam = state.beams[i];
    beam.life -= dt;
    if (beam.life <= 0) state.beams.splice(i, 1);
  }

  for (let i = state.strikes.length - 1; i >= 0; i -= 1) {
    const strike = state.strikes[i];
    strike.life -= dt;
    if (strike.life <= 0) state.strikes.splice(i, 1);
  }
}

function updateEnemies(dt: number): void {
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

function updateEnemyStatus(enemy: Enemy, dt: number): void {
  enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
  if (enemy.slowTimer <= 0) {
    enemy.slowFactor = 1;
  }

  Object.keys(enemy.hitCooldowns).forEach((key) => {
    const weaponId = key as WeaponId;
    const next = Math.max(0, (enemy.hitCooldowns[weaponId] ?? 0) - dt);
    if (next <= 0) {
      delete enemy.hitCooldowns[weaponId];
    } else {
      enemy.hitCooldowns[weaponId] = next;
    }
  });
}

function updateGems(dt: number): void {
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

function updateParticles(dt: number): void {
  updateLooseList(state.particles, dt);
  updateLooseList(state.floaters, dt);
}

function updateLooseList<T extends LooseItem>(list: T[], dt: number): void {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const item = list[i];
    item.x += item.vx * dt;
    item.y += item.vy * dt;
    item.vy += (item.gravity ?? 0) * dt;
    item.life -= dt;
    if (item.life <= 0) list.splice(i, 1);
  }
}

function killEnemy(index: number, enemy: Enemy): void {
  state.enemies.splice(index, 1);
  state.kills += 1;
  creditChestKill(enemy);
  const gemCount = enemy.kind === "boss" ? 10 : enemy.kind === "brute" ? 4 : 1;
  for (let i = 0; i < gemCount; i += 1) {
    spawnGem({
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
      spawnGem({
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

function gainXp(base: number): void {
  state.xp += base * getPlayer().xpGain;
  while (state.xp >= state.nextXp) {
    state.xp -= state.nextXp;
    state.level += 1;
    state.nextXp = Math.floor(state.nextXp * 1.24 + 8);
    openUpgradePanel();
    break;
  }
}

function openUpgradePanel(): void {
  hideDetailTooltip();
  state.mode = "levelup";
  ui.upgrade.hidden = false;
  renderUpgradeChoices();
}

function renderUpgradeChoices(): void {
  hideDetailTooltip();
  ui.upgradeGrid.innerHTML = "";
  const choices = makeUpgradeChoices();

  if (choices.length === 0) {
    ui.upgrade.hidden = true;
    state.mode = "playing";
    updateHud(true);
    return;
  }

  choices.forEach((choice) => {
    const button = document.createElement("button");
    const tag = document.createElement("small");
    const sprite = document.createElement("span");
    const title = document.createElement("strong");
    const text = document.createElement("p");

    button.className = `upgrade-card${choice.weaponId ? " has-weapon-sprite" : ""}`;
    button.type = "button";
    button.title = choice.text;
    button.dataset.tooltip = choice.text;
    button.setAttribute("aria-label", `${choice.title}. ${choice.text}`);
    tag.textContent = choice.tag;
    title.textContent = choice.title;
    text.textContent = choice.text;
    sprite.className = "choice-weapon-sprite";
    sprite.setAttribute("aria-hidden", "true");

    if (choice.weaponId && hasWeaponEffectSprite(choice.weaponId)) {
      const definition = weaponDefinitionMap.get(choice.weaponId);
      if (definition) {
        button.style.setProperty("--skill-color", definition.color);
      }
      applyWeaponEffectSpriteStyle(sprite, choice.weaponId);
      button.append(tag, sprite, title, text);
    } else {
      button.append(tag, title, text);
    }

    button.addEventListener("click", () => {
      hideDetailTooltip();
      choice.apply();
      state.upgradesTaken.push(choice.id);
      ui.upgrade.hidden = true;
      state.mode = "playing";
      updateHud(true);
    });
    ui.upgradeGrid.appendChild(button);
  });
  updateUpgradeActions();
}

function updateUpgradeActions(): void {
  ui.reroll.textContent = `Reroll ${state.rerolls}`;
  ui.reroll.disabled = state.rerolls <= 0;
}

function makeUpgradeChoices(): UpgradeChoice[] {
  const ownedIds = new Set(state.weapons.map((weapon) => weapon.id));
  const choices: UpgradeChoice[] = [];

  state.weapons
    .filter((weapon) => weapon.level < weapon.maxLevel)
    .forEach((weapon) => {
      choices.push({
        id: weapon.id,
        title: weapon.name,
        tag: "Weapon",
        text: weapon.getDescription(),
        weaponId: weapon.id,
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
          weaponId: definition.id,
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
