import { BlobReader, BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import { createBackup } from './backup';

function uniqueName(name: string, alternative: string, used: Set<string>): string {
  const candidates = [name, alternative];
  for (let number = 2; used.has(candidates.at(-1)!.toLowerCase()); number++) {
    const dot = alternative.lastIndexOf('.');
    candidates.push(dot > 0 ? `${alternative.slice(0, dot)}-${number}${alternative.slice(dot)}` : `${alternative}-${number}`);
  }
  const chosen = candidates.find((candidate) => !used.has(candidate.toLowerCase()))!;
  used.add(chosen.toLowerCase());
  return chosen;
}

export async function exportModules(): Promise<Blob> {
  const backup = await createBackup();
  const zip = new ZipWriter(new BlobWriter('application/zip'), { useWebWorkers: false });
  const files = new Set<string>();
  const folders = new Set<string>();
  try {
    for (const { id, module: installed, retained } of backup.plugins) {
      const module = installed ?? retained;
      if (!module) continue;
      const safe = /^[\w.-]+\.js$/i.test(module.name) ? module.name : `${id}.js`;
      await zip.add(`plugins/${uniqueName(safe, `${id}.js`, files)}`, new TextReader(module.source));
    }
    for (const { id, module: installed, retained } of backup.themes) {
      const module = installed ?? retained;
      if (!module) continue;
      const safe = module.folder && /^[a-z0-9][a-z0-9._-]*$/i.test(module.folder) ? module.folder : id;
      const path = `themes/${uniqueName(safe, id, folders)}`;
      await zip.add(`${path}/theme.css`, new TextReader(module.css));
      await zip.add(`${path}/metadata.js`, new TextReader(module.metadataSource ?? `export default ${JSON.stringify(module.metadata, null, 2)};\n`));
      if (module.preview) {
        const data = Uint8Array.from(atob(module.preview.dataUrl.split(',')[1]!), (char) => char.charCodeAt(0));
        await zip.add(`${path}/${module.preview.name}`, new BlobReader(new Blob([data])));
      }
    }
    return await zip.close();
  } catch (error) {
    await zip.close().catch(() => {});
    throw error;
  }
}
