const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const scoreElement = document.getElementById("score");
const finalScoreElement = document.getElementById("finalScore");
const gravityIndicator = document.getElementById("gravityIndicator");
const gravityWarning = document.getElementById("gravityWarning");
const speedWarning = document.getElementById("speedWarning");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const restartButton = document.getElementById("restartButton");
const musicToggle = document.getElementById("musicToggle");

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 18,
  velocityY: 0,
  glowPulse: 0
};

const game = {
  gravity: 0.34,
  impulse: 7.2,
  gravityDirection: 1,
  gravityPhaseMin: 10000,
  gravityPhaseMax: 15000,
  gravityWarningDuration: 1000,
  baseObstacleSpeed: 2.8,
  obstacleSpeed: 2.8,
  speedIncreaseRate: 1.65,
  obstacleWidth: 72,
  obstacleGap: 213,
  baseObstacleSpawnInterval: 2000,
  score: 0,
  completedPhases: 0,
  isGameOver: false,
  isMusicOn: false,
  lastObstacleSpawn: 0,
  speedWarningUntil: 0,
  nextGravityPhaseEnd: 0,
  isPreparingGravitySwitch: false,
  animationFrameId: null
};

const obstacles = [];

const palette = {
  down: {
    background: "#101426",
    grid: "#27304f",
    speck: "#1b2440",
    orbCore: "#effcff",
    orbMid: "#83f5ff",
    orbEdge: "#2d7f9f",
    exhaust: "255, 211, 106",
    exhaustTail: "131, 245, 255",
    barrier: "#51467d",
    barrierEdge: "#8a7cc1",
    barrierGlow: "#b8d9ff",
    shadow: "#090b17"
  },
  up: {
    background: "#141023",
    grid: "#34294f",
    speck: "#241b3d",
    orbCore: "#fff4ff",
    orbMid: "#d68cff",
    orbEdge: "#774a9f",
    exhaust: "214, 140, 255",
    exhaustTail: "131, 245, 255",
    barrier: "#433b70",
    barrierEdge: "#9473b8",
    barrierGlow: "#e2c2ff",
    shadow: "#090b17"
  }
};

function getMoodPalette() {
  return game.gravityDirection === 1 ? palette.down : palette.up;
}

function setGravityMood() {
  const isGravityUp = game.gravityDirection === -1;
  document.body.classList.toggle("gravity-up", isGravityUp);
  gravityIndicator.textContent = `Gravity ${isGravityUp ? "\u2191" : "\u2193"}`;
}

function getObstacleSpawnInterval() {
  const baseDistance = game.baseObstacleSpeed * game.baseObstacleSpawnInterval;
  return baseDistance / game.obstacleSpeed;
}

function getRandomGravityPhaseDuration() {
  return game.gravityPhaseMin + Math.random() * (game.gravityPhaseMax - game.gravityPhaseMin);
}

function startGravityPhase(timestamp) {
  game.nextGravityPhaseEnd = timestamp + getRandomGravityPhaseDuration();
  game.lastObstacleSpawn = timestamp;
  game.isPreparingGravitySwitch = false;
  gravityWarning.classList.add("hidden");
}

function resetGame() {
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.velocityY = 0;
  player.glowPulse = 0;

  game.score = 0;
  game.completedPhases = 0;
  game.obstacleSpeed = game.baseObstacleSpeed;
  game.speedWarningUntil = 0;
  game.isGameOver = false;
  game.lastObstacleSpawn = performance.now();
  game.gravityDirection = 1;
  startGravityPhase(game.lastObstacleSpawn);
  obstacles.length = 0;

  scoreElement.textContent = game.score;
  finalScoreElement.textContent = game.score;
  setGravityMood();
  gravityWarning.classList.add("hidden");
  speedWarning.classList.add("hidden");
  gameOverOverlay.classList.add("hidden");

  cancelAnimationFrame(game.animationFrameId);
  gameLoop(game.lastObstacleSpawn);
}

function flap() {
  if (game.isGameOver) {
    resetGame();
    return;
  }

  player.velocityY = -game.gravityDirection * game.impulse;
  player.glowPulse = 1;
}

