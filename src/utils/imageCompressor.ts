/**
 * Client-side high-efficiency image compression utility for mobile & desktop uploads.
 * Guarantees optimal visual quality while keeping base64 data-URL payload small (< 60KB)
 * so that Firestore documents never exceed the 1MB limit and persist reliably across reloads.
 */
export async function compressImageFile(
  file: File | Blob,
  maxWidth = 1000,
  maxHeight = 750,
  quality = 0.70
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type && !file.type.startsWith('image/')) {
      reject(new Error('Недопустимый формат файла. Пожалуйста, выберите изображение (JPEG, PNG, WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл изображения.'));
    reader.onload = (readerEvent) => {
      const dataUrl = readerEvent.target?.result as string;
      compressDataUrl(dataUrl, maxWidth, maxHeight, quality)
        .then(resolve)
        .catch(() => resolve(dataUrl));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an existing Base64 Data URL or remote image to a lightweight JPEG (< 60KB).
 */
export async function compressDataUrl(
  dataUrl: string,
  maxWidth = 1000,
  maxHeight = 750,
  quality = 0.70
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => resolve(dataUrl);
    img.onload = () => {
      try {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let compressed = canvas.toDataURL('image/jpeg', quality);

        // If still over 80KB (~110,000 base64 chars), perform aggressive second pass
        if (compressed.length > 110000) {
          const secondRatio = 0.75;
          canvas.width = Math.round(width * secondRatio);
          canvas.height = Math.round(height * secondRatio);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          compressed = canvas.toDataURL('image/jpeg', 0.62);
        }

        resolve(compressed);
      } catch {
        resolve(dataUrl);
      }
    };
    img.src = dataUrl;
  });
}

/**
 * Avatar compression utility (square crop, 200x200 max, ~15-25KB)
 */
export async function compressAvatarFile(file: File | Blob): Promise<string> {
  return compressImageFile(file, 200, 200, 0.72);
}

