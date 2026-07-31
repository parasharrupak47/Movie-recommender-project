/** Largest file we'll even attempt to read, before resizing. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Reads an image file, centre-crops it to a square, scales it down and returns
 * a compressed JPEG data URL.
 *
 * Resizing happens in the browser so the payload sent to the API stays small
 * (a 256px JPEG lands around 15–40 KB) and user documents don't balloon. This
 * avoids needing object storage or a multipart upload pipeline.
 *
 * @param {File}   file           - the image file chosen by the user
 * @param {number} size           - output width/height in pixels
 * @param {number} quality        - JPEG quality, 0–1
 * @returns {Promise<string>} a `data:image/jpeg;base64,…` URL
 */
export function fileToSquareDataUrl(file, size = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file selected"));

    if (!file.type.startsWith("image/"))
      return reject(new Error("Please choose an image file"));

    if (file.size > MAX_UPLOAD_BYTES)
      return reject(new Error("That image is over 8 MB. Please pick a smaller one."));

    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Could not read that file"));

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error("That file isn't a valid image"));

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;

          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Image processing isn't supported here"));

          // Centre-crop to a square so avatars are never stretched
          const edge = Math.min(img.width, img.height);
          const sx = (img.width - edge) / 2;
          const sy = (img.height - edge) / 2;

          ctx.drawImage(img, sx, sy, edge, edge, 0, 0, size, size);

          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch {
          reject(new Error("Could not process that image"));
        }
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}
