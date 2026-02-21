const canvas = document.getElementById("mazeCanvas");
const ctx = canvas.getContext("2d");

const statusText = document.getElementById("statusText");
const levelText = document.getElementById("levelText");
const gridText = document.getElementById("gridText");
const livesText = document.getElementById("livesText");
const movesText = document.getElementById("movesText");
const timeText = document.getElementById("timeText");
const nextLevelBtn = document.getElementById("nextLevelBtn");
const newGameBtn = document.getElementById("newGameBtn");
const modeButtons = Array.from(document.querySelectorAll(".mode-btn"));

const PREVIEW_MS = 5000;
const MAX_LIVES = 3;

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
  easy: { name: "Easy", minRatio: 0.32 },
  normal: { name: "Normal", minRatio: 0.45 },
  hard: { name: "Hard", minRatio: 0.58 },
};

const state = {
  level: 1,
  difficulty: "easy",
  size: 5,
  cellSize: 30,
  maze: [],
  player: { x: 0, y: 0 },
  trail: [{ x: 0, y: 0 }],
  discovered: new Set(["0,0"]),
  exit: { x: 0, y: 0 },
  lives: MAX_LIVES,
  completed: false,
  moves: 0,
  elapsed: 0,
  timer: null,
  previewTimer: null,
  previewStartedAt: 0,
  previewRevealMs: 700,
  startedAt: 0,
  phase: "preview",
  solutionPath: [],
  winBannerUntil: 0,
  strike: {
    active: false,
    startedAt: 0,
    duration: 540,
    dir: "up",
    anchor: { x: 0, y: 0 },
  },
  drag: {
    active: false,
    pointerId: null,
    x: 0,
    y: 0,
  },
};

function cellKey(x, y) {
  return `${x},${y}`;
}

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

function livesToText() {
  const full = "⚡".repeat(state.lives);
  const empty = "·".repeat(MAX_LIVES - state.lives);
  return `${full}${empty}`;
}

function updateHUD() {
  levelText.textContent = `Level: ${state.level}`;
  gridText.textContent = `Grid: ${state.size}x${state.size}`;
  livesText.textContent = `Leben: ${livesToText()}`;
  movesText.textContent = `Moves: ${state.moves}`;
  timeText.textContent = `Zeit: ${state.elapsed}s`;
}

function startTimer() {
  state.startedAt = Date.now();
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (state.phase === "play") {
      state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      updateHUD();
    }
  }, 250);
}

function startPlayPhase() {
  state.phase = "play";
  startTimer();
  statusText.textContent = "Go! Nebel aktiv. Folge deinem Lichtpfad.";
}

function resetTraversalAtStart() {
  state.player = { x: 0, y: 0 };
  state.trail = [{ x: 0, y: 0 }];
  state.discovered = new Set([cellKey(0, 0)]);
}

function startLevel(resetLevel = false, withPreview = true) {
  if (resetLevel) state.level = 1;

  state.size = getGridSize();
  calcCellSize();
  state.exit = { x: state.size - 1, y: state.size - 1 };
  createLevelMaze();

  resetTraversalAtStart();
  state.completed = false;
  state.moves = 0;
  state.elapsed = 0;
  state.strike.active = false;
  state.winBannerUntil = 0;

  clearTimeout(state.previewTimer);
  nextLevelBtn.disabled = true;

  if (withPreview) {
    state.phase = "preview";
    state.previewStartedAt = performance.now();
    state.previewRevealMs = Math.min(
      1000,
      Math.max(200, Math.floor(state.solutionPath.length * 36))
    );
    clearInterval(state.timer);
    statusText.textContent = "Merke dir den Weg... 3";

    state.previewTimer = setTimeout(() => {
      startPlayPhase();
    }, PREVIEW_MS);
  } else {
    state.phase = "play";
    startTimer();
    statusText.textContent = "Nebel aktiv. Folge deinem Lichtpfad.";
  }
  updateHUD();
}

function gameOver() {
  state.phase = "gameover";
  state.completed = false;
  clearInterval(state.timer);
  clearTimeout(state.previewTimer);
  nextLevelBtn.disabled = true;
  statusText.textContent = "Game Over. Starte ein neues Spiel.";
  updateHUD();
}

