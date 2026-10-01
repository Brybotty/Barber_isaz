/** Tamaño máximo de la foto ya comprimida. Firestore admite hasta 1 MB por documento. */
const MAX_BYTES = 300 * 1024;

/**
 * Reduce y comprime una foto en el navegador (WebP, o JPEG si el navegador no sabe hacer WebP)
 * y la devuelve como data URL para guardarla en el propio documento del producto.
 * Así no hace falta Firebase Storage.
 */
export async function comprimirImagen(archivo: File): Promise<string> {
  const bitmap = await abrir(archivo);
  try {
    for (const [lado, calidad] of [[900, 0.82], [800, 0.72], [640, 0.65], [520, 0.55]] as const) {
      const canvas = dibujar(bitmap, lado);
      const webp = canvas.toDataURL('image/webp', calidad);
      const url = webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', calidad);
      // Longitud del data URL ≈ bytes * 4/3.
      if (url.length * 0.75 <= MAX_BYTES) return url;
    }
    throw new Error('La imagen es demasiado pesada incluso comprimida. Prueba con otra.');
  } finally {
    bitmap.close();
  }
}

/**
 * Prepara una foto para subirla a Firebase Storage: lado mayor de hasta 1200 px, en WebP
 * (o JPEG si el navegador no sabe hacer WebP). Una foto de celular de 4 MB queda en unos 100-200 KB.
 */
export async function prepararFoto(archivo: File, lado = 1200, calidad = 0.85): Promise<Blob> {
  const bitmap = await abrir(archivo);
  try {
    const canvas = dibujar(bitmap, lado);
    const webp = await aBlob(canvas, 'image/webp', calidad);
    // Safari antiguo ignora 'image/webp' y entrega PNG (pesado): en ese caso, JPEG.
    return webp?.type === 'image/webp' ? webp : (await aBlob(canvas, 'image/jpeg', calidad))!;
  } finally {
    bitmap.close();
  }
}

async function abrir(archivo: File): Promise<ImageBitmap> {
  if (!archivo.type.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  try {
    // Respeta la orientación EXIF: las fotos de celular no quedan acostadas.
    return await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('No pudimos abrir esa imagen. Prueba con una foto JPG, PNG o WebP.');
  }
}

function dibujar(bitmap: ImageBitmap, lado: number): HTMLCanvasElement {
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function aBlob(canvas: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob | null> {
  return new Promise(resolver => canvas.toBlob(resolver, tipo, calidad));
}