function updateGravity(timestamp) {
  if (!game.isPreparingGravitySwitch && timestamp >= game.nextGravityPhaseEnd) {
    game.isPreparingGravitySwitch = true;
    gravityWarning.classList.remove("hidden");
  }

  if (game.isPreparingGravitySwitch && obstacles.length === 0) {
    game.gravityDirection *= -1;
    game.completedPhases += 1;

    if (game.completedPhases % 2 === 0) {
      game.obstacleSpeed *= game.speedIncreaseRate;
      game.speedWarningUntil = timestamp + 2200;
      speedWarning.classList.remove("hidden");
    }
    setGravityMood();
    startGravityPhase(timestamp);
    return;
  }

  const timeUntilSwitch = game.nextGravityPhaseEnd - timestamp;
  const shouldShowWarning = game.isPreparingGravitySwitch ||
    timeUntilSwitch <= game.gravityWarningDuration;

  gravityWarning.classList.toggle("hidden", !shouldShowWarning);
}

function updatePlayer() {
  player.velocityY += game.gravity * game.gravityDirection;
  player.y += player.velocityY;
  player.glowPulse = Math.max(0, player.glowPulse - 0.055);

  if (player.y - player.radius <= 0 || player.y + player.radius >= canvas.height) {
    endGame();
  }
}

function createObstacle() {
  const minimumGapY = 90;
  const maximumGapY = canvas.height - game.obstacleGap - minimumGapY;
  const gapY = minimumGapY + Math.random() * (maximumGapY - minimumGapY);

  obstacles.push({
    x: canvas.width,
    width: game.obstacleWidth,
    gapY,
    gapHeight: game.obstacleGap,
    passed: false
  });
}

function updateObstacles(timestamp) {
  speedWarning.classList.toggle("hidden", timestamp >= game.speedWarningUntil);

  if (
    !game.isPreparingGravitySwitch &&
    timestamp - game.lastObstacleSpawn >= getObstacleSpawnInterval()
  ) {
    createObstacle();
    game.lastObstacleSpawn = timestamp;
  }

  for (let index = obstacles.length - 1; index >= 0; index -= 1) {
    const obstacle = obstacles[index];
    obstacle.x -= game.obstacleSpeed;

    if (!obstacle.passed && obstacle.x + obstacle.width < player.x - player.radius) {
      obstacle.passed = true;
      game.score += 1;
      scoreElement.textContent = game.score;
    }

    if (obstacle.x + obstacle.width < 0) {
      obstacles.splice(index, 1);
    }
  }
}

function circleIntersectsRect(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  const distanceX = circle.x - closestX;
  const distanceY = circle.y - closestY;

  return distanceX * distanceX + distanceY * distanceY <= circle.radius * circle.radius;
}

function checkObstacleCollisions() {
  for (const obstacle of obstacles) {
    const topPipe = {
      x: obstacle.x,
      y: 0,
      width: obstacle.width,
      height: obstacle.gapY
    };
    const bottomPipe = {
      x: obstacle.x,
      y: obstacle.gapY + obstacle.gapHeight,
      width: obstacle.width,
      height: canvas.height - obstacle.gapY - obstacle.gapHeight
    };

    if (circleIntersectsRect(player, topPipe) || circleIntersectsRect(player, bottomPipe)) {
      endGame();
      return;
    }
  }
}

function endGame() {
  game.isGameOver = true;
  finalScoreElement.textContent = game.score;
  gameOverOverlay.classList.remove("hidden");
}

