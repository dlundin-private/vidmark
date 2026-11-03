import jarnfors from '../../assets/maps/jarnfors.json';
import kallsjo from '../../assets/maps/kallsjo.json';
import type { TiledJson } from './tiledMap';

/** Every map in the game, by the name GameState.map uses. */
export const MAPS: Record<string, TiledJson> = {
  kallsjo: kallsjo as TiledJson,
  jarnfors: jarnfors as TiledJson,
};

export function mapJson(name: string): TiledJson {
  return MAPS[name] ?? MAPS.kallsjo!;
}
