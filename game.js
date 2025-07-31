//import * as utils from "./utils.js"; //shjt's getting ugly; here's a utils file

const gameCanvas = document.getElementById("gameCanvas");
const gameCtx = gameCanvas.getContext("2d");
gameCanvas.width = 400;
gameCanvas.height = 400;

const UNIT_SIZE = 20;
const SNAKE_OVERLINE = UNIT_SIZE / 10;
const BOARD_CHUNK_SIZE = 4;

const GROWTH_AMOUNT = 4;
const FOOD_HEAL_RATE = 0.1; // health gained from eating food
const SELF_COLLISION_DMG = 1;
const OUT_COLLISION_DMG = 2;
const HEAD_DMG_MULTIPLIER = 1.0;
const BODY_DMG_MULTIPLIER = 0.1;

const STATES = {
    PLAYING: "PLAYING",
    GAME_OVER: "GAME_OVER",
    PAUSED: "PAUSED"
};

let SNAKE_SPEED = 200; // more milliseconds = slower speed
let MAX_HEALTH = 2;
let INDICATOR_ON = true;
let PAUSE_OVERVIEW_ON = true;

// enemy stats
const BASE_DMG = 1/20; // ratio of MAX_HEALTH;
function getKnightDmg() { return MAX_HEALTH * BASE_DMG; }
function getKnightAtkRate() { return SNAKE_SPEED * 3; }
function getKnightHealRate() { return getKnightDmg() * 1.5; } // health gained from killing a knight
let KNIGHT_SCORE = 1; // score for killing a knight
let FOOD_PER_KNIGHT = 10; //adjust for balance

function getArcherDmg() { return MAX_HEALTH * BASE_DMG / 2; }
function getArcherAtkRate() { return SNAKE_SPEED * 2; }
function getArcherHealRate() { return getArcherDmg() * 3; } // health gained from killing an archer
let ARCHER_SCORE = 1; // score for killing an archer
let FOOD_PER_ARCHER = 10; //adjust for balance

const gameState = {};

function initializeBoard(width, length) {
    let boardChunks = new Set();
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < length; y++) {
            boardChunks.add(`${x},${y}`);
        }
    }
    return boardChunks;
}

function initialization() {
    gameState.snake = [{ x: 0, y: 0 }];
    gameState.snakePositions = new Set(["0,0"]);
    gameState.direction = { x: 0, y: 0 };
    gameState.currentDirection = { x: 0, y: 0 };
    gameState.nextDirection = { x: 0, y: 0 };
    gameState.food = { x: UNIT_SIZE * 3, y: UNIT_SIZE * 3 };
    gameState.boardChunks = initializeBoard(2, 2);
    gameState.lastUpdateTime = 0;
    gameState.lastRenderTime = 0;
    gameState.keys = {};
    gameState.cameraOffset = { x: 0, y: 0 };
    gameState.state = STATES.PLAYING;
    gameState.score = 0;
    gameState.currentHP = MAX_HEALTH;
    gameState.knights = [];
    gameState.archers = [];
    gameState.foodEaten = 0;
}

initialization();

function startGame() {
    document.getElementById("gameContainer").style.display = "block";
    document.getElementById("gameInitialization").style.display = "none";
    SNAKE_SPEED = document.getElementById("snakeSpeed").value;
    MAX_HEALTH = document.getElementById("maxHealth").value; 
    FOOD_PER_KNIGHT = parseInt(document.getElementById("foodPerKnight").value); // NEW: set from dropdown
    gameState.currentHP = MAX_HEALTH;
    document.getElementById("healthBarContainer").style.width = `${UNIT_SIZE * MAX_HEALTH}px`;
    document.getElementById("healthBar").style.width = `${UNIT_SIZE * MAX_HEALTH}px`;
    document.getElementById("healthBarContainer").style.height = `${UNIT_SIZE}px`;
    document.getElementById("healthBar").style.height = `${UNIT_SIZE}px`;

    gameState.boardChunks = initializeBoard(document.getElementById("boardW").value, document.getElementById("boardL").value);
    INDICATOR_ON = document.getElementById("indicator").checked;
    PAUSE_OVERVIEW_ON = document.getElementById("pauseOverview").checked;
    document.getElementById("overviewCanvas").style.display = "none";

    document.getElementById("score").innerText = `Score: 0`;
}

