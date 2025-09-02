import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, Eye, TrendingUp, Activity, Monitor, Smartphone, Tablet, Globe, RefreshCcw, Clock, Download } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import AdminNav from '@/components/AdminNav';

interface AnalyticsResponse {
  ok: boolean;
  data: AnalyticsData[];
  summary: AnalyticsSummary;
  lastSaved?: string;
}

interface AnalyticsData {
  day: string;
  unique_visitors: number;
  total_pageviews: number;
  new_visitors: number;
  returning_visitors: number;
  avg_session_duration: number;
  top_pages: Array<{ path: string; views: number }>;
  top_referrers: Array<{ referrer: string; count: number }>;
  device_breakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
}

interface AnalyticsSummary {
  totalVisitors: number;
  totalPageviews: number;
  avgVisitorsPerDay: number;
  avgPageviewsPerDay: number;
  liveVisitors: number;
  daysAnalyzed: number;
}

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ef4444'];

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState('30');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const { toast } = useToast();

  // Check authentication
  useEffect(() => {
    const adminKey = localStorage.getItem('adminKey');
    if (adminKey) {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch analytics data
  const { data, isLoading, error, refetch } = useQuery<{
    ok: boolean;
    data: AnalyticsData[];
    summary: AnalyticsSummary;
    lastSaved?: string;
  }>({
    queryKey: ['/api/admin/analytics', dateRange],
    queryFn: async () => {
      const adminKey = localStorage.getItem('adminKey');
      const response = await fetch(`/api/admin/analytics?days=${dateRange}`, {
        headers: {
          'x-admin-key': adminKey || ''
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to fetch analytics');
      }
      setLastRefresh(new Date());
      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 60000 // Refresh every minute
  });

  // Store daily analytics mutation
  const storeDailyMutation = useMutation({
    mutationFn: async () => {
      const adminKey = localStorage.getItem('adminKey');
      const response = await fetch('/api/admin/analytics/store-daily', {
        method: 'POST',
        headers: {
          'x-admin-key': adminKey || ''
        }
      });
      if (!response.ok) throw new Error('Failed to store analytics');
      return response.json();
    },
    onSuccess: (data) => {
      const lastSaved = data.lastSaved ? new Date(data.lastSaved).toLocaleString('en-US', { 
        timeZone: 'America/Los_Angeles',
        dateStyle: 'short',
        timeStyle: 'short'
      }) + ' PST' : 'now';
      toast({
        title: 'Analytics Stored',
        description: `Daily analytics saved at ${lastSaved}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to store daily analytics',
        variant: 'destructive'
      });
    }
  });

  // Export CSV handler
  const handleExportCSV = async () => {
    const adminKey = localStorage.getItem('adminKey');
    const response = await fetch(`/api/admin/analytics/export?days=${dateRange}`, {
      headers: {
        'x-admin-key': adminKey || ''
      }
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jugnu-analytics-${dateRange}days-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Successful',
        description: `Analytics data exported for last ${dateRange} days`,
      });
    } else {
      toast({
        title: 'Export Failed',
        description: 'Failed to export analytics data',
        variant: 'destructive'
      });
    }
  };

  // Login handler
  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const key = formData.get('adminKey') as string;
    if (key) {
      localStorage.setItem('adminKey', key);
      setIsAuthenticated(true);
      refetch();
    }
  };

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/40 border-copper-500/20">
          <CardHeader>
            <CardTitle className="text-white">Admin Analytics Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                name="adminKey"
                placeholder="Enter admin key"
                className="w-full px-4 py-2 bg-black/60 border border-copper-500/30 rounded-lg text-white"
                required
              />
              <Button type="submit" className="w-full bg-copper-600 hover:bg-copper-700">
                Access Analytics
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-white">Loading analytics...</div>
      </div>
    );
  }

  const analyticsData = data?.data || [];
  const summary = data?.summary || {
    totalVisitors: 0,
    totalPageviews: 0,
    avgVisitorsPerDay: 0,
    avgPageviewsPerDay: 0,
    liveVisitors: 0,
    daysAnalyzed: 0
  };

  // Prepare chart data
  const chartData = analyticsData.map(day => ({
    date: format(new Date(day.day), 'MMM d'),
    visitors: day.unique_visitors,
    pageviews: day.total_pageviews,
    newVisitors: day.new_visitors,
    returningVisitors: day.returning_visitors
  }));

  // Aggregate device data
  const deviceData = analyticsData.reduce((acc, day) => {
    acc.mobile += day.device_breakdown?.mobile || 0;
    acc.desktop += day.device_breakdown?.desktop || 0;
    acc.tablet += day.device_breakdown?.tablet || 0;
    return acc;
  }, { mobile: 0, desktop: 0, tablet: 0 });

  const deviceChartData = [
    { name: 'Mobile', value: deviceData.mobile, icon: Smartphone },
    { name: 'Desktop', value: deviceData.desktop, icon: Monitor },
    { name: 'Tablet', value: deviceData.tablet, icon: Tablet }
  ];

  // Aggregate top pages
  const topPagesMap = new Map<string, number>();
  analyticsData.forEach(day => {
    day.top_pages?.forEach(page => {
      topPagesMap.set(page.path, (topPagesMap.get(page.path) || 0) + page.views);
    });
  });
  const topPages = Array.from(topPagesMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }));

  return (
    <div className="min-h-screen bg-bg">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-white">Visitor Analytics Dashboard</h1>
            <div className="flex gap-4">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32 bg-black/40 border-copper-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-copper-500/30">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleExportCSV}
                className="bg-copper-600 hover:bg-copper-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                onClick={() => storeDailyMutation.mutate()}
                disabled={storeDailyMutation.isPending}
                className="bg-copper-600 hover:bg-copper-700"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Store Today's Data
              </Button>
            </div>
          </div>
          <div className="flex gap-4 text-sm text-white/60">
            {data?.lastSaved && (
              <div>
                Last saved: {new Date(data.lastSaved).toLocaleString('en-US', { 
                  timeZone: 'America/Los_Angeles',
                  dateStyle: 'short',
                  timeStyle: 'short'
                })} PST
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Auto-refreshes every minute (last: {lastRefresh.toLocaleTimeString('en-US', {
                timeZone: 'America/Los_Angeles',
                timeStyle: 'short'
              })} PST)
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-black/40 border-copper-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Live Visitors</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.liveVisitors}</div>
              <p className="text-xs text-white/60">Currently active</p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-copper-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Total Visitors</CardTitle>
              <Users className="h-4 w-4 text-copper-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.totalVisitors.toLocaleString()}</div>
              <p className="text-xs text-white/60">
                {dateRange === 'today' ? 'Today' : 
                 dateRange === 'yesterday' ? 'Yesterday' : 
                 `Last ${dateRange} days`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-copper-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Total Pageviews</CardTitle>
              <Eye className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.totalPageviews.toLocaleString()}</div>
              <p className="text-xs text-white/60">
                {dateRange === 'today' ? 'Today' : 
                 dateRange === 'yesterday' ? 'Yesterday' : 
                 `Last ${dateRange} days`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-copper-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Avg Daily Visitors</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.avgVisitorsPerDay}</div>
              <p className="text-xs text-white/60">
                {dateRange === 'today' || dateRange === 'yesterday' ? 
                  (dateRange === 'today' ? 'Today\'s total' : 'Yesterday\'s total') :
                  'Per day average'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Visitor Trend */}
          <Card className="bg-black/40 border-copper-500/20">
            <CardHeader>
              <CardTitle className="text-white">Visitor Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="date" stroke="#999" />
                  <YAxis stroke="#999" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #444' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="visitors" stroke="#f97316" strokeWidth={2} name="Unique Visitors" />
                  <Line type="monotone" dataKey="pageviews" stroke="#3b82f6" strokeWidth={2} name="Pageviews" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Device Breakdown */}
          <Card className="bg-black/40 border-copper-500/20">
            <CardHeader>
              <CardTitle className="text-white">Device Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deviceChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={(entry) => {
                      const percent = (entry.percent * 100).toFixed(0);
                      return percent > 0 ? `${entry.name} ${percent}%` : '';
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {deviceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Pages */}
        <Card className="bg-black/40 border-copper-500/20">
          <CardHeader>
            <CardTitle className="text-white">Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPages.map((page, index) => (
                <div key={page.path} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-copper-500 font-bold">#{index + 1}</span>
                    <span className="text-white">{page.path}</span>
                  </div>
                  <span className="text-white/60">{page.views.toLocaleString()} views</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* New vs Returning */}
        <Card className="bg-black/40 border-copper-500/20 mt-6">
          <CardHeader>
            <CardTitle className="text-white">New vs Returning Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="date" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #444' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="newVisitors" fill="#22c55e" name="New Visitors" />
                <Bar dataKey="returningVisitors" fill="#a855f7" name="Returning Visitors" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}