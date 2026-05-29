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
const ambientMusic = document.getElementById("ambientMusic");

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
  gravityPhaseStart: 0,
  gravityPhaseDuration: 0,
  nextGravityPhaseEnd: 0,
  isPreparingGravitySwitch: false,
  animationFrameId: null
};

const obstacles = [];
const stars = createStars(72);

const palette = {
  down: {
    background: "#101426",
    grid: "#27304f",
    speck: "#1b2440",
    orbCore: "#ffd6c2",
    orbMid: "#e84b3c",
    orbEdge: "#842436",
    exhaust: "255, 132, 86",
    exhaustTail: "255, 70, 88",
    barrier: "#51467d",
    barrierEdge: "#8a7cc1",
    barrierGlow: "#b8d9ff",
    dayBackground: "#8a6f4d",
    dayGrid: "#b69462",
    daySpeck: "#6f603f",
    dayGlow: "255, 211, 106",
    shadow: "#090b17"
  },
  up: {
    background: "#141023",
    grid: "#34294f",
    speck: "#241b3d",
    orbCore: "#ffe2cf",
    orbMid: "#c93a4f",
    orbEdge: "#6f2036",
    exhaust: "255, 118, 78",
    exhaustTail: "217, 48, 76",
    barrier: "#433b70",
    barrierEdge: "#9473b8",
    barrierGlow: "#e2c2ff",
    dayBackground: "#7b5b62",
    dayGrid: "#ad8270",
    daySpeck: "#67475a",
    dayGlow: "255, 188, 116",
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

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function mixHexColors(startColor, endColor, amount) {
  const start = parseInt(startColor.slice(1), 16);
  const end = parseInt(endColor.slice(1), 16);
  const startRed = (start >> 16) & 255;
  const startGreen = (start >> 8) & 255;
  const startBlue = start & 255;
  const endRed = (end >> 16) & 255;
  const endGreen = (end >> 8) & 255;
  const endBlue = end & 255;
  const red = Math.round(lerp(startRed, endRed, amount));
  const green = Math.round(lerp(startGreen, endGreen, amount));
  const blue = Math.round(lerp(startBlue, endBlue, amount));

  return `rgb(${red}, ${green}, ${blue})`;
}

function getDayNightAmount(timestamp) {
  if (game.gravityPhaseDuration <= 0) {
    return 0;
  }

  const progress = Math.min(
    1,
    Math.max(0, (timestamp - game.gravityPhaseStart) / game.gravityPhaseDuration)
  );

  return game.completedPhases % 2 === 0 ? progress : 1 - progress;
}

function createStars(count) {
  const generatedStars = [];

  for (let index = 0; index < count; index += 1) {
    generatedStars.push({
      x: Math.floor(Math.random() * canvas.width),
      y: Math.floor(Math.random() * (canvas.height - 96)),
      size: Math.random() > 0.78 ? 3 : 2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.0024 + Math.random() * 0.0028
    });
  }

  return generatedStars;
}

function getRandomGravityPhaseDuration() {
  return game.gravityPhaseMin + Math.random() * (game.gravityPhaseMax - game.gravityPhaseMin);
}

function startGravityPhase(timestamp) {
  game.gravityPhaseStart = timestamp;
  game.gravityPhaseDuration = getRandomGravityPhaseDuration();
  game.nextGravityPhaseEnd = timestamp + game.gravityPhaseDuration;
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

function drawBackground(timestamp) {
  const mood = getMoodPalette();
  const dayNightAmount = getDayNightAmount(timestamp);

  ctx.fillStyle = mixHexColors(mood.background, mood.dayBackground, dayNightAmount);
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawStars(mood, timestamp, dayNightAmount);
  drawCyberGrid(mood, dayNightAmount);

  drawPlanetSurface(mood);
}

function drawCyberGrid(mood, dayNightAmount) {
  const gridColor = mixHexColors(mood.grid, mood.dayGrid, dayNightAmount);
  const alpha = 0.12 - dayNightAmount * 0.04;

  ctx.strokeStyle = gridColor;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1;

  for (let y = 40; y < canvas.height - 96; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  for (let x = 40; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height - 96);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawStars(mood, timestamp, dayNightAmount) {
  for (const star of stars) {
    const twinkle = 0.5 + Math.sin(timestamp * star.speed + star.phase) * 0.5;
    const starVisibility = 1 - dayNightAmount * 0.35;
    const starAlpha = (0.18 + twinkle * 0.72) * starVisibility;

    ctx.fillStyle = `rgba(244, 241, 255, ${starAlpha})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);

    if (star.size > 2) {
      ctx.fillStyle = game.gravityDirection === 1
        ? `rgba(131, 245, 255, ${(0.14 + twinkle * 0.36) * starVisibility})`
        : `rgba(214, 140, 255, ${(0.14 + twinkle * 0.36) * starVisibility})`;
      ctx.fillRect(star.x - 2, star.y + 1, 1, 1);
      ctx.fillRect(star.x + star.size + 1, star.y + 1, 1, 1);
      ctx.fillRect(star.x + 1, star.y - 2, 1, 1);
      ctx.fillRect(star.x + 1, star.y + star.size + 1, 1, 1);
    }
  }

  const glowAlpha = 0.04 + dayNightAmount * 0.18;
  ctx.fillStyle = `rgba(${mood.dayGlow}, ${glowAlpha})`;
  ctx.fillRect(0, 0, canvas.width, 128);

  if (dayNightAmount > 0.35) {
    const sunAlpha = (dayNightAmount - 0.35) / 0.65;
    ctx.fillStyle = `rgba(255, 224, 132, ${0.14 * sunAlpha})`;
    ctx.fillRect(canvas.width - 118, 34, 56, 56);
    ctx.fillStyle = `rgba(255, 246, 184, ${0.22 * sunAlpha})`;
    ctx.fillRect(canvas.width - 102, 50, 24, 24);
  }
}

function drawPlanetSurface(mood) {
  const surfaceY = canvas.height - 86;
  const terrain = [
    [0, 12],
    [34, 4],
    [72, 10],
    [116, -2],
    [158, 8],
    [202, 0],
    [244, 14],
    [286, 5],
    [330, 11],
    [374, -3],
    [420, 8],
    [480, 2]
  ];

  ctx.fillStyle = "#0a0c18";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(0, surfaceY + terrain[0][1]);

  for (const point of terrain) {
    ctx.lineTo(point[0], surfaceY + point[1]);
  }

  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = game.gravityDirection === 1 ? "#171d32" : "#1d1732";
  ctx.fillRect(0, surfaceY + 28, canvas.width, 58);

  ctx.fillStyle = mood.grid;
  for (const point of terrain) {
    ctx.fillRect(point[0], surfaceY + point[1], 36, 4);
  }

  const craters = [
    { x: 48, y: surfaceY + 48, width: 42, height: 10 },
    { x: 166, y: surfaceY + 58, width: 58, height: 12 },
    { x: 306, y: surfaceY + 42, width: 48, height: 10 },
    { x: 396, y: surfaceY + 64, width: 36, height: 8 }
  ];

  for (const crater of craters) {
    ctx.fillStyle = "#070812";
    ctx.fillRect(crater.x, crater.y, crater.width, crater.height);
    ctx.fillStyle = mood.speck;
    ctx.fillRect(crater.x + 6, crater.y - 4, crater.width - 12, 4);
    ctx.fillStyle = mood.grid;
    ctx.fillRect(crater.x + 10, crater.y + crater.height, crater.width - 20, 3);
  }

  ctx.fillStyle = game.gravityDirection === 1 ? "#222b49" : "#2b2248";
  ctx.fillRect(18, surfaceY + 68, 18, 6);
  ctx.fillRect(108, surfaceY + 38, 26, 6);
  ctx.fillRect(258, surfaceY + 70, 22, 6);
  ctx.fillRect(360, surfaceY + 30, 18, 6);
  ctx.fillRect(438, surfaceY + 52, 30, 6);
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

    drawBarrierPixels(x, 0, obstacle.width, obstacle.gapY, mood);
    drawBarrierPixels(x, bottomPipeY, obstacle.width, canvas.height - bottomPipeY, mood);
  }
}

function drawBarrierPixels(x, y, width, height, mood) {
  if (height <= 28) {
    return;
  }

  const pattern = [
    [18, 18, 8, 8],
    [46, 34, 12, 10],
    [30, 62, 6, 14],
    [54, 92, 10, 8],
    [14, 120, 14, 12],
    [40, 152, 8, 8],
    [24, 188, 12, 6],
    [52, 224, 6, 12]
  ];

  for (const pixel of pattern) {
    for (let offsetY = pixel[1]; offsetY < height - 14; offsetY += 246) {
      const blockX = x + Math.min(pixel[0], width - pixel[2] - 8);
      const blockY = y + offsetY;

      ctx.fillStyle = mood.barrierEdge;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(blockX, blockY, pixel[2], pixel[3]);

      ctx.fillStyle = mood.barrierGlow;
      ctx.globalAlpha = 0.28;
      ctx.fillRect(blockX + 2, blockY + 2, Math.max(2, pixel[2] - 4), Math.max(2, pixel[3] - 4));
      ctx.globalAlpha = 1;
    }
  }
}

function draw(timestamp) {
  drawBackground(timestamp);
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

  draw(timestamp);

  if (!game.isGameOver) {
    game.animationFrameId = requestAnimationFrame(gameLoop);
  }
}

function toggleMusic() {
  if (!ambientMusic) {
    game.isMusicOn = false;
    musicToggle.textContent = "Music: Off";
    musicToggle.setAttribute("aria-pressed", "false");
    return;
  }

  game.isMusicOn = !game.isMusicOn;

  if (game.isMusicOn) {
    ambientMusic.play().catch(() => {
      game.isMusicOn = false;
      musicToggle.textContent = "Music: Off";
      musicToggle.setAttribute("aria-pressed", "false");
    });
  } else {
    ambientMusic.pause();
  }

  musicToggle.textContent = game.isMusicOn ? "Music: On" : "Music: Off";
  musicToggle.setAttribute("aria-pressed", String(game.isMusicOn));
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    flap();
  }
});

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  flap();
});
restartButton.addEventListener("click", resetGame);
musicToggle.addEventListener("click", toggleMusic);

resetGame();
