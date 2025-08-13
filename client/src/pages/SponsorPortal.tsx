import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Eye, MousePointer, Calendar, Download, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PortalData {
  ok: boolean;
  campaign?: {
    name: string;
    start_at: string;
    end_at: string;
  };
  totals?: {
    impressions: number;
    clicks: number;
    ctr: number;
  };
  chartData?: Array<{
    date: string;
    impressions: number;
    clicks: number;
    ctr: string;
  }>;
  last7Days?: Array<any>;
  last30Days?: Array<any>;
  error?: string;
}

export default function SponsorPortal() {
  const [, params] = useRoute('/sponsor/:token');
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = params?.token;

  useEffect(() => {
    if (!token) {
      setError('Invalid portal link');
      setLoading(false);
      return;
    }

    const fetchPortalData = async () => {
      try {
        const response = await fetch(`/api/spotlight/portal/${token}`);
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
  }, [token]);

  const exportCSV = () => {
    if (!data?.chartData) return;

    const csvHeaders = ['Date', 'Impressions', 'Clicks', 'CTR (%)'];
    const csvRows = data.chartData.map(row => [
      row.date,
      row.impressions,
      row.clicks,
      row.ctr
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.campaign?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'campaign'}_analytics.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
                <h1 className="font-fraunces text-3xl sm:text-4xl font-bold text-white mb-2">
                  Campaign Analytics
                </h1>
                <p className="text-muted text-lg">
                  Real-time performance data for your Jugnu sponsorship
                </p>
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
              {/* Total Impressions */}
              <Card className="p-6 bg-white/5 border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Eye className="w-6 h-6 text-blue-400" />
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    Total
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {totals?.impressions.toLocaleString() || '0'}
                </div>
                <p className="text-muted text-sm">Total Impressions</p>
              </Card>

              {/* Total Clicks */}
              <Card className="p-6 bg-white/5 border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <MousePointer className="w-6 h-6 text-green-400" />
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Total
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {totals?.clicks.toLocaleString() || '0'}
                </div>
                <p className="text-muted text-sm">Total Clicks</p>
              </Card>

              {/* Click-Through Rate */}
              <Card className="p-6 bg-white/5 border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-copper-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-copper-400" />
                  </div>
                  <Badge className="bg-copper-500/20 text-copper-400 border-copper-500/30">
                    Average
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {totals?.ctr.toFixed(1) || '0.0'}%
                </div>
                <p className="text-muted text-sm">Click-Through Rate</p>
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
                  Daily Impressions
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
                        dataKey="impressions" 
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

      {/* Footer */}
      <section className="py-12 border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-muted mb-4">
            Questions about your campaign? Contact us at{' '}
            <a href="mailto:hello@jugnu.events" className="text-copper-400 hover:text-copper-300">
              hello@jugnu.events
            </a>
          </p>
          <Button
            onClick={() => window.location.href = '/promote'}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            Plan Your Next Campaign
          </Button>
        </div>
      </section>
    </div>
  );
}