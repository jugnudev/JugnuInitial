import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Download,
  Clock,
  Server,
  Database,
  Mail,
  CreditCard,
  Wifi,
  Settings,
  Activity,
  MemoryStick,
  Timer,
  DollarSign
} from 'lucide-react';

interface TestCheck {
  status: 'pass' | 'fail' | 'warning';
  message: string;
  responseTime?: number;
  port?: number;
  missing?: string[];
  [key: string]: any;
}

interface SelfTestResult {
  ok: boolean;
  timestamp: string;
  checks: {
    database?: TestCheck;
    supabase?: TestCheck;
    stripe?: TestCheck;
    sendgrid?: TestCheck;
    websocket?: TestCheck;
    environment?: TestCheck;
    [key: string]: TestCheck | undefined;
  };
  metrics?: {
    totalCommunities?: number;
    activeSubscriptions?: number;
    totalMembers?: number;
    monthlyRevenue?: number;
    systemMemory?: {
      used: number;
      total: number;
    };
    uptime?: number;
    error?: string;
  };
}

interface SelfTestResultsProps {
  results: SelfTestResult;
  onClose: () => void;
  onRerun: () => void;
}

const getCheckIcon = (status: string) => {
  switch (status) {
    case 'pass':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'fail':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'warning':
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    default:
      return <AlertCircle className="w-5 h-5 text-gray-500" />;
  }
};

const getCheckLabel = (key: string) => {
  const labels: Record<string, string> = {
    database: 'Database Connection',
    supabase: 'Supabase Service',
    stripe: 'Stripe Payment Gateway',
    sendgrid: 'SendGrid Email Service',
    websocket: 'WebSocket Server',
    environment: 'Environment Variables'
  };
  return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

const getCheckIcon2 = (key: string) => {
  const icons: Record<string, any> = {
    database: Database,
    supabase: Server,
    stripe: CreditCard,
    sendgrid: Mail,
    websocket: Wifi,
    environment: Settings
  };
  const Icon = icons[key] || Server;
  return <Icon className="w-4 h-4" />;
};

const formatBytes = (bytes: number) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.length > 0 ? parts.join(' ') : 'Just started';
};

export default function SelfTestResults({ results, onClose, onRerun }: SelfTestResultsProps) {
  const [isOpen, setIsOpen] = useState(true);

  const exportToJSON = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selftest-results-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  const passCount = Object.values(results.checks).filter(c => c?.status === 'pass').length;
  const failCount = Object.values(results.checks).filter(c => c?.status === 'fail').length;
  const warningCount = Object.values(results.checks).filter(c => c?.status === 'warning').length;
  const totalChecks = Object.keys(results.checks).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl bg-black/95 border-copper-500/20 text-white max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-copper-500" />
              System Self-Test Results
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm"
                variant="outline"
                onClick={exportToJSON}
                className="border-copper-500/20"
                data-testid="button-export-json"
              >
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
              <Button 
                size="sm"
                onClick={onRerun}
                className="bg-copper-500 hover:bg-copper-600 text-black"
                data-testid="button-rerun-test"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Test Again
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          <div className="space-y-4">
            {/* Overall Status */}
            <Card className={`border-2 ${results.ok ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  {results.ok ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      <span className="text-green-500">All Systems Operational</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6 text-red-500" />
                      <span className="text-red-500">System Issues Detected</span>
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm">
                  <span className="text-white/60">
                    Timestamp: {new Date(results.timestamp).toLocaleString()}
                  </span>
                  <span className="text-green-500">
                    ✓ {passCount} passed
                  </span>
                  {failCount > 0 && (
                    <span className="text-red-500">
                      ✗ {failCount} failed
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="text-yellow-500">
                      ⚠ {warningCount} warnings
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Service Checks */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white mb-3">Service Health Checks</h3>
              {Object.entries(results.checks).map(([key, check]) => {
                if (!check) return null;
                
                return (
                  <Card key={key} className="bg-black/60 border-copper-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getCheckIcon(check.status)}
                          <div className="flex items-center gap-2">
                            {getCheckIcon2(key)}
                            <span className="font-medium text-white">
                              {getCheckLabel(key)}
                            </span>
                          </div>
                          <span className="text-white/60">
                            {check.message}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {check.responseTime && (
                            <div className="flex items-center gap-1 text-sm text-white/60">
                              <Clock className="w-3 h-3" />
                              {check.responseTime}ms
                            </div>
                          )}
                          {check.port && (
                            <Badge variant="outline" className="border-copper-500/20">
                              Port {check.port}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {check.missing && check.missing.length > 0 && (
                        <div className="mt-3 pl-8">
                          <div className="text-sm text-red-400">
                            Missing: {check.missing.join(', ')}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* System Metrics */}
            {results.metrics && !results.metrics.error && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white mb-3">System Metrics</h3>
                
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {results.metrics.totalCommunities !== undefined && (
                    <Card className="bg-black/60 border-copper-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                          <Server className="w-4 h-4" />
                          Total Communities
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {results.metrics.totalCommunities}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {results.metrics.activeSubscriptions !== undefined && (
                    <Card className="bg-black/60 border-copper-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                          <CreditCard className="w-4 h-4" />
                          Active Subscriptions
                        </div>
                        <div className="text-2xl font-bold text-green-500">
                          {results.metrics.activeSubscriptions}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {results.metrics.totalMembers !== undefined && (
                    <Card className="bg-black/60 border-copper-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                          <Activity className="w-4 h-4" />
                          Total Members
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {results.metrics.totalMembers}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {results.metrics.monthlyRevenue !== undefined && (
                    <Card className="bg-black/60 border-copper-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                          <DollarSign className="w-4 h-4" />
                          Monthly Revenue
                        </div>
                        <div className="text-2xl font-bold text-copper-500">
                          ${results.metrics.monthlyRevenue.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {results.metrics.systemMemory && (
                    <Card className="bg-black/60 border-copper-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                          <MemoryStick className="w-4 h-4" />
                          Memory Usage
                        </div>
                        <div className="text-lg font-bold text-white">
                          {formatBytes(results.metrics.systemMemory.used)}
                        </div>
                        <div className="text-sm text-white/60">
                          of {formatBytes(results.metrics.systemMemory.total)}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {results.metrics.uptime !== undefined && (
                    <Card className="bg-black/60 border-copper-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                          <Timer className="w-4 h-4" />
                          System Uptime
                        </div>
                        <div className="text-lg font-bold text-white">
                          {formatUptime(results.metrics.uptime)}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Error State for Metrics */}
            {results.metrics?.error && (
              <Alert className="bg-yellow-500/10 border-yellow-500/50">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <div className="text-white">
                  <strong>Metrics Error:</strong> {results.metrics.error}
                </div>
              </Alert>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}