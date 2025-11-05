import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, MapPin, Ticket, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

interface Order {
  id: string;
  eventId: string;
  buyerEmail: string;
  buyerName: string;
  status: string;
  subtotalCents: number;
  totalCents: number;
  createdAt: string;
  event: {
    id: string;
    title: string;
    startAt: string;
    venue: string;
    city: string;
    coverUrl: string | null;
  };
  ticketCount: number;
}

export function TicketsMyOrdersPage() {
  const { data: authData } = useQuery({ queryKey: ['/api/auth/me'] });
  const user = (authData as any)?.user;

  const { data: ordersData, isLoading, error } = useQuery<{ ok: boolean; orders: Order[] }>({
    queryKey: ['/api/tickets/my-orders'],
    enabled: !!user,
    retry: 1
  });

  const orders = ordersData?.orders || [];

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to view your orders</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/account/signup">
              <Button className="w-full">Sign In / Sign Up</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="heading-my-orders">My Ticket Orders</h1>
          <p className="text-muted-foreground">View and manage your event tickets</p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading your orders...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive mb-4">Failed to load orders</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Ticket className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Orders Yet</h3>
              <p className="text-muted-foreground mb-6">
                You haven't purchased any tickets yet
              </p>
              <Link href="/events">
                <Button>Browse Events</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow" data-testid={`order-card-${order.id}`}>
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Event Image */}
                    {order.event.coverUrl && (
                      <div className="md:w-48 h-48 md:h-auto relative overflow-hidden">
                        <img
                          src={order.event.coverUrl}
                          alt={order.event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Order Details */}
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1">{order.event.title}</h3>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(order.event.startAt), 'MMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {order.event.venue}, {order.event.city}
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={order.status === 'paid' ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {order.status === 'paid' ? 'Confirmed' : order.status}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Tickets</p>
                            <p className="font-semibold">{order.ticketCount}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="font-semibold">
                              ${(order.totalCents / 100).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Order Date</p>
                            <p className="font-semibold">
                              {format(new Date(order.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>

                        <Link href={`/tickets/order/success?orderId=${order.id}`}>
                          <Button variant="outline" size="sm" data-testid={`button-view-order-${order.id}`}>
                            View Tickets
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
