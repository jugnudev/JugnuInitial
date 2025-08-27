import React from 'react';
import { Calendar, Globe, Upload } from 'lucide-react';
import { CreativeUploadField } from '@/components/CreativeUploadField';

interface PromoteCreativeSectionProps {
  selectedPackage: string | null;
  creatives: {
    desktop: File | null;
    mobile: File | null;
    eventsDesktop: File | null;
    eventsMobile: File | null;
    homeDesktop: File | null;
    homeMobile: File | null;
  };
  creativeValidation: {
    desktop: { valid: boolean; issues: string[]; dimensions: {width: number, height: number} | null };
    mobile: { valid: boolean; issues: string[]; dimensions: {width: number, height: number} | null };
    eventsDesktop: { valid: boolean; issues: string[]; dimensions: {width: number, height: number} | null };
    eventsMobile: { valid: boolean; issues: string[]; dimensions: {width: number, height: number} | null };
    homeDesktop: { valid: boolean; issues: string[]; dimensions: {width: number, height: number} | null };
    homeMobile: { valid: boolean; issues: string[]; dimensions: {width: number, height: number} | null };
  };
  dragActive: {
    desktop: boolean;
    mobile: boolean;
    eventsDesktop: boolean;
    eventsMobile: boolean;
    homeDesktop: boolean;
    homeMobile: boolean;
  };
  handleCreativeUpload: (file: File, type: 'desktop' | 'mobile' | 'eventsDesktop' | 'eventsMobile' | 'homeDesktop' | 'homeMobile') => void;
  setCreatives: React.Dispatch<React.SetStateAction<any>>;
  setCreativeValidation: React.Dispatch<React.SetStateAction<any>>;
  setDragActive: React.Dispatch<React.SetStateAction<any>>;
}

