/**
 * Resizes an image so its longest edge is at most maxEdge pixels, then
 * re-encodes it as JPEG (default quality 0.85) to reduce upload size.
 *
 * A 12 MP camera photo (~4 MB) compresses to ~200-500 KB at 2000px,
 * which is adequate for OCR while cutting mobile upload time dramatically.
 *
 * Falls back to the original File if the browser lacks canvas/createObjectURL,
 * or if the image is already within the size limit.
 *
 * Browser-only: do not import from server-side code.
 */
export function compressImage(
  file: File,
  { maxEdge = 2000, quality = 0.85 }: { maxEdge?: number; quality?: number } = {}
): Promise<File> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { naturalWidth: w, naturalHeight: h } = img;

      // Already within the size limit — return original unchanged.
      if (Math.max(w, h) <= maxEdge) {
        resolve(file);
        return;
      }

      const scale = maxEdge / Math.max(w, h);
      const targetW = Math.round(w * scale);
      const targetH = Math.round(h * scale);

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file); // canvas not supported — use original
        return;
      }

      ctx.drawImage(img, 0, 0, targetW, targetH);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const outName = file.name.replace(/\.[^.]+$/, ".jpg") || "document.jpg";
          resolve(new File([blob], outName, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // can't decode — use original and let the server decide
    };

    img.src = objectUrl;
  });
}
