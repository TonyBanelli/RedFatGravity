const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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
  velocityY: 0
};

const game = {
  gravity: 0.34,
  lift: -7.2,
  obstacleSpeed: 2.8,
  obstacleWidth: 72,
  obstacleGap: 170,
  obstacleSpawnInterval: 1500,
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
}

function updatePlayer() {
  player.velocityY += game.gravity;
  player.y += player.velocityY;

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
  ctx.fillStyle = "#101622";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#1d2738";
  ctx.lineWidth = 1;

  for (let y = 40; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#f3d15d";
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = "#fff4b0";
  ctx.stroke();
}

function drawObstacles() {
  for (const obstacle of obstacles) {
    const bottomPipeY = obstacle.gapY + obstacle.gapHeight;

    ctx.fillStyle = "#4ade80";
    ctx.fillRect(obstacle.x, 0, obstacle.width, obstacle.gapY);
    ctx.fillRect(obstacle.x, bottomPipeY, obstacle.width, canvas.height - bottomPipeY);

    ctx.fillStyle = "#86efac";
    ctx.fillRect(obstacle.x - 6, obstacle.gapY - 18, obstacle.width + 12, 18);
    ctx.fillRect(obstacle.x - 6, bottomPipeY, obstacle.width + 12, 18);
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
