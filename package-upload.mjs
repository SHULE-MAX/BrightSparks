#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
 *  BRIGHT SPARKS — PACK THE NEWS FILES FOR cPANEL
 *
 *  WHAT THIS IS FOR
 *  After build-news.mjs has written the article pages, they have to be put on
 *  the server. cPanel's File Manager cannot upload a folder, so the files go up
 *  as one zip and are extracted there.
 *
 *  WHY NOT JUST RIGHT-CLICK → "SEND TO → COMPRESSED FOLDER"
 *  Windows writes the paths inside the zip with backslashes. The server runs
 *  Linux, where a backslash is an ordinary character in a name, not a folder
 *  separator — so extracting produces a single file actually called
 *  "news\some-article\index.html" sitting in the web root, no news folder is
 *  ever made, and every article gives a 404. The zip written here uses forward
 *  slashes, which is what the format requires and what the server expects.
 *
 *  HOW TO RUN IT
 *      node build-news.mjs        first — write the pages
 *      node package-upload.mjs    then  — bundle them
 *
 *  Upload the resulting news-upload.zip into public_html and choose Extract.
 *
 *  THE ZIP IS NOW THE FALLBACK, NOT THE USUAL ROUTE
 *  The Build news pages workflow sends these same files to the server over
 *  cPanel's HTTPS API on every run, so nobody has to remember to upload
 *  anything. It uses this file's list rather than keeping a second copy of it:
 *
 *      node package-upload.mjs --stage _deploy
 *
 *  copies exactly what the zip would contain into _deploy/, laid out the way it
 *  has to land on the server, and the workflow uploads that folder. Keep the
 *  zip for the days the workflow cannot run and a story has to go up by hand.
 * ════════════════════════════════════════════════════════════════════════════ */

import { readFile, writeFile, readdir, stat, mkdir, copyFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = 'news-upload.zip';

/* --stage <folder> copies the files instead of zipping them. */
const STAGE_ARG = process.argv.indexOf('--stage');
const STAGE_DIR = STAGE_ARG === -1 ? null : process.argv[STAGE_ARG + 1] || '_deploy';

/* Everything the news pages need on the server, and nothing else — no build
   scripts, no workflow files, nothing that only matters on this machine. */
const LOOSE_FILES = [
  'news.html',
  'bsjs-data.js',
  'news-comments.js',
  'news-article.css',
  'privacy-policy.html',
  'editorial-policy.html',
  'policy.css',
  'robots.txt',
  'sitemap.xml',
  'news-sitemap.xml',
  'feed.xml'
];
const FOLDERS = ['news'];

// ── CRC-32, which every entry in a zip has to carry ────────────────────────
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i++) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/* Zip stores the clock as two 16-bit numbers in the format MS-DOS used. */
function dosStamp(date) {
  const time = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() / 2)) & 0xffff;
  const day = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;
  return { time, day };
}

const missing = [];

async function collect() {
  const files = [];

  for (const name of LOOSE_FILES) {
    if (existsSync(path.join(ROOT, name))) files.push(name);
    else {
      missing.push(name);
      console.warn(`  ! ${name} is missing — run build-news.mjs first.`);
    }
  }

  for (const folder of FOLDERS) {
    const base = path.join(ROOT, folder);
    if (!existsSync(base)) continue;

    const walk = async (dir) => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        // Forward slashes, always — this is the whole point of the file.
        else files.push(path.relative(ROOT, full).split(path.sep).join('/'));
      }
    };
    await walk(base);
  }

  return files;
}

/* Lays the files out in a folder of their own, ready to be uploaded as-is.
 *
 * The deploy that reads this folder mirrors it: anything it put on the server
 * before and cannot find here now is deleted there. That is what retires the
 * page of a withdrawn story — and it is also why a half-filled folder would be
 * destructive, so a missing file stops the run rather than quietly shipping a
 * short list. */
async function stage(files) {
  const target = path.resolve(ROOT, STAGE_DIR);

  if (target === ROOT || !target.startsWith(ROOT + path.sep)) {
    console.error(`\n  Refusing to stage into ${target} — it must be a folder inside the project.\n`);
    process.exit(1);
  }

  if (missing.length) {
    console.error(`\n  ${missing.length} file(s) missing, so nothing was staged. Deploying an`);
    console.error('  incomplete folder would delete the missing files from the server.\n');
    process.exit(1);
  }

  await rm(target, { recursive: true, force: true });
  for (const name of files) {
    const to = path.join(target, name);
    await mkdir(path.dirname(to), { recursive: true });
    await copyFile(path.join(ROOT, name), to);
  }

  console.log(`\n  ${STAGE_DIR}/ — ${files.length} files ready to upload\n`);
  for (const name of files) console.log(`    ${name}`);
  console.log('');
}

async function main() {
  const files = await collect();
  if (!files.length) {
    console.error('\n  Nothing to pack. Run "node build-news.mjs" first.\n');
    process.exit(1);
  }

  if (STAGE_DIR) return stage(files);

  const locals = [];
  const central = [];
  let offset = 0;

  for (const name of files) {
    const contents = await readFile(path.join(ROOT, name));
    const packed = deflateRawSync(contents, { level: 9 });
    const nameBytes = Buffer.from(name, 'utf8');
    const crc = crc32(contents);
    const { time, day } = dosStamp((await stat(path.join(ROOT, name))).mtime);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);   // local file header
    local.writeUInt16LE(20, 4);           // version needed
    local.writeUInt16LE(0x0800, 6);       // names are UTF-8
    local.writeUInt16LE(8, 8);            // deflated
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(contents.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);           // no extra field
    locals.push(local, nameBytes, packed);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);   // central directory header
    entry.writeUInt16LE(20, 4);           // version made by
    entry.writeUInt16LE(20, 6);           // version needed
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(time, 12);
    entry.writeUInt16LE(day, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(packed.length, 20);
    entry.writeUInt32LE(contents.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt16LE(0, 30);           // extra
    entry.writeUInt16LE(0, 32);           // comment
    entry.writeUInt16LE(0, 34);           // disk number
    entry.writeUInt16LE(0, 36);           // internal attributes
    entry.writeUInt32LE(0o644 << 16, 38); // readable by the web server
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBytes);

    offset += local.length + nameBytes.length + packed.length;
  }

  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);       // end of central directory
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  const zip = Buffer.concat([...locals, directory, end]);
  await writeFile(path.join(ROOT, OUTPUT), zip);

  console.log(`\n  ${OUTPUT} — ${files.length} files, ${(zip.length / 1024).toFixed(0)} KB\n`);
  for (const name of files) console.log(`    ${name}`);
  console.log('\n  Upload it into public_html and choose Extract.\n');
}

main().catch((error) => {
  console.error(`\n  Could not pack the files: ${error.message}\n`);
  process.exit(1);
});
