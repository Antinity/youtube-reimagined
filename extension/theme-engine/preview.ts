export interface ThemePreview {
  name: string;
  dataUrl: string;
}

export const fallbackPreview = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><path fill="#aaa" d="M0 0h400v300H0z"/><path fill="#666" d="M0 300 400 0v300z"/></svg>',
);

export const previewName = /^preview\.(png|jpe?g|webp)$/i;

export async function validatePreview(name: string, dataUrl: string): Promise<ThemePreview> {
  const type = name.match(previewName)?.[1]?.toLowerCase();
  const mime = type === 'jpg' ? 'jpeg' : type;
  if (!mime || !dataUrl.startsWith(`data:image/${mime};base64,`) || dataUrl.length > 2_800_000) {
    throw new Error(`${name}: expected a PNG, JPEG, or WebP preview up to 2 MB.`);
  }
  let bitmap: ImageBitmap;
  try {
    const data = Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',') + 1)), (byte) => byte.charCodeAt(0));
    const ascii = (start: number, end: number) => String.fromCharCode(...data.slice(start, end));
    const valid = mime === 'png' ? data[0] === 137 && ascii(1, 4) === 'PNG'
      : mime === 'jpeg' ? data[0] === 255 && data[1] === 216
        : ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
    if (!valid) throw new Error();
    bitmap = await createImageBitmap(new Blob([data], { type: `image/${mime}` }));
  } catch {
    throw new Error(`${name}: expected a valid ${mime.toUpperCase()} image.`);
  }
  const { width, height } = bitmap;
  bitmap.close();
  if (width * 3 !== height * 4 || width > 4096 || height > 4096) {
    throw new Error(`${name}: expected a 4:3 preview up to 4096 px per side, found ${width}×${height}.`);
  }
  return { name, dataUrl };
}
