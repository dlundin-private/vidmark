import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Compiler, CompilerOptions } from 'inkjs/full';
import type { Plugin } from 'vite';

/**
 * Compiles Ink stories at build time: `import story from './main.ink'` gives
 * the compiled story as a JSON string. INCLUDEd files resolve relative to the
 * importing file and are watched, so editing any .ink file reloads the game.
 */
export function ink(): Plugin {
  return {
    name: 'vidmark-ink',
    load(id) {
      if (!id.endsWith('.ink')) return null;
      const root = dirname(id);
      const included: string[] = [];
      const errors: string[] = [];
      const fileHandler = {
        ResolveInkFilename: (filename: string) => resolve(root, filename),
        LoadInkFileContents: (filename: string) => {
          included.push(filename);
          return readFileSync(filename, 'utf8');
        },
      };
      const options = new CompilerOptions(id, [], false, (message: string, type: number) => {
        // ErrorType: 0 = author message, 1 = warning, 2 = error.
        if (type === 2) errors.push(message);
        else if (type === 1) this.warn(message);
      }, fileHandler);

      let json: string;
      try {
        const story = new Compiler(readFileSync(id, 'utf8'), options).Compile();
        if (errors.length > 0 || !story) throw new Error('');
        json = story.ToJson() as string;
      } catch (e) {
        const detail = errors.length > 0 ? errors.join('\n') : String(e);
        throw new Error(`Ink compile failed for ${id}:\n${detail}`, { cause: e });
      }
      for (const file of included) this.addWatchFile(file);
      return `export default ${JSON.stringify(json)};`;
    },
  };
}