function gameLoop(timestamp) {
    if (timestamp - gameState.lastUpdateTime > SNAKE_SPEED) {
        //console.log(timestamp - gameState.lastUpdateTime);
        update();
        gameState.lastUpdateTime = timestamp;
    }
    if (timestamp - gameState.lastRenderTime > 33) { // 30 FPS
        render();
        gameState.lastRenderTime = timestamp;
    }
    requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState.state !== STATES.PLAYING) return;

    if (gameState.nextDirection.x !== 0 || gameState.nextDirection.y !== 0) {
        gameState.direction = gameState.nextDirection;
    }
    
    if (gameState.direction.x !== 0 || gameState.direction.y !== 0) {
        const newHead = {
            x: gameState.snake[0].x + gameState.direction.x * UNIT_SIZE,
            y: gameState.snake[0].y + gameState.direction.y * UNIT_SIZE
        };

        // Check for collision with board chunk borders
        const chunkX = Math.floor(newHead.x / (BOARD_CHUNK_SIZE * UNIT_SIZE));
        const chunkY = Math.floor(newHead.y / (BOARD_CHUNK_SIZE * UNIT_SIZE));
        const chunkKey = `${chunkX},${chunkY}`;
        if (!gameState.boardChunks.has(chunkKey)) {
            updateScore(-1);
            gameState.currentHP -= OUT_COLLISION_DMG;
            document.getElementById("healthBar").style.width = `${UNIT_SIZE * gameState.currentHP}px`;
            if (gameState.currentHP <= 0) {
                gameState.state = STATES.GAME_OVER;
                return;
            }
        }
        // Check for collision with self
        const newHeadKey = `${newHead.x},${newHead.y}`;
        if (gameState.snakePositions.has(newHeadKey)) {
            updateScore(-0.1);
            gameState.currentHP -= SELF_COLLISION_DMG;
            document.getElementById("healthBar").style.width = `${UNIT_SIZE * gameState.currentHP}px`;
            if (gameState.currentHP <= 0) {
                gameState.state = STATES.GAME_OVER;
                return;
            }
        }

        gameState.snake.unshift(newHead);
        gameState.snakePositions.add(newHeadKey);
        // Check for collision with food
        if (newHead.x === gameState.food.x && newHead.y === gameState.food.y) {
            updateScore(GROWTH_AMOUNT);
            gameState.currentHP = Math.min(gameState.currentHP + FOOD_HEAL_RATE, MAX_HEALTH);
            document.getElementById("healthBar").style.width = `${UNIT_SIZE * gameState.currentHP}px`;
            spawnFood();
            gameState.foodEaten++;
            if (gameState.foodEaten == 2 || 
                (gameState.foodEaten > 0 && gameState.foodEaten % FOOD_PER_KNIGHT === 0)) {
                spawnKnight();
            }
            if (gameState.foodEaten == 4 || (gameState.foodEaten > 0 && gameState.foodEaten % FOOD_PER_ARCHER === 0)) {
                spawnArcher();
            }
            expandBoard(newHead);
            for (let i = 0; i < GROWTH_AMOUNT - 1; i++) { 
                gameState.snake.push({ ...gameState.snake[gameState.snake.length - 1] }); 
            }
        } else {
            const tail = gameState.snake.pop();
            gameState.snakePositions.delete(`${tail.x},${tail.y}`);
        }
        // Check for collision with knights
        gameState.knights.forEach((knight, index) => {
            if (newHead.x === knight.x && newHead.y === knight.y) {
                updateScore(KNIGHT_SCORE);
                gameState.currentHP = Math.min(gameState.currentHP + getKnightHealRate(), MAX_HEALTH);
                document.getElementById("healthBar").style.width = `${UNIT_SIZE * gameState.currentHP}px`;
                gameState.knights.splice(index, 1);
                spawnKnight();
            }
        });
        // Check for collision with archers
        gameState.archers.forEach((archer, index) => {
            if (newHead.x === archer.x && newHead.y === archer.y) {
                updateScore(ARCHER_SCORE);
                gameState.currentHP = Math.min(gameState.currentHP + getArcherHealRate(), MAX_HEALTH);
                document.getElementById("healthBar").style.width = `${UNIT_SIZE * gameState.currentHP}px`;
                gameState.archers.splice(index, 1);
                spawnArcher();
            }
        });

        // Knight and Archer damage logic
        const now = performance.now();
        // Knight damage logic: check if any snake segment is adjacent to any knight
        gameState.knights.forEach(knight => {
            if (!knight.lastAttackTime) knight.lastAttackTime = 0;
            if (now - knight.lastAttackTime >= getKnightAtkRate()) {
                // Check all 8 adjacent squares for any snake segment
                for (let i = 0; i < gameState.snake.length; i++) {
                    const seg = gameState.snake[i];
                    const dx = Math.abs(seg.x - knight.x) / UNIT_SIZE;
                    const dy = Math.abs(seg.y - knight.y) / UNIT_SIZE;
                    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1) || (dx === 1 && dy === 1)) {
                        // Adjacent (8 directions)
                        let dmg = getKnightDmg() * (i === 0 ? HEAD_DMG_MULTIPLIER : BODY_DMG_MULTIPLIER);
                        gameState.currentHP -= dmg;
                        document.getElementById("healthBar").style.width = `${UNIT_SIZE * gameState.currentHP}px`;
                        knight.lastAttackTime = now;
                        knight.flashUntil = now + 150; // flash for 150ms
                        // Only damage once per attack interval per knight
                        if (gameState.currentHP <= 0) {
                            gameState.state = STATES.GAME_OVER;
                        }
                        break;
                    }
                }
            }
        });
        // Archer damage logic: check if any snake segment is within 5x5 area of any archer
        gameState.archers.forEach(archer => {
            if (!archer.lastAttackTime) archer.lastAttackTime = 0;
            if (now - archer.lastAttackTime >= getArcherAtkRate()) {
                for (let i = 0; i < gameState.snake.length; i++) {
                    const seg = gameState.snake[i];
                    const dx = Math.abs(seg.x - archer.x) / UNIT_SIZE;
                    const dy = Math.abs(seg.y - archer.y) / UNIT_SIZE;
                    if ((dx !== 0 || dy !== 0) && dx <= 2 && dy <= 2) {
                        let dmg = getArcherDmg() * (i === 0 ? HEAD_DMG_MULTIPLIER : BODY_DMG_MULTIPLIER);
                        gameState.currentHP -= dmg;
                        document.getElementById("healthBar").style.width = `${UNIT_SIZE * gameState.currentHP}px`;
                        archer.lastAttackTime = now;
                        archer.flashUntil = now + 150;
                        if (gameState.currentHP <= 0) {
                            gameState.state = STATES.GAME_OVER;
                        }
                        break;
                    }
                }
            }
        });

        gameState.cameraOffset.x = gameState.snake[0].x;
        gameState.cameraOffset.y = gameState.snake[0].y;
    }
}

