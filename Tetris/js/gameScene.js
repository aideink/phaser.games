class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.BLOCK_SIZE = 30;
        this.GRID_WIDTH = 10;
        this.GRID_HEIGHT = 20;
        this.GAME_PADDING = 40; // Add padding for better visibility
        this.grid = [];
        this.score = 0;
        console.log('GameScene constructed'); // Debug message
    }

    preload() {
        console.log('GameScene preload');
        // Create particle texture
        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('particle', 8, 8);
        graphics.destroy();
    }

    create() {
        console.log('GameScene create');
        
        // Initialize sounds with dummy functions
        this.sounds = {
            rotate: { play: () => {} },
            move: { play: () => {} },
            drop: { play: () => {} },
            clear: { play: () => {} },
            gameover: { play: () => {} }
        };

        // Calculate game dimensions
        const gameWidth = this.GRID_WIDTH * this.BLOCK_SIZE;
        const gameHeight = this.GRID_HEIGHT * this.BLOCK_SIZE;
        const totalWidth = gameWidth + 150; // Include space for side panel
        const totalHeight = gameHeight + this.GAME_PADDING * 2;

        // Add background gradient first - make it lighter
        const gradient = this.add.graphics();
        gradient.fillGradientStyle(0x2a2a4e, 0x2a2a4e, 0x26314e, 0x26314e, 1);
        gradient.fillRect(0, 0, totalWidth, totalHeight);

        // Initialize grid
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                this.grid[y][x] = null;
            }
        }

        // Create graphics for the game board
        this.graphics = this.add.graphics();
        
        // Create particle emitter
        this.particles = this.add.particles('particle');
        this.emitter = this.particles.createEmitter({
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 800,
            on: false
        });

        // Add game container to center everything with more space for side panel
        this.gameContainer = this.add.container(
            this.GAME_PADDING, 
            this.GAME_PADDING
        );
        
        // Add background panel with lighter color
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.5);
        bg.fillRoundedRect(
            0, 0, 
            gameWidth, 
            gameHeight, 
            16
        );
        this.gameContainer.add(bg);
        
        // Add side panel with lighter color - adjust position
        this.sidePanel = this.add.graphics();
        this.sidePanel.fillStyle(0x000000, 0.5);
        this.sidePanel.fillRoundedRect(
            this.GAME_PADDING + gameWidth + 20, // Adjust X position
            this.GAME_PADDING, // Align with game container
            100, 
            gameHeight,
            16
        );
        
        // Adjust text positions to match new side panel position
        this.nextPieceText = this.add.text(
            this.GAME_PADDING + gameWidth + 35, // Adjust X position
            this.GAME_PADDING + 10, // Align with game container
            'NEXT', 
            { fontFamily: 'Arial', fontSize: '20px', fill: '#ffffff' }
        );
        
        // Update preview piece position
        this.previewX = this.GAME_PADDING + gameWidth + 45;
        this.previewY = this.GAME_PADDING + 50;
        
        // Adjust score position
        this.scoreText = this.add.text(
            this.GAME_PADDING + gameWidth + 35, // Adjust X position
            this.GAME_PADDING + 120, // Align with game container
            'SCORE\n0', 
            { fontFamily: 'Arial', fontSize: '20px', fill: '#ffffff', align: 'center' }
        );
        
        // Adjust level position
        this.levelText = this.add.text(
            this.GAME_PADDING + gameWidth + 35, // Adjust X position
            this.GAME_PADDING + 200, // Align with game container
            'LEVEL\n1', 
            { fontFamily: 'Arial', fontSize: '20px', fill: '#ffffff', align: 'center' }
        );

        // Initialize game state
        this.level = 1;
        this.score = 0;
        this.linesCleared = 0;
        this.gameSpeed = 1000;
        this.isGameOver = false;

        // Set up input
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Initialize current piece and next piece
        this.currentPiece = null;
        this.currentPiecePosition = { x: 0, y: 0 };
        this.nextPiece = null;
        
        // Spawn first piece
        this.spawnNewPiece();
        
        // Draw initial grid
        this.drawGrid();
        
        // Initialize game loop timer
        this.gameTimer = this.time.addEvent({
            delay: this.gameSpeed,
            callback: this.moveDown,
            callbackScope: this,
            loop: true
        });

        // Update game configuration
        const config = {
            width: totalWidth,
            height: totalHeight,
            parent: 'game'
        };
        this.scale.resize(totalWidth, totalHeight);
    }

    generateNextPiece() {
        const shapes = Object.keys(SHAPES);
        const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
        this.nextPiece = SHAPES[randomShape];
        this.drawNextPiece();
    }

    drawNextPiece() {
        // Clear previous preview
        if (this.nextPieceGraphics) {
            this.nextPieceGraphics.clear();
        } else {
            this.nextPieceGraphics = this.add.graphics();
        }

        this.nextPiece.shape.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell) {
                    this.drawPreviewBlock(
                        this.previewX + x * 20,
                        this.previewY + y * 20,
                        this.nextPiece.color,
                        this.nextPieceGraphics
                    );
                }
            });
        });
    }

    drawPreviewBlock(x, y, color, graphics) {
        const size = 18;
        graphics.fillStyle(color, 1);
        graphics.fillRect(x, y, size, size);
        graphics.lineStyle(1, 0xffffff, 0.3);
        graphics.strokeRect(x, y, size, size);
    }

    spawnNewPiece() {
        if (this.nextPiece === null) {
            this.generateNextPiece();
        }
        
        this.currentPiece = this.nextPiece;
        this.currentPiecePosition = {
            x: Math.floor(this.GRID_WIDTH / 2) - Math.floor(this.currentPiece.shape[0].length / 2),
            y: 0
        };

        // Check for game over
        if (!this.canMove(0, 0)) {
            this.gameOver();
            return;
        }

        this.generateNextPiece();
        this.drawGrid();
    }

    gameOver() {
        this.isGameOver = true;
        this.sounds.gameover.play();
        this.gameTimer.remove();

        const gameOverText = this.add.text(
            this.gameContainer.x + (this.GRID_WIDTH * this.BLOCK_SIZE) / 2,
            this.gameContainer.y + (this.GRID_HEIGHT * this.BLOCK_SIZE) / 2,
            'GAME OVER\nClick to restart',
            {
                fontFamily: 'Arial',
                fontSize: '40px',
                fill: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);

        // Add restart functionality
        this.input.on('pointerdown', () => {
            if (this.isGameOver) {
                this.scene.restart();
            }
        });
    }

    drawGrid() {
        this.graphics.clear();

        // Draw grid lines with higher opacity and lighter color
        this.graphics.lineStyle(1, 0x666666, 0.8);
        
        // Adjust the grid position to match the container
        const offsetX = this.gameContainer.x;
        const offsetY = this.gameContainer.y;

        for (let x = 0; x <= this.GRID_WIDTH; x++) {
            this.graphics.moveTo(offsetX + x * this.BLOCK_SIZE, offsetY);
            this.graphics.lineTo(offsetX + x * this.BLOCK_SIZE, offsetY + this.GRID_HEIGHT * this.BLOCK_SIZE);
        }
        for (let y = 0; y <= this.GRID_HEIGHT; y++) {
            this.graphics.moveTo(offsetX, offsetY + y * this.BLOCK_SIZE);
            this.graphics.lineTo(offsetX + this.GRID_WIDTH * this.BLOCK_SIZE, offsetY + y * this.BLOCK_SIZE);
        }
        this.graphics.strokePath();

        // Draw placed blocks with gradient and glow
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                if (this.grid[y][x]) {
                    this.drawBlock(x, y, this.grid[y][x]);
                }
            }
        }

        // Draw current piece with shadow
        if (this.currentPiece) {
            // Draw shadow
            const shadowY = this.findDropPosition();
            this.currentPiece.shape.forEach((row, y) => {
                row.forEach((cell, x) => {
                    if (cell) {
                        this.drawShadowBlock(
                            this.currentPiecePosition.x + x,
                            shadowY + y
                        );
                    }
                });
            });

            // Draw actual piece
            this.currentPiece.shape.forEach((row, y) => {
                row.forEach((cell, x) => {
                    if (cell) {
                        this.drawBlock(
                            this.currentPiecePosition.x + x,
                            this.currentPiecePosition.y + y,
                            this.currentPiece.color
                        );
                    }
                });
            });
        }
    }

    drawBlock(x, y, color) {
        const blockX = this.gameContainer.x + x * this.BLOCK_SIZE;
        const blockY = this.gameContainer.y + y * this.BLOCK_SIZE;
        const size = this.BLOCK_SIZE - 2;

        // Draw block shadow
        this.graphics.fillStyle(0x000000, 0.3);
        this.graphics.fillRect(blockX + 2, blockY + 2, size, size);

        // Draw main block with higher opacity
        this.graphics.fillStyle(color, 1);
        this.graphics.fillRect(blockX + 1, blockY + 1, size, size);

        // Add stronger highlight
        this.graphics.lineStyle(2, 0xffffff, 0.4);
        this.graphics.beginPath();
        this.graphics.moveTo(blockX + 1, blockY + size);
        this.graphics.lineTo(blockX + 1, blockY + 1);
        this.graphics.lineTo(blockX + size, blockY + 1);
        this.graphics.strokePath();

        // Add stronger shadow edges
        this.graphics.lineStyle(2, 0x000000, 0.4);
        this.graphics.beginPath();
        this.graphics.moveTo(blockX + size, blockY + 1);
        this.graphics.lineTo(blockX + size, blockY + size);
        this.graphics.lineTo(blockX + 1, blockY + size);
        this.graphics.strokePath();
    }

    drawShadowBlock(x, y) {
        const blockX = this.gameContainer.x + x * this.BLOCK_SIZE;
        const blockY = this.gameContainer.y + y * this.BLOCK_SIZE;
        const size = this.BLOCK_SIZE - 2;

        // Make shadow block more visible
        this.graphics.fillStyle(0xffffff, 0.15);
        this.graphics.fillRect(blockX + 1, blockY + 1, size, size);
        this.graphics.lineStyle(1, 0xffffff, 0.3);
        this.graphics.strokeRect(blockX + 1, blockY + 1, size, size);
    }

    findDropPosition() {
        let dropY = this.currentPiecePosition.y;
        while (this.canMove(0, dropY - this.currentPiecePosition.y + 1)) {
            dropY++;
        }
        return dropY;
    }

    moveDown() {
        if (this.canMove(0, 1)) {
            this.currentPiecePosition.y++;
            this.drawGrid();
        } else {
            this.placePiece();
            this.clearLines();
            this.spawnNewPiece();
        }
    }

    canMove(offsetX, offsetY) {
        return this.currentPiece.shape.every((row, y) => {
            return row.every((cell, x) => {
                if (!cell) return true;
                const newX = this.currentPiecePosition.x + x + offsetX;
                const newY = this.currentPiecePosition.y + y + offsetY;
                return (
                    newX >= 0 &&
                    newX < this.GRID_WIDTH &&
                    newY < this.GRID_HEIGHT &&
                    (!this.grid[newY] || !this.grid[newY][newX])
                );
            });
        });
    }

    placePiece() {
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell) {
                    const gridY = this.currentPiecePosition.y + y;
                    const gridX = this.currentPiecePosition.x + x;
                    if (gridY >= 0 && gridY < this.GRID_HEIGHT) {
                        this.grid[gridY][gridX] = this.currentPiece.color;
                    }
                }
            });
        });
    }

    clearLines() {
        let linesCleared = 0;
        for (let y = this.GRID_HEIGHT - 1; y >= 0; y--) {
            if (this.grid[y].every(cell => cell !== null)) {
                // Particle effects
                this.grid[y].forEach((cell, x) => {
                    this.emitter.setPosition(
                        this.gameContainer.x + x * this.BLOCK_SIZE + this.BLOCK_SIZE/2,
                        this.gameContainer.y + y * this.BLOCK_SIZE + this.BLOCK_SIZE/2
                    );
                    this.emitter.setTint(cell);
                    this.emitter.explode(5);
                });

                // Play clear sound
                this.sounds.clear.play();

                // Remove line with animation
                this.tweens.add({
                    targets: this.graphics,
                    alpha: { from: 1, to: 0 },
                    duration: 200,
                    onComplete: () => {
                        this.grid.splice(y, 1);
                        this.grid.unshift(Array(this.GRID_WIDTH).fill(null));
                        this.graphics.alpha = 1;
                        this.drawGrid();
                    }
                });

                linesCleared++;
                this.linesCleared++;
                
                // Update score and level
                this.score += linesCleared * 100 * this.level;
                this.scoreText.setText(`SCORE\n${this.score}`);
                
                // Level up every 10 lines
                const newLevel = Math.floor(this.linesCleared / 10) + 1;
                if (newLevel > this.level) {
                    this.levelUp(newLevel);
                }
            }
        }
    }

    levelUp(newLevel) {
        this.level = newLevel;
        this.levelText.setText(`LEVEL\n${this.level}`);
        
        // Increase game speed
        this.gameSpeed = Math.max(100, 1000 - (this.level - 1) * 100);
        this.gameTimer.reset({
            delay: this.gameSpeed,
            callback: this.moveDown,
            callbackScope: this,
            loop: true
        });

        // Add level up animation
        this.tweens.add({
            targets: this.levelText,
            scale: { from: 1, to: 1.5 },
            duration: 200,
            yoyo: true
        });
    }

    update() {
        if (this.isGameOver) return;

        if (Phaser.Input.Keyboard.JustDown(this.cursors.left) && this.canMove(-1, 0)) {
            this.currentPiecePosition.x--;
            this.sounds.move.play();
            this.drawGrid();
        }
        if (Phaser.Input.Keyboard.JustDown(this.cursors.right) && this.canMove(1, 0)) {
            this.currentPiecePosition.x++;
            this.sounds.move.play();
            this.drawGrid();
        }
        if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            this.moveDown();
        }
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.rotatePiece();
        }
        // Add hard drop with spacebar
        if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE))) {
            this.hardDrop();
        }
    }

    hardDrop() {
        while (this.canMove(0, 1)) {
            this.currentPiecePosition.y++;
        }
        this.sounds.drop.play();
        this.placePiece();
        this.clearLines();
        this.spawnNewPiece();
    }

    rotatePiece() {
        const rotated = [];
        for (let i = 0; i < this.currentPiece.shape[0].length; i++) {
            rotated[i] = [];
            for (let j = 0; j < this.currentPiece.shape.length; j++) {
                rotated[i][j] = this.currentPiece.shape[this.currentPiece.shape.length - 1 - j][i];
            }
        }

        const originalShape = this.currentPiece.shape;
        this.currentPiece.shape = rotated;

        if (!this.canMove(0, 0)) {
            this.currentPiece.shape = originalShape;
        } else {
            this.sounds.rotate.play();
            this.drawGrid();
        }
    }
} 