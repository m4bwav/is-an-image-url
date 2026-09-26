/*!
The extension list and lookup of is-image 3.1.0 (https://github.com/sindresorhus/is-image), inlined unchanged.
MIT License, Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com); the full notice is in LICENSE.
*/

// Kept exactly as is-image 3.1.0 has it (plan D3b), odd entries included: `fs`, `int`, `max` and `raw` count as images, and
// `PI1`, `PI2` and `PI3` are listed in upper case but looked up in lower case, so they never match. A change to this list
// changes captured answers, so it needs a decision entry and a minor release with its own golden file.
const extensions = new Set([
  '3dv',
  'ai',
  'amf',
  'art',
  'ase',
  'awg',
  'blp',
  'bmp',
  'bw',
  'cd5',
  'cdr',
  'cgm',
  'cit',
  'cmx',
  'cpt',
  'cr2',
  'cur',
  'cut',
  'dds',
  'dib',
  'djvu',
  'dxf',
  'e2d',
  'ecw',
  'egt',
  'emf',
  'eps',
  'exif',
  'fs',
  'gbr',
  'gif',
  'gpl',
  'grf',
  'hdp',
  'heic',
  'heif',
  'icns',
  'ico',
  'iff',
  'int',
  'inta',
  'jfif',
  'jng',
  'jp2',
  'jpeg',
  'jpg',
  'jps',
  'jxr',
  'lbm',
  'liff',
  'max',
  'miff',
  'mng',
  'msp',
  'nef',
  'nitf',
  'nrrd',
  'odg',
  'ota',
  'pam',
  'pbm',
  'pc1',
  'pc2',
  'pc3',
  'pcf',
  'pct',
  'pcx',
  'pdd',
  'pdn',
  'pgf',
  'pgm',
  'PI1',
  'PI2',
  'PI3',
  'pict',
  'png',
  'pnm',
  'pns',
  'ppm',
  'psb',
  'psd',
  'psp',
  'px',
  'pxm',
  'pxr',
  'qfx',
  'ras',
  'raw',
  'rgb',
  'rgba',
  'rle',
  'sct',
  'sgi',
  'sid',
  'stl',
  'sun',
  'svg',
  'sxd',
  'tga',
  'tif',
  'tiff',
  'v2d',
  'vnd',
  'vrml',
  'vtf',
  'wdp',
  'webp',
  'wmf',
  'x3d',
  'xar',
  'xbm',
  'xcf',
  'xpm',
]);

/**
The extension of the last path segment, without its dot, as `path.posix.extname(path).slice(1)` gives it: trailing slashes
are ignored, and a name that starts with its only dot (`.png`) has none. Only membership in the list matters, so the edge
cases where extname returns a bare dot need no special handling.
*/
function extensionOf(path: string): string {
  let end = path.length;
  while (end > 1 && path[end - 1] === '/') {
    end--;
  }

  const name = path.slice(path.lastIndexOf('/', end - 1) + 1, end);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1) : '';
}

/**
Whether a file path or URL path ends in an image file extension, compared in lower case: is-image 3.1.0's check.
*/
export function hasImageExtension(path: string): boolean {
  return extensions.has(extensionOf(path).toLowerCase());
}