function updateScore(amount) {
    gameState.score = parseFloat((gameState.score + amount).toFixed(2));
    document.getElementById("score").innerText = `Score: ${gameState.score}`;
}

function render() {
    renderGame(gameCanvas, gameCtx);
    if (gameState.state === STATES.GAME_OVER || (gameState.state === STATES.PAUSED && PAUSE_OVERVIEW_ON)) {
        document.getElementById("overviewCanvas").style.display = "block";
        const overviewCanvas = document.getElementById("overviewCanvas");
        const overviewCtx = overviewCanvas.getContext("2d");
        overviewCanvas.width = gameCanvas.width * 2;
        overviewCanvas.height = gameCanvas.height * 2;
        renderGame(overviewCanvas, overviewCtx, true);
    }
    else {
        document.getElementById("overviewCanvas").style.display = "none";
    }
}

function renderGame(canvas, ctx, isOverview = false) {
    if (renderOverlayIfPausedOrGameOver(canvas, ctx, isOverview)) return;

    prepareCanvasTransform(ctx, canvas, isOverview);
    renderBoardChunks(ctx, isOverview);
    renderSnake(ctx, isOverview);
    renderFood(ctx);
    renderAdventurers(ctx);
    ctx.restore(); // Restore the context to its original state before drawing in screen coordinates
    renderIndicators(ctx, canvas, isOverview);
}

