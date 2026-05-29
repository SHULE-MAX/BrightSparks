/**
 * resize-images.mjs  — Lighthouse image-sizing fix
 *
 * Generates properly-sized WebP variants for every oversized image flagged by
 * Lighthouse, writes them to  optimized/  (mirrors source paths), then prints
 * the exact <img> srcset snippets to paste into your HTML.
 *
 * Usage:
 *   node resize-images.mjs
 *
 * sharp is already available globally on this machine.
 * If you move this project, run:  npm install -g sharp
 */

import sharp from 'sharp';
import { mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT  = path.join(ROOT, 'optimized');

// ─── MANIFEST ────────────────────────────────────────────────────────────────
// widths  – pixel widths to generate (browser picks the best via srcset)
// square  – if true, also crops to square for circular avatar display
// sizes   – the HTML `sizes` attribute hint to print in the output
// ─────────────────────────────────────────────────────────────────────────────
const MANIFEST = [
  {
    src:    'logo.webp',
    widths: [100, 200],
    sizes:  '(max-width: 640px) 80px, 100px',
    note:   'Nav logo — height:50px desktop, 40px mobile',
  },
  {
    src:    'Director.webp',
    widths: [76, 152],
    square: true,
    sizes:  '(max-width: 640px) 62px, 76px',
    note:   'Management photo — 76×76 desktop, 62×62 mobile',
  },
  {
    src:    'head teacher.webp',
    widths: [76, 152],
    square: true,
    sizes:  '(max-width: 640px) 62px, 76px',
    note:   'Management photo — 76×76 desktop, 62×62 mobile',
  },
  {
    src:    'images/general/hero-main.webp',
    widths: [375, 663, 1326],
    sizes:  '(max-width: 640px) 375px, (max-width: 1024px) 663px, 663px',
    note:   'Hero main photo — 663px desktop, ~375px mobile',
  },
  {
    src:    'images/general/school-building.webp',
    widths: [375, 663, 1326],
    sizes:  '(max-width: 640px) 375px, (max-width: 1024px) 663px, 663px',
    note:   'Hero small photo — same responsive breakpoints',
  },
  {
    src:    'images/general/classroom.webp',
    widths: [375, 663, 1326],
    sizes:  '(max-width: 640px) 375px, (max-width: 1024px) 663px, 663px',
    note:   'Hero small photo — same responsive breakpoints',
  },
  {
    src:    'images/general/HeadKindergarten.webp',
    widths: [76, 152],
    square: true,
    sizes:  '(max-width: 640px) 62px, 76px',
    note:   'Management photo',
  },
  {
    src:    'images/general/Deputy Head Teacher.webp',
    widths: [76, 152],
    square: true,
    sizes:  '(max-width: 640px) 62px, 76px',
    note:   'Management photo',
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function ensureDir(dir) {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

function outPath(src, width) {
  const rel  = src.replace(/\\/g, '/');
  const dir  = path.dirname(rel);
  const base = path.basename(rel, path.extname(rel));
  const dest = dir === '.' ? `${base}-${width}w.webp` : `${dir}/${base}-${width}w.webp`;
  return path.join(OUT, dest);
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

console.log('\n🔄  Bright Sparks — Image Resizer\n');
await ensureDir(OUT);
await ensureDir(path.join(OUT, 'images', 'general'));

const htmlSnippets = [];

for (const entry of MANIFEST) {
  const srcFull = path.join(ROOT, entry.src);
  if (!existsSync(srcFull)) {
    console.warn(`  ⚠  Not found, skipping: ${entry.src}`);
    continue;
  }

  const origStat = await stat(srcFull);
  const meta     = await sharp(srcFull).metadata();
  console.log(`\n📷  ${entry.src}  (${meta.width}×${meta.height}, ${kb(origStat.size)})`);
  if (entry.note) console.log(`     ${entry.note}`);

  const generatedFiles = [];

  for (const w of entry.widths) {
    const destFull = outPath(entry.src, w);
    await ensureDir(path.dirname(destFull));

    let pipeline = sharp(srcFull);

    if (entry.square) {
      pipeline = pipeline.resize(w, w, { fit: 'cover', position: 'top' });
    } else {
      pipeline = pipeline.resize(w, null, { fit: 'inside', withoutEnlargement: true });
    }

    await pipeline.webp({ quality: 82, effort: 6 }).toFile(destFull);

    const outStat  = await stat(destFull);
    const saved    = origStat.size - outStat.size;
    const savedPct = Math.round((saved / origStat.size) * 100);

    const relDest  = path.relative(ROOT, destFull).replace(/\\/g, '/');
    console.log(`     → ${relDest.padEnd(55)} ${kb(outStat.size).padStart(9)}  (${savedPct}% smaller)`);
    generatedFiles.push({ w, path: relDest });
  }

  // Build srcset string
  const srcset = generatedFiles.map(f => `${f.path} ${f.w}w`).join(',\n          ');
  const fallback = generatedFiles[generatedFiles.length - 1].path;

  // Derive width/height hint for the HTML attribute (use smallest generated size)
  const smallMeta = await sharp(path.join(ROOT, generatedFiles[0].path.replace('optimized/', ''))).metadata().catch(() => null);

  htmlSnippets.push({ entry, srcset, fallback, generatedFiles });
}

// ─── PRINT HTML SNIPPETS ──────────────────────────────────────────────────────

console.log('\n\n' + '─'.repeat(72));
console.log('  HTML CHANGES  —  paste these <img> attributes into your HTML');
console.log('─'.repeat(72));

for (const { entry, srcset, fallback, generatedFiles } of htmlSnippets) {
  const smallest = generatedFiles[0];
  const largest  = generatedFiles[generatedFiles.length - 1];

  console.log(`\n// ${entry.src}`);
  console.log(`<img`);
  console.log(`  src="${fallback}"`);
  console.log(`  srcset="${srcset}"`);
  console.log(`  sizes="${entry.sizes}"`);
  if (entry.square) {
    console.log(`  width="${smallest.w}" height="${smallest.w}"`);
  }
  console.log(`  alt="…"  {/* keep existing alt text */}`);
  console.log(`  loading="lazy">`);
}

console.log('\n' + '─'.repeat(72));
console.log('✅  Done — all resized images are in  optimized/');
console.log('   Upload the optimized/ folder alongside your site files.');
console.log('   Then update your HTML <img> tags with the srcset snippets above.');
console.log('─'.repeat(72) + '\n');
