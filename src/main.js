import * as Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';

const config = {
    type: Phaser.AUTO,
    width: 1280,   // Nova largura Widescreen
    height: 720,   // Nova altura
    parent: 'game-container',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: true // Mude para true se quiser ver as caixas de colisão
        }
    },
    scene: [ GameScene ]
};

const game = new Phaser.Game(config);