const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const scoreElement = document.getElementById("score");
const finalScoreElement = document.getElementById("finalScore");
const gravityIndicator = document.getElementById("gravityIndicator");
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
  lift: -7.2,
  obstacleSpeed: 2.8,
  obstacleWidth: 72,
  obstacleGap: 213,
  obstacleSpawnInterval: 2000,
  score: 0,
  isGameOver: false,
  isMusicOn: false,
  lastObstacleSpawn: 0,
  animationFrameId: null
};

const obstacles = [];

function resetGame() {
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.velocityY = 0;
  player.glowPulse = 0;

  game.score = 0;
  game.isGameOver = false;
  game.lastObstacleSpawn = performance.now();
  obstacles.length = 0;

  scoreElement.textContent = game.score;
  finalScoreElement.textContent = game.score;
  gravityIndicator.textContent = "Down";
  gameOverOverlay.classList.add("hidden");

  cancelAnimationFrame(game.animationFrameId);
  gameLoop(game.lastObstacleSpawn);
}

function flap() {
  if (game.isGameOver) {
    resetGame();
    return;
  }

  player.velocityY = game.lift;
  player.glowPulse = 1;
}

function updatePlayer() {
  player.velocityY += game.gravity;
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
  if (timestamp - game.lastObstacleSpawn >= game.obstacleSpawnInterval) {
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
  ctx.fillStyle = "#15162a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#24264a";
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

  ctx.fillStyle = "#1d1e38";
  for (let y = 16; y < canvas.height; y += 64) {
    for (let x = 16; x < canvas.width; x += 64) {
      ctx.fillRect(x, y, 4, 4);
    }
  }
}

function drawPlayer() {
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
    const movementDirection = Math.sign(player.velocityY || game.lift);
    const glowOffsetY = -movementDirection * 34;

    for (const step of glowSteps) {
      const radius = step.radius * player.glowPulse;
      const glowY = y + glowOffsetY;
      const gradient = ctx.createRadialGradient(x, glowY, 0, x, glowY, radius);

      gradient.addColorStop(0, `rgba(255, 223, 93, ${step.alpha * player.glowPulse})`);
      gradient.addColorStop(0.58, `rgba(255, 107, 157, ${step.alpha * 0.55 * player.glowPulse})`);
      gradient.addColorStop(1, "rgba(255, 107, 157, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, glowY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = "#171024";
  for (const row of rows) {
    ctx.fillRect(x + row[0] + 4, y + row[1] + 4, row[2], row[3]);
  }

  ctx.fillStyle = "#ffdf5d";
  for (const row of rows) {
    ctx.fillRect(x + row[0], y + row[1], row[2], row[3]);
  }

  ctx.fillStyle = "#fff7d6";
  ctx.fillRect(x - 8, y - 10, 8, 8);
  ctx.fillStyle = "#ff6b9d";
  ctx.fillRect(x + 10, y + 4, 8, 6);
}

function drawObstacles() {
  for (const obstacle of obstacles) {
    const x = Math.round(obstacle.x);
    const bottomPipeY = obstacle.gapY + obstacle.gapHeight;

    ctx.fillStyle = "#171024";
    ctx.fillRect(x + 6, 0, obstacle.width, obstacle.gapY);
    ctx.fillRect(x + 6, bottomPipeY, obstacle.width, canvas.height - bottomPipeY);
    ctx.fillRect(x, obstacle.gapY - 18, obstacle.width + 12, 18);
    ctx.fillRect(x, bottomPipeY, obstacle.width + 12, 18);

    ctx.fillStyle = "#5f4a8b";
    ctx.fillRect(x, 0, obstacle.width, obstacle.gapY);
    ctx.fillRect(x, bottomPipeY, obstacle.width, canvas.height - bottomPipeY);

    ctx.fillStyle = "#9b7cc7";
    ctx.fillRect(x + 8, 0, 10, obstacle.gapY);
    ctx.fillRect(x + 8, bottomPipeY, 10, canvas.height - bottomPipeY);

    ctx.fillStyle = "#c7b6e6";
    ctx.fillRect(x - 6, obstacle.gapY - 18, obstacle.width + 12, 6);
    ctx.fillStyle = "#5f4a8b";
    ctx.fillRect(x - 6, obstacle.gapY - 12, obstacle.width + 12, 18);
    ctx.fillRect(x - 6, bottomPipeY, obstacle.width + 12, 18);
  }
}

function draw() {
  drawBackground();
  drawObstacles();
  drawPlayer();
}

function gameLoop(timestamp) {
  if (!game.isGameOver) {
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
