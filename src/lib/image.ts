export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export function isValidImageType(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type);
}

export function isValidImageSize(file: File): boolean {
  return file.size <= MAX_IMAGE_SIZE;
}

export async function convertToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getImageMetadata(file: File): {
  mimeType: string;
  size: number;
} {
  return {
    mimeType: file.type,
    size: file.size,
  };
}
