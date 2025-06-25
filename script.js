const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player, bullets = [], enemies = [], keys = {}, score = 0, highScore = localStorage.getItem("neonCarHS") || 0;
let powerUps = [], boss = null;
let gameRunning = false;
let shootCooldown = 0;
let isMuted = false;
let speedTimer = 0;

let shootSound = new Audio("assets/catch.mp3");
let hitSound = new Audio("assets/hit.mp3");
let shieldSound = new Audio("assets/shield.mp3");
let speedSound = new Audio("assets/speed.mp3");
let bossHitSound = new Audio("assets/boss_hit.wav");
let bossDeathSound = new Audio("assets/boss_death.wav");

function startGame() {
  document.getElementById("start-screen").style.display = "none";
  document.getElementById("gameCanvas").style.display = "block";
  document.getElementById("gameUI").style.display = "block";
  player = { x: canvas.width / 2 - 20, y: canvas.height - 60, w: 40, h: 60, speed: 5, shield: false };
  bullets = [];
  enemies = [];
  powerUps = [];
  boss = null;
  score = 0;
  speedTimer = 0;
  shootCooldown = 0;
  gameRunning = true;
  updateScoreDisplay(); // ✅ تحديث الـ UI
  requestAnimationFrame(update);
}

function resetGame() {
  gameRunning = false;
  setTimeout(startGame, 200);
}

document.getElementById("resetBtn")?.addEventListener("click", resetGame);

function drawPlayer() {
  ctx.fillStyle = player.shield ? "#0ff" : speedTimer > 0 ? "#0f0" : "#00fff7";
  ctx.fillRect(player.x, player.y, player.w, player.h);
  if (player.shield) {
    ctx.strokeStyle = "#0ff";
    ctx.lineWidth = 3;
    ctx.strokeRect(player.x - 2, player.y - 2, player.w + 4, player.h + 4);
  }
}

function drawBullets() {
  ctx.fillStyle = "#fff";
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= bullets[i].speed;
    ctx.fillRect(bullets[i].x, bullets[i].y, bullets[i].w, bullets[i].h);
    if (bullets[i].y < 0) bullets.splice(i, 1);
  }
}

function drawEnemies() {
  ctx.fillStyle = "red";
  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].y += enemies[i].speed;
    ctx.fillRect(enemies[i].x, enemies[i].y, enemies[i].w, enemies[i].h);

    if (isColliding(player, enemies[i])) {
      if (player.shield) {
        player.shield = false;
        enemies.splice(i, 1);
      } else {
        gameOver();
      }
    }
  }
}

function checkBulletCollisions() {
  for (let j = bullets.length - 1; j >= 0; j--) {
    const b = bullets[j];
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (isColliding(b, e)) {
        if (!isMuted) hitSound.play();
        enemies.splice(i, 1);
        bullets.splice(j, 1);
        score++;
        updateScoreDisplay();
        break;
      }
    }
  }
}

function drawPowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    p.y += p.speed;
    ctx.beginPath();
    ctx.arc(p.x + p.r, p.y + p.r, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.type === "shield" ? "yellow" : "lime";
    ctx.fill();

    if (isColliding(player, { x: p.x, y: p.y, w: p.r * 2, h: p.r * 2 })) {
      if (p.type === "shield") {
        player.shield = true;
        if (!isMuted) shieldSound.play();
      } else if (p.type === "speed") {
        speedTimer = 600;
        if (!isMuted) speedSound.play();
      }
      powerUps.splice(i, 1);
    }

    if (p.y > canvas.height) powerUps.splice(i, 1);
  }
}

function drawBoss() {
  if (!boss) return;
  boss.y += 0.5;
  ctx.fillStyle = "#ff0";
  ctx.fillRect(boss.x, boss.y, boss.w, boss.h);

  for (let j = bullets.length - 1; j >= 0; j--) {
    const b = bullets[j];
    if (isColliding(b, boss)) {
      boss.hp--;
      bullets.splice(j, 1);
      if (!isMuted) bossHitSound.play();
      if (boss.hp <= 0) {
        if (!isMuted) bossDeathSound.play();
        boss = null;
        score += 10;
        updateScoreDisplay();
      }
    }
  }

  if (isColliding(player, boss)) {
    if (player.shield) {
      player.shield = false;
    } else {
      gameOver();
    }
  }
}

function isColliding(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function updateScoreDisplay() {
  const scoreEl = document.getElementById("score");
  const hsEl = document.getElementById("highScore");
  if (scoreEl) scoreEl.textContent = score;
  if (hsEl) hsEl.textContent = highScore;
}

function update() {
  if (!gameRunning) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const playerSpeed = speedTimer > 0 ? 9 : player.speed;
  if (keys["ArrowLeft"]) player.x -= playerSpeed;
  if (keys["ArrowRight"]) player.x += playerSpeed;
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));

  if (keys[" "] && shootCooldown <= 0) {
    bullets.push({ x: player.x + player.w / 2 - 2, y: player.y, w: 4, h: 10, speed: 8 });
    if (!isMuted) shootSound.play();
    shootCooldown = 15;
  }
  shootCooldown--;

  if (speedTimer > 0) speedTimer--;

  if (!boss && score > 0 && score % 20 === 0) {
    boss = { x: canvas.width / 2 - 50, y: -100, w: 100, h: 100, hp: 20 };
  }

  if (Math.random() < 0.03) {
    enemies.push({ x: Math.random() * (canvas.width - 40), y: -40, w: 40, h: 40, speed: 2 });
  }

  if (Math.random() < 0.005) {
    const type = Math.random() < 0.5 ? "shield" : "speed";
    powerUps.push({ x: Math.random() * (canvas.width - 20), y: -20, r: 10, speed: 2, type });
  }

  drawPlayer();
  drawBullets();
  drawEnemies();
  checkBulletCollisions();
  drawPowerUps();
  drawBoss();

  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("Score: " + score, 10, 20);
  ctx.fillText("High Score: " + highScore, 480, 20);

  requestAnimationFrame(update);
}

function gameOver() {
  gameRunning = false;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("neonCarHS", highScore);
  }
  updateScoreDisplay(); // ✅ تحديث الواجهة بعد التعديل
  ctx.fillStyle = "white";
  ctx.font = "32px Arial";
  ctx.fillText("Game Over", 210, 200);
}

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});
