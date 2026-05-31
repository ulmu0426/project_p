function createSilverBoltDefinition(): WeaponDefinition {
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

      const weapon: WeaponInstance = {
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
          if (stats.timer > 0 || activeGame.state.enemies.length === 0) return;

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
                sourceWeaponId: weapon.id,
                evolved: weapon.evolved,
                onHit: weapon.evolved
                  ? (enemy, projectile, gameOnHit) => {
                      const shardTargets = gameOnHit.findNearestEnemies(
                        enemy,
                        2,
                        projectile.hitEnemyIds,
                        gameOnHit.area(280),
                      );
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
                          sourceWeaponId: weapon.id,
                          evolved: weapon.evolved,
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
          if (!raiseWeaponLevel(weapon)) return;
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

function createMoonKnivesDefinition(): WeaponDefinition {
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

      const weapon: WeaponInstance = {
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
            if (cooldown > 0 || enemy.hp <= 0) return;

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
          if (!raiseWeaponLevel(weapon)) return;
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

function createEmberRiteDefinition(): WeaponDefinition {
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

      const weapon: WeaponInstance = {
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
          if (stats.timer > 0) return;

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
                sourceWeaponId: weapon.id,
                evolved: weapon.evolved,
              });
            }
          });
          stats.pulse = 1;
          stats.timer = activeGame.cooldown(stats.cooldown);
          activeGame.state.shake = Math.max(activeGame.state.shake, 3);
        },
        draw(drawContext, camera, activeGame) {
          if (stats.pulse <= 0) return;
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
          if (!raiseWeaponLevel(weapon)) return;
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

function createGraveLanternDefinition(): WeaponDefinition {
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
      const exposureByEnemyId = new Map<number, number>();

      const weapon: WeaponInstance = {
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
          const seenEnemyIds = new Set<number>();
          activeGame.state.enemies.forEach((enemy) => {
            const cooldown = enemy.hitCooldowns[weapon.id] ?? 0;
            if (enemy.hp <= 0) return;
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
              if (!seenEnemyIds.has(enemyId)) exposureByEnemyId.delete(enemyId);
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
          if (!raiseWeaponLevel(weapon)) return;
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

function createRicochetCrossbowDefinition(): WeaponDefinition {
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

      const weapon: WeaponInstance = {
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
          if (stats.timer > 0) return;

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
                sourceWeaponId: weapon.id,
                evolved: weapon.evolved,
                onHit: weapon.evolved
                  ? (enemy, projectile, gameOnHit) => {
                      const mirrorTargets = gameOnHit.findNearestEnemies(
                        enemy,
                        2,
                        projectile.hitEnemyIds,
                        stats.range,
                      );
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
                          sourceWeaponId: weapon.id,
                          evolved: weapon.evolved,
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
          if (!raiseWeaponLevel(weapon)) return;
          stats.damage += 4;
          stats.cooldown = Math.max(0.62, stats.cooldown - 0.055);
          if (weapon.level === 3 || weapon.level === 6) stats.bounces += 1;
          if (weapon.level === 4) stats.count += 1;
        },
        getDescription() {
          return `Bolts bounce ${stats.bounces} times between enemies.`;
        },
      };

      return weapon;
    },
  };
}

function createFrostSigilDefinition(): WeaponDefinition {
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

      const weapon: WeaponInstance = {
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
          if (stats.timer > 0) return;

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
                sourceWeaponId: weapon.id,
                evolved: weapon.evolved,
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
          if (!raiseWeaponLevel(weapon)) return;
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

function createThunderCharmDefinition(): WeaponDefinition {
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

      const weapon: WeaponInstance = {
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
          if (stats.timer > 0) return;

          activeGame.withEcho(() => {
            const player = activeGame.player();
            let origin: VectorLike = player;
            const hitIds: number[] = [];

            for (let i = 0; i < activeGame.amount(stats.chains, 10); i += 1) {
              const next = activeGame.findNearestEnemies(origin, 1, hitIds, i === 0 ? Infinity : activeGame.area(stats.range))[0];
              if (!next) break;
              activeGame.spawnStrike({
                fromX: origin.x,
                fromY: origin.y,
                toX: next.x,
                toY: next.y,
                life: 0.18,
                maxLife: 0.18,
                color: weapon.color,
                sourceWeaponId: weapon.id,
                evolved: weapon.evolved,
              });
              activeGame.damageEnemy(next, stats.damage);
              activeGame.addParticles(next.x, next.y, weapon.color, 8);
              hitIds.push(next.id);
              if (weapon.evolved && Math.random() < Math.min(0.88, activeGame.player().passives.criticalChance + 0.24)) {
                const bonusTarget =
                  activeGame.findNearestEnemies(next, 1, hitIds, activeGame.area(stats.range * 1.25))[0] ?? next;
                activeGame.spawnStrike({
                  fromX: next.x,
                  fromY: next.y,
                  toX: bonusTarget.x,
                  toY: bonusTarget.y,
                  life: 0.16,
                  maxLife: 0.16,
                  color: weapon.color,
                  sourceWeaponId: weapon.id,
                  evolved: weapon.evolved,
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
          if (!raiseWeaponLevel(weapon)) return;
          stats.damage += 6;
          stats.cooldown = Math.max(1.15, stats.cooldown - 0.11);
          if (weapon.level === 2 || weapon.level === 5) stats.chains += 1;
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

function createBloodBatsDefinition(): WeaponDefinition {
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

      const weapon: WeaponInstance = {
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
          if (stats.timer > 0) return;

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
                sourceWeaponId: weapon.id,
                evolved: weapon.evolved,
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
                          sourceWeaponId: weapon.id,
                          evolved: weapon.evolved,
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
          if (!raiseWeaponLevel(weapon)) return;
          stats.damage += 4;
          stats.cooldown = Math.max(0.92, stats.cooldown - 0.09);
          if (weapon.level === 2 || weapon.level === 4 || weapon.level === 6) stats.count += 1;
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

function createSunSpearDefinition(): WeaponDefinition {
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

      const weapon: WeaponInstance = {
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
          if (stats.timer > 0) return;

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
                sourceWeaponId: weapon.id,
                evolved: weapon.evolved,
              });
            }
          });

          activeGame.state.shake = Math.max(activeGame.state.shake, 2);
          stats.timer = activeGame.cooldown(stats.cooldown);
        },
        upgrade(_activeGame) {
          if (!raiseWeaponLevel(weapon)) return;
          stats.damage += 12;
          stats.width += 2;
          stats.cooldown = Math.max(2.5, stats.cooldown - 0.22);
          if (weapon.level === 4) stats.count += 1;
        },
        getDescription() {
          return `Pierces a long line for ${stats.damage} damage.`;
        },
      };

      return weapon;
    },
  };
}

function createThornMinesDefinition(): WeaponDefinition {
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

      const weapon: WeaponInstance = {
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
          if (stats.timer > 0) return;

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
              sourceWeaponId: weapon.id,
              evolved: weapon.evolved,
              gemVacuumRadius: weapon.evolved ? stats.radius * 2.4 : undefined,
              gemBonusDamage: weapon.evolved ? 7 : undefined,
            });
          });
          stats.timer = activeGame.cooldown(stats.cooldown);
        },
        upgrade(_activeGame) {
          if (!raiseWeaponLevel(weapon)) return;
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

function createVoidBellDefinition(): WeaponDefinition {
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

      const weapon: WeaponInstance = {
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
          if (stats.timer > 0) return;

          const player = activeGame.player();
          const pullRadius = activeGame.area(stats.pullRadius);
          const explosionRadius = activeGame.area(stats.explosionRadius);
          activeGame.withEcho(() => {
            activeGame.state.enemies.forEach((enemy) => {
              const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
              if (dist > pullRadius || enemy.hp <= 0) return;
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
                sourceWeaponId: weapon.id,
                evolved: weapon.evolved,
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
          if (stats.pulse <= 0) return;
          const player = activeGame.player();
          drawContext.save();
          drawContext.globalAlpha = stats.pulse * 0.55;
          drawContext.strokeStyle = weapon.color;
          drawContext.lineWidth = 4;
          drawContext.beginPath();
          drawContext.arc(
            player.x - camera.x,
            player.y - camera.y,
            activeGame.area(stats.pullRadius) * (1.05 - stats.pulse * 0.2),
            0,
            TAU,
          );
          drawContext.stroke();
          drawContext.restore();
        },
        upgrade(_activeGame) {
          if (!raiseWeaponLevel(weapon)) return;
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

function createReaperScytheDefinition(): WeaponDefinition {
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

      const weapon: WeaponInstance = {
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
          if (stats.timer > 0) return;

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
                sourceWeaponId: weapon.id,
                evolved: weapon.evolved,
              });
            }
          });

          stats.timer = activeGame.cooldown(stats.cooldown);
        },
        upgrade(_activeGame) {
          if (!raiseWeaponLevel(weapon)) return;
          stats.damage += 7;
          stats.size += 1.5;
          stats.cooldown = Math.max(1.65, stats.cooldown - 0.13);
          if (weapon.level === 3 || weapon.level === 6) stats.count += 1;
        },
        getDescription() {
          return `Throws ${stats.count} returning scythe${stats.count > 1 ? "s" : ""}.`;
        },
      };

      return weapon;
    },
  };
}
