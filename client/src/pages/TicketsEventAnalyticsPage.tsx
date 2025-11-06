import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, DollarSign, Users, TrendingUp } from "lucide-react";

interface AnalyticsData {
  totalSales: number;
  totalRevenue: number;
  totalTickets: number;
  conversionRate: number;
}

export function TicketsEventAnalyticsPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const organizerId = localStorage.getItem('ticketsOrganizerId');
  
  // For now, we'll use placeholder data
  const mockAnalytics: AnalyticsData = {
    totalSales: 0,
    totalRevenue: 0,
    totalTickets: 0,
    conversionRate: 0
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="sm" 
            data-testid="button-back-dashboard"
            onClick={() => setLocation('/tickets')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
          <h1 className="text-3xl font-fraunces">Event Analytics</h1>
        </div>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-white">${mockAnalytics.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">Tickets Sold</p>
                  <p className="text-2xl font-bold text-white">{mockAnalytics.totalTickets}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">Total Orders</p>
                  <p className="text-2xl font-bold text-white">{mockAnalytics.totalSales}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">Conversion Rate</p>
                  <p className="text-2xl font-bold text-white">{mockAnalytics.conversionRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Sales Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Analytics Coming Soon</h3>
                <p className="text-gray-400 mb-4">
                  Detailed analytics dashboard with charts and insights will be available soon.
                </p>
                <p className="text-sm text-gray-500">
                  Event ID: {id}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Activity Feed</h3>
                <p className="text-gray-400 mb-4">
                  Recent ticket sales and customer activity will appear here.
                </p>
                <Button variant="outline" data-testid="button-refresh-analytics">
                  Refresh Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

