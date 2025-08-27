import React from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CreativeUploadFieldProps {
  id: string;
  label: string;
  sublabel: string;
  creative: File | null;
  validation: {
    valid: boolean;
    issues: string[];
    dimensions: { width: number; height: number } | null;
  };
  dragActive: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  testId?: string;
}

export function CreativeUploadField({
  id,
  label,
  sublabel,
  creative,
  validation,
  dragActive,
  onUpload,
  onRemove,
  onDragEnter,
  onDragLeave,
  testId
}: CreativeUploadFieldProps) {
  const { toast } = useToast();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragLeave();
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      onUpload(imageFile);
    } else {
      toast({
        title: "Invalid file",
        description: "Please drop an image file (JPG, PNG, or WebP)",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-white font-medium">
        {label}
        <span className="text-muted text-sm font-normal ml-2">
          {sublabel}
        </span>
      </label>
      
      <div 
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive ? 'border-copper-500 bg-copper-500/20' :
          creative ? 
            (validation.valid ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10') :
            'border-white/20 hover:border-white/40'
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDragEnter();
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.currentTarget === e.target) {
            onDragLeave();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }}
          className="hidden"
          id={id}
          data-testid={testId}
        />
        
        {!creative ? (
          <label htmlFor={id} className="cursor-pointer flex flex-col items-center gap-3">
            <Upload className={`w-8 h-8 ${dragActive ? 'text-copper-500' : 'text-muted'} transition-colors`} />
            <div className="text-center">
              <div className="text-white font-medium">
                {dragActive ? 'Drop your image here' : `Upload ${label}`}
              </div>
              <div className="text-muted text-sm">Click to browse or drag & drop</div>
            </div>
          </label>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  validation.valid ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-white font-medium">{creative.name}</span>
                {validation.valid && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRemove}
                className="text-white border-white/20"
              >
                Remove
              </Button>
            </div>
            
            {validation.dimensions && (
              <div className="text-sm text-muted">
                Dimensions: {validation.dimensions.width}×{validation.dimensions.height}px
              </div>
            )}
            
            {validation.issues.length > 0 && (
              <div className="space-y-1">
                {validation.issues.map((issue, index) => (
                  <div key={index} className="text-red-400 text-sm flex items-center gap-2">
                    <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                    {issue}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}