import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
await mkdir(new URL('../dist/', import.meta.url));
execFileSync(process.execPath, [fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url)), '--emitDeclarationOnly'], { cwd: root, stdio: 'inherit' });
for (const format of ['esm', 'cjs']) await build({
  absWorkingDir: root, entryPoints: ['src/index.ts'], bundle: true, platform: 'neutral',
  format, target: 'es2022', outfile: `dist/index.${format === 'esm' ? 'js' : 'cjs'}`,
  sourcemap: true,
});
await copyFile(new URL('../dist/index.d.ts', import.meta.url), new URL('../dist/index.d.cts', import.meta.url));
