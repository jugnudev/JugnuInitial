import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import FirefliesCounter from "@/components/FirefliesCounter";
import { useEffect } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import Home from "@/pages/home";
import Story from "@/pages/Story";
import Explore from "@/pages/Explore";
import EventsExplore from "@/pages/EventsExplore";
import CommunityRedirect from "@/pages/CommunityRedirect";
import CommunityFeature from "@/pages/CommunityFeature";
import Places from "@/pages/places";
import PlacesSubmit from "@/pages/PlacesSubmit";
import Saved from "@/pages/Saved";
import Waitlist from "@/pages/waitlist";
import ThankYou from "@/pages/thank-you";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import NotFound from "@/pages/not-found";
import DevPlacesSync from "@/pages/DevPlacesSync";
import Promote from "@/pages/Promote";
import SponsorPortal from "@/pages/SponsorPortal";
import AdminPromote from "@/pages/AdminPromote";
import AdminLeads from "@/pages/AdminLeads";
import AdminAnalytics from "@/pages/AdminAnalytics";
import Onboard from "@/pages/Onboard";
import Deals from "@/pages/Deals";
import { TicketsEventListPage } from "@/pages/TicketsEventListPage";
import { TicketsEventDetailPage } from "@/pages/TicketsEventDetailPage";
import { TicketsEventCreatePage } from "@/pages/TicketsEventCreatePage";
import { TicketsEventEditPage } from "@/pages/TicketsEventEditPage";
import { TicketsEventManagePage } from "@/pages/TicketsEventManagePage";
import { TicketsOrganizerDashboard } from "@/pages/TicketsOrganizerDashboard";
import { TicketsOrganizerConnect } from "@/pages/TicketsOrganizerConnect";
import { TicketsCheckinPage } from "@/pages/TicketsCheckinPage";
import { TicketsCheckinDashboard } from "@/pages/TicketsCheckinDashboard";
import { TicketsAttendeesPageEnhanced } from "@/pages/TicketsAttendeesPageEnhanced";
import { TicketsAnalyticsPage } from "@/pages/TicketsAnalyticsPage";
import { TicketsOrganizerPayouts } from "@/pages/TicketsOrganizerPayouts";
import { TicketsOrganizerSettings } from "@/pages/TicketsOrganizerSettings";
import { TicketsOrderSuccessPage } from "@/pages/TicketsOrderSuccessPage";
import { CommunitiesSigninPage } from "@/pages/CommunitiesSigninPage";
import { CommunitiesSignupPage } from "@/pages/CommunitiesSignupPage";
import { BusinessSignupPage } from "@/pages/BusinessSignupPage";
import { CommunitiesProfilePage } from "@/pages/CommunitiesProfilePage";
import { CommunitiesOrganizerApplicationPage } from "@/pages/CommunitiesOrganizerApplicationPage";
import CommunitiesIndexPage from "@/pages/CommunitiesIndexPage";
import EnhancedCommunityDetailPage from "@/pages/EnhancedCommunityDetailPage";
import AdminOrganizers from "@/pages/AdminOrganizers";
import AdminCommunitiesPage from "@/pages/AdminCommunitiesPage";
import NotificationCenter from "@/pages/NotificationCenter";
import AdminCareersPage from "@/pages/AdminCareersPage";
import CareersPage from "@/pages/CareersPage";
import LoyaltyLanding from "@/pages/LoyaltyLanding";
import WalletPage from "@/pages/WalletPage";
import WalletRedeemPage from "@/pages/WalletRedeemPage";
import BizLoyaltyHome from "@/pages/BizLoyaltyHome";
import BizLoyaltyIssue from "@/pages/BizLoyaltyIssue";
import TicketsMyTickets from "@/pages/TicketsMyTickets";
import TicketsViewTicket from "@/pages/TicketsViewTicket";
import TicketsLookup from "@/pages/TicketsLookup";
import PricingPage from "@/pages/PricingPage";
import SubscribePage from "@/pages/SubscribePage";
import OrganizerSubscribePage from "@/pages/OrganizerSubscribePage";
import AccountBillingPage from "@/pages/AccountBillingPage";
import SubscriptionSuccessPage from "@/pages/SubscriptionSuccessPage";

