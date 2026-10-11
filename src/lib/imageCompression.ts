/**
 * src/lib/imageCompression.ts
 * Compresses an image File in the browser using HTML5 Canvas.
 * Reduces raw mobile photos (5-20 MB) down to ~800 KB - 1.5 MB while maintaining crystal-clear quality.
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<File> {
  const { maxWidth = 2048, maxHeight = 2048, quality = 0.85 } = options;

  // Only compress in browser environment
  if (typeof window === "undefined" || !file) {
    return file;
  }

  // Check if it's an image by MIME type or file extension
  const isImage =
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|heic|heif|bmp)$/i.test(file.name);

  if (!isImage) {
    return file;
  }

  // If already small (< 1 MB), no need to re-encode
  if (file.size <= 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Scale down if dimensions exceed maxWidth or maxHeight while preserving aspect ratio
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file); // fallback if canvas 2D context unavailable
        return;
      }

      // Draw image onto canvas
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // If compression didn't produce a smaller file, keep original
            resolve(file);
            return;
          }

          const baseName = file.name.replace(/\.[^/.]+$/, "") || "delivery_proof";
          const compressedFile = new File([blob], `${baseName}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fallback to original file if decoding fails (e.g., HEIC on desktop)
    };

    img.src = objectUrl;
  });
}
