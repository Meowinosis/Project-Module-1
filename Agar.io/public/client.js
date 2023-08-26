let canvas;
let players = [];
let cells = [];
let cellPositions = [];
let socket;
let playerName = ""; // Initialize player name
let playerTargets = {};
let leaderboardData = [];
let movementInterval = 1000 / 60; // Default movement interval
let player = {
    id: "",       // Player ID from the server
    x: 0,         // Current x position
    y: 0,         // Current y position
    size: 30,     // Player size
    color: "",    // Player color
};

let cameraX = 0;
let cameraY = 0;
let gameWidth = 2000;
let gameHeight = 2000;

function setup() {
    canvas = createCanvas(gameWidth, gameHeight);
    // Listen for initPlayer event from the server
    socket = io(); // Connect to server
    socket.on("connect", () => {
        console.log("Client connected to server.");

        socket.on("initPlayer", (playerData) => {
            player = playerData; // Initialize the player object
            player.cameraX = player.x;
            player.cameraY = player.y;
            player.cameraWidth = player.size; // Set initial camera width
            player.cameraHeight = player.size;

            updateCamera(player.x, player.y);
            players.push(playerData); // Store received player data
        });

        socket.on("updatePlayers", (updatedPlayers) => {
            // Find the player object corresponding to the client's socket ID
            players = updatedPlayers;
            const currentPlayer = players.find(player => player.id === socket.id);

            if (currentPlayer) {
                // Update the camera position based on the current player's position
                updateCamera(currentPlayer.x, currentPlayer.y);

                cameraX = currentPlayer.cameraX - canvas.width / 2;
                cameraY = currentPlayer.cameraY - canvas.height / 2;
            }
        });
        socket.on("initCells", (initialCells) => {
            cells = initialCells;
        });

        // Listen for new cell data from the server
        socket.on("newCell", (newCell) => {
            cells.push(newCell);
        });

        socket.on("cellEaten", (eatenCellId) => {
            const eatenIndex = cells.findIndex(cell => cell.id === eatenCellId);
            if (eatenIndex !== -1) {
                cells.splice(eatenIndex, 1); // Remove the eaten cell from the array
                player.size += 0.3; // Increase the player's size
            }
        });

        socket.on("leaderBoards", (updatedPlayers) => {
            leaderboardData = updatedPlayers; // Update the leaderboard data
        });

        socket.on("initCells", (initialCellPositions) => {
            cellPositions = initialCellPositions;
        });


        socket.on("updateMovementInterval", (interval) => {
            movementInterval = interval;
        });


        // Show the prompt to enter the player's name
        showNamePrompt();

        // Listen for the "start game" button click event
        const startButton = document.getElementById("start-button");
        startButton.addEventListener("click", startGame);

        canvas.mouseMoved(handleMouseMoved);

        frameRate(60);
    });
}

function handleMouseMoved() {
    const currentPlayer = players.find(player => player.id === socket.id);

    if (currentPlayer) {
        const targetX = mouseX + cameraX;
        const targetY = mouseY + cameraY;

        currentPlayer.x = targetX;
        currentPlayer.y = targetY;

        socket.emit("playerMove", { x: currentPlayer.x, y: currentPlayer.y });
    }
}



function showNamePrompt() {
    // Display the name prompt
    const promptContainer = document.getElementById("name-popup");
    promptContainer.style.display = "block";
}
function startGame() {
    // Get the player's name from the input field
    playerName = document.getElementById("player-name-input").value;

    // Hide the name prompt
    const promptContainer = document.getElementById("name-popup");
    promptContainer.style.display = "none";

    // Connect to the server and emit player's data
    socket.emit("joinGame", { name: playerName });

}

function updateCamera(playerX, playerY) {
    // Update the camera's position based on the player's position
    cameraX = playerX - canvas.width / 2;
    cameraY = playerY - canvas.height / 2;

    // Clamp camera position to stay within the game boundaries
    cameraX = constrain(cameraX, 0, gameWidth - canvas.width);
    cameraY = constrain(cameraY, 0, gameHeight - canvas.height);
}

function draw() {
    // Clear the canvas
    background(255);
    const currentPlayer = players.find(player => player.id === socket.id);
    if (currentPlayer) {
        // Update the camera position based on the current player's position
        currentPlayer.cameraX = currentPlayer.x;
        currentPlayer.cameraY = currentPlayer.y;

        // Inside the camera position update block
        cameraX = currentPlayer.cameraX - canvas.width / 2;
        cameraY = currentPlayer.cameraY - canvas.height / 2;
    }

    for (const cell of cells) {
        fill(cell.color);
        noStroke();
        ellipse(cell.x - cameraX, cell.y - cameraY, cell.size);
    }

    for (const player of players) {
        fill(player.color);
        noStroke();
        ellipse(player.x - cameraX, player.y - cameraY, player.size);
        fill(0); // Set text color to black
        textSize(12);
        textAlign(CENTER);
        text(player.name, player.x - cameraX, player.y - cameraY - player.size - 5);
    }

    fill(255, 0, 0, 0);
    rect(
        width - 220 - cameraX + canvas.width / 2,
        10 - cameraY + canvas.height / 2,
        200,
        200
    );

    fill(0); // Set text color to black
    textSize(16);
    textAlign(RIGHT, CENTER);

    // Display the leaderboard data in the table
    for (let i = 0; i < leaderboardData.length; i++) {
        const playerData = leaderboardData[i];
        const rank = playerData.rank;
        const name = playerData.name;
        text(`${rank}. ${name}`, width - 30, 30 + i * 20);
    }
}



