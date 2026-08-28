// Download the sample bank the engine plays from. It is not in the repo, so a fresh
// clone has no sound until this has run.
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const FILES = ['main.webm', 'main.mp3', 'main.json'];
const SOURCE = 'https://salsabeatmachine.org/assets/audio';
const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'audio');

await mkdir(target, { recursive: true });

for (const name of FILES) {
  const response = await fetch(`${SOURCE}/${name}`);
  if (!response.ok) {
    throw new Error(`${SOURCE}/${name}: ${response.status} ${response.statusText}`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  await writeFile(join(target, name), body);
  console.log(`${name}  ${(body.length / 1024).toFixed(0)} KB`);
}
