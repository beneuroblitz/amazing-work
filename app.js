const canvas = document.getElementById("mazeCanvas");
const ctx = canvas.getContext("2d");

const statusText = document.getElementById("statusText");
const levelText = document.getElementById("levelText");
const gridText = document.getElementById("gridText");
const movesText = document.getElementById("movesText");
const timeText = document.getElementById("timeText");
const nextLevelBtn = document.getElementById("nextLevelBtn");
const newGameBtn = document.getElementById("newGameBtn");
const modeButtons = Array.from(document.querySelectorAll(".mode-btn"));

const PREVIEW_MS = 5000;

const DIRS = {
  up: { dx: 0, dy: -1, wall: 0, opposite: 2 },
  right: { dx: 1, dy: 0, wall: 1, opposite: 3 },
  down: { dx: 0, dy: 1, wall: 2, opposite: 0 },
  left: { dx: -1, dy: 0, wall: 3, opposite: 1 },
};

const KEYMAP = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowRight: "right",
  KeyD: "right",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
};

const DIFFICULTY = {
  easy: { name: "Easy", minRatio: 0.32, wallPenalty: true },
  normal: { name: "Normal", minRatio: 0.45, wallPenalty: true },
  hard: { name: "Hard", minRatio: 0.58, wallPenalty: true },
};

const state = {
  level: 1,
  difficulty: "easy",
  size: 5,
  cellSize: 30,
  maze: [],
  player: { x: 0, y: 0 },
  exit: { x: 0, y: 0 },
  completed: false,
  moves: 0,
  elapsed: 0,
  timer: null,
  previewTimer: null,
  restartTimer: null,
  startedAt: 0,
  phase: "preview",
  solutionPath: [],
  wallCrash: false,
  strike: {
    active: false,
    startedAt: 0,
    duration: 1000,
    dir: "up",
  },
};

function createCell() {
  return {
    visited: false,
    walls: [true, true, true, true],
  };
}

function buildMaze(size) {
  const maze = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => createCell())
  );

  const stack = [{ x: 0, y: 0 }];
  maze[0][0].visited = true;

  while (stack.length) {
    const current = stack[stack.length - 1];
    const neighbors = [];

    for (const dirName of Object.keys(DIRS)) {
      const dir = DIRS[dirName];
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      if (!maze[ny][nx].visited) {
        neighbors.push({ nx, ny, dir });
      }
    }

    if (!neighbors.length) {
      stack.pop();
      continue;
    }

    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    maze[current.y][current.x].walls[pick.dir.wall] = false;
    maze[pick.ny][pick.nx].walls[pick.dir.opposite] = false;
    maze[pick.ny][pick.nx].visited = true;
    stack.push({ x: pick.nx, y: pick.ny });
  }

  return maze;
}

function findSolutionPath() {
  const visited = Array.from({ length: state.size }, () =>
    Array.from({ length: state.size }, () => false)
  );
  const path = [];

  function walk(x, y) {
    if (x === state.exit.x && y === state.exit.y) {
      path.push({ x, y });
      return true;
    }

    visited[y][x] = true;
    const cell = state.maze[y][x];

    for (const dirName of Object.keys(DIRS)) {
      const dir = DIRS[dirName];
      if (cell.walls[dir.wall]) continue;
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (nx < 0 || ny < 0 || nx >= state.size || ny >= state.size) continue;
      if (visited[ny][nx]) continue;
      if (walk(nx, ny)) {
        path.push({ x, y });
        return true;
      }
    }
    return false;
  }

  walk(0, 0);
  return path.reverse();
}

function getGridSize() {
  return Math.min(9, 5 + (state.level - 1));
}

function calcCellSize() {
  const maxW = canvas.width - 40;
  const maxH = canvas.height - 40;
  state.cellSize = Math.max(24, Math.floor(Math.min(maxW / state.size, maxH / state.size)));
}

function createLevelMaze() {
  const totalCells = state.size * state.size;
  const minLength = Math.ceil(totalCells * DIFFICULTY[state.difficulty].minRatio);

  for (let attempt = 0; attempt < 250; attempt += 1) {
    state.maze = buildMaze(state.size);
    state.solutionPath = findSolutionPath();
    if (state.solutionPath.length >= minLength) return;
  }

  state.maze = buildMaze(state.size);
  state.solutionPath = findSolutionPath();
}

function updateHUD() {
  levelText.textContent = `Level: ${state.level}`;
  gridText.textContent = `Grid: ${state.size}x${state.size}`;
  movesText.textContent = `Moves: ${state.moves}`;
  timeText.textContent = `Zeit: ${state.elapsed}s`;
}

function startPlayPhase() {
  state.phase = "play";
  state.startedAt = Date.now();
  statusText.textContent = "Nebel aktiv. Fuehre dein Licht zum Ziel, ohne die Wand zu beruehren.";

  clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (!state.completed) {
      state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      updateHUD();
    }
  }, 250);

  draw();
}

