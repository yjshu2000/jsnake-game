const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
//document.body.appendChild(canvas);
canvas.width = 400;
canvas.height = 400;

const UNIT_SIZE = 20;
const SNAKE_OVERLINE = UNIT_SIZE / 10;
const CHUNK_SIZE = 4;
const GROWTH_AMOUNT = 4;
const STATES = {
    PLAYING: "PLAYING",
    GAME_OVER: "GAME_OVER",
    PAUSED: "PAUSED"
};

let SNAKE_SPEED = 200; // more milliseconds = slower speed
let MAX_HEALTH = 2;

let snake = [{ x: 0, y: 0 }];
let direction = { x: 0, y: 0 };
let currentDirection = { x: 0, y: 0 };
let nextDirection = { x: 0, y: 0 };
let food = { x: UNIT_SIZE * 5, y: UNIT_SIZE * 5 };
let chunks = new Set(["0,0","0,1","1,1", "1,0"]);
let lastUpdateTime = 0;
let keys = {};
let cameraOffset = { x: 0, y: 0 };
let gameState = STATES.PLAYING;
let score = 0;
let currentHP = MAX_HEALTH;

function startGame() {
    document.getElementById("gameContainer").style.display = "block";
    document.getElementById("gameInitialization").style.display = "none";
    SNAKE_SPEED = document.getElementById("snakeSpeed").value;
    MAX_HEALTH = document.getElementById("maxHealth").value; 
    currentHP = MAX_HEALTH;
    //set the health bar dimensions
    document.getElementById("healthBarContainer").style.width = `${UNIT_SIZE * MAX_HEALTH}px`;
    document.getElementById("healthBar").style.width = `${UNIT_SIZE * MAX_HEALTH}px`;
    document.getElementById("healthBarContainer").style.height = `${UNIT_SIZE}px`;
    document.getElementById("healthBar").style.height = `${UNIT_SIZE}px`;
}

function gameLoop(timestamp) {
    if (timestamp - lastUpdateTime > SNAKE_SPEED) {
        update();
        lastUpdateTime = timestamp;
    }
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState !== STATES.PLAYING) return;

    if (nextDirection.x !== 0 || nextDirection.y !== 0) {
        direction = nextDirection;
    }
    
    if (direction.x !== 0 || direction.y !== 0) {
        const newHead = {
            x: snake[0].x + direction.x * UNIT_SIZE,
            y: snake[0].y + direction.y * UNIT_SIZE
        };

        // Check for collision with chunk borders
        const chunkX = Math.floor(newHead.x / (CHUNK_SIZE * UNIT_SIZE));
        const chunkY = Math.floor(newHead.y / (CHUNK_SIZE * UNIT_SIZE));
        const chunkKey = `${chunkX},${chunkY}`;
        if (!chunks.has(chunkKey)) {
            gameState = STATES.GAME_OVER;
            return;
        }

        // Check for collision with self
        for (let i = 1; i < snake.length; i++) {
            if (newHead.x === snake[i].x && newHead.y === snake[i].y) {
                updateScore(-1);
                currentHP -= 1;
                document.getElementById("healthBar").style.width = `${UNIT_SIZE * currentHP}px`;
                if (currentHP <= 0) {
                    gameState = STATES.GAME_OVER;
                    return;
                }
            }
        }

        snake.unshift(newHead);
        if (newHead.x === food.x && newHead.y === food.y) {
            updateScore(GROWTH_AMOUNT);
            currentHP = Math.min(currentHP + 0.1, MAX_HEALTH);
            document.getElementById("healthBar").style.width = `${UNIT_SIZE * currentHP}px`;
            spawnFood();
            expandBoard(newHead);
            for (let i = 0; i < GROWTH_AMOUNT - 1; i++) { 
                snake.push({ ...snake[snake.length - 1] }); 
            }
        } else {
            snake.pop();
        }        
        cameraOffset.x = snake[0].x;
        cameraOffset.y = snake[0].y;
    }
}

function updateScore(amount) {
    score += amount;
    document.getElementById("score").innerText = `Score: ${score}`;
}

