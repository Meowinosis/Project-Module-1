const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const Player = require("./Player"); // Import Player class
const Cell = require("./Cell"); // Import Cell class

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname + "/public"));

const players = {}; // Stores player objects
const maxCellSize = 8;
const minCellSize = 4;
const sizeIncreaseRate = 0.5;
const positionUpdateInterval = 100;

function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
const canvasWidth = 2000;
const canvasHeight = 2000;
const initialNumCells =100;
const speed = 8;
// Initialize cells when the server starts
let cells = generateInitialCells(initialNumCells);

function generateInitialCells(numCells) {
  const initialCells = [];
  for (let i = 0; i < numCells; i++) {
    const cellX = Math.random() * canvasWidth;
    const cellY = Math.random() * canvasHeight;
    const cellSize =
      Math.floor(Math.random() * (maxCellSize - minCellSize)) + minCellSize;
    const cellColor = getRandomColor();
    const cellId = "cell" + Date.now() + i; // Generate a unique cell ID
    const cell = new Cell(cellId, cellX, cellY, cellSize, cellColor);
    initialCells.push(cell);
  }
  return initialCells;
}

function createRandomCell() {
  const cellColor = getRandomColor();
  const cellX = Math.random() * canvasWidth;
  const cellY = Math.random() * canvasHeight;
  const cellSize =
    Math.floor(Math.random() * (maxCellSize - minCellSize)) + minCellSize;
  const cellId = "cell" + Date.now(); // Generate a unique cell ID
  const cell = new Cell(cellId, cellX, cellY, cellSize, cellColor);
  cells.push(cell); // Add the cell to the array

  // Emit the new cell to connected players
  io.emit("newCell", cell);
}

function handlePlayerEating() {
  for (const playerId in players) {
    const player = players[playerId];
    for (let i = cells.length - 1; i >= 0; i--) {
      const cell = cells[i];
      const dx = cell.x - player.x;
      const dy = cell.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < player.size / 2 + cell.size / 2) {
        player.size += 0.3; // Increase player size slightly
        cells.splice(i, 1);
        // Remove the eaten cell
        io.emit("cellEaten", cell.id);
      }
    }
  }
}

function handlePlayerPlayerCollision() {
  for (const eaterId in players) {
    const eater = players[eaterId];
    for (const targetId in players) {
      if (eaterId !== targetId) {
        const target = players[targetId];
        const dx = target.x - eater.x;
        const dy = target.y - eater.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Adjust the buffer (hitbox) value as needed
        const buffer = 40;

        if (distance < (eater.size + target.size - buffer) / 2) {
          if (eater.size > target.size) {
            const growthAmount = target.size * sizeIncreaseRate;
            eater.size += growthAmount; // Increase eater size
            delete players[targetId]; // Remove target player
          }
        }
      }
    }
  }
}

const startingPlayerSize = 30; // Adjust as needed

setInterval(() => {
    // Update player positions based on target positions
    for (const player of Object.values(players)) {
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > speed) {
            const moveX = (dx / distance) * speed;
            const moveY = (dy / distance) * speed;
            player.x += moveX;
            player.y += moveY;
        } else {
            player.x = player.targetX;
            player.y = player.targetY;
        }
    }

    // Broadcast updated player positions to all clients
    io.emit("updatePlayers", Object.values(players).sort((a, b) => a.size - b.size));
}, 1000 / 60);
// Handle socket connections
io.on("connection", (socket) => {
  console.log("A player connected:", socket.id);

  socket.on("joinGame", (playerData) => {
    if (socket.movementInterval) {
      clearInterval(socket.movementInterval);
    }

    const { name } = playerData;
    // Generate random starting position within canvas boundaries
    const startingX = Math.random() * (canvasWidth - startingPlayerSize);
    const startingY = Math.random() * (canvasHeight - startingPlayerSize);

    const player = new Player(
      socket.id,
      startingX,
      startingY,
      startingPlayerSize,
      getRandomColor(),
      name
    );
    player.x = startingX;
    player.y = startingY;
    player.targetX = startingX;
    player.targetY = startingY;
    players[socket.id] = player; // Store player object

    // Emit new player's data to all existing players (including the new player)
    io.emit("initPlayer", player);

    // Emit all existing players' data to the new player
    for (const playerId in players) {
      if (playerId !== socket.id) {
        socket.emit("initPlayer", players[playerId]);
      }
    }

    socket.emit("initCells", cells);

    socket.broadcast.emit("initCells", cells);

    socket.emit("updatePlayers", Object.values(players));

    socket.on("playerMove", (mousePosition) => {
        const player = players[socket.id];
        if (player) {
            player.targetX = mousePosition.x;
            player.targetY = mousePosition.y;
        }
    });
    
  });

  setInterval(() => {
    // Sort players by size (largest to smallest)
    const sortedPlayers = Object.values(players).sort(
      (a, b) => b.size - a.size
    );

    // Emit updated player ranks and names to all clients
    io.emit(
      "leaderBoards",
      sortedPlayers.map((player, index) => ({
        rank: index + 1,
        name: player.name,
      }))
    );
  }, 1000 / 10);

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
    delete players[socket.id]; // Remove the player from the object
    io.emit("updatePlayers", Object.values(players));
    // Handle player and cell cleanup
    if (socket.movementInterval) {
      clearInterval(socket.movementInterval);
    }
  });
});

const cellGenerationInterval = 2000;
// Trigger cell generation at intervals
setInterval(createRandomCell, cellGenerationInterval);
setInterval(() => {
  handlePlayerEating();
  handlePlayerPlayerCollision();
}, 1000 / 10);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
