import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AnnouncementImageUploaderProps {
  onUpload: (file: File) => Promise<string>;
  existingUrl?: string;
  onRemove?: () => void;
  className?: string;
}

export function AnnouncementImageUploader({
  onUpload,
  existingUrl,
  onRemove,
  className
}: AnnouncementImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateImageAspectRatio = useCallback(
    (file: File): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const aspectRatio = img.width / img.height;
          const targetRatio = 16 / 9;
          const tolerance = 0.1; // 10% tolerance
          
          if (Math.abs(aspectRatio - targetRatio) > tolerance) {
            reject(new Error(`Image must have a 16:9 aspect ratio. Current ratio: ${aspectRatio.toFixed(2)}:1`));
          } else {
            resolve(true);
          }
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Failed to load image"));
        };
        
        img.src = objectUrl;
      });
    },
    []
  );

  const validateFile = useCallback(
    async (file: File) => {
      // Check file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Only image files are allowed");
      }

      // Check file size (max 5MB)
      const maxBytes = 5 * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new Error("File size must be less than 5MB");
      }

      // Check aspect ratio
      await validateImageAspectRatio(file);

      return true;
    },
    [validateImageAspectRatio]
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        setUploading(true);
        setError(null);
        
        await validateFile(file);
        await onUpload(file);
        
        toast({
          title: "Image uploaded!",
          description: "Your announcement image has been uploaded successfully."
        });
      } catch (err) {
        console.error("Upload error:", err);
        const errorMessage = err instanceof Error ? err.message : "Upload failed";
        setError(errorMessage);
        toast({
          title: "Upload failed",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setUploading(false);
      }
    },
    [onUpload, validateFile, toast]
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
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <img
            src={existingUrl}
            alt="Announcement image"
            className="absolute top-0 left-0 w-full h-full object-cover rounded-lg"
            data-testid="img-announcement-preview"
          />
        </div>
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleClick}
              data-testid="button-replace-announcement-image"
            >
              <Upload className="w-4 h-4 mr-2" />
              Replace
            </Button>
            {onRemove && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onRemove}
                data-testid="button-remove-announcement-image"
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
          accept="image/jpeg,image/png,image/webp"
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
          "relative w-full border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors",
          "hover:border-accent hover:bg-accent/10",
          isDragOver && "border-accent bg-accent/20",
          uploading && "pointer-events-none opacity-70",
          error && "border-red-500 bg-red-500/10"
        )}
        style={{ paddingTop: '56.25%' }} // 16:9 aspect ratio
        data-testid="dropzone-announcement-image"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
          {uploading ? (
            <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
          ) : (
            <ImageIcon className="w-10 h-10 text-muted-foreground" />
          )}
          
          <div>
            <p className="text-sm font-medium mb-1">
              {uploading ? "Uploading..." : "Drop image here or click to upload"}
            </p>
            <p className="text-xs text-muted-foreground">
              {uploading ? "Please wait..." : "16:9 ratio • Max 5MB • JPG, PNG, WebP"}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-2" data-testid="text-upload-error">
          {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
