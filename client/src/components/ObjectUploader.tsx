import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ObjectUploaderProps {
  onUpload: (file: File) => Promise<string>;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  placeholder?: string;
  existingUrl?: string;
  onRemove?: () => void;
}

export function ObjectUploader({
  onUpload,
  accept = "image/*",
  maxSizeMB = 5,
  className,
  placeholder = "Drop image here or click to upload",
  existingUrl,
  onRemove,
}: ObjectUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File) => {
      // Check file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Only image files are allowed");
      }

      // Check file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new Error(`File size must be less than ${maxSizeMB}MB`);
      }

      return true;
    },
    [maxSizeMB]
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        setUploading(true);
        setError(null);
        
        validateFile(file);
        await onUpload(file);
      } catch (err) {
        console.error("Upload error:", err);
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUpload, validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (uploading) return;
    fileInputRef.current?.click();
  }, [uploading]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  if (existingUrl && !uploading && !error) {
    return (
      <div className={cn("relative group", className)}>
        <img
          src={existingUrl}
          alt="Uploaded content"
          className="w-full h-48 object-cover rounded-lg"
          data-testid="img-uploaded-preview"
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleClick}
              data-testid="button-replace-image"
            >
              <Upload className="w-4 h-4 mr-2" />
              Replace
            </Button>
            {onRemove && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onRemove}
                data-testid="button-remove-image"
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          "hover:border-primary hover:bg-accent/50",
          isDragOver && "border-primary bg-accent",
          uploading && "pointer-events-none opacity-70",
          error && "border-red-300 bg-red-50/50"
        )}
        data-testid="dropzone-upload-area"
      >
        <div className="flex flex-col items-center gap-4">
          {uploading ? (
            <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
          ) : (
            <ImageIcon className="w-12 h-12 text-muted-foreground" />
          )}
          
          <div>
            <p className="text-sm font-medium mb-1">
              {uploading ? "Uploading..." : placeholder}
            </p>
            <p className="text-xs text-muted-foreground">
              {uploading ? "Please wait..." : `Max ${maxSizeMB}MB • JPG, PNG, WebP`}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-2" data-testid="text-upload-error">
          {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}