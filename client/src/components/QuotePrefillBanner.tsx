import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle } from 'lucide-react';
import { formatCAD } from '@/lib/pricing';
import { format } from 'date-fns';

interface QuotePrefillBannerProps {
  prefillData: {
    quoteId: string;
    packageCode: string;
    duration: string;
    numWeeks: number;
    totalCents: number;
    currency: string;
    expiresAt: string;
  };
  isLoading?: boolean;
}

const packageNames = {
  events_spotlight: 'Events Spotlight',
  homepage_feature: 'Homepage Feature', 
  full_feature: 'Full Feature'
};

export default function QuotePrefillBanner({ prefillData, isLoading }: QuotePrefillBannerProps) {
  if (isLoading) {
    return (
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-blue-600">Loading quote data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const expiryDate = new Date(prefillData.expiresAt);
  const isExpiringSoon = expiryDate.getTime() - Date.now() < 24 * 60 * 60 * 1000; // 24 hours
  
  return (
    <Card className="border-green-500/30 bg-green-500/5 mb-6">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <div className="font-medium text-green-800">
                Quote #{prefillData.quoteId.slice(-6)} Applied
              </div>
              <div className="text-sm text-green-600">
                {packageNames[prefillData.packageCode as keyof typeof packageNames]} • 
                {prefillData.duration === 'weekly' ? `${prefillData.numWeeks} week${prefillData.numWeeks > 1 ? 's' : ''}` : '1 day'} • 
                {formatCAD(prefillData.totalCents / 100)}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <Badge 
              variant={isExpiringSoon ? "destructive" : "secondary"}
              className="text-xs"
            >
              <Clock className="h-3 w-3 mr-1" />
              Expires {format(expiryDate, 'MMM d, h:mm a')}
            </Badge>
          </div>
        </div>
        
        <div className="mt-3 text-xs text-green-600">
          Your pricing is locked in until the quote expires. Complete your application to secure these rates.
        </div>
      </CardContent>
    </Card>
  );
}