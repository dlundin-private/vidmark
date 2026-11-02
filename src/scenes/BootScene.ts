import Phaser from 'phaser';
import { TILE_HEIGHT, TILE_WIDTH } from '../config';

/** Every PNG in assets/sprites/, keyed by file name without extension. */
const SPRITE_URLS = import.meta.glob<string>('../../assets/sprites/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Texture key of the ground tileset (assets/sprites/tiles.png), loaded as a spritesheet. */
export const TILESET_KEY = 'tiles';

function spriteKey(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1, -'.png'.length);
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const [path, url] of Object.entries(SPRITE_URLS)) {
      const key = spriteKey(path);
      if (key === TILESET_KEY) {
        this.load.spritesheet(key, url, { frameWidth: TILE_WIDTH, frameHeight: TILE_HEIGHT });
      } else {
        this.load.image(key, url);
      }
    }
  }

  create(): void {
    this.scene.start('World');
  }
}
