const canvas = mustElement("game", HTMLCanvasElement);
const renderContext = canvas.getContext("2d");

if (!renderContext) {
  throw new Error("2D canvas context is not available.");
}

const ctx = renderContext;
const menuPanel = mustElement("menuPanel", HTMLElement);
const touchStick = mustElement("touchStick", HTMLDivElement);

const ui: UiElements = {
  time: mustElement("timeValue", HTMLSpanElement),
  level: mustElement("levelValue", HTMLSpanElement),
  kills: mustElement("killValue", HTMLSpanElement),
  health: mustElement("healthFill", HTMLSpanElement),
  xp: mustElement("xpFill", HTMLSpanElement),
  rail: mustElement("weaponRail", HTMLDivElement),
  passiveRail: mustElement("passiveRail", HTMLDivElement),
  relicRail: mustElement("relicRail", HTMLElement),
  detailTooltip: mustElement("detailTooltip", HTMLDivElement),
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