function startLevel(resetLevel = false) {
  if (resetLevel) state.level = 1;

  state.size = getGridSize();
  calcCellSize();
  state.exit = { x: state.size - 1, y: state.size - 1 };
  createLevelMaze();

  state.player = { x: 0, y: 0 };
  state.completed = false;
  state.moves = 0;
  state.phase = "preview";
  state.wallCrash = false;
  state.strike.active = false;
  state.startedAt = 0;
  state.elapsed = 0;

  clearInterval(state.timer);
  clearTimeout(state.previewTimer);
  clearTimeout(state.restartTimer);

  nextLevelBtn.disabled = true;
  statusText.textContent = `Merke dir den Weg. Vorschau: ${PREVIEW_MS / 1000}s.`;
  updateHUD();
  draw();

  state.previewTimer = setTimeout(() => {
    startPlayPhase();
  }, PREVIEW_MS);
}

function triggerWallCrash() {
  if (state.phase !== "play") return;

  state.wallCrash = true;
  state.phase = "blocked";
  state.strike.active = true;
  state.strike.startedAt = performance.now();
  statusText.textContent = "Wand beruehrt. Level startet neu...";
  draw();

  clearTimeout(state.restartTimer);
  state.restartTimer = setTimeout(() => {
    startLevel(false);
  }, 950);
}