export function PromoteCreativeSection({
  selectedPackage,
  creatives,
  creativeValidation,
  dragActive,
  handleCreativeUpload,
  setCreatives,
  setCreativeValidation,
  setDragActive
}: PromoteCreativeSectionProps) {
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
          
          <CreativeUploadField
            id="events-desktop-creative"
            label="Desktop Creative *"
            sublabel="(Min: 1600×400px, ~4:1 ratio, JPG/PNG/WebP)"
            creative={creatives.eventsDesktop}
            validation={creativeValidation.eventsDesktop}
            dragActive={dragActive.eventsDesktop}
            onUpload={(file) => handleCreativeUpload(file, 'eventsDesktop')}
            onRemove={() => {
              setCreatives(prev => ({ ...prev, eventsDesktop: null }));
              setCreativeValidation(prev => ({ 
                ...prev, 
                eventsDesktop: { valid: false, issues: [], dimensions: null }
              }));
            }}
            onDragEnter={() => setDragActive(prev => ({ ...prev, eventsDesktop: true }))}
            onDragLeave={() => setDragActive(prev => ({ ...prev, eventsDesktop: false }))}
            testId="upload-events-desktop-creative"
          />
          
          <CreativeUploadField
            id="events-mobile-creative"
            label="Mobile Creative *"
            sublabel="(Min: 1080×1080px, 1:1 ratio, JPG/PNG/WebP)"
            creative={creatives.eventsMobile}
            validation={creativeValidation.eventsMobile}
            dragActive={dragActive.eventsMobile}
            onUpload={(file) => handleCreativeUpload(file, 'eventsMobile')}
            onRemove={() => {
              setCreatives(prev => ({ ...prev, eventsMobile: null }));
              setCreativeValidation(prev => ({ 
                ...prev, 
                eventsMobile: { valid: false, issues: [], dimensions: null }
              }));
            }}
            onDragEnter={() => setDragActive(prev => ({ ...prev, eventsMobile: true }))}
            onDragLeave={() => setDragActive(prev => ({ ...prev, eventsMobile: false }))}
            testId="upload-events-mobile-creative"
          />
        </div>
      )}

      {/* Homepage Feature Creatives - for homepage_feature or full_feature */}
      {(selectedPackage === 'homepage_feature' || selectedPackage === 'full_feature') && (
        <div className="space-y-6 p-4 bg-white/5 rounded-lg">
          <h4 className="text-white font-medium flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Homepage Feature
          </h4>
          
          <CreativeUploadField
            id="home-desktop-creative"
            label="Desktop Creative *"
            sublabel="(Min: 1600×400px, ~4:1 ratio, JPG/PNG/WebP)"
            creative={creatives.homeDesktop}
            validation={creativeValidation.homeDesktop}
            dragActive={dragActive.homeDesktop}
            onUpload={(file) => handleCreativeUpload(file, 'homeDesktop')}
            onRemove={() => {
              setCreatives(prev => ({ ...prev, homeDesktop: null }));
              setCreativeValidation(prev => ({ 
                ...prev, 
                homeDesktop: { valid: false, issues: [], dimensions: null }
              }));
            }}
            onDragEnter={() => setDragActive(prev => ({ ...prev, homeDesktop: true }))}
            onDragLeave={() => setDragActive(prev => ({ ...prev, homeDesktop: false }))}
            testId="upload-home-desktop-creative"
          />
          
          <CreativeUploadField
            id="home-mobile-creative"
            label="Mobile Creative *"
            sublabel="(Min: 1080×1080px, 1:1 ratio, JPG/PNG/WebP)"
            creative={creatives.homeMobile}
            validation={creativeValidation.homeMobile}
            dragActive={dragActive.homeMobile}
            onUpload={(file) => handleCreativeUpload(file, 'homeMobile')}
            onRemove={() => {
              setCreatives(prev => ({ ...prev, homeMobile: null }));
              setCreativeValidation(prev => ({ 
                ...prev, 
                homeMobile: { valid: false, issues: [], dimensions: null }
              }));
            }}
            onDragEnter={() => setDragActive(prev => ({ ...prev, homeMobile: true }))}
            onDragLeave={() => setDragActive(prev => ({ ...prev, homeMobile: false }))}
            testId="upload-home-mobile-creative"
          />
        </div>
      )}

      {/* Default upload for non-placement packages */}
      {!['events_spotlight', 'homepage_feature', 'full_feature'].includes(selectedPackage || '') && (
        <>
          <CreativeUploadField
            id="desktop-creative"
            label="Desktop Creative *"
            sublabel="(Min: 1600×400px, ~4:1 ratio, JPG/PNG/WebP)"
            creative={creatives.desktop}
            validation={creativeValidation.desktop}
            dragActive={dragActive.desktop}
            onUpload={(file) => handleCreativeUpload(file, 'desktop')}
            onRemove={() => {
              setCreatives(prev => ({ ...prev, desktop: null }));
              setCreativeValidation(prev => ({ 
                ...prev, 
                desktop: { valid: false, issues: [], dimensions: null }
              }));
            }}
            onDragEnter={() => setDragActive(prev => ({ ...prev, desktop: true }))}
            onDragLeave={() => setDragActive(prev => ({ ...prev, desktop: false }))}
            testId="upload-desktop-creative"
          />
          
          <CreativeUploadField
            id="mobile-creative"
            label="Mobile Creative *"
            sublabel="(Min: 1080×1080px, 1:1 ratio, JPG/PNG/WebP)"
            creative={creatives.mobile}
            validation={creativeValidation.mobile}
            dragActive={dragActive.mobile}
            onUpload={(file) => handleCreativeUpload(file, 'mobile')}
            onRemove={() => {
              setCreatives(prev => ({ ...prev, mobile: null }));
              setCreativeValidation(prev => ({ 
                ...prev, 
                mobile: { valid: false, issues: [], dimensions: null }
              }));
            }}
            onDragEnter={() => setDragActive(prev => ({ ...prev, mobile: true }))}
            onDragLeave={() => setDragActive(prev => ({ ...prev, mobile: false }))}
            testId="upload-mobile-creative"
          />
        </>
      )}
    </div>
  );
}