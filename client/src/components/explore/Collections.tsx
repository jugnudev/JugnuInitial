import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

interface Collection {
  id: string;
  name: string;
  query: string;
  count?: number;
  color?: string;
}

interface CollectionsProps {
  type: 'events' | 'places';
  basePath: string;
  onCollectionClick?: (collection: Collection) => void;
}

const EVENT_COLLECTIONS: Collection[] = [
  { id: 'this-week', name: 'This Week', query: 'timeframe=week', color: 'bg-copper-500/90' },
  { id: 'concerts', name: 'Concerts', query: 'category=concert', color: 'bg-purple-500/90' },
  { id: 'parties', name: 'Parties', query: 'category=parties', color: 'bg-pink-500/90' },
  { id: 'comedy', name: 'Comedy', query: 'category=comedy', color: 'bg-yellow-500/90' },
  { id: 'festivals', name: 'Festivals', query: 'category=festival', color: 'bg-green-500/90' },
  { id: 'free', name: 'Free Events', query: 'price=free', color: 'bg-blue-500/90' },
];

const PLACE_COLLECTIONS: Collection[] = [
  { id: 'best-chai', name: 'Best Chai', query: 'search=chai tea', color: 'bg-amber-500/90' },
  { id: 'late-night', name: 'Late-Night Eats', query: 'search=late night', color: 'bg-indigo-500/90' },
  { id: 'vegetarian', name: 'Vegetarian & Vegan', query: 'search=vegetarian vegan', color: 'bg-green-500/90' },
  { id: 'punjabi', name: 'Punjabi Favourites', query: 'search=punjabi', color: 'bg-orange-500/90' },
  { id: 'south-indian', name: 'South Indian', query: 'search=south indian', color: 'bg-red-500/90' },
  { id: 'desserts', name: 'Desserts', query: 'type=dessert', color: 'bg-pink-500/90' },
];

export default function Collections({ type, basePath, onCollectionClick }: CollectionsProps) {
  const collections = type === 'events' ? EVENT_COLLECTIONS : PLACE_COLLECTIONS;

  const handleCollectionClick = (collection: Collection) => {
    if (onCollectionClick) {
      onCollectionClick(collection);
    }
  };

  return (
    <div className="w-full overflow-x-auto scrollbar-hide pb-2">
      <div className="flex gap-3 min-w-fit px-4 sm:px-6 lg:px-8">
        {collections.map((collection) => (
          <Link 
            key={collection.id}
            href={`${basePath}?${collection.query}`}
            className="flex-shrink-0"
          >
            <Badge
              className={`
                ${collection.color} 
                text-white border-0 px-4 py-2 font-medium whitespace-nowrap
                transition-all duration-300 cursor-pointer
                hover:scale-105 hover:shadow-lg hover:shadow-black/25
                active:scale-95
                focus:outline-none focus:ring-2 focus:ring-copper-500 focus:ring-offset-2 focus:ring-offset-bg
              `}
              onClick={() => handleCollectionClick(collection)}
              data-testid={`collection-${collection.id}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCollectionClick(collection);
                }
              }}
            >
              {collection.name}
              {collection.count && (
                <span className="ml-2 text-xs opacity-90">
                  {collection.count}
                </span>
              )}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}