function triggerStrike(dirName) {
  state.strike.active = true;
  state.strike.startedAt = performance.now();
  state.strike.dir = dirName;
  state.strike.anchor = { x: state.player.x, y: state.player.y };
}

function onWallHit(dirName) {
  if (state.phase !== "play") return;

  triggerStrike(dirName);
  state.lives = Math.max(0, state.lives - 1);

  if (state.lives === 0) {
    gameOver();
    return;
  }

  statusText.textContent = `Strike! Weiter ab hier. Leben: ${state.lives}/${MAX_LIVES}`;
  updateHUD();
}

function drawLine(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawPathSteps(offsetX, offsetY, steps) {
  if (!steps.length) return;

  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = Math.max(3, Math.floor(state.cellSize * 0.16));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(255,255,255,0.85)";
  ctx.shadowBlur = 8;
  ctx.beginPath();

  steps.forEach((step, index) => {
    const x = offsetX + step.x * state.cellSize + state.cellSize / 2;
    const y = offsetY + step.y * state.cellSize + state.cellSize / 2;
    if (index === 0) {
      ctx.moveTo(x, y);
      return;
    }
    ctx.lineTo(x, y);
  });

  ctx.stroke();
  ctx.restore();
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

function getGridCenter(offsetX, offsetY, cell) {
  return {
    x: offsetX + cell.x * state.cellSize + state.cellSize / 2,
    y: offsetY + cell.y * state.cellSize + state.cellSize / 2,
  };
}

function drawPreviewCountdown(now) {
  if (state.phase !== "preview") return;

  const elapsed = now - state.previewStartedAt;
  const remaining = Math.max(0, PREVIEW_MS - elapsed);

  let label = "3";
  if (remaining <= 1000) label = "GO!";
  else if (remaining <= 2000) label = "1";
  else if (remaining <= 3000) label = "2";

  ctx.save();
  ctx.fillStyle = "rgba(29, 36, 120, 0.9)";
  ctx.font = `${Math.max(18, state.cellSize * 0.7)}px 'Press Start 2P'`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, canvas.width / 2, 32 + state.cellSize * 0.35);
  ctx.restore();

  statusText.textContent = `Merke dir den Weg... ${label}`;
}

function drawFogWithTorch(offsetX, offsetY, now) {
  if (state.phase !== "play") return;

  const player = getGridCenter(offsetX, offsetY, state.player);
  const pulse = Math.sin(now * 0.013) * 0.5 + 0.5;
  const core = state.cellSize * (0.16 + pulse * 0.05);
  const radius = state.cellSize * (0.38 + pulse * 0.09);

  ctx.save();
  ctx.fillStyle = "rgba(8, 12, 30, 0.98)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "destination-out";

  state.discovered.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    const c = getGridCenter(offsetX, offsetY, { x, y });
    ctx.beginPath();
    ctx.arc(c.x, c.y, state.cellSize * 0.56, 0, Math.PI * 2);
    ctx.fill();
  });

  const gradient = ctx.createRadialGradient(
    player.x,
    player.y,
    core * 0.2,
    player.x,
    player.y,
    radius
  );
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(0.7, "rgba(0,0,0,0.45)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.shadowColor = "rgba(255,255,255,0.95)";
  ctx.shadowBlur = 7 + pulse * 5;
  ctx.beginPath();
  ctx.arc(player.x, player.y, Math.max(2, core * 0.7), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStrikeOverlay(now, offsetX, offsetY) {
  if (!state.strike.active) return;

  const elapsed = now - state.strike.startedAt;
  const progress = Math.min(1, elapsed / state.strike.duration);
  const alpha = 1 - progress;

  const anchor = getGridCenter(offsetX, offsetY, state.strike.anchor);
  const dir = DIRS[state.strike.dir] || DIRS.up;
  const strike = {
    x: anchor.x + dir.dx * state.cellSize * 0.52,
    y: anchor.y + dir.dy * state.cellSize * 0.52,
  };

  ctx.save();
  ctx.fillStyle = `rgba(230, 57, 70, ${0.24 * alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = `rgba(255,255,255,${0.95 * alpha})`;
  ctx.lineWidth = Math.max(2, state.cellSize * 0.1);
  ctx.beginPath();
  ctx.moveTo(anchor.x, anchor.y);
  ctx.lineTo((anchor.x + strike.x) * 0.5 + state.cellSize * 0.1, (anchor.y + strike.y) * 0.5);
  ctx.lineTo(strike.x, strike.y);
  ctx.stroke();

  ctx.strokeStyle = `rgba(230,57,70,${0.98 * alpha})`;
  ctx.lineWidth = Math.max(2, state.cellSize * 0.08);
  ctx.beginPath();
  ctx.arc(strike.x, strike.y, state.cellSize * (0.18 + progress * 1.1), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (progress >= 1) {
    state.strike.active = false;
  }
}

function drawRewardOverlay(now) {
  if (now > state.winBannerUntil) return;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.76)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1d2478";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.max(20, state.cellSize * 0.85)}px 'Press Start 2P'`;
  ctx.fillText("LEVEL CLEAR", canvas.width / 2, canvas.height / 2 - 14);
  ctx.font = `${Math.max(12, state.cellSize * 0.38)}px 'Press Start 2P'`;
  ctx.fillText("Nice run!", canvas.width / 2, canvas.height / 2 + 20);
  ctx.restore();
}

function draw(now = performance.now()) {
  let shakeX = 0;
  let shakeY = 0;
  if (state.strike.active) {
    const elapsed = now - state.strike.startedAt;
    if (elapsed < 170) {
      const intensity = (1 - elapsed / 170) * 4;
      shakeX = (Math.random() - 0.5) * intensity;
      shakeY = (Math.random() - 0.5) * intensity;
    }
  }

  const offsetX = Math.floor((canvas.width - state.size * state.cellSize) / 2 + shakeX);
  const offsetY = Math.floor((canvas.height - state.size * state.cellSize) / 2 + shakeY);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e9f9f1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#1d2478";
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
    const elapsed = Math.max(0, now - state.previewStartedAt);
    const progress = Math.min(1, elapsed / state.previewRevealMs);
    const steps = Math.max(1, Math.floor(state.solutionPath.length * progress));
    drawPathSteps(offsetX, offsetY, state.solutionPath.slice(0, steps));
    drawMarker(offsetX, offsetY, 0, 0, "#1d2478");
    drawMarker(offsetX, offsetY, state.exit.x, state.exit.y, "#ffffff");
  }

  if (state.phase === "play") {
    drawPathSteps(offsetX, offsetY, state.trail);
  }

  if (state.phase === "done" || state.phase === "gameover") {
    drawPathSteps(offsetX, offsetY, state.trail);
    drawMarker(offsetX, offsetY, 0, 0, "#1d2478");
    drawMarker(offsetX, offsetY, state.exit.x, state.exit.y, "#ffffff");
  }

  const player = getGridCenter(offsetX, offsetY, state.player);
  ctx.fillStyle = "#1d2478";
  ctx.beginPath();
  ctx.arc(player.x, player.y, Math.max(5, state.cellSize * 0.2), 0, Math.PI * 2);
  ctx.fill();

  drawFogWithTorch(offsetX, offsetY, now);
  drawPreviewCountdown(now);
  drawStrikeOverlay(now, offsetX, offsetY);
  drawRewardOverlay(now);
}

function move(dirName) {
  if (state.phase !== "play") return;

  const dir = DIRS[dirName];
  const cell = state.maze[state.player.y][state.player.x];

  if (cell.walls[dir.wall]) {
    onWallHit(dirName);
    return;
  }

  const nx = state.player.x + dir.dx;
  const ny = state.player.y + dir.dy;
  if (nx < 0 || ny < 0 || nx >= state.size || ny >= state.size) {
    onWallHit(dirName);
    return;
  }

  state.player.x = nx;
  state.player.y = ny;
  state.trail.push({ x: nx, y: ny });
  state.discovered.add(cellKey(nx, ny));
  state.moves += 1;

  if (nx === state.exit.x && ny === state.exit.y) {
    state.completed = true;
    state.phase = "done";
    clearInterval(state.timer);
    state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
    state.winBannerUntil = performance.now() + 1400;
    statusText.textContent = `Level geschafft! ${state.moves} Moves in ${state.elapsed}s.`;
    nextLevelBtn.disabled = false;
  }

  updateHUD();
}

function handleSwipeDelta(dx, dy) {
  const threshold = Math.max(16, state.cellSize * 0.28);
  let consumed = false;

  while (Math.abs(dx) >= threshold || Math.abs(dy) >= threshold) {
    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx > 0) {
        move("right");
        dx -= threshold;
      } else {
        move("left");
        dx += threshold;
      }
    } else if (dy > 0) {
      move("down");
      dy -= threshold;
    } else {
      move("up");
      dy += threshold;
    }
    consumed = true;
  }

  return { consumed, dx, dy };
}

