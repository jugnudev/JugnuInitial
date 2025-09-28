import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  TrendingUp, 
  Star, 
  Search, 
  Filter,
  Users,
  Calendar,
  Sparkles,
  ChevronRight,
  Globe
} from 'lucide-react';
import { Link } from 'wouter';
import { LazyImage } from './LazyImage';
import { CommunityGridSkeleton } from './LoadingSkeletons';
import { motion } from 'framer-motion';

const CATEGORIES = [
  { value: 'all', label: 'All Categories', icon: Globe },
  { value: 'music', label: 'Music', icon: null },
  { value: 'sports', label: 'Sports', icon: null },
  { value: 'arts', label: 'Arts & Culture', icon: null },
  { value: 'technology', label: 'Technology', icon: null },
  { value: 'business', label: 'Business', icon: null },
  { value: 'wellness', label: 'Health & Wellness', icon: null },
  { value: 'education', label: 'Education', icon: null },
  { value: 'food', label: 'Food & Dining', icon: null },
  { value: 'travel', label: 'Travel', icon: null },
  { value: 'gaming', label: 'Gaming', icon: null },
  { value: 'fashion', label: 'Fashion', icon: null },
];

interface Community {
  id: string;
  name: string;
  description: string;
  slug: string;
  imageUrl?: string;
  category?: string;
  memberCount: number;
  postCount: number;
  weeklyActivity?: number;
  isFeatured?: boolean;
  isTrending?: boolean;
  tags?: string[];
}

/**
 * Community Discovery Component
 * Features: Featured, Trending, Categories, Search
 */
export function CommunityDiscovery() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch featured communities
  const { data: featuredData, isLoading: featuredLoading } = useQuery<{ communities: Community[] }>({
    queryKey: ['/api/communities/featured'],
  });

  // Fetch trending communities
  const { data: trendingData, isLoading: trendingLoading } = useQuery<{ communities: Community[] }>({
    queryKey: ['/api/communities/trending'],
  });

  // Fetch all communities with filters
  const { data: allData, isLoading: allLoading } = useQuery<{ communities: Community[] }>({
    queryKey: ['/api/communities', { category: selectedCategory, search: searchQuery }],
    enabled: searchQuery.length > 0 || selectedCategory !== 'all',
  });

  const featuredCommunities = featuredData?.communities || [];
  const trendingCommunities = trendingData?.communities || [];
  const filteredCommunities = allData?.communities || [];

  return (
    <div className="space-y-8" data-testid="community-discovery">
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search communities by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-communities"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48" data-testid="select-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  <div className="flex items-center gap-2">
                    {cat.icon && <cat.icon className="h-4 w-4" />}
                    {cat.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
            data-testid="button-toggle-filters"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>
        
        {showFilters && (
          <Card className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Active this week</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Accepting members</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Verified</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Has events</span>
              </label>
            </div>
          </Card>
        )}
      </div>

      {/* Featured Communities */}
      {!searchQuery && selectedCategory === 'all' && featuredCommunities.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-yellow-500" />
              <h2 className="text-2xl font-bold">Featured Communities</h2>
            </div>
            <Link href="/communities/featured">
              <a className="text-sm text-accent hover:underline flex items-center gap-1">
                View all <ChevronRight className="h-4 w-4" />
              </a>
            </Link>
          </div>
          
          {featuredLoading ? (
            <CommunityGridSkeleton count={3} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredCommunities.slice(0, 3).map((community) => (
                <FeaturedCommunityCard key={community.id} community={community} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Trending Communities */}
      {!searchQuery && selectedCategory === 'all' && trendingCommunities.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <h2 className="text-2xl font-bold">Trending This Week</h2>
            </div>
            <Link href="/communities/trending">
              <a className="text-sm text-accent hover:underline flex items-center gap-1">
                View all <ChevronRight className="h-4 w-4" />
              </a>
            </Link>
          </div>
          
          {trendingLoading ? (
            <CommunityGridSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {trendingCommunities.slice(0, 8).map((community, index) => (
                <TrendingCommunityCard 
                  key={community.id} 
                  community={community} 
                  rank={index + 1}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Search Results / Filtered Communities */}
      {(searchQuery || selectedCategory !== 'all') && (
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              {searchQuery ? `Search results for "${searchQuery}"` : `${CATEGORIES.find(c => c.value === selectedCategory)?.label} Communities`}
            </h2>
            <p className="text-muted-foreground mt-1">
              Found {filteredCommunities.length} communities
            </p>
          </div>
          
          {allLoading ? (
            <CommunityGridSkeleton count={6} />
          ) : filteredCommunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCommunities.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No communities found matching your criteria.</p>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}

/**
 * Featured Community Card
 */
function FeaturedCommunityCard({ community }: { community: Community }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link href={`/communities/${community.slug}`}>
        <a>
          <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full" data-testid={`card-featured-${community.id}`}>
            <div className="aspect-video relative">
              <LazyImage
                src={community.imageUrl || '/images/placeholder.svg'}
                alt={community.name}
                className="w-full h-full"
                testId={`image-featured-${community.id}`}
              />
              <Badge className="absolute top-3 left-3 bg-yellow-500 text-white">
                <Star className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            </div>
            <CardHeader>
              <CardTitle>{community.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {community.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {community.memberCount} members
                </span>
                {community.category && (
                  <Badge variant="secondary">{community.category}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </a>
      </Link>
    </motion.div>
  );
}

/**
 * Trending Community Card
 */
function TrendingCommunityCard({ community, rank }: { community: Community; rank: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: rank * 0.05 }}
    >
      <Link href={`/communities/${community.slug}`}>
        <a>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`card-trending-${community.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl font-bold text-muted-foreground">
                  #{rank}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold line-clamp-1">{community.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    <TrendingUp className="inline h-3 w-3 mr-1 text-green-500" />
                    {community.weeklyActivity || 0}% activity increase
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {community.memberCount} members
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </a>
      </Link>
    </motion.div>
  );
}

/**
 * Regular Community Card
 */
function CommunityCard({ community }: { community: Community }) {
  return (
    <Link href={`/communities/${community.slug}`}>
      <a>
        <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full" data-testid={`card-community-${community.id}`}>
          <div className="aspect-video relative">
            <LazyImage
              src={community.imageUrl || '/images/placeholder.svg'}
              alt={community.name}
              className="w-full h-full"
              testId={`image-community-${community.id}`}
            />
          </div>
          <CardHeader>
            <CardTitle className="line-clamp-1">{community.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {community.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {community.memberCount} members
              </span>
              {community.tags && community.tags.length > 0 && (
                <div className="flex gap-1">
                  {community.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </a>
    </Link>
  );
}