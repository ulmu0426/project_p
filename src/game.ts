function loop(now = performance.now()): void {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function setPointerPosition(event: PointerEvent): void {
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

function getTooltipTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const element = target.closest("[data-tooltip]");
  return element instanceof HTMLElement ? element : null;
}

function showDetailTooltip(element: HTMLElement, clientX: number, clientY: number): void {
  const text = element.dataset.tooltip;
  if (!text) return;
  ui.detailTooltip.textContent = text;
  ui.detailTooltip.hidden = false;
  positionDetailTooltip(clientX, clientY);
}

function hideDetailTooltip(): void {
  ui.detailTooltip.hidden = true;
}

function positionDetailTooltip(clientX: number, clientY: number): void {
  const margin = 12;
  let left = clientX + margin;
  let top = clientY + margin;

  ui.detailTooltip.style.left = `${left}px`;
  ui.detailTooltip.style.top = `${top}px`;
  const rect = ui.detailTooltip.getBoundingClientRect();

  if (rect.right > window.innerWidth - 8) {
    left = Math.max(8, clientX - rect.width - margin);
  }
  if (rect.bottom > window.innerHeight - 8) {
    top = Math.max(8, clientY - rect.height - margin);
  }

  ui.detailTooltip.style.left = `${left}px`;
  ui.detailTooltip.style.top = `${top}px`;
}

canvas.addEventListener("pointerdown", (event) => {
  if (state.mode !== "playing") return;
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
  if (!pointer.active || pointer.id !== event.pointerId) return;
  setPointerPosition(event);
});

canvas.addEventListener("pointerup", (event) => {
  if (pointer.id !== event.pointerId) return;
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

document.addEventListener("pointerover", (event) => {
  const target = getTooltipTarget(event.target);
  if (!target) return;
  showDetailTooltip(target, event.clientX, event.clientY);
});

document.addEventListener("pointermove", (event) => {
  if (ui.detailTooltip.hidden) return;
  positionDetailTooltip(event.clientX, event.clientY);
});

document.addEventListener("pointerout", (event) => {
  const nextTarget = getTooltipTarget(event.relatedTarget);
  if (nextTarget) return;
  hideDetailTooltip();
});

document.addEventListener("focusin", (event) => {
  const target = getTooltipTarget(event.target);
  if (!target) return;
  const rect = target.getBoundingClientRect();
  showDetailTooltip(target, rect.left, rect.bottom);
});

document.addEventListener("focusout", hideDetailTooltip);

ui.openCharacter.addEventListener("click", () => showMenuView("character"));
ui.openShop.addEventListener("click", () => showMenuView("shop"));
ui.characterBack.addEventListener("click", () => showMenuView("main"));
ui.shopBack.addEventListener("click", () => showMenuView("main"));
ui.resume.addEventListener("click", togglePause);
ui.start.addEventListener("click", resetRun);

ui.restart.addEventListener("click", resetRun);
ui.pause.addEventListener("click", togglePause);
ui.reroll.addEventListener("click", () => {
  if (state.mode !== "levelup" || state.rerolls <= 0) return;
  state.rerolls -= 1;
  renderUpgradeChoices();
});
Array.from(ui.shopTabs.querySelectorAll("button[data-shop-category]")).forEach((tab) => {
  tab.addEventListener("click", () => {
    currentShopCategory = tab.getAttribute("data-shop-category") as ShopCategory;
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
