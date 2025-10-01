import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2, Video } from "lucide-react";
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

  const validateFile = useCallback(
    async (file: File) => {
      // Check file type - allow images and videos
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type === "video/mp4";
      
      if (!isImage && !isVideo) {
        throw new Error("Only image files (JPG, PNG, WebP) and MP4 videos are allowed");
      }

      // Check file size - 10MB for images, 50MB for videos
      const maxBytes = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      const maxSizeMB = isVideo ? 50 : 10;
      
      if (file.size > maxBytes) {
        throw new Error(`File size must be less than ${maxSizeMB}MB`);
      }

      return true;
    },
    []
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        setUploading(true);
        setError(null);
        
        await validateFile(file);
        await onUpload(file);
        
        const isVideo = file.type.startsWith("video/");
        toast({
          title: `${isVideo ? "Video" : "Image"} uploaded!`,
          description: `Your announcement ${isVideo ? "video" : "image"} has been uploaded successfully.`
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
    const isVideo = existingUrl.includes('.mp4') || existingUrl.includes('video');
    
    return (
      <div className={cn("relative group", className)}>
        <div className="relative w-full rounded-lg overflow-hidden bg-black">
          {isVideo ? (
            <video
              src={existingUrl}
              controls
              className="w-full max-h-[500px] object-contain"
              data-testid="video-announcement-preview"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <img
              src={existingUrl}
              alt="Announcement media"
              className="w-full max-h-[500px] object-contain"
              data-testid="img-announcement-preview"
            />
          )}
        </div>
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleClick}
              data-testid="button-replace-announcement-media"
            >
              <Upload className="w-4 h-4 mr-2" />
              Replace
            </Button>
            {onRemove && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onRemove}
                data-testid="button-remove-announcement-media"
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
          accept="image/jpeg,image/png,image/webp,video/mp4"
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
          "relative w-full border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors min-h-[200px]",
          "hover:border-accent hover:bg-accent/10",
          isDragOver && "border-accent bg-accent/20",
          uploading && "pointer-events-none opacity-70",
          error && "border-red-500 bg-red-500/10"
        )}
        data-testid="dropzone-announcement-media"
      >
        <div className="flex flex-col items-center justify-center gap-3 p-8">
          {uploading ? (
            <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
          ) : (
            <div className="flex gap-2">
              <ImageIcon className="w-10 h-10 text-muted-foreground" />
              <Video className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium mb-1">
              {uploading ? "Uploading..." : "Drop image or video here, or click to upload"}
            </p>
            <p className="text-xs text-muted-foreground">
              {uploading ? "Please wait..." : "Images: Max 10MB • Videos: Max 50MB • JPG, PNG, WebP, MP4"}
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
        accept="image/jpeg,image/png,image/webp,video/mp4"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
