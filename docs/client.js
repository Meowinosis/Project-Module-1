let canvas;
const serverURL = "agario-clone.phonnguyen.repl.co";
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

const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;

function setup() {
    canvas = createCanvas(screenWidth, screenHeight);
    // Listen for initPlayer event from the server
    socket = io(); // Connect to server
    socket.on("connect", () => {
        console.log("Client connected to server.");

        socket.on("initPlayer", (playerData) => {
            player = playerData; // Initialize the player object
            players.push(playerData); // Store received player data
        });

        socket.emit("screenDimensions", { width: screenWidth, height: screenHeight });

        socket.on("updatePlayers", (updatedPlayers) => {
            // Find the player object corresponding to the client's socket ID
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
                player.size += 0.3; // Increase the player's size
            }
        });

        socket.on("removeCell", (cellId) => {
            // Find the index of the cell with the given cellId
            const cellIndex = cells.findIndex((cell) => cell.id === cellId);
            if (cellIndex !== -1) {
              cells.splice(cellIndex, 1); // Remove the cell from the array
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

        socket.on("playerEaten", () => {
            // Reload the page after a short delay
            setTimeout(() => {
                location.reload();
            }, 4000); // You can adjust the delay (in milliseconds) as needed
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
    const mouseXOnCanvas = event.clientX - canvas.elt.getBoundingClientRect().left;
    const mouseYOnCanvas = event.clientY - canvas.elt.getBoundingClientRect().top;

    socket.emit("playerMove", { x: mouseXOnCanvas, y: mouseYOnCanvas });
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
        fill(0); // Set text color to black
        textSize(12);
        textAlign(CENTER);
        text(player.name, player.x, player.y - player.size - 5);
    }

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

const dataToSend = {
    playerPosition: { x: player.x, y: player.y },
    gameState: { }
    // Add more relevant data fields as needed
  };

fetch(`${serverURL}/update-game-state`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(dataToSend)
  })
  .then(response => response.json())
  .then(responseData => {
    // Process the response from the server
  })
  .catch(error => {
    console.error("Error:", error);
  });

