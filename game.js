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
  score: 0,
  isGameOver: false,
  isMusicOn: false,
  lastScoreTime: 0,
  animationFrameId: null
};

function resetGame() {
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.velocityY = 0;

  game.score = 0;
  game.isGameOver = false;
  game.lastScoreTime = performance.now();

  scoreElement.textContent = game.score;
  finalScoreElement.textContent = game.score;
  gravityIndicator.textContent = "Down";
  gameOverOverlay.classList.add("hidden");

  cancelAnimationFrame(game.animationFrameId);
  gameLoop(game.lastScoreTime);
}

function flap() {
  if (game.isGameOver) {
    resetGame();
    return;
  }

  player.velocityY = game.lift;
}

function updateScore(timestamp) {
  if (timestamp - game.lastScoreTime >= 1000) {
    game.score += 1;
    game.lastScoreTime = timestamp;
    scoreElement.textContent = game.score;
  }
}

function updatePlayer() {
  player.velocityY += game.gravity;
  player.y += player.velocityY;

  if (player.y - player.radius <= 0) {
    player.y = player.radius;
    player.velocityY = 0;
  }

  if (player.y + player.radius >= canvas.height) {
    endGame();
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

function draw() {
  drawBackground();
  drawPlayer();
}

function gameLoop(timestamp) {
  if (!game.isGameOver) {
    updatePlayer();
    updateScore(timestamp);
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
