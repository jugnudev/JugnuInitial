import { Button } from '@/components/ui/button';
import { 
  Twitter, 
  Facebook, 
  Linkedin, 
  Link, 
  Mail, 
  MessageCircle,
  Share2,
  Check
} from 'lucide-react';
import { useState, useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  hashtags?: string[];
  via?: string;
  onShare?: (platform: string) => void;
  className?: string;
  showLabel?: boolean;
}

/**
 * Social media share buttons component
 * Supports multiple platforms and copy link functionality
 */
export function ShareButtons({
  url,
  title,
  description,
  hashtags = [],
  via = 'thehouseofjugnu',
  onShare,
  className,
  showLabel = false
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description || title);
  const hashtagString = hashtags.map(tag => tag.replace('#', '')).join(',');

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&via=${via}${hashtags.length ? `&hashtags=${hashtagString}` : ''}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`
  };

  const handleShare = useCallback((platform: string) => {
    if (platform === 'copy') {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        toast({
          title: 'Link copied!',
          description: 'The link has been copied to your clipboard.'
        });
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        toast({
          title: 'Failed to copy',
          description: 'Please try selecting and copying the link manually.',
          variant: 'destructive'
        });
      });
    } else if (platform in shareLinks) {
      window.open(shareLinks[platform as keyof typeof shareLinks], '_blank', 'width=600,height=400');
    }

    onShare?.(platform);
  }, [url, shareLinks, onShare, toast]);

  // Check if native share API is available
  const canNativeShare = typeof navigator !== 'undefined' && navigator.share;

  const handleNativeShare = useCallback(async () => {
    if (!canNativeShare) return;

    try {
      await navigator.share({
        title,
        text: description || title,
        url
      });
      onShare?.('native');
    } catch (error) {
      // User cancelled or error occurred
      console.log('Native share cancelled or failed:', error);
    }
  }, [canNativeShare, title, description, url, onShare]);

  return (
    <div className={className}>
      {canNativeShare ? (
        // Use native share on mobile
        <Button
          variant="outline"
          size="sm"
          onClick={handleNativeShare}
          className="gap-2"
          data-testid="button-share-native"
        >
          <Share2 className="h-4 w-4" />
          {showLabel && 'Share'}
        </Button>
      ) : (
        // Desktop share dropdown
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              data-testid="button-share-menu"
            >
              <Share2 className="h-4 w-4" />
              {showLabel && 'Share'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => handleShare('twitter')}
              className="gap-2"
              data-testid="button-share-twitter"
            >
              <Twitter className="h-4 w-4" />
              Twitter
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => handleShare('facebook')}
              className="gap-2"
              data-testid="button-share-facebook"
            >
              <Facebook className="h-4 w-4" />
              Facebook
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => handleShare('linkedin')}
              className="gap-2"
              data-testid="button-share-linkedin"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => handleShare('whatsapp')}
              className="gap-2"
              data-testid="button-share-whatsapp"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => handleShare('email')}
              className="gap-2"
              data-testid="button-share-email"
            >
              <Mail className="h-4 w-4" />
              Email
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => handleShare('copy')}
              className="gap-2"
              data-testid="button-share-copy"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Link className="h-4 w-4" />
                  Copy Link
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

/**
 * Inline share buttons for larger displays
 */
export function InlineShareButtons(props: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(props.url).then(() => {
      setCopied(true);
      toast({ title: 'Link copied!' });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`flex items-center gap-2 ${props.className}`}>
      <span className="text-sm text-muted-foreground">Share:</span>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.open(shareLinks.twitter, '_blank')}
        data-testid="button-share-twitter-inline"
      >
        <Twitter className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.open(shareLinks.facebook, '_blank')}
        data-testid="button-share-facebook-inline"
      >
        <Facebook className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.open(shareLinks.linkedin, '_blank')}
        data-testid="button-share-linkedin-inline"
      >
        <Linkedin className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopyLink}
        data-testid="button-share-copy-inline"
      >
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link className="h-4 w-4" />}
      </Button>
    </div>
  );
  
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(props.url)}&text=${encodeURIComponent(props.title)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(props.url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(props.url)}`
  };
}