function setupTouchControls() {
  canvas.style.touchAction = "none";

  if (window.PointerEvent) {
    canvas.addEventListener(
      "pointerdown",
      (event) => {
        if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
        event.preventDefault();
        state.drag.active = true;
        state.drag.pointerId = event.pointerId;
        state.drag.x = event.clientX;
        state.drag.y = event.clientY;
        if (canvas.setPointerCapture) {
          try {
            canvas.setPointerCapture(event.pointerId);
          } catch (_err) {
            // ignore capture errors on unsupported edge-cases
          }
        }
      },
      { passive: false }
    );

    canvas.addEventListener(
      "pointermove",
      (event) => {
        if (!state.drag.active || event.pointerId !== state.drag.pointerId) return;
        const dx = event.clientX - state.drag.x;
        const dy = event.clientY - state.drag.y;
        const result = handleSwipeDelta(dx, dy);
        if (result.consumed) event.preventDefault();
        state.drag.x = event.clientX - result.dx;
        state.drag.y = event.clientY - result.dy;
      },
      { passive: false }
    );

    const stopPointer = (event) => {
      if (event.pointerId !== state.drag.pointerId) return;
      state.drag.active = false;
      state.drag.pointerId = null;
    };

    canvas.addEventListener("pointerup", stopPointer, { passive: true });
    canvas.addEventListener("pointercancel", stopPointer, { passive: true });
    canvas.addEventListener("lostpointercapture", stopPointer, { passive: true });
    return;
  }

  canvas.addEventListener(
    "touchstart",
    (event) => {
      if (!event.touches.length) return;
      event.preventDefault();
      const touch = event.touches[0];
      state.drag.active = true;
      state.drag.x = touch.clientX;
      state.drag.y = touch.clientY;
    },
    { passive: false }
  );

  canvas.addEventListener(
    "touchmove",
    (event) => {
      if (!state.drag.active || !event.touches.length) return;
      const touch = event.touches[0];
      const dx = touch.clientX - state.drag.x;
      const dy = touch.clientY - state.drag.y;
      const result = handleSwipeDelta(dx, dy);
      event.preventDefault();
      state.drag.x = touch.clientX - result.dx;
      state.drag.y = touch.clientY - result.dy;
    },
    { passive: false }
  );

  const stopTouch = () => {
    state.drag.active = false;
  };

  canvas.addEventListener("touchend", stopTouch, { passive: true });
  canvas.addEventListener("touchcancel", stopTouch, { passive: true });
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

  state.lives = MAX_LIVES;
  statusText.textContent = `${DIFFICULTY[mode].name}-Modus aktiv. Neues Spiel startet.`;
  startLevel(true, true);
}

function setupInput() {
  window.addEventListener("keydown", onKeyDown, { passive: false });

  document.querySelectorAll("[data-dir]").forEach((btn) => {
    btn.addEventListener("click", () => move(btn.dataset.dir));
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => setDifficulty(button.dataset.mode));
  });

  newGameBtn.addEventListener("click", () => {
    state.lives = MAX_LIVES;
    startLevel(true, true);
  });

  nextLevelBtn.addEventListener("click", () => {
    state.level += 1;
    startLevel(false, true);
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
}

function renderLoop(now) {
  draw(now);
  requestAnimationFrame(renderLoop);
}

window.addEventListener("resize", () => {
  fitCanvas();
});

setupInput();
setupTouchControls();
fitCanvas();
startLevel(true, true);
requestAnimationFrame(renderLoop);
