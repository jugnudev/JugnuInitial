import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Loading skeleton for community cards
 */
export function CommunityCardSkeleton() {
  return (
    <Card className="overflow-hidden" data-testid="skeleton-community-card">
      <div className="aspect-video">
        <Skeleton className="w-full h-full" />
      </div>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for post cards
 */
export function PostCardSkeleton() {
  return (
    <Card className="overflow-hidden" data-testid="skeleton-post-card">
      <CardHeader>
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <div className="pt-3">
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
        <div className="flex items-center gap-4 pt-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for member list items
 */
export function MemberListSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 border-b" data-testid="skeleton-member-item">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-9 w-24" />
    </div>
  );
}

/**
 * Loading skeleton for community details
 */
export function CommunityDetailsSkeleton() {
  return (
    <div className="space-y-6" data-testid="skeleton-community-details">
      {/* Cover image */}
      <div className="aspect-[3/1] relative">
        <Skeleton className="w-full h-full" />
      </div>
      
      {/* Community info */}
      <div className="max-w-6xl mx-auto px-6 -mt-16 relative z-10">
        <div className="flex items-end gap-6">
          <Skeleton className="h-32 w-32 rounded-2xl border-4 border-white" />
          <div className="flex-1 space-y-3 pb-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-96" />
            <div className="flex gap-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>
      
      {/* Content tabs */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-b">
          <div className="flex gap-6">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
        
        {/* Posts grid */}
        <div className="grid gap-6 mt-6">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      </div>
    </div>
  );
}

/**
 * Loading grid for multiple community cards
 */
export function CommunityGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="skeleton-community-grid">
      {Array.from({ length: count }).map((_, i) => (
        <CommunityCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Loading list for multiple posts
 */
export function PostListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" data-testid="skeleton-post-list">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Loading list for multiple members
 */
export function MemberListSkeletonGrid({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y" data-testid="skeleton-member-list">
      {Array.from({ length: count }).map((_, i) => (
        <MemberListSkeleton key={i} />
      ))}
    </div>
  );
}