function renderOverlayIfPausedOrGameOver(canvas, ctx, isOverview) {
    if ((gameState.state === STATES.GAME_OVER || gameState.state === STATES.PAUSED) && !isOverview) {
        ctx.font = "30px Tahoma";
        ctx.textAlign = "center";
        if (gameState.state === STATES.GAME_OVER) {
            // Set the shadow properties for text
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 1;
            ctx.shadowColor = "white";
            // Draw the text
            ctx.fillStyle = "black";
            ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
            ctx.font = "24px Tahoma";
            ctx.fillText("press enter to play again", canvas.width / 2, canvas.height / 2 + 40);
            ctx.fillText("reload to update settings", canvas.width / 2, canvas.height / 2 + 80);
            // Reset the shadow properties
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 0;
        } else if (gameState.state === STATES.PAUSED) {
            ctx.fillStyle = "#666";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "black";
            ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
        }
        return true;
    }
    return false;
}

function prepareCanvasTransform(ctx, canvas, isOverview) {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    if (isOverview) {
        // put the score in the corner of the canvas
        ctx.font = "24px Tahoma";
        ctx.textAlign = "left";
        ctx.fillStyle = "black";
        ctx.fillText(`Score: ${gameState.score}`, BOARD_CHUNK_SIZE * UNIT_SIZE + 1, BOARD_CHUNK_SIZE * UNIT_SIZE + 1);
        ctx.fillText(`Score: ${gameState.score}`, BOARD_CHUNK_SIZE * UNIT_SIZE - 1, BOARD_CHUNK_SIZE * UNIT_SIZE - 1);
        ctx.fillStyle = "white";
        ctx.fillText(`Score: ${gameState.score}`, BOARD_CHUNK_SIZE * UNIT_SIZE, BOARD_CHUNK_SIZE * UNIT_SIZE);

        // Scale and translate stuff
        const boardBounds = getBounds(gameState.boardChunks);
        const shiftX = ((boardBounds.maxX + boardBounds.minX + 1) / 2) * BOARD_CHUNK_SIZE * UNIT_SIZE;
        const shiftY = ((boardBounds.maxY + boardBounds.minY + 1) / 2) * BOARD_CHUNK_SIZE * UNIT_SIZE;
        
        const scaleFactor = Math.min(1, 
            canvas.width / ((boardBounds.maxX - boardBounds.minX + 4) * BOARD_CHUNK_SIZE * UNIT_SIZE), 
            canvas.height / ((boardBounds.maxY - boardBounds.minY + 4) * BOARD_CHUNK_SIZE * UNIT_SIZE));
        ctx.scale(scaleFactor, scaleFactor);
        ctx.translate(canvas.width / scaleFactor / 2 - shiftX, canvas.height / scaleFactor / 2 - shiftY);
    } else {
        ctx.translate(canvas.width / 2 - gameState.cameraOffset.x, canvas.height / 2 - gameState.cameraOffset.y);
    }
}

function renderBoardChunks(ctx, isOverview) {
    // Convert board chunks to array of coordinates for easier processing
    const chunkCoords = getChunkCoords(gameState.boardChunks);
    
    // Draw chunk fill
    ctx.beginPath();
    chunkCoords.forEach(chunk => {
        const size = BOARD_CHUNK_SIZE * UNIT_SIZE;
        const x = chunk.x * size;
        const y = chunk.y * size;
        if (!isOverview && !isInCamView(x, y)) return;
        // For each chunk in view, draw its rectangle
        ctx.rect(x, y, size, size);
    });
    
    // Fill the entire area
    ctx.fillStyle = "khaki";
    ctx.fill();
    
    // Draw borders
    ctx.beginPath();
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;
    
    // For each chunk, check each edge
    chunkCoords.forEach(chunk => {
        const x = chunk.x * BOARD_CHUNK_SIZE * UNIT_SIZE;
        const y = chunk.y * BOARD_CHUNK_SIZE * UNIT_SIZE;
        const size = BOARD_CHUNK_SIZE * UNIT_SIZE;
        // Only process this chunk if it's in view OR one of its neighbors is in view
        if (isInCamView(x, y) ||
            isInCamView(x + size, y) ||
            isInCamView(x - size, y) ||
            isInCamView(x, y + size) ||
            isInCamView(x, y - size) ||
            isOverview
        ) {
            // Check top edge
            if (!gameState.boardChunks.has(`${chunk.x},${chunk.y - 1}`)) {
                ctx.moveTo(x, y);
                ctx.lineTo(x + size, y);
            }
            // Check right edge
            if (!gameState.boardChunks.has(`${chunk.x + 1},${chunk.y}`)) {
                ctx.moveTo(x + size, y);
                ctx.lineTo(x + size, y + size);
            }
            // Check bottom edge
            if (!gameState.boardChunks.has(`${chunk.x},${chunk.y + 1}`)) {
                ctx.moveTo(x, y + size);
                ctx.lineTo(x + size, y + size);
            }
            // Check left edge
            if (!gameState.boardChunks.has(`${chunk.x - 1},${chunk.y}`)) {
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + size);
            }
        }
    });
    
    ctx.stroke();
}

