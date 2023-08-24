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


function setup() {
    canvas = createCanvas(2000, 2000);
    // Listen for initPlayer event from the server
    socket = io(); // Connect to server
    socket.on("connect", () => {
        console.log("Client connected to server.");

        socket.on("initPlayer", (playerData) => {
            player = playerData; // Initialize the player object
            players.push(playerData); // Store received player data
        });

        socket.on("updatePlayers", (updatedPlayers) => {
            // Find the player object corresponding to the client's socket ID
            players = updatedPlayers;

            // Find the current player's data
            const currentPlayer = players.find(player => player.id === socket.id);
        
            if (currentPlayer) {
                // Call the updateCamera function with the current player's position
                updateCamera(currentPlayer.x, currentPlayer.y, currentPlayer.size);
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

function handleMouseMoved(event) {
    const mouseX = event.clientX - canvas.elt.getBoundingClientRect().left;
    const mouseY = event.clientY - canvas.elt.getBoundingClientRect().top;


    // Adjust mouse position based on camera's position
    const adjustedMouseX = mouseX + cameraX;
    const adjustedMouseY = mouseY + cameraY;

    // Emit adjusted mouse position as player movement data to the server
    socket.emit("playerMove", { x: adjustedMouseX, y: adjustedMouseY });
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

function updateCamera(playerX, playerY,playerSize) {
    // Update the camera's position based on the player's position
    cameraX = playerX - canvas.width / 2+ playerSize / 2;
    cameraY = playerY - canvas.height / 2+ playerSize / 2;

    // Clamp camera position to stay within the game boundaries
    cameraX = constrain(cameraX, 0, gameWidth - canvas.width);
    cameraY = constrain(cameraY, 0, gameHeight - canvas.height);
}

function draw() {
    // Clear the canvas
    background(255);

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
        text(player.name, player.x- cameraX, player.y  - cameraY - player.size - 5); // Adjust offset as needed
    }

    fill(255, 0, 0, 0);
    rect(width - 220, 10, 200, 200); // Position and size of the leaderboard table

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