function render() {
    if (gameState === STATES.GAME_OVER || gameState === STATES.PAUSED) {
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        if (gameState === STATES.GAME_OVER) {
            // Set the shadow properties for text
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 1;
            ctx.shadowColor = "white";
            // Draw the text
            ctx.fillStyle = "black";
            ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
            ctx.fillText("reload to play again", canvas.width / 2, canvas.height / 2 + 40);
            // Reset the shadow properties
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 0;
        } else if (gameState === STATES.PAUSED) {
            ctx.fillStyle = "#666";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "black";
            ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
        }
        return;
    }

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2 - cameraOffset.x, canvas.height / 2 - cameraOffset.y);
    
    // Convert chunks to array of coordinates for easier processing
    const chunkCoords = Array.from(chunks).map(chunk => {
        const [x, y] = chunk.split(',').map(Number);
        return { x, y };
    });
    
    // First draw the fill
    ctx.beginPath();
    chunkCoords.forEach(chunk => {
        const x = chunk.x * CHUNK_SIZE * UNIT_SIZE;
        const y = chunk.y * CHUNK_SIZE * UNIT_SIZE;
        const size = CHUNK_SIZE * UNIT_SIZE;
        
        // For each chunk, draw its rectangle
        ctx.rect(x, y, size, size);
    });
    
    // Fill the entire area
    ctx.fillStyle = "khaki";
    ctx.fill();
    
    // Now draw the border
    ctx.beginPath();
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;
    
    // For each chunk, check each edge
    chunkCoords.forEach(chunk => {
        const x = chunk.x * CHUNK_SIZE * UNIT_SIZE;
        const y = chunk.y * CHUNK_SIZE * UNIT_SIZE;
        const size = CHUNK_SIZE * UNIT_SIZE;
        
        // Check top edge
        if (!chunks.has(`${chunk.x},${chunk.y - 1}`)) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + size, y);
        }
        
        // Check right edge
        if (!chunks.has(`${chunk.x + 1},${chunk.y}`)) {
            ctx.moveTo(x + size, y);
            ctx.lineTo(x + size, y + size);
        }
        
        // Check bottom edge
        if (!chunks.has(`${chunk.x},${chunk.y + 1}`)) {
            ctx.moveTo(x, y + size);
            ctx.lineTo(x + size, y + size);
        }
        
        // Check left edge
        if (!chunks.has(`${chunk.x - 1},${chunk.y}`)) {
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + size);
        }
    });
    
    ctx.stroke();
    
    // Draw snake
    snake.forEach((segment, index) => {
        if (index === 0) {
            ctx.fillStyle = "blue";
        } else {
            ctx.fillStyle = "green";
        }
        ctx.fillRect(segment.x, segment.y, UNIT_SIZE, UNIT_SIZE);
    });
    
    // Continuous line on top of snake
    ctx.strokeStyle = "chartreuse";
    ctx.lineWidth = SNAKE_OVERLINE;
    snake.forEach((segment, index) => {
        if (index === 0) return;
        const prevSegment = snake[index - 1];
        ctx.beginPath();
        ctx.moveTo(segment.x + UNIT_SIZE / 2, segment.y + UNIT_SIZE / 2);
        ctx.lineTo(prevSegment.x + UNIT_SIZE / 2, prevSegment.y + UNIT_SIZE / 2);
        ctx.stroke();
    });

    // Draw food
    ctx.fillStyle = "red";
    ctx.fillRect(food.x, food.y, UNIT_SIZE, UNIT_SIZE);
    ctx.restore();
}

function expandBoard() {
    // Get the boundaries of existing chunks
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (let chunk of chunks) {
        const [x, y] = chunk.split(",").map(Number);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }
    
    // Find all possible border positions
    const borderPositions = [];
    
    // Define orthogonal directions (up, right, down, left)
    const directions = [
        { dx: 0, dy: -1 }, // up
        { dx: 1, dy: 0 },  // right
        { dx: 0, dy: 1 },  // down
        { dx: -1, dy: 0 }  // left
    ];
    
    // Check all positions around the border
    for (let x = minX - 1; x <= maxX + 1; x++) {
        for (let y = minY - 1; y <= maxY + 1; y++) {
            const key = `${x},${y}`;
            
            // Skip if this chunk already exists
            if (chunks.has(key)) continue;
            
            // Check if this position is orthogonally adjacent to an existing chunk
            let isAdjacent = false;
            for (const dir of directions) {
                const adjacentKey = `${x + dir.dx},${y + dir.dy}`;
                if (chunks.has(adjacentKey)) {
                    isAdjacent = true;
                    break;
                }
            }
            
            if (isAdjacent) {
                borderPositions.push(key);
            }
        }
    }
    
    // If there are valid positions, randomly select one and add it
    if (borderPositions.length > 0) {
        const newChunk = borderPositions[Math.floor(Math.random() * borderPositions.length)];
        chunks.add(newChunk);
        return true;
    }
    
    return false;
}

function spawnFood() {
    // Select a random chunk from the existing chunks
    const chunkArray = Array.from(chunks);
    const randomChunk = chunkArray[Math.floor(Math.random() * chunkArray.length)];
    let [cx, cy] = randomChunk.split(",").map(Number);
    
    // Keep trying until we find a valid position
    let isValidPosition = false;
    while (!isValidPosition) {
        // Generate potential food position within the chunk boundaries
        const potentialX = cx * CHUNK_SIZE * UNIT_SIZE + Math.floor(Math.random() * CHUNK_SIZE) * UNIT_SIZE;
        const potentialY = cy * CHUNK_SIZE * UNIT_SIZE + Math.floor(Math.random() * CHUNK_SIZE) * UNIT_SIZE;
        
        // Check if this position overlaps with any snake segment
        isValidPosition = true;
        for (const segment of snake) {
            if (segment.x === potentialX && segment.y === potentialY) {
                isValidPosition = false;
                break;
            }
        }
        
        // If position is valid, set the food coordinates
        if (isValidPosition) {
            food.x = potentialX;
            food.y = potentialY;
            break;
        }
        
        // If we've tried too many times in this chunk, pick a new random chunk
        if (Math.random() < 0.1) {  // 10% chance to switch chunks if stuck
            const newRandomChunk = chunkArray[Math.floor(Math.random() * chunkArray.length)];
            [cx, cy] = newRandomChunk.split(",").map(Number);
        }
    }
}

document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault(); // Stops the page from scrolling
        cameraOffset.x = snake[0].x;
        cameraOffset.y = snake[0].y;
    }

    if (e.key === "ArrowUp" && direction.y !== 1) nextDirection = { x: 0, y: -1 };
    if (e.key === "ArrowDown" && direction.y !== -1) nextDirection = { x: 0, y: 1 };
    if (e.key === "ArrowLeft" && direction.x !== 1) nextDirection = { x: -1, y: 0 };
    if (e.key === "ArrowRight" && direction.x !== -1) nextDirection = { x: 1, y: 0 };

    if (e.key === "Escape") {
        if (gameState === STATES.PLAYING) {
            gameState = STATES.PAUSED;
        } else if (gameState === STATES.PAUSED) {
            gameState = STATES.PLAYING;
        }
    }

    if (e.key === "x") { //testing the game over state
        gameState = STATES.GAME_OVER;
    }
});

document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

requestAnimationFrame(gameLoop);