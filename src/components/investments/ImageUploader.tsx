import { useState, useCallback, useRef } from 'react';
import { Upload, Camera, X, ImageIcon, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FileType = 'image' | 'pdf';

interface FileUploaderProps {
  onFileSelect: (base64: string, fileType: FileType) => void;
  isProcessing?: boolean;
  className?: string;
}

export function ImageUploader({ onFileSelect, isProcessing = false, className }: FileUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<FileType>('image');
  const [fileName, setFileName] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    
    if (!isImage && !isPdf) {
      return;
    }

    const type: FileType = isPdf ? 'pdf' : 'image';
    setFileType(type);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (isImage) {
        setPreview(base64);
      } else {
        setPreview(null); // PDFs don't have visual preview
      }
      onFileSelect(base64, type);
    };
    reader.readAsDataURL(file);
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const clearPreview = useCallback(() => {
    setPreview(null);
    setFileName('');
    setFileType('image');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }, []);

  // Show preview for images or file info for PDFs
  if (preview || (fileType === 'pdf' && fileName)) {
    return (
      <div className={cn("relative rounded-lg border overflow-hidden", className)}>
        {fileType === 'image' && preview ? (
          <img 
            src={preview} 
            alt="Vista previa" 
            className="w-full h-48 object-contain bg-muted"
          />
        ) : (
          <div className="w-full h-48 bg-muted flex flex-col items-center justify-center gap-3">
            <FileText className="h-16 w-16 text-primary" />
            <span className="text-sm font-medium text-foreground truncate max-w-[80%] px-4">
              {fileName}
            </span>
            <span className="text-xs text-muted-foreground">Documento PDF</span>
          </div>
        )}
        {isProcessing ? (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                {fileType === 'pdf' ? 'Analizando PDF...' : 'Analizando imagen...'}
              </span>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={clearPreview}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors",
          "flex flex-col items-center justify-center gap-2",
          isDragOver 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-primary/50"
        )}
      >
        <div className="flex gap-2">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Arrastra una imagen o PDF aquí</p>
          <p className="text-xs text-muted-foreground">o usa los botones de abajo</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          Subir archivo
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="mr-2 h-4 w-4" />
          Cámara
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
