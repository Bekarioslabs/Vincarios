'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const BRAND_DIR = path.join(__dirname, '..', 'src', 'renderer', 'assets', 'brand');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  const source = await fs.readFile(path.join(BRAND_DIR, 'vincarios-logo-dark.svg'));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(SIZES.length, 4);
  const directory = Buffer.alloc(SIZES.length * 16);
  const frames = [];
  let offset = header.length + directory.length;

  // ICO directories use a zero dimension byte for a 256px PNG frame.
  for (const [index, size] of SIZES.entries()) {
    const png = await sharp(source).resize(size, size).ensureAlpha().png().toBuffer();
    const entry = index * 16;
    directory[entry] = size % 256;
    directory[entry + 1] = size % 256;
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(png.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    frames.push(png);
    offset += png.length;
  }

  const target = path.join(BRAND_DIR, 'vincarios-icon.ico');
  await fs.writeFile(target, Buffer.concat([header, directory, ...frames]));
  console.log('Generated ' + target + ' from vincarios-logo-dark.svg (' + SIZES.join(', ') + 'px).');
}

main().catch((error) => {
  console.error('Could not generate the application icon:', error.message);
  process.exitCode = 1;
});
