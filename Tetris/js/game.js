const config = {
    type: Phaser.AUTO,
    width: 450,
    height: 680,
    parent: 'game',
    scene: GameScene,
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config); 