function drawBackground() {
  const mood = getMoodPalette();

  ctx.fillStyle = mood.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = mood.grid;
  ctx.lineWidth = 1;

  for (let y = 32; y < canvas.height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  for (let x = 32; x < canvas.width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  ctx.fillStyle = mood.speck;
  for (let y = 16; y < canvas.height; y += 64) {
    for (let x = 16; x < canvas.width; x += 64) {
      ctx.fillRect(x, y, 4, 4);
    }
  }
}

function drawPlayer() {
  const mood = getMoodPalette();
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const glowSteps = [
    { radius: 28, alpha: 0.32 },
    { radius: 44, alpha: 0.18 },
    { radius: 62, alpha: 0.09 }
  ];
  const rows = [
    [-8, -18, 16, 6],
    [-14, -12, 28, 6],
    [-18, -6, 36, 12],
    [-14, 6, 28, 6],
    [-8, 12, 16, 6]
  ];

  if (player.glowPulse > 0) {
    const movementDirection = Math.sign(player.velocityY || -game.gravityDirection);
    const glowOffsetY = -movementDirection * 34;

    for (const step of glowSteps) {
      const radius = step.radius * player.glowPulse;
      const glowY = y + glowOffsetY;
      const gradient = ctx.createRadialGradient(x, glowY, 0, x, glowY, radius);

      gradient.addColorStop(0, `rgba(${mood.exhaust}, ${step.alpha * player.glowPulse})`);
      gradient.addColorStop(0.58, `rgba(${mood.exhaustTail}, ${step.alpha * 0.5 * player.glowPulse})`);
      gradient.addColorStop(1, `rgba(${mood.exhaustTail}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, glowY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = mood.shadow;
  for (const row of rows) {
    ctx.fillRect(x + row[0] + 4, y + row[1] + 4, row[2], row[3]);
  }

  ctx.fillStyle = mood.orbEdge;
  for (const row of rows) {
    ctx.fillRect(x + row[0], y + row[1], row[2], row[3]);
  }

  ctx.fillStyle = mood.orbMid;
  ctx.fillRect(x - 12, y - 12, 24, 24);
  ctx.fillRect(x - 16, y - 6, 32, 12);
  ctx.fillStyle = mood.orbCore;
  ctx.fillRect(x - 6, y - 8, 12, 10);

  ctx.fillStyle = mood.shadow;
  ctx.fillRect(x - 23, y - 3, 7, 6);
  ctx.fillRect(x + 16, y - 3, 7, 6);
  ctx.fillStyle = mood.orbMid;
  ctx.fillRect(x - 25, y - 5, 7, 6);
  ctx.fillRect(x + 18, y - 5, 7, 6);
  ctx.fillStyle = mood.orbCore;
  ctx.fillRect(x - 8, y - 10, 8, 8);
  ctx.fillStyle = "#ff6f9f";
  ctx.fillRect(x + 10, y + 4, 8, 6);
}

function drawObstacles() {
  const mood = getMoodPalette();

  for (const obstacle of obstacles) {
    const x = Math.round(obstacle.x);
    const bottomPipeY = obstacle.gapY + obstacle.gapHeight;

    ctx.fillStyle = mood.shadow;
    ctx.fillRect(x + 6, 0, obstacle.width, obstacle.gapY);
    ctx.fillRect(x + 6, bottomPipeY, obstacle.width, canvas.height - bottomPipeY);
    ctx.fillRect(x, obstacle.gapY - 18, obstacle.width + 12, 18);
    ctx.fillRect(x, bottomPipeY, obstacle.width + 12, 18);

    ctx.fillStyle = mood.barrier;
    ctx.fillRect(x, 0, obstacle.width, obstacle.gapY);
    ctx.fillRect(x, bottomPipeY, obstacle.width, canvas.height - bottomPipeY);

    ctx.fillStyle = mood.barrierEdge;
    ctx.fillRect(x + 8, 0, 10, obstacle.gapY);
    ctx.fillRect(x + 8, bottomPipeY, 10, canvas.height - bottomPipeY);
    ctx.fillRect(x + obstacle.width - 14, 0, 4, obstacle.gapY);
    ctx.fillRect(x + obstacle.width - 14, bottomPipeY, 4, canvas.height - bottomPipeY);

    ctx.fillStyle = mood.barrierGlow;
    ctx.fillRect(x - 6, obstacle.gapY - 18, obstacle.width + 12, 6);
    ctx.fillRect(x - 6, bottomPipeY, obstacle.width + 12, 6);
    ctx.fillStyle = mood.barrier;
    ctx.fillRect(x - 6, obstacle.gapY - 12, obstacle.width + 12, 18);
    ctx.fillRect(x - 6, bottomPipeY, obstacle.width + 12, 18);

    ctx.fillStyle = mood.barrierGlow;
    for (let y = 20; y < obstacle.gapY - 24; y += 42) {
      ctx.fillRect(x + 24, y, 18, 4);
    }

    for (let y = bottomPipeY + 26; y < canvas.height - 20; y += 42) {
      ctx.fillRect(x + 24, y, 18, 4);
    }
  }
}

function draw() {
  drawBackground();
  drawObstacles();
  drawPlayer();
}

function gameLoop(timestamp) {
  if (!game.isGameOver) {
    updateGravity(timestamp);
    updatePlayer();
    updateObstacles(timestamp);
    checkObstacleCollisions();
  }

  draw();

  if (!game.isGameOver) {
    game.animationFrameId = requestAnimationFrame(gameLoop);
  }
}

function toggleMusic() {
  game.isMusicOn = !game.isMusicOn;
  musicToggle.textContent = game.isMusicOn ? "Music On" : "Music Off";
  musicToggle.setAttribute("aria-pressed", String(game.isMusicOn));
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    flap();
  }
});

canvas.addEventListener("pointerdown", flap);
restartButton.addEventListener("click", resetGame);
musicToggle.addEventListener("click", toggleMusic);

resetGame();
