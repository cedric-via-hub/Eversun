'use client';

import { useState, useRef, useEffect } from 'react';
import { CloudArrowUp, File, X, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { parseJsonSafe } from '@/lib/utils';

interface FileUploadProps {
  /** Callback quand les fichiers sont uploadés avec succès */
  onUploadComplete?: (files: UploadedFile[]) => void;
  /** Client name pour créer le dossier dans Google Drive */
  clientName: string;
  /** Section du client (dp-en-cours, consuel-en-cours, etc.) */
  section: string;
  /** Nombre maximum de fichiers */
  maxFiles?: number;
  /** Types de fichiers acceptés */
  accept?: string;
  /** Liste initiale des fichiers déjà uploadés */
  initialUploadedFiles?: UploadedFile[];
  /** Désactive le composant quand le client n'est pas renseigné */
  disabled?: boolean;
  /** ID HTML pour l'input file */
  inputId?: string;
}

export interface UploadedFile {
  id: string;
  section?: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export default function FileUpload({
  onUploadComplete,
  clientName,
  section,
  maxFiles = 10,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  initialUploadedFiles = [],
  disabled = false,
  inputId = 'file-upload',
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(initialUploadedFiles);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUploadedFiles(initialUploadedFiles);
  }, [initialUploadedFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const selectedFiles = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} fichiers autorisés`);
      return;
    }
    setFiles((prev) => [...prev, ...selectedFiles]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const removeUploadedFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    if (disabled) {
      setError('Veuillez renseigner le client avant d uploader un fichier.');
      return;
    }
    if (files.length === 0) {
      setError('Veuillez sélectionner au moins un fichier');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('clientName', clientName);
      formData.append('section', section);
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = (await parseJsonSafe(response)) || { error: 'Erreur lors de l\'upload' };
        throw new Error((error as any).error || 'Erreur lors de l\'upload');
      }

      const result = (await parseJsonSafe(response)) || {};
      setUploadedFiles((prev) => [...prev, ...result.files]);
      setFiles([]);
      onUploadComplete?.(result.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
        <div className="text-center">
          <CloudArrowUp className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
            <label
              htmlFor={inputId}
              className={`relative rounded-md bg-white dark:bg-gray-800 font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-amber-500 focus-within:ring-offset-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:text-amber-600 dark:hover:text-amber-400'}`}
            >
              <span>Télécharger des fichiers</span>
              <input
                ref={fileInputRef}
                id={inputId}
                name={inputId}
                type="file"
                className="sr-only"
                multiple
                accept={accept}
                onChange={handleFileSelect}
                disabled={disabled || uploading}
              />
            </label>
            <p className="pl-1">ou glisser-déposer</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {accept} (max {maxFiles} fichiers)
          </p>
        </div>
      </div>

      {/* Files to upload */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Fichiers à télécharger ({files.length})
            </h4>
            <button
              onClick={handleUpload}
              disabled={disabled || uploading}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm hover:shadow transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Upload... {uploadProgress}%
                </>
              ) : (
                <>
                  <CloudArrowUp className="h-4 w-4 mr-2" />
                  Uploader
                </>
              )}
            </button>
          </div>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <File className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-900 dark:text-white truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Fichiers uploadés ({uploadedFiles.length})
          </h4>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <File className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-700 dark:text-green-300 hover:underline truncate"
                  >
                    {file.name}
                  </a>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <button
                  onClick={() => removeUploadedFile(file.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300 text-sm">
          <WarningCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