function renderSnake(ctx, isOverview) {
    gameState.snake.forEach((segment, index) => {
        if (index === 0) {
            ctx.fillStyle = "blue";
        } else {
            if (!isOverview && !isInCamView(segment.x, segment.y)) return;
            ctx.fillStyle = "green";
        }
        ctx.fillRect(segment.x, segment.y, UNIT_SIZE, UNIT_SIZE);
    });
    
    // Continuous line on top of snake
    ctx.strokeStyle = "chartreuse";
    ctx.lineWidth = SNAKE_OVERLINE;
    gameState.snake.forEach((segment, index) => {
        if (index === 0 || (!isOverview && !isInCamView(segment.x, segment.y))) return;
        const prevSegment = gameState.snake[index - 1];
        ctx.beginPath();
        ctx.moveTo(segment.x + UNIT_SIZE / 2, segment.y + UNIT_SIZE / 2);
        ctx.lineTo(prevSegment.x + UNIT_SIZE / 2, prevSegment.y + UNIT_SIZE / 2);
        ctx.stroke();
    });
}

function renderFood(ctx) {
    ctx.fillStyle = "red";
    ctx.fillRect(gameState.food.x, gameState.food.y, UNIT_SIZE, UNIT_SIZE);
}

function renderAdventurers(ctx) {
    renderKnights(ctx);
    renderArchers(ctx);
    // maybe more adventurers in the future
    //renderMages(ctx);
    //renderArchers(ctx);
}

function renderKnights(ctx) {
    // render each knight
    if (!gameState.knights) return; // if knights are not defined, do nothing
    const now = performance.now();
    gameState.knights.forEach(knight => {
        if (knight.flashUntil && now < knight.flashUntil) {
            ctx.fillStyle = "lightslategrey"; // flash colour
        } else {
            ctx.fillStyle = "lightsteelblue"; // normal colour
        }
        ctx.fillRect(knight.x, knight.y, UNIT_SIZE, UNIT_SIZE);
    });
}

function renderArchers(ctx) {
    if (!gameState.archers) return;
    const now = performance.now();
    gameState.archers.forEach(archer => {
        if (archer.flashUntil && now < archer.flashUntil) {
            ctx.fillStyle = "DarkOliveGreen"; // flash colour
        } else {
            ctx.fillStyle = "OliveDrab"; // normal colour
        }
        ctx.fillRect(archer.x, archer.y, UNIT_SIZE, UNIT_SIZE);
    });
}

