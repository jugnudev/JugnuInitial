import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import {
  TrendingUp, TrendingDown, Users, DollarSign, 
  Clock, Calendar, Download, Filter, ChevronRight,
  BarChart3, PieChart, Activity, RefreshCw,
  UserCheck, Ticket, AlertCircle, XCircle, ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import Papa from "papaparse";

interface AnalyticsData {
  summary: {
    totalTicketsSold: number;
    totalRevenue: number;
    averageTicketPrice: number;
    conversionRate: number;
    refundRate: number;
    checkInRate: number;
  };
  salesOverTime: Array<{
    date: string;
    tickets: number;
    revenue: number;
  }>;
  revenueByTier: Array<{
    name: string;
    revenue: number;
    ticketsSold: number;
    percentage: number;
  }>;
  checkInPatterns: Array<{
    hour: string;
    count: number;
  }>;
  refundStats: {
    totalRefunds: number;
    refundedAmount: number;
    reasons: Array<{
      reason: string;
      count: number;
    }>;
  };
  attendeeDemographics: {
    topCities?: Array<{ city: string; count: number }>;
    emailDomains: Array<{ domain: string; count: number }>;
    purchaseTimes: Array<{ hour: string; count: number }>;
  };
  comparisonData?: {
    lastPeriod: {
      ticketsSold: number;
      revenue: number;
    };
    change: {
      tickets: number;
      revenue: number;
    };
  };
}

// Copper-themed chart colors matching the app's aesthetic
const COLORS = ['#c0580f', '#FF8A47', '#a04a0c', '#f59e0b', '#ef4444', '#10b981', '#3b82f6'];

export function TicketsAnalyticsPage() {
  const [, params] = useRoute("/tickets/organizer/events/:eventId/analytics");
  const [, navigate] = useLocation();
  const eventId = params?.eventId;
  const { toast } = useToast();
  
  const [dateRange, setDateRange] = useState("last7days");
  const [compareMode, setCompareMode] = useState(false);
  
  console.log('[Analytics] Component mounted, eventId:', eventId, 'params:', params);
  
  // Fetch event details
  const { data: event } = useQuery<{ event: { title: string } }>({
    queryKey: ['/api/tickets/events', eventId],
    enabled: !!eventId
  });
  
  // Fetch analytics data
  const { data: analytics, isLoading, error, refetch } = useQuery<AnalyticsData>({
    queryKey: ['/api/tickets/events', eventId, 'analytics', dateRange],
    queryFn: async () => {
      console.log('[Analytics] Fetching analytics for eventId:', eventId, 'dateRange:', dateRange);
      const response = await fetch(`/api/tickets/events/${eventId}/analytics?period=${dateRange}`);
      console.log('[Analytics] Response status:', response.status, response.ok);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Analytics] API error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }
      const data = await response.json();
      console.log('[Analytics] Response data:', data);
      return data.analytics; // Extract the analytics object from the response
    },
    enabled: !!eventId
  });
  
  console.log('[Analytics] Query state - analytics:', analytics, 'isLoading:', isLoading, 'error:', error);
  
  // Export analytics data
  const handleExport = (format: 'csv' | 'json') => {
    if (!analytics) return;
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `analytics-${eventId}-${Date.now()}.json`;
      link.click();
    } else {
      // Convert to CSV format
      const csvData = {
        summary: [analytics.summary],
        salesOverTime: analytics.salesOverTime,
        revenueByTier: analytics.revenueByTier,
        checkInPatterns: analytics.checkInPatterns
      };
      
      // Create multiple CSV sheets
      const summaryCSV = Papa.unparse(csvData.summary);
      const salesCSV = Papa.unparse(csvData.salesOverTime);
      const revenueCSV = Papa.unparse(csvData.revenueByTier);
      const checkInCSV = Papa.unparse(csvData.checkInPatterns);
      
      const combinedCSV = `Summary\n${summaryCSV}\n\nSales Over Time\n${salesCSV}\n\nRevenue by Tier\n${revenueCSV}\n\nCheck-in Patterns\n${checkInCSV}`;
      
      const blob = new Blob([combinedCSV], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `analytics-${eventId}-${Date.now()}.csv`;
      link.click();
    }
    
    toast({
      title: "Export Complete",
      description: `Analytics exported as ${format.toUpperCase()}`
    });
  };
  
  // Calculate trend percentages
  const getTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };
  
  if (!eventId) return null;
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate('/tickets/organizer/dashboard');
                }
              }}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-back-to-manage"
              aria-label="Back to manage events"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-fraunces mb-2">Event Analytics</h1>
              <p className="text-muted-foreground">{event?.event?.title}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="allTime">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={() => refetch()}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <Button
              variant="outline"
              onClick={() => navigate(`/tickets/organizer/events/${eventId}/attendees`)}
            >
              <Users className="h-4 w-4 mr-2" />
              Attendees
            </Button>
            
            <Button
              onClick={() => handleExport('csv')}
              data-testid="button-export"
              className="bg-copper hover:bg-copper-dark text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading analytics...</div>
          </div>
        ) : analytics ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${(analytics.summary.totalRevenue / 100).toFixed(2)}
                  </div>
                  {analytics.comparisonData && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      {analytics.comparisonData.change.revenue > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                      )}
                      <span className={analytics.comparisonData.change.revenue > 0 ? "text-green-600" : "text-red-600"}>
                        {Math.abs(analytics.comparisonData.change.revenue).toFixed(1)}%
                      </span>
                      <span className="ml-1">vs last period</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.summary.totalTicketsSold}</div>
                  {analytics.comparisonData && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      {analytics.comparisonData.change.tickets > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                      )}
                      <span className={analytics.comparisonData.change.tickets > 0 ? "text-green-600" : "text-red-600"}>
                        {Math.abs(analytics.comparisonData.change.tickets).toFixed(1)}%
                      </span>
                      <span className="ml-1">vs last period</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Check-in Rate</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.summary.checkInRate.toFixed(1)}%</div>
                  <Progress 
                    value={analytics.summary.checkInRate} 
                    className="mt-2 [&>div]:bg-copper" 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Refund Rate</CardTitle>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.summary.refundRate.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">
                    {analytics.refundStats.totalRefunds} refunds processed
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Analytics Tabs */}
            <Tabs defaultValue="sales" className="space-y-4">
              <TabsList className="bg-charcoal-800/50 border border-charcoal-700 p-1">
                <TabsTrigger 
                  value="sales"
                  className="data-[state=active]:bg-copper data-[state=active]:text-white data-[state=active]:shadow-lg"
                  data-testid="tab-sales"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Sales
                </TabsTrigger>
                <TabsTrigger 
                  value="revenue"
                  className="data-[state=active]:bg-copper data-[state=active]:text-white data-[state=active]:shadow-lg"
                  data-testid="tab-revenue"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Revenue
                </TabsTrigger>
                <TabsTrigger 
                  value="checkins"
                  className="data-[state=active]:bg-copper data-[state=active]:text-white data-[state=active]:shadow-lg"
                  data-testid="tab-checkins"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Check-ins
                </TabsTrigger>
                <TabsTrigger 
                  value="refunds"
                  className="data-[state=active]:bg-copper data-[state=active]:text-white data-[state=active]:shadow-lg"
                  data-testid="tab-refunds"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Refunds
                </TabsTrigger>
                <TabsTrigger 
                  value="demographics"
                  className="data-[state=active]:bg-copper data-[state=active]:text-white data-[state=active]:shadow-lg"
                  data-testid="tab-demographics"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Demographics
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="sales" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Over Time</CardTitle>
                    <CardDescription>
                      Daily ticket sales for the selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analytics.salesOverTime}>
                        <defs>
                          <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c0580f" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#c0580f" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-charcoal-700" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                          className="text-muted-foreground"
                        />
                        <YAxis className="text-muted-foreground" />
                        <Tooltip 
                          labelFormatter={(value) => format(new Date(value), 'MMMM dd, yyyy')}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="tickets" 
                          stroke="#c0580f" 
                          fillOpacity={1} 
                          fill="url(#colorTickets)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Average Ticket Price</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ${(analytics.summary.averageTicketPrice / 100).toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Conversion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics.summary.conversionRate.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Peak Sales Day</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics.salesOverTime.length > 0 
                          ? format(new Date(
                              analytics.salesOverTime.reduce((max, day) => 
                                day.tickets > max.tickets ? day : max
                              ).date
                            ), 'MMM dd')
                          : 'N/A'
                        }
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="revenue" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Ticket Tier</CardTitle>
                    <CardDescription>
                      Breakdown of revenue contribution by tier
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsChart>
                        <Pie
                          data={analytics.revenueByTier}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.percentage.toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="revenue"
                        >
                          {analytics.revenueByTier.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `$${(value / 100).toFixed(2)}`} />
                      </RechartsChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Tier Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.revenueByTier.map((tier, index) => (
                        <div key={tier.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="font-medium">{tier.name}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {tier.ticketsSold} tickets • ${(tier.revenue / 100).toFixed(2)}
                            </div>
                          </div>
                          <Progress value={tier.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="checkins" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Check-in Patterns</CardTitle>
                    <CardDescription>
                      Hourly distribution of attendee check-ins
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.checkInPatterns}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-charcoal-700" />
                        <XAxis dataKey="hour" className="text-muted-foreground" />
                        <YAxis className="text-muted-foreground" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="count" fill="#c0580f" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Peak Check-in Hour</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics.checkInPatterns.length > 0
                          ? analytics.checkInPatterns.reduce((max, hour) => 
                              hour.count > max.count ? hour : max
                            ).hour
                          : 'N/A'
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Most attendees arrived at this time
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Check-in Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Checked In</span>
                          <span className="font-bold">{analytics.summary.checkInRate.toFixed(0)}%</span>
                        </div>
                        <Progress value={analytics.summary.checkInRate} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="refunds" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Total Refunds</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.refundStats.totalRefunds}</div>
                      <div className="text-sm text-muted-foreground">
                        {analytics.summary.refundRate.toFixed(1)}% of total sales
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Refunded Amount</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ${(analytics.refundStats.refundedAmount / 100).toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Average Refund</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ${analytics.refundStats.totalRefunds > 0
                          ? ((analytics.refundStats.refundedAmount / analytics.refundStats.totalRefunds) / 100).toFixed(2)
                          : '0.00'
                        }
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {analytics.refundStats.reasons.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Refund Reasons</CardTitle>
                      <CardDescription>
                        Most common reasons for refunds
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.refundStats.reasons.map((reason) => (
                          <div key={reason.reason} className="flex items-center justify-between">
                            <span className="text-sm">{reason.reason || 'No reason provided'}</span>
                            <Badge variant="secondary">{reason.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="demographics" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Purchase Times</CardTitle>
                      <CardDescription>
                        When attendees typically buy tickets
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={analytics.attendeeDemographics.purchaseTimes}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Email Domains</CardTitle>
                      <CardDescription>
                        Most common attendee email domains
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.attendeeDemographics.emailDomains.slice(0, 5).map((domain, index) => (
                          <div key={domain.domain} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-muted-foreground">
                                #{index + 1}
                              </span>
                              <span className="text-sm">{domain.domain}</span>
                            </div>
                            <Badge variant="secondary">{domain.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {analytics.attendeeDemographics.topCities && analytics.attendeeDemographics.topCities.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Geographic Distribution</CardTitle>
                      <CardDescription>
                        Top cities where attendees are from
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.attendeeDemographics.topCities.map((city, index) => (
                          <div key={city.city} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-muted-foreground">
                                #{index + 1}
                              </span>
                              <span className="text-sm">{city.city}</span>
                            </div>
                            <Badge variant="secondary">{city.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
            
            {/* Export Section */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Export Analytics</CardTitle>
                <CardDescription>
                  Download analytics data for external analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleExport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export as CSV
                  </Button>
                  <Button variant="outline" onClick={() => handleExport('json')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export as JSON
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No analytics data available</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}