function drawLine(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawSolutionPath(offsetX, offsetY) {
  if (!state.solutionPath.length) return;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = Math.max(4, Math.floor(state.cellSize * 0.22));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(255,255,255,0.85)";
  ctx.shadowBlur = 10;
  ctx.beginPath();

  state.solutionPath.forEach((step, index) => {
    const x = offsetX + step.x * state.cellSize + state.cellSize / 2;
    const y = offsetY + step.y * state.cellSize + state.cellSize / 2;
    if (index === 0) {
      ctx.moveTo(x, y);
      return;
    }
    ctx.lineTo(x, y);
  });

  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawMarker(offsetX, offsetY, gridX, gridY, color) {
  const x = offsetX + gridX * state.cellSize;
  const y = offsetY + gridY * state.cellSize;
  ctx.fillStyle = color;
  ctx.fillRect(
    x + state.cellSize * 0.22,
    y + state.cellSize * 0.22,
    state.cellSize * 0.56,
    state.cellSize * 0.56
  );
}

function getPlayerPixel(offsetX, offsetY) {
  return {
    x: offsetX + state.player.x * state.cellSize + state.cellSize / 2,
    y: offsetY + state.player.y * state.cellSize + state.cellSize / 2,
  };
}

function getStrikePoint(offsetX, offsetY) {
  const player = getPlayerPixel(offsetX, offsetY);
  const dir = DIRS[state.strike.dir] || DIRS.up;
  return {
    x: player.x + dir.dx * state.cellSize * 0.52,
    y: player.y + dir.dy * state.cellSize * 0.52,
  };
}

function drawFogWithTorch(offsetX, offsetY, now) {
  if (state.phase !== "play" && state.phase !== "blocked") return;

  const player = getPlayerPixel(offsetX, offsetY);
  const pulse = Math.sin(now * 0.007) * 0.5 + 0.5;
  const core = state.cellSize * (0.8 + pulse * 0.28);
  const radius = state.cellSize * (1.8 + pulse * 0.9);

  ctx.save();
  ctx.fillStyle = "rgba(8, 12, 30, 0.9)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "destination-out";

  const gradient = ctx.createRadialGradient(
    player.x,
    player.y,
    core * 0.25,
    player.x,
    player.y,
    radius
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0.98)");
  gradient.addColorStop(0.45, "rgba(0, 0, 0, 0.6)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.shadowColor = "rgba(255,255,255,0.95)";
  ctx.shadowBlur = 18 + pulse * 14;
  ctx.beginPath();
  ctx.arc(player.x, player.y, Math.max(5, core * 0.34), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStrikeOverlay(now, offsetX, offsetY) {
  if (!state.strike.active) return;

  const elapsed = now - state.strike.startedAt;
  const progress = Math.min(1, elapsed / state.strike.duration);
  const alpha = 1 - progress;
  const strike = getStrikePoint(offsetX, offsetY);
  const player = getPlayerPixel(offsetX, offsetY);

  ctx.save();
  ctx.fillStyle = `rgba(230, 57, 70, ${0.2 * alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = `rgba(255,255,255,${0.92 * alpha})`;
  ctx.lineWidth = Math.max(2, state.cellSize * 0.12);
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo((player.x + strike.x) * 0.5 + state.cellSize * 0.12, (player.y + strike.y) * 0.5);
  ctx.lineTo(strike.x, strike.y);
  ctx.stroke();

  ctx.strokeStyle = `rgba(230,57,70,${0.95 * alpha})`;
  ctx.lineWidth = Math.max(2, state.cellSize * 0.08);
  ctx.beginPath();
  ctx.arc(strike.x, strike.y, state.cellSize * (0.25 + progress * 1.35), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (progress >= 1) {
    state.strike.active = false;
  }
}

function draw(now = performance.now()) {
  let shakeX = 0;
  let shakeY = 0;
  if (state.strike.active) {
    const elapsed = now - state.strike.startedAt;
    if (elapsed < 260) {
      const intensity = (1 - elapsed / 260) * 7;
      shakeX = (Math.random() - 0.5) * intensity;
      shakeY = (Math.random() - 0.5) * intensity;
    }
  }

  const offsetX = Math.floor((canvas.width - state.size * state.cellSize) / 2 + shakeX);
  const offsetY = Math.floor((canvas.height - state.size * state.cellSize) / 2 + shakeY);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = state.wallCrash ? "#ffd4d8" : "#e9f9f1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = state.wallCrash ? "#e63946" : "#1d2478";
  ctx.lineWidth = 3;

  for (let y = 0; y < state.size; y += 1) {
    for (let x = 0; x < state.size; x += 1) {
      const cell = state.maze[y][x];
      const px = offsetX + x * state.cellSize;
      const py = offsetY + y * state.cellSize;

      if (cell.walls[0]) drawLine(px, py, px + state.cellSize, py);
      if (cell.walls[1]) drawLine(px + state.cellSize, py, px + state.cellSize, py + state.cellSize);
      if (cell.walls[2]) drawLine(px, py + state.cellSize, px + state.cellSize, py + state.cellSize);
      if (cell.walls[3]) drawLine(px, py, px, py + state.cellSize);
    }
  }

  if (state.phase === "preview") {
    drawSolutionPath(offsetX, offsetY);
    drawMarker(offsetX, offsetY, 0, 0, "#1d2478");
    drawMarker(offsetX, offsetY, state.exit.x, state.exit.y, "#ffffff");
  }

  if (state.phase === "done") {
    drawMarker(offsetX, offsetY, 0, 0, "#1d2478");
    drawMarker(offsetX, offsetY, state.exit.x, state.exit.y, "#ffffff");
  }

  const playerX = offsetX + state.player.x * state.cellSize + state.cellSize / 2;
  const playerY = offsetY + state.player.y * state.cellSize + state.cellSize / 2;

  ctx.fillStyle = "#1d2478";
  ctx.beginPath();
  ctx.arc(playerX, playerY, Math.max(6, state.cellSize * 0.26), 0, Math.PI * 2);
  ctx.fill();

  drawFogWithTorch(offsetX, offsetY, now);
  drawStrikeOverlay(now, offsetX, offsetY);
}

function move(dirName) {
  if (state.completed || state.phase !== "play") return;

  const dir = DIRS[dirName];
  const cell = state.maze[state.player.y][state.player.x];

  if (cell.walls[dir.wall]) {
    if (DIFFICULTY[state.difficulty].wallPenalty) {
      state.strike.dir = dirName;
      triggerWallCrash();
    }
    return;
  }

  const nx = state.player.x + dir.dx;
  const ny = state.player.y + dir.dy;
  if (nx < 0 || ny < 0 || nx >= state.size || ny >= state.size) {
    if (DIFFICULTY[state.difficulty].wallPenalty) {
      state.strike.dir = dirName;
      triggerWallCrash();
    }
    return;
  }

  state.player.x = nx;
  state.player.y = ny;
  state.moves += 1;

  if (state.player.x === state.exit.x && state.player.y === state.exit.y) {
    state.completed = true;
    state.phase = "done";
    state.wallCrash = false;
    state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
    statusText.textContent = `Ziel erreicht. Nebel aufgeloest. ${state.moves} Moves in ${state.elapsed}s.`;
    nextLevelBtn.disabled = false;
  }

  updateHUD();
  draw();
}

function onKeyDown(event) {
  const dir = KEYMAP[event.code];
  if (!dir) return;
  event.preventDefault();
  move(dir);
}

function setDifficulty(mode) {
  if (!DIFFICULTY[mode]) return;
  state.difficulty = mode;

  modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });

  statusText.textContent = `${DIFFICULTY[mode].name}-Modus aktiv. Merke dir den Weg.`;
  startLevel(true);
}

function setupInput() {
  window.addEventListener("keydown", onKeyDown, { passive: false });

  document.querySelectorAll("[data-dir]").forEach((btn) => {
    btn.addEventListener("click", () => move(btn.dataset.dir));
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => setDifficulty(button.dataset.mode));
  });

  newGameBtn.addEventListener("click", () => startLevel(true));
  nextLevelBtn.addEventListener("click", () => {
    state.level += 1;
    startLevel(false);
  });
}

function fitCanvas() {
  const ratio = 1.5;
  const rect = canvas.getBoundingClientRect();
  const displayWidth = Math.max(320, Math.floor(rect.width));
  const displayHeight = Math.floor(displayWidth / ratio);

  canvas.width = displayWidth;
  canvas.height = displayHeight;

  calcCellSize();
  draw();
}

function renderLoop(now) {
  draw(now);
  requestAnimationFrame(renderLoop);
}

window.addEventListener("resize", () => {
  fitCanvas();
});

setupInput();
fitCanvas();
startLevel(true);
requestAnimationFrame(renderLoop);
