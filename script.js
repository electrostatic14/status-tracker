const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 400;

let player = { x: 50, y: 300, width: 30, height: 30, dy: 0, gravity: 0.6, jump: -12, grounded: false };
let obstacles = [];
let speed = 4;
let gameOver = false;

function spawnObstacle() {
    obstacles.push({ x: canvas.width, y: 320, width: 30, height: 30 });
    setTimeout(spawnObstacle, Math.random() * 2000 + 1000);
}

// Функция прыжка
function jump() {
    if (player.grounded) {
        player.dy = player.jump;
        player.grounded = false;
    }
}

// Обработчик нажатий клавиатуры
document.addEventListener("keydown", function (event) {
    if (event.code === "Space") jump();
});

// Обработчик нажатий на экран (для мобильных)
canvas.addEventListener("click", jump);
canvas.addEventListener("touchstart", function (event) {
    event.preventDefault(); // Убираем стандартное выделение
    jump();
});

function update() {
    if (gameOver) return;

    player.dy += player.gravity;
    player.y += player.dy;

    if (player.y >= 300) {
        player.y = 300;
        player.dy = 0;
        player.grounded = true;
    }

    obstacles.forEach(obstacle => {
        obstacle.x -= speed;
        if (obstacle.x + obstacle.width < 0) {
            obstacles.shift();
        }

        if (player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            player.y < obstacle.y + obstacle.height &&
            player.y + player.height > obstacle.y) {
            gameOver = true;
            alert("Игра окончена!");
            document.location.reload();
        }
    });

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "blue";
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = "red";
    obstacles.forEach(obstacle => {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
}

spawnObstacle();
update();