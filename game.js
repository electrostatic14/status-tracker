// Game Logic for Surgery Game

// Initializing game variables
let gameState = {
    score: 0,
    isGameOver: false,
    playerHealth: 100
};

// Function to initialize the game
function initializeGame() {
    gameState.score = 0;
    gameState.isGameOver = false;
    gameState.playerHealth = 100;
    console.log("Game Initialized");
}

// Function to handle events
function handleEvent(eventType) {
    switch(eventType) {
        case 'startGame':
            initializeGame();
            startGameLoop();
            break;
        case 'playerAction':
            playerAction();
            break;
        case 'gameOver':
            endGame();
            break;
        default:
            console.log("Unknown event");
    }
}

// Game loop
function startGameLoop() {
    const gameLoop = setInterval(() => {
        if (gameState.isGameOver) {
            clearInterval(gameLoop);
            console.log("Game Over");
        } else {
            updateGame();
        }
    }, 1000); // Run game loop every second
}

// Update game state
function updateGame() {
    // Simulate game state updates
    gameState.score += Math.floor(Math.random() * 10);
    console.log(`Score: ${gameState.score}, Health: ${gameState.playerHealth}`);
}

// Handle player action
function playerAction() {
    // Example player action affecting score and health
    const actionSuccess = Math.random() > 0.5;
    if (actionSuccess) {
        gameState.score += 20;
    } else {
        gameState.playerHealth -= 10;
    }
    if (gameState.playerHealth <= 0) {
        handleEvent('gameOver');
    }
    console.log(`Action taken. Score: ${gameState.score}, Health: ${gameState.playerHealth}`);
}

// End game
function endGame() {
    gameState.isGameOver = true;
    console.log(`Final Score: ${gameState.score}`);
}

// A test call to start the game
handleEvent('startGame');
