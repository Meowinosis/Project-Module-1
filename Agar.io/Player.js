// Player.js

class Player {
    constructor(id, x, y, size, color, name) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.directionX = 0; // Add directionX property
        this.directionY = 0;    // Add directionY property
        this.name = name;
        this.lastPositionUpdateTime = Date.now();
    }
}


module.exports = Player;
