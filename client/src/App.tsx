import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import FirefliesCounter from "@/components/FirefliesCounter";
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

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/story" component={Story} />
        <Route path="/deals" component={Deals} />
        <Route path="/explore" component={() => { window.location.href = '/events'; return null; }} />
        <Route path="/events" component={EventsExplore} />
        <Route path="/community" component={CommunityRedirect} />
        <Route path="/events/feature" component={CommunityFeature} />
        <Route path="/community/feature" component={CommunityRedirect} />
        <Route path="/promote" component={Promote} />
        <Route path="/promote/apply" component={Promote} />
        <Route path="/sponsor/:tokenId" component={SponsorPortal} />
        <Route path="/onboard/:token" component={Onboard} />
        <Route path="/admin/promote" component={AdminPromote} />
        <Route path="/admin/leads" component={AdminLeads} />
        <Route path="/admin/analytics" component={AdminAnalytics} />
        <Route path="/places" component={() => { window.location.href = '/events'; return null; }} />
        <Route path="/places/submit" component={() => { window.location.href = '/events'; return null; }} />
        <Route path="/saved" component={Saved} />
        <Route path="/waitlist" component={Waitlist} />
        <Route path="/thank-you" component={ThankYou} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/dev/places-sync" component={DevPlacesSync} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <FirefliesCounter />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
