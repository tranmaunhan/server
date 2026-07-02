const MAX_DIMENSION = 1600;
const TARGET_MAX_BYTES = 450 * 1024;
const INITIAL_QUALITY = 0.82;
const MIN_QUALITY = 0.5;
const QUALITY_STEP = 0.08;

export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const decodedImage = await decodeImage(file).catch(() => null);
  if (!decodedImage) {
    return file;
  }

  const { width, height } = getTargetSize(decodedImage.width, decodedImage.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(decodedImage.source, 0, 0, width, height);

  let quality = INITIAL_QUALITY;
  let blob = await canvasToBlob(canvas, "image/jpeg", quality);

  while (blob && blob.size > TARGET_MAX_BYTES && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }

  if (!blob || blob.size >= file.size) {
    decodedImage.cleanup();
    return file;
  }

  const compressedFile = new File([blob], replaceExtension(file.name, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now()
  });

  decodedImage.cleanup();
  return compressedFile;
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      source: bitmap,
      cleanup: () => bitmap.close()
    };
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      source: image,
      cleanup: () => URL.revokeObjectURL(objectUrl)
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Khong tai duoc anh de nen."));
    image.src = src;
  });
}

function getTargetSize(width: number, height: number) {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return { width, height };
  }

  const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function replaceExtension(filename: string, nextExtension: string) {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex <= 0) {
    return `${filename}${nextExtension}`;
  }
  return `${filename.slice(0, dotIndex)}${nextExtension}`;
}

interface DecodedImage {
  width: number;
  height: number;
  source: CanvasImageSource;
  cleanup: () => void;
}