function Router() {
  // Track page views when routes change - Google Analytics integration
  useAnalytics();
  
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/story" component={Story} />
        <Route path="/deals" component={Deals} />
        <Route path="/loyalty" component={LoyaltyLanding} />
        <Route path="/wallet" component={WalletPage} />
        <Route path="/wallet/redeem" component={WalletRedeemPage} />
        <Route path="/biz/loyalty/home" component={BizLoyaltyHome} />
        <Route path="/biz/loyalty/issue" component={BizLoyaltyIssue} />
        <Route path="/explore" component={() => { window.location.href = '/events'; return null; }} />
        <Route path="/events" component={EventsExplore} />
        {/* Community routes - redirect to either new Communities feature or legacy redirect based on feature flag */}
        {import.meta.env.VITE_ENABLE_COMMUNITIES === 'true' ? (
          <>
            <Route path="/communities" component={CommunitiesIndexPage} />
            <Route path="/communities/:slug" component={EnhancedCommunityDetailPage} />
          </>
        ) : (
          <Route path="/community" component={CommunityRedirect} />
        )}
        <Route path="/events/feature" component={CommunityFeature} />
        <Route path="/community/feature" component={CommunityRedirect} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/subscribe/:communityId" component={SubscribePage} />
        <Route path="/promote" component={Promote} />
        <Route path="/promote/apply" component={Promote} />
        <Route path="/sponsor/:tokenId" component={SponsorPortal} />
        <Route path="/onboard/:token" component={Onboard} />
        <Route path="/admin/promote" component={AdminPromote} />
        <Route path="/admin/leads" component={AdminLeads} />
        <Route path="/admin/analytics" component={AdminAnalytics} />
        <Route path="/admin/careers" component={AdminCareersPage} />
        <Route path="/careers" component={CareersPage} />
        <Route path="/places" component={() => { window.location.href = '/events'; return null; }} />
        <Route path="/places/submit" component={() => { window.location.href = '/events'; return null; }} />
        <Route path="/saved" component={Saved} />
        <Route path="/waitlist" component={Waitlist} />
        <Route path="/thank-you" component={ThankYou} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/dev/places-sync" component={DevPlacesSync} />
        
        {/* Ticketing Routes - Only visible if ENABLE_TICKETING is true */}
        {import.meta.env.VITE_ENABLE_TICKETING === 'true' && (
          <>
            <Route path="/tickets" component={TicketsEventListPage} />
            <Route path="/tickets/event/:slug" component={TicketsEventDetailPage} />
            <Route path="/tickets/organizer/dashboard" component={TicketsOrganizerDashboard} />
            <Route path="/tickets/organizer/events/new" component={TicketsEventCreatePage} />
            <Route path="/tickets/organizer/events/:eventId/edit" component={TicketsEventEditPage} />
            <Route path="/tickets/organizer/events/:id" component={TicketsEventManagePage} />
            <Route path="/tickets/organizer/events/:eventId/checkin" component={TicketsCheckinDashboard} />
            <Route path="/tickets/organizer/events/:eventId/attendees" component={TicketsAttendeesPageEnhanced} />
            <Route path="/tickets/organizer/events/:eventId/analytics" component={TicketsAnalyticsPage} />
            {/* REMOVED: Separate organizer signup - redirect to business signup instead */}
            {/* <Route path="/tickets/organizer/signup" component={TicketsOrganizerSignup} /> */}
            <Route path="/tickets/organizer/connect" component={TicketsOrganizerConnect} />
            <Route path="/tickets/checkin" component={TicketsCheckinPage} />
            <Route path="/tickets/organizer/payouts" component={TicketsOrganizerPayouts} />
            <Route path="/tickets/organizer/settings" component={TicketsOrganizerSettings} />
            <Route path="/tickets/order/success" component={TicketsOrderSuccessPage} />
            <Route path="/tickets/my-tickets" component={TicketsMyTickets} />
            <Route path="/tickets/view/:ticketId" component={TicketsViewTicket} />
            <Route path="/tickets/lookup" component={TicketsLookup} />
          </>
        )}
        
        {/* Communities Authentication Routes - Only visible if ENABLE_COMMUNITIES is true */}
        {import.meta.env.VITE_ENABLE_COMMUNITIES === 'true' && (
          <>
            <Route path="/account" component={() => { window.location.href = '/account/signin'; return null; }} />
            <Route path="/account/signin" component={CommunitiesSigninPage} />
            <Route path="/account/signup" component={CommunitiesSignupPage} />
            <Route path="/business/signup" component={BusinessSignupPage} />
            <Route path="/account/profile" component={CommunitiesProfilePage} />
            <Route path="/account/billing" component={AccountBillingPage} />
            <Route path="/account/billing/success" component={SubscriptionSuccessPage} />
            <Route path="/account/subscribe" component={OrganizerSubscribePage} />
            <Route path="/account/apply-organizer" component={CommunitiesOrganizerApplicationPage} />
            <Route path="/admin/organizers" component={AdminOrganizers} />
            <Route path="/admin/communities" component={AdminCommunitiesPage} />
            <Route path="/admin/communities/selftest" component={AdminCommunitiesPage} />
            <Route path="/notifications" component={NotificationCenter} />
          </>
        )}
        
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <FirefliesCounter />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
