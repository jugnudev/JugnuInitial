import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, RefreshCw, Eye, MapPin, Building2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SyncResult {
  google?: {
    imported: number;
    errors: string[];
  };
  yelp?: {
    imported: number;
    updated: number;
    errors: string[];
  };
  summary?: {
    imported: number;
    updated: number;
    errors: number;
    cities: string[];
  };
}

interface ReverifyResult {
  verified: number;
  deactivated: number;
  errors: string[];
}

interface PlaceStats {
  total: number;
  byCity: Record<string, number>;
  inactive: number;
  withoutImage: number;
  withoutWebsite: number;
}

export default function DevPlacesSync() {
  const [syncLoading, setSyncLoading] = useState(false);
  const [reverifyLoading, setReverifyLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [reverifyResult, setReverifyResult] = useState<ReverifyResult | null>(null);
  const [stats, setStats] = useState<PlaceStats | null>(null);
  const { toast } = useToast();

  // Check if we're in development
  const isDev = import.meta.env.DEV;

  if (!isDev) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-8">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">This page is only available in development mode.</p>
        </div>
      </div>
    );
  }

  const handleSyncAll = async () => {
    setSyncLoading(true);
    try {
      const response = await fetch('/api/places/admin/import/sync?city=all', {
        method: 'POST',
        headers: {
          'x-admin-key': import.meta.env.VITE_ADMIN_KEY || 'dev-key-placeholder',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.ok) {
        setSyncResult(data.results);
        toast({
          title: "Sync Completed",
          description: data.message,
        });
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleReverify = async () => {
    setReverifyLoading(true);
    try {
      const response = await fetch('/api/places/admin/reverify', {
        method: 'POST',
        headers: {
          'x-admin-key': import.meta.env.VITE_ADMIN_KEY || 'dev-key-placeholder',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.ok) {
        setReverifyResult(data.results);
        toast({
          title: "Re-verification Completed",
          description: data.message,
        });
      } else {
        throw new Error(data.error || 'Re-verification failed');
      }
    } catch (error) {
      console.error('Reverify error:', error);
      toast({
        title: "Re-verification Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setReverifyLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      // Get basic stats from places list endpoint
      const response = await fetch('/api/places/list?limit=1000');
      const data = await response.json();
      
      if (data.ok) {
        const places = data.items || [];
        const byCity: Record<string, number> = {};
        let inactive = 0;
        let withoutImage = 0;
        let withoutWebsite = 0;

        places.forEach((place: any) => {
          // Count by city
          const city = place.city || 'Unknown';
          byCity[city] = (byCity[city] || 0) + 1;

          // Count issues
          if (place.status !== 'active') inactive++;
          if (!place.image_url) withoutImage++;
          if (!place.website_url) withoutWebsite++;
        });

        setStats({
          total: places.length,
          byCity,
          inactive,
          withoutImage,
          withoutWebsite
        });
      }
    } catch (error) {
      console.error('Stats error:', error);
      toast({
        title: "Failed to Load Stats",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setStatsLoading(false);
    }
  };

  // Load stats on component mount
  useState(() => {
    loadStats();
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Places Sync Dev Console</h1>
          <p className="text-gray-600">Development utilities for Google Places and Yelp integration</p>
          <Badge variant="outline" className="mt-2">
            <Clock className="w-3 h-3 mr-1" />
            Development Mode
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sync Operations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Sync Operations
              </CardTitle>
              <CardDescription>
                Import places from Google Places API and Yelp Fusion API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleSyncAll}
                disabled={syncLoading}
                className="w-full"
                size="lg"
              >
                {syncLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Sync All Cities
              </Button>

              <Button 
                onClick={handleReverify}
                disabled={reverifyLoading}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {reverifyLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Re-verify Places
              </Button>

              {syncResult && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">Last Sync Results</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>• Google: {syncResult.google?.imported || 0} imported</p>
                    <p>• Yelp: {syncResult.yelp?.imported || 0} imported, {syncResult.yelp?.updated || 0} updated</p>
                    <p>• Total Errors: {(syncResult.google?.errors.length || 0) + (syncResult.yelp?.errors.length || 0)}</p>
                  </div>
                </div>
              )}

              {reverifyResult && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Last Re-verification Results</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>• Verified: {reverifyResult.verified}</p>
                    <p>• Deactivated: {reverifyResult.deactivated}</p>
                    <p>• Errors: {reverifyResult.errors.length}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Place Statistics
              </CardTitle>
              <CardDescription>
                Current state of the places database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={loadStats}
                disabled={statsLoading}
                variant="outline"
                className="w-full"
              >
                {statsLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh Stats
              </Button>

              {stats && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
                      <div className="text-sm text-blue-700">Total Places</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-900">{stats.inactive}</div>
                      <div className="text-sm text-red-700">Inactive</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-900">{stats.withoutImage}</div>
                      <div className="text-sm text-yellow-700">No Image</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-900">{stats.withoutWebsite}</div>
                      <div className="text-sm text-purple-700">No Website</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      By City
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(stats.byCity)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([city, count]) => (
                          <div key={city} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{city}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Links */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Admin Operations
              </CardTitle>
              <CardDescription>
                Quick links to admin endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  asChild
                  className="justify-start"
                >
                  <a href="/api/places/admin/review?status=pending" target="_blank" rel="noopener noreferrer">
                    <Eye className="w-4 h-4 mr-2" />
                    Review Pending
                  </a>
                </Button>
                
                <Button 
                  variant="outline" 
                  asChild
                  className="justify-start"
                >
                  <a href="/api/places/admin/review?status=active" target="_blank" rel="noopener noreferrer">
                    <Eye className="w-4 h-4 mr-2" />
                    Review Active
                  </a>
                </Button>
                
                <Button 
                  variant="outline" 
                  asChild
                  className="justify-start"
                >
                  <a href="/api/places/admin/review?status=inactive" target="_blank" rel="noopener noreferrer">
                    <Eye className="w-4 h-4 mr-2" />
                    Review Inactive
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}