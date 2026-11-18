import { BlobReader, ZipReader } from '@zip.js/zip.js';
import { validateThemeCss } from './import';
import { readMetadataJs } from './metadata';
import { previewName, validatePreview, type ThemePreview } from './preview';
import type { Theme } from './schema';

function withFile<T>(name: string, read: () => T): T {
  try {
    return read();
  } catch (error) {
    throw new Error(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function validateThemeFiles(css: string, metadataSource: string, preview?: ThemePreview): Promise<Theme> {
  const metadata = withFile('metadata.js', () => readMetadataJs(metadataSource));
  withFile('theme.css', () => validateThemeCss(css));
  return { metadata, css, metadataSource, preview: preview && await validatePreview(preview.name, preview.dataUrl) };
}

export async function readThemeZip(file: Blob): Promise<Theme> {
  if (file.size > 4_000_000) throw new Error('Expected a theme ZIP up to 4 MB.');
  const zip = new ZipReader(new BlobReader(file), { useWebWorkers: false });
  try {
    const entries = await zip.getEntries();
    if (entries.length > 4) throw new Error('Expected one folder with theme.css, metadata.js, and at most one preview.');
    let folder: string | undefined;
    const seen = new Set<string>();
    const files = new Map<string, Uint8Array>();
    for (const entry of entries) {
      const name = entry.filename;
      const match = /^([a-z0-9][a-z0-9._-]*)\/([^/]+)?$/i.exec(name);
      if (!match || name.includes('\\') || seen.has(name.toLowerCase()) || entry.encrypted) {
        throw new Error(`${name}: expected a unique, unencrypted path inside one theme folder.`);
      }
      seen.add(name.toLowerCase());
      folder ??= match[1];
      if (match[1] !== folder) throw new Error(`${name}: expected exactly one theme folder.`);
      const filename = match[2];
      if (entry.directory && !filename) continue;
      if (entry.directory || !filename || (filename !== 'theme.css' && filename !== 'metadata.js' && !previewName.test(filename))) {
        throw new Error(`${name}: expected theme.css, metadata.js, or a preview image.`);
      }
      const limit = previewName.test(filename) ? 2_000_000 : filename === 'theme.css' ? 500_000 : 100_000;
      if (entry.uncompressedSize > limit) throw new Error(`${name}: file exceeds ${limit} bytes.`);
      const chunks: Uint8Array[] = [];
      let length = 0;
      await entry.getData(new WritableStream<Uint8Array>({ write(chunk) {
        length += chunk.length;
        if (length > limit) throw new Error(`${name}: extracted file exceeds ${limit} bytes.`);
        chunks.push(chunk);
      } }), { checkSignature: true, useWebWorkers: false }).catch((error: unknown) => {
        throw new Error(`${name}: corrupt or unreadable ZIP entry. ${String(error)}`);
      });
      const data = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
      files.set(filename, data);
    }
    const decode = (name: string) => withFile(name, () => {
      const data = files.get(name);
      if (!data) throw new Error('Required file is missing.');
      return new TextDecoder('utf-8', { fatal: true }).decode(data);
    });
    const images = [...files].filter(([name]) => previewName.test(name));
    if (images.length > 1) throw new Error('Expected at most one preview image.');
    const image = images[0];
    let binary = '';
    if (image) for (let start = 0; start < image[1].length; start += 8192) {
      binary += String.fromCharCode(...image[1].subarray(start, start + 8192));
    }
    const preview = image && {
      name: image[0],
      dataUrl: `data:image/${image[0].split('.').at(-1)!.toLowerCase().replace(/^jpg$/, 'jpeg')};base64,${btoa(binary)}`,
    };
    return await validateThemeFiles(decode('theme.css'), decode('metadata.js'), preview);
  } finally {
    await zip.close();
  }
}