function renderIndicators(ctx, canvas, isOverview) {
    if (INDICATOR_ON && !isOverview) {
        const indicatorRadius = UNIT_SIZE / 3;
        let paddingX = 0;
        let paddingY = 0;
        // Calculate food position relative to camera view
        const relativeX = gameState.food.x - gameState.cameraOffset.x;
        const relativeY = gameState.food.y - gameState.cameraOffset.y;
        if (relativeX > 0) paddingX = UNIT_SIZE;
        if (relativeY > 0) paddingY = UNIT_SIZE;
        // Calculate indicator position
        let indicatorX = Math.min(Math.max(relativeX + canvas.width / 2, paddingX), canvas.width - paddingX) + UNIT_SIZE/2;
        let indicatorY = Math.min(Math.max(relativeY + canvas.height / 2, paddingY), canvas.height - paddingY) + UNIT_SIZE/2;
        // Draw the indicator
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, indicatorRadius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function expandBoard() {
    // Get the boundaries of existing board chunks
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (let chunk of gameState.boardChunks) {
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
            if (gameState.boardChunks.has(key)) continue;
            
            // Check if this position is orthogonally adjacent to an existing chunk
            let isAdjacent = false;
            for (const dir of directions) {
                const adjacentKey = `${x + dir.dx},${y + dir.dy}`;
                if (gameState.boardChunks.has(adjacentKey)) {
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
        gameState.boardChunks.add(newChunk);
        return true;
    }
    
    return false;
}

function spawnFood() {
    const foodPos = getUnoccupiedPosition();
    gameState.food.x = foodPos.x;
    gameState.food.y = foodPos.y;
}

function spawnKnight() {
    const knightPos = getUnoccupiedPosition();
    const knight = {
        x: knightPos.x, 
        y: knightPos.y,
        lastAttackTime: 0 // Track last attack time for each knight
    }
    gameState.knights.push(knight);
}

function spawnArcher() {
    const archerPos = getUnoccupiedPosition();
    const archer = {
        x: archerPos.x,
        y: archerPos.y,
        lastAttackTime: 0
    };
    gameState.archers.push(archer);
}

function getUnoccupiedPosition() {
    // Select a random board chunk from the existing board chunks
    const chunkArray = Array.from(gameState.boardChunks);
    const randomChunk = chunkArray[Math.floor(Math.random() * chunkArray.length)];
    let [cx, cy] = randomChunk.split(",").map(Number);
    
    const maxAttemptsPerChunk = Math.floor(BOARD_CHUNK_SIZE * BOARD_CHUNK_SIZE / 2);
    let attempts = 0;

    // Keep trying until we find a valid position
    while (true) {
        // Generate potential unoccupied position within the chunk boundaries
        const potentialX = cx * BOARD_CHUNK_SIZE * UNIT_SIZE + Math.floor(Math.random() * BOARD_CHUNK_SIZE) * UNIT_SIZE;
        const potentialY = cy * BOARD_CHUNK_SIZE * UNIT_SIZE + Math.floor(Math.random() * BOARD_CHUNK_SIZE) * UNIT_SIZE;

        
        if (!isPositionOccupied(potentialX, potentialY)) {
            return { x: potentialX, y: potentialY };
        }

        attempts++;
        // If we've tried enough times in this chunk, switch to a new random chunk
        if (attempts >= maxAttemptsPerChunk) {
            attempts = 0;
            [cx, cy] = chunkArray[Math.floor(Math.random() * chunkArray.length)].split(",").map(Number);
        }
    }
}

function isPositionOccupied(x, y, forKnight) {
    // Check snake
    const key = `${x},${y}`;
    if (gameState.snakePositions.has(key)) return true;
    // Check food
    if (gameState.food.x === x && gameState.food.y === y) return true;
    // Check knights (if defined)
    if (gameState.knights) {
        for (const knight of gameState.knights) {
            if (knight.x === x && knight.y === y) return true;
        }
    }
    // Check archers (if defined)
    if (gameState.archers) {
        for (const archer of gameState.archers) {
            if (archer.x === x && archer.y === y) return true;
        }
    }
    // Add more checks for other entity types here

    return false; // Position is not occupied
}

document.addEventListener("keydown", (e) => {
    gameState.keys[e.key] = true;
    // Define arrow keys and numpad/num row equivalents
    const upKeys = ["ArrowUp", "8", "w"];
    const downKeys = ["ArrowDown", "5", "s"];
    const leftKeys = ["ArrowLeft", "4", "a"];
    const rightKeys = ["ArrowRight", "6", "d"];

    if ([...upKeys, ...downKeys, ...leftKeys, ...rightKeys].includes(e.key)) {
        e.preventDefault(); // Stops the page from scrolling
        gameState.cameraOffset.x = gameState.snake[0].x;
        gameState.cameraOffset.y = gameState.snake[0].y;
    }
    let newDirection = { x: 0, y: 0 };

    if (upKeys.includes(e.key) && gameState.direction.y !== 1) {
        newDirection = { x: 0, y: -1 };
    }
    if (downKeys.includes(e.key) && gameState.direction.y !== -1) {
        newDirection = { x: 0, y: 1 };
    }
    if (leftKeys.includes(e.key) && gameState.direction.x !== 1) {
        newDirection = { x: -1, y: 0 };
    }
    if (rightKeys.includes(e.key) && gameState.direction.x !== -1) {
        newDirection = { x: 1, y: 0 };
    }

    if (newDirection.x !== 0 || newDirection.y !== 0) { //if newDirection is not 0, update nextDirection
        gameState.nextDirection = newDirection;
        
        // force update ONLY if direction CHANGED
        if (newDirection.x !== gameState.direction.x && newDirection.y !== gameState.direction.y) { 
            update(); 
            gameState.lastUpdateTime = performance.now();
        }
    }

    if (e.key === "Escape") {
        if (gameState.state === STATES.PLAYING) {
            gameState.state = STATES.PAUSED;
        } else if (gameState.state === STATES.PAUSED) {
            gameState.state = STATES.PLAYING;
        }
    }

    if (e.key === "x") { //testing the game over state
        gameState.state = STATES.GAME_OVER;
    }

    if (e.key === "Enter" && gameState.state === STATES.GAME_OVER) {
        initialization();
        startGame();
    }
});

document.addEventListener("keyup", (e) => {
    gameState.keys[e.key] = false;
});

requestAnimationFrame(gameLoop);

//nevermind the utils.js for now... apparently modules dont work in local file testing
function getChunkCoords(boardChunks) {
    return Array.from(boardChunks).map(chunk => {
        const [x, y] = chunk.split(',').map(Number);
        return { x, y };
    });
}

function getBounds(boardChunks) {
    const chunkCoords = getChunkCoords(boardChunks);

    const xValues = chunkCoords.map(coord => coord.x);
    const yValues = chunkCoords.map(coord => coord.y);

    return {
        minX: Math.min(...xValues),
        maxX: Math.max(...xValues),
        minY: Math.min(...yValues),
        maxY: Math.max(...yValues)
    };
}

function isInCamView(x, y) {
    const halfWidth = gameCanvas.width / 2;
    const halfHeight = gameCanvas.height / 2;
    const padding = BOARD_CHUNK_SIZE * UNIT_SIZE;
    return (
        x >= gameState.cameraOffset.x - halfWidth - padding &&
        x <= gameState.cameraOffset.x + halfWidth + padding &&
        y >= gameState.cameraOffset.y - halfHeight - padding &&
        y <= gameState.cameraOffset.y + halfHeight + padding);
}

//preset functions
function presetMyBabySnek() {
    document.getElementById("boardW").value = 4;
    document.getElementById("boardL").value = 4;
    document.getElementById("snakeSpeed").value = 200;
    document.getElementById("maxHealth").value = 8;
    document.getElementById("indicator").checked = true;
    document.getElementById("pauseOverview").checked = true;
}

function presetNewFav1() {
    document.getElementById("boardW").value = 1;
    document.getElementById("boardL").value = 1;
    document.getElementById("snakeSpeed").value = 200;
    document.getElementById("maxHealth").value = 8;
    document.getElementById("indicator").checked = true;
    document.getElementById("pauseOverview").checked = false;
}

function presetDefault() {
    document.getElementById("boardW").value = 3;
    document.getElementById("boardL").value = 3;
    document.getElementById("snakeSpeed").value = 200;
    document.getElementById("maxHealth").value = 4;
    document.getElementById("indicator").checked = true;
    document.getElementById("pauseOverview").checked = false;
}

function presetOriginal() {
    document.getElementById("boardW").value = 2;
    document.getElementById("boardL").value = 2;
    document.getElementById("snakeSpeed").value = 200;
    document.getElementById("maxHealth").value = 1;
    document.getElementById("indicator").checked = false;
    document.getElementById("pauseOverview").checked = false;
}

function presetImpossible() {
    document.getElementById("boardW").value = 2;
    document.getElementById("boardL").value = 1;
    document.getElementById("snakeSpeed").value = 50;
    document.getElementById("maxHealth").value = 1;
    document.getElementById("indicator").checked = true;
    document.getElementById("pauseOverview").checked = false;
}

function presetHard() {
    document.getElementById("boardW").value = 2;
    document.getElementById("boardL").value = 2;
    document.getElementById("snakeSpeed").value = 100;
    document.getElementById("maxHealth").value = 1;
    document.getElementById("indicator").checked = true;
    document.getElementById("pauseOverview").checked = false;
}