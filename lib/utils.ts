import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function parseJsonSafe<T = any>(response: Response): Promise<T | undefined> {
  const text = await response.text();
  if (!text || !text.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error('Erreur lors de l’analyse JSON de la réponse :', error, 'texte de réponse :', text);
    throw error;
  }
}
