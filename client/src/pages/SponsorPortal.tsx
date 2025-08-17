import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Eye, MousePointer, Calendar, Download, AlertCircle, Award, ExternalLink, Rocket, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PortalData {
  ok: boolean;
  campaign?: {
    name: string;
    sponsor_name: string;
    start_at: string;
    end_at: string;
  };
  totals?: {
    billable_impressions: number;
    raw_views: number;
    unique_users: number;
    clicks: number;
    ctr: number;
  };
  ctrBenchmark?: {
    percentile: number;
    badge: string;
    totalCampaigns: number;
    averageCtr: string;
  } | null;
  chartData?: Array<{
    date: string;
    billable_impressions: number;
    raw_views: number;
    unique_users: number;
    clicks: number;
    ctr: string;
  }>;
  last7Days?: Array<any>;
  last30Days?: Array<any>;
  error?: string;
}

export default function SponsorPortal() {
  const [, params] = useRoute('/sponsor/:tokenId');
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailSubscription, setEmailSubscription] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const tokenId = params?.tokenId;

  useEffect(() => {
    if (!tokenId) {
      setError('Invalid portal link');
      setLoading(false);
      return;
    }

    const fetchPortalData = async () => {
      try {
        const response = await fetch(`/api/spotlight/portal/${tokenId}`);
        const result = await response.json();
        
        if (!result.ok) {
          throw new Error(result.error || 'Failed to load portal data');
        }
        
        setData(result);
      } catch (err) {
        console.error('Portal data fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load portal data');
      } finally {
        setLoading(false);
      }
    };

    fetchPortalData();
  }, [tokenId]);

  const exportCSV = async () => {
    if (!tokenId) return;

    try {
      // Use the new CSV export endpoint
      const response = await fetch(`/api/spotlight/portal/${tokenId}/export.csv`);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('CSV export failed:', error);
        alert('Failed to export CSV. Please try again.');
        return;
      }

      // Get the CSV content
      const csvContent = await response.text();
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data?.campaign?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'campaign'}_analytics.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('CSV export error:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const handleNextCampaign = async () => {
    if (!tokenId) return;
    
    try {
      const response = await fetch(`/api/spotlight/portal/${tokenId}/campaign-details`);
      const result = await response.json();
      
      if (result.ok && result.campaign) {
        // Build URL with prefilled data
        const params = new URLSearchParams();
        Object.entries(result.campaign).forEach(([key, value]) => {
          if (value && typeof value === 'string') {
            params.set(key, value);
          } else if (Array.isArray(value)) {
            params.set(key, value.join(','));
          }
        });
        
        // Open promote page with prefilled form
        window.open(`/promote?${params.toString()}`, '_blank');
      }
    } catch (error) {
      console.error('Failed to load campaign details:', error);
      // Fallback to regular promote page
      window.open('/promote', '_blank');
    }
  };

  const handleWeeklySummary = async (subscribe: boolean) => {
    if (!tokenId || !emailSubscription.trim()) return;
    
    setSubscribing(true);
    try {
      const response = await fetch(`/api/spotlight/portal/${tokenId}/weekly-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailSubscription.trim(),
          subscribe
        })
      });
      
      const result = await response.json();
      if (result.ok) {
        alert(result.message);
        if (!subscribe) setEmailSubscription('');
      } else {
        alert('Failed to update subscription');
      }
    } catch (error) {
      console.error('Weekly summary subscription error:', error);
      alert('Failed to update subscription');
    } finally {
      setSubscribing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-copper-500/30 border-t-copper-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.ok) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-muted mb-6">
            {error || 'This portal link is invalid or has expired.'}
          </p>
          <Button
            onClick={() => window.location.href = '/'}
            className="bg-copper-500 hover:bg-copper-600 text-black"
          >
            Return to Homepage
          </Button>
        </div>
      </div>
    );
  }

  const { campaign, totals, chartData, last7Days } = data;

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <section className="py-12 border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                {campaign && (
                  <>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="font-fraunces text-3xl sm:text-4xl font-bold text-white">
                        {campaign.sponsor_name}
                      </h1>
                      <Badge variant="outline" className="text-copper-400 border-copper-500/50">
                        Sponsor Portal
                      </Badge>
                    </div>
                    <h2 className="font-fraunces text-xl text-white/80 mb-1">
                      {campaign.name}
                    </h2>
                    <p className="text-muted text-lg flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(campaign.start_at)} - {formatDate(campaign.end_at)}
                    </p>
                  </>
                )}
                {!campaign && (
                  <>
                    <h1 className="font-fraunces text-3xl sm:text-4xl font-bold text-white mb-2">
                      Campaign Analytics
                    </h1>
                    <p className="text-muted text-lg">
                      Real-time performance data for your Jugnu sponsorship
                    </p>
                  </>
                )}
              </div>
              <Button
                onClick={exportCSV}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                data-testid="export-csv"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {campaign && (
              <Card className="p-6 bg-white/5 border-white/10">
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="font-medium text-white mb-2">Campaign Name</h3>
                    <p className="text-muted">{campaign.name}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-white mb-2">Start Date</h3>
                    <p className="text-muted">{formatDate(campaign.start_at)}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-white mb-2">End Date</h3>
                    <p className="text-muted">{formatDate(campaign.end_at)}</p>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </section>
      {/* Key Metrics */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h2 className="font-fraunces text-2xl font-bold text-white mb-8">Overview</h2>
            
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {/* Impressions - Simplified single metric */}
              <Card className="p-6 bg-white/5 border-white/10" title="Total number of times your campaign was displayed to users."
                data-testid="impressions-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Eye className="w-6 h-6 text-blue-400" />
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    Views
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {(totals?.billable_impressions || totals?.raw_views || 0).toLocaleString()}
                </div>
                <p className="text-muted text-sm">Impressions</p>
              </Card>

              {/* Reach (Unique Users) */}
              <Card className="p-6 bg-white/5 border-white/10" title="Estimated number of unique users who viewed your campaign."
                data-testid="unique-users-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-400" />
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    Reach
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {totals?.unique_users.toLocaleString() || '0'}
                </div>
                <p className="text-muted text-sm">Unique Users</p>
              </Card>

              {/* Total Clicks & CTR */}
              <Card className="p-6 bg-white/5 border-white/10" data-testid="clicks-ctr-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <MousePointer className="w-6 h-6 text-green-400" />
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {totals?.ctr.toFixed(1) || '0.0'}% CTR
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {totals?.clicks.toLocaleString() || '0'}
                </div>
                <p className="text-muted text-sm">Total Clicks</p>
                
                {/* CTR Benchmark Badge */}
                {data?.ctrBenchmark?.badge && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-copper-400" />
                      <Badge className="bg-copper-500/20 text-copper-400 border-copper-500/30 text-xs">
                        {data.ctrBenchmark.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      Avg: {data.ctrBenchmark.averageCtr}% ({data.ctrBenchmark.totalCampaigns} campaigns)
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </motion.div>
        </div>
      </section>
      {/* Charts */}
      <section className="py-12 bg-white/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="font-fraunces text-2xl font-bold text-white mb-8">Performance Trends</h2>
            
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Impressions Chart */}
              <Card className="p-6 bg-white/5 border-white/10">
                <h3 className="font-medium text-white mb-6 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-400" />
                  Daily Billable Impressions
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="rgba(255,255,255,0.5)"
                        fontSize={12}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0,0,0,0.9)', 
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px'
                        }}
                        labelFormatter={(value) => formatDate(value)}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="billable_impressions" 
                        stroke="#3b82f6" 
                        fill="rgba(59, 130, 246, 0.2)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Clicks Chart */}
              <Card className="p-6 bg-white/5 border-white/10">
                <h3 className="font-medium text-white mb-6 flex items-center gap-2">
                  <MousePointer className="w-5 h-5 text-green-400" />
                  Daily Clicks
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="rgba(255,255,255,0.5)"
                        fontSize={12}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0,0,0,0.9)', 
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px'
                        }}
                        labelFormatter={(value) => formatDate(value)}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="clicks" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>
      {/* 7-Day Summary */}
      {last7Days && last7Days.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h2 className="font-fraunces text-2xl font-bold text-white mb-8">Last 7 Days</h2>
              
              <Card className="p-6 bg-white/5 border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-white font-medium py-3">Date</th>
                        <th className="text-right text-white font-medium py-3">Impressions</th>
                        <th className="text-right text-white font-medium py-3">Clicks</th>
                        <th className="text-right text-white font-medium py-3">CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {last7Days.map((day, index) => (
                        <tr key={index} className="border-b border-white/5">
                          <td className="py-3 text-muted">{formatDate(day.date)}</td>
                          <td className="py-3 text-right text-white">{day.impressions.toLocaleString()}</td>
                          <td className="py-3 text-right text-white">{day.clicks.toLocaleString()}</td>
                          <td className="py-3 text-right">
                            <Badge className={`${
                              parseFloat(day.ctr) >= 8 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : parseFloat(day.ctr) >= 5
                                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                            }`}>
                              {day.ctr}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>
      )}
      {/* Renewal and Support Section */}
      <section className="py-16 border-t border-white/10 bg-gradient-to-br from-copper-900/20 to-orange-900/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Plan Next Campaign */}
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-copper-500/20 rounded-xl flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-copper-400" />
                  </div>
                  <h3 className="font-fraunces text-2xl font-bold text-white">
                    Ready for Your Next Campaign?
                  </h3>
                </div>
                <p className="text-muted text-lg mb-6 leading-relaxed">
                  Launch another successful campaign with your proven settings. 
                  We'll prefill your application with your current campaign details 
                  to save you time.
                </p>
                <Button
                  onClick={handleNextCampaign}
                  className="bg-copper-500 hover:bg-copper-600 text-white font-medium px-8 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-copper-500/25"
                  data-testid="plan-next-campaign"
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  Plan Your Next Campaign
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Weekly Summary Subscription */}
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="font-fraunces text-2xl font-bold text-white">
                    Weekly Performance Updates
                  </h3>
                </div>
                <p className="text-muted text-lg mb-6 leading-relaxed">
                  Get campaign progress delivered to your inbox. Weekly summaries 
                  include impressions, clicks, CTR trends, and performance insights.
                </p>
                
                {/* Email subscription form - only show if feature is enabled */}
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <input
                      type="email"
                      placeholder="Enter your email for weekly updates"
                      value={emailSubscription}
                      onChange={(e) => setEmailSubscription(e.target.value)}
                      className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      data-testid="email-subscription-input"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleWeeklySummary(true)}
                      disabled={!emailSubscription.trim() || subscribing}
                      variant="outline"
                      className="flex-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                      data-testid="subscribe-weekly"
                    >
                      {subscribing ? 'Subscribing...' : 'Subscribe'}
                    </Button>
                    <Button
                      onClick={() => handleWeeklySummary(false)}
                      disabled={!emailSubscription.trim() || subscribing}
                      variant="outline"
                      className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                      data-testid="unsubscribe-weekly"
                    >
                      Unsubscribe
                    </Button>
                  </div>
                  <p className="text-xs text-muted">
                    Weekly emails sent only while your campaign is active. 
                    Unsubscribe anytime using your portal link.
                  </p>
                </div>
              </div>
            </div>

            {/* Support Contact */}
            <div className="mt-16 pt-8 border-t border-white/10 text-center">
              <p className="text-muted text-lg mb-4">
                Questions about your campaign performance or need help optimizing results?
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <a 
                  href="mailto:hello@jugnu.app" 
                  className="text-copper-400 hover:text-copper-300 transition-colors font-medium"
                >
                  hello@jugnu.app
                </a>
                <span className="text-white/30">•</span>
                <span className="text-muted">24-hour response time</span>
                <span className="text-white/30">•</span>
                <a 
                  href="/promote" 
                  target="_blank"
                  className="text-copper-400 hover:text-copper-300 transition-colors font-medium"
                >
                  View all packages
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}