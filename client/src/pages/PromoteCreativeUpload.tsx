import React from 'react';
import { Calendar, Globe, Upload, CheckCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export function PromoteCreativeUpload({ 
  selectedPackage, 
  creatives, 
  creativeValidation, 
  dragActive, 
  handleCreativeUpload, 
  setCreatives, 
  setCreativeValidation, 
  setDragActive,
  formData,
  setFormData,
  toast 
}) {
  const renderUploadField = (type, label, sublabel, creative, validation, isActive) => (
    <div className="space-y-3">
      <label className="block text-white font-medium">
        {label}
        <span className="text-muted text-sm font-normal ml-2">
          {sublabel}
        </span>
      </label>
      
      <div 
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          isActive ? 'border-copper-500 bg-copper-500/20' :
          creative ? 
            (validation.valid ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10') :
            'border-white/20 hover:border-white/40'
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(prev => ({ ...prev, [type]: true }));
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.currentTarget === e.target) {
            setDragActive(prev => ({ ...prev, [type]: false }));
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(prev => ({ ...prev, [type]: false }));
          
          const files = Array.from(e.dataTransfer.files);
          const imageFile = files.find(file => file.type.startsWith('image/'));
          
          if (imageFile) {
            handleCreativeUpload(imageFile, type);
          } else {
            toast({
              title: "Invalid file",
              description: "Please drop an image file (JPG, PNG, or WebP)",
              variant: "destructive"
            });
          }
        }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCreativeUpload(file, type);
          }}
          className="hidden"
          id={`${type}-creative`}
          data-testid={`upload-${type}-creative`}
        />
        
        {!creative ? (
          <label htmlFor={`${type}-creative`} className="cursor-pointer flex flex-col items-center gap-3">
            <Upload className={`w-8 h-8 ${isActive ? 'text-copper-500' : 'text-muted'} transition-colors`} />
            <div className="text-center">
              <div className="text-white font-medium">
                {isActive ? 'Drop your image here' : `Upload ${label}`}
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
                onClick={() => {
                  setCreatives(prev => ({ ...prev, [type]: null }));
                  setCreativeValidation(prev => ({ 
                    ...prev, 
                    [type]: { valid: false, issues: [], dimensions: null }
                  }));
                }}
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Creative Assets (Optional)
        </h3>
        <p className="text-muted text-sm mb-6">
          Upload your campaign creatives. Requirements vary by package:
          {selectedPackage === 'events_spotlight' && ' Events Banner (Desktop + Mobile)'}
          {selectedPackage === 'homepage_feature' && ' Homepage Banner (Desktop + Mobile)'}
          {selectedPackage === 'full_feature' && ' Both Events Banner + Homepage Banner (4 total assets: Desktop + Mobile for each placement)'}
        </p>
      </div>

      {/* Events Banner Creatives - for events_spotlight or full_feature */}
      {(selectedPackage === 'events_spotlight' || selectedPackage === 'full_feature') && (
        <div className="space-y-6 p-4 bg-white/5 rounded-lg">
          <h4 className="text-white font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Events Page Banner
          </h4>
          
          {renderUploadField(
            'eventsDesktop',
            'Desktop Creative *',
            '(Min: 1600×400px, ~4:1 ratio, JPG/PNG/WebP)',
            creatives.eventsDesktop,
            creativeValidation.eventsDesktop,
            dragActive.eventsDesktop
          )}
          
          {renderUploadField(
            'eventsMobile',
            'Mobile Creative *',
            '(Min: 1080×1080px, 1:1 ratio, JPG/PNG/WebP)',
            creatives.eventsMobile,
            creativeValidation.eventsMobile,
            dragActive.eventsMobile
          )}
        </div>
      )}

      {/* Homepage Feature Creatives - for homepage_feature or full_feature */}
      {(selectedPackage === 'homepage_feature' || selectedPackage === 'full_feature') && (
        <div className="space-y-6 p-4 bg-white/5 rounded-lg">
          <h4 className="text-white font-medium flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Homepage Feature
          </h4>
          
          {renderUploadField(
            'homeDesktop',
            'Desktop Creative *',
            '(Min: 1600×400px, ~4:1 ratio, JPG/PNG/WebP)',
            creatives.homeDesktop,
            creativeValidation.homeDesktop,
            dragActive.homeDesktop
          )}
          
          {renderUploadField(
            'homeMobile',
            'Mobile Creative *',
            '(Min: 1080×1080px, 1:1 ratio, JPG/PNG/WebP)',
            creatives.homeMobile,
            creativeValidation.homeMobile,
            dragActive.homeMobile
          )}
        </div>
      )}

      {/* Default upload for non-placement packages */}
      {!['events_spotlight', 'homepage_feature', 'full_feature'].includes(selectedPackage || '') && (
        <>
          {renderUploadField(
            'desktop',
            'Desktop Creative *',
            '(Min: 1600×400px, ~4:1 ratio, JPG/PNG/WebP)',
            creatives.desktop,
            creativeValidation.desktop,
            dragActive.desktop
          )}
          
          {renderUploadField(
            'mobile',
            'Mobile Creative *',
            '(Min: 1080×1080px, 1:1 ratio, JPG/PNG/WebP)',
            creatives.mobile,
            creativeValidation.mobile,
            dragActive.mobile
          )}
        </>
      )}

      {/* Creative Guidelines */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Creative Guidelines
        </h4>
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
            All banners automatically include a subtle "Sponsored" label for transparency
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
            Avoid placing critical text near edges (safe margin: 40px)
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
            Use high contrast colors for better readability
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
            Test designs on dark backgrounds (similar to site theme)
          </li>
        </ul>
      </div>

      {/* Additional Creative Links */}
      <div>
        <label className="block text-white font-medium mb-2">
          Additional Creative Links
          <span className="text-muted text-sm font-normal ml-2">(Optional - Figma, brand assets, etc.)</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 text-sm">
            https://
          </span>
          <Input
            type="text"
            value={formData.creative_links.replace(/^https?:\/\//, '')}
            onChange={(e) => {
              const value = e.target.value.replace(/^https?:\/\//, '');
              setFormData({...formData, creative_links: value});
            }}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pl-16"
            placeholder="figma.com/file/... or drive.google.com/..."
            data-testid="input-additional-creative-links"
          />
        </div>
      </div>
    </div>
  );
}