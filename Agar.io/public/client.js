let canvas;
let players = [];
let cells = [];
let cellPositions = [];
let socket;
let playerName = ""; // Initialize player name
let playerTargets = {};
let leaderboardData = [];

let player = {
    id: "",       // Player ID from the server
    x: 0,         // Current x position
    y: 0,         // Current y position
    size: 30,     // Player size
    color: "",    // Player color
};

function setup() {
    canvas = createCanvas(800, 600);
    // Listen for initPlayer event from the server
    socket = io(); // Connect to server
    socket.on("connect", () => {
        console.log("Client connected to server.");

        socket.on("initPlayer", (playerData) => {
            players.push(playerData); // Store received player data
        });

        socket.on("updatePlayers", (updatedPlayers) => {
            players = updatedPlayers;
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
                // Optionally, you can adjust the player size here as well
                player.size += 1; // Increase the player's size
            }
        });

        socket.on("leaderBoards", (updatedPlayers) => {
            leaderboardData = updatedPlayers; // Update the leaderboard data
        });

        socket.on("initCells", (initialCellPositions) => {
            cellPositions = initialCellPositions;
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

    // Emit player movement data to the server
    socket.emit("playerMove", { x: mouseX, y: mouseY });
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

function draw() {
    // Clear the canvas
    background(255);

    for (const cell of cells) {
        fill(cell.color);
        noStroke();
        ellipse(cell.x, cell.y, cell.size);
    }

    for (const player of players) {
        fill(player.color);
        noStroke();
        ellipse(player.x, player.y, player.size);

        // Display player's name above their character
        fill(0); // Set text color to black
        textSize(12);
        textAlign(CENTER);
        text(player.name, player.x, player.y - player.size -5); // Adjust offset as needed
    }

    fill(255); // Set background color
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

