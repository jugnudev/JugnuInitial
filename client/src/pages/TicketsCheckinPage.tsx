import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Camera, CheckCircle, XCircle, Scan } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface CheckinResult {
  ok: boolean;
  status: 'valid' | 'invalid' | 'used' | 'refunded';
  ticket?: {
    id: string;
    serial: string;
    tierName: string;
    eventTitle: string;
    buyerName: string;
    buyerEmail: string;
  };
  error?: string;
}

export function TicketsCheckinPage() {
  const [qrToken, setQrToken] = useState("");
  const [eventId, setEventId] = useState("");
  const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
  const { toast } = useToast();

  const validateMutation = useMutation({
    mutationFn: async ({ qrToken, eventId }: { qrToken: string; eventId: string }) => {
      const response = await fetch('/api/tickets/validate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken, eventId })
      });
      return response.json();
    },
    onSuccess: (data) => {
      setLastResult(data);
      if (data.ok && data.status === 'valid') {
        toast({
          title: "Valid Ticket",
          description: `${data.ticket?.tierName} for ${data.ticket?.eventTitle}`
        });
      }
    }
  });

  const checkinMutation = useMutation({
    mutationFn: async ({ qrToken, eventId }: { qrToken: string; eventId: string }) => {
      const response = await fetch('/api/tickets/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken, eventId, checkInBy: 'staff' })
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({
          title: "Check-in Successful",
          description: "Ticket has been checked in successfully"
        });
        setQrToken("");
        setLastResult(null);
      } else {
        toast({
          title: "Check-in Failed",
          description: data.error || "Failed to check in ticket",
          variant: "destructive"
        });
      }
    }
  });

  const handleValidate = () => {
    if (!qrToken || !eventId) {
      toast({
        title: "Missing Information",
        description: "Please enter both QR token and event ID",
        variant: "destructive"
      });
      return;
    }
    validateMutation.mutate({ qrToken, eventId });
  };

  const handleCheckin = () => {
    if (!qrToken || !eventId) return;
    checkinMutation.mutate({ qrToken, eventId });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800">Valid</Badge>;
      case 'used':
        return <Badge variant="secondary">Already Used</Badge>;
      case 'refunded':
        return <Badge variant="outline">Refunded</Badge>;
      case 'invalid':
        return <Badge variant="destructive">Invalid</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-fraunces mb-2">Check-in App</h1>
            <p className="text-lg text-muted-foreground">
              Scan or validate tickets for your event
            </p>
          </div>

          {/* Check-in Form */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="w-5 h-5" />
                Ticket Validation
              </CardTitle>
              <CardDescription>
                Enter QR token manually or scan with camera
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="eventId">Event ID</Label>
                <Input
                  id="eventId"
                  placeholder="Enter event ID"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  data-testid="input-event-id"
                />
              </div>
              
              <div>
                <Label htmlFor="qrToken">QR Token</Label>
                <Input
                  id="qrToken"
                  placeholder="Scan QR code or enter token manually"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  data-testid="input-qr-token"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleValidate}
                  disabled={validateMutation.isPending || !qrToken || !eventId}
                  className="flex-1"
                  data-testid="button-validate"
                >
                  {validateMutation.isPending ? "Validating..." : "Validate Ticket"}
                </Button>
                
                <Button variant="outline" className="px-3" data-testid="button-camera">
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Validation Result */}
          {lastResult && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {lastResult.status === 'valid' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  Ticket Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    {getStatusBadge(lastResult.status)}
                  </div>
                  
                  {lastResult.ticket && (
                    <>
                      <div>
                        <span className="font-medium">Event:</span>
                        <span className="ml-2">{lastResult.ticket.eventTitle}</span>
                      </div>
                      <div>
                        <span className="font-medium">Tier:</span>
                        <span className="ml-2">{lastResult.ticket.tierName}</span>
                      </div>
                      <div>
                        <span className="font-medium">Buyer:</span>
                        <span className="ml-2">{lastResult.ticket.buyerName}</span>
                      </div>
                      <div>
                        <span className="font-medium">Email:</span>
                        <span className="ml-2">{lastResult.ticket.buyerEmail}</span>
                      </div>
                    </>
                  )}
                  
                  {lastResult.error && (
                    <div className="text-red-600">
                      <span className="font-medium">Error:</span>
                      <span className="ml-2">{lastResult.error}</span>
                    </div>
                  )}
                  
                  {lastResult.status === 'valid' && (
                    <Button
                      onClick={handleCheckin}
                      disabled={checkinMutation.isPending}
                      className="w-full"
                      data-testid="button-checkin"
                    >
                      {checkinMutation.isPending ? "Checking In..." : "Check In Ticket"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>How to Use</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Enter the Event ID for the event you're managing</li>
                <li>Scan the QR code on a ticket or enter the token manually</li>
                <li>Click "Validate Ticket" to check the ticket status</li>
                <li>If valid, click "Check In Ticket" to mark as used</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}