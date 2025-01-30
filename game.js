const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
canvas.width = 400;
canvas.height = 400;

const UNIT_SIZE = 20;
const CHUNK_SIZE = 10;
const BOARD_CHUNK_SIZE = 4;
const INITIAL_BOARD_SIZE = 16; //16x16, 4 chunks
const SNAKE_SPEED = 100;

let snake = [{ x: 0, y: 0 }];
let direction = { x: 0, y: 0 };
let food = { x: UNIT_SIZE * 5, y: UNIT_SIZE * 5 };
let chunks = new Set(["0,0"]);
let lastUpdateTime = 0;
let keys = {};
let cameraOffset = { x: 0, y: 0 };

function gameLoop(timestamp) {
    if (timestamp - lastUpdateTime > SNAKE_SPEED) {
        update();
        lastUpdateTime = timestamp;
    }
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (!keys["ArrowUp"] && !keys["ArrowDown"] && !keys["ArrowLeft"] && !keys["ArrowRight"]) {
        direction = { x: 0, y: 0 };
    }

    if (keys["ArrowUp"]) direction = { x: 0, y: -1 };
    if (keys["ArrowDown"]) direction = { x: 0, y: 1 };
    if (keys["ArrowLeft"]) direction = { x: -1, y: 0 };
    if (keys["ArrowRight"]) direction = { x: 1, y: 0 };
    
    if (direction.x !== 0 || direction.y !== 0) {
        const newHead = {
            x: snake[0].x + direction.x * UNIT_SIZE,
            y: snake[0].y + direction.y * UNIT_SIZE
        };
        snake.unshift(newHead);
        if (newHead.x === food.x && newHead.y === food.y) {
            spawnFood();
            expandBoard(newHead);
        } else {
            snake.pop();
        }
        cameraOffset.x = snake[0].x;
        cameraOffset.y = snake[0].y;
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2 - cameraOffset.x, canvas.height / 2 - cameraOffset.y);
    
    for (let chunk of chunks) {
        let [cx, cy] = chunk.split(",").map(Number);
        ctx.strokeStyle = "#444";
        ctx.strokeRect(cx * CHUNK_SIZE * UNIT_SIZE, cy * CHUNK_SIZE * UNIT_SIZE, CHUNK_SIZE * UNIT_SIZE, CHUNK_SIZE * UNIT_SIZE);
    }
    
    snake.forEach((segment, index) => {
        if (index === 0) {
            ctx.fillStyle = "blue";
        } else {
            ctx.fillStyle = "green";
        }
        ctx.fillRect(segment.x, segment.y, UNIT_SIZE, UNIT_SIZE);
    });

    //draw food
    ctx.fillStyle = "red";
    ctx.fillRect(food.x, food.y, UNIT_SIZE, UNIT_SIZE);
    ctx.restore();
}

function expandBoard(head) {
    const cx = Math.floor(head.x / (CHUNK_SIZE * UNIT_SIZE));
    const cy = Math.floor(head.y / (CHUNK_SIZE * UNIT_SIZE));
    const key = `${cx},${cy}`;
    if (!chunks.has(key)) chunks.add(key);
}

function spawnFood() {
    food.x = (Math.floor(Math.random() * 10) - 5) * UNIT_SIZE * CHUNK_SIZE;
    food.y = (Math.floor(Math.random() * 10) - 5) * UNIT_SIZE * CHUNK_SIZE;
}

document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        cameraOffset.x = snake[0].x;
        cameraOffset.y = snake[0].y;
    }
});

document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

requestAnimationFrame(gameLoop);