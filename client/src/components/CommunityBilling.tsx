import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Zap,
  Crown,
  Users,
  MessageSquare,
  BarChart3,
  Share2,
  Shield,
  Sparkles,
  Check,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionDashboard } from "@/components/SubscriptionDashboard";

interface BillingProps {
  communityId: string;
  communitySlug: string;
  isOwner: boolean;
}

interface Subscription {
  id: string;
  communityId: string;
  organizerId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  plan: 'free' | 'monthly' | 'yearly';
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | 'expired';
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAt?: string;
  canceledAt?: string;
  trialStart?: string;
  trialEnd?: string;
  trialDaysRemaining?: number;
  memberLimit: number;
  features?: any;
  metadata?: any;
  canManage: boolean;
  payments?: Payment[];
}

interface Payment {
  id: string;
  createdAt: string;
  amountPaid: number;
  currency: string;
  status: string;
  description?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  receiptUrl?: string;
  failureReason?: string;
}

const communityFeatures = [
  {
    icon: <Users className="w-5 h-5" />,
    title: "Member Management",
    description: "Add and manage community members with role-based permissions"
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Real-time Chat",
    description: "Engage members with instant messaging and group conversations"
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    title: "Event Planning",
    description: "Create and manage community events with calendar sync"
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Analytics Dashboard",
    description: "Track engagement, growth, and member activity"
  },
  {
    icon: <Share2 className="w-5 h-5" />,
    title: "Social Sharing",
    description: "Grow your community with invite links and social integration"
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Privacy Controls",
    description: "Secure your community with customizable privacy settings"
  },
];

export default function CommunityBilling({
  communityId,
  communitySlug,
  isOwner,
}: BillingProps) {
  if (!isOwner) {
    return (
      <Alert data-testid="alert-not-owner">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Only community owners can manage billing settings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      {/* Subscription & Credits Dashboard */}
      <SubscriptionDashboard />

      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">Your Community Features</h2>
          <p className="text-white/60">
            All features are included with your business account
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {communityFeatures.map((feature, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] p-5 hover:shadow-lg transition-all duration-300"
              data-testid={`feature-${index}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-copper-500/5 to-transparent opacity-100 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex p-2 rounded-lg bg-copper-100 dark:bg-copper-900/30 text-copper-700 dark:text-copper-300">
                    {feature.icon}
                  </div>
                  <CheckCircle className="w-5 h-5 text-jade-500" />
                </div>
                <h3 className="font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-white/60">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
