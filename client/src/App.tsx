import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Home from "@/pages/home";
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

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/explore" component={Explore} />
        <Route path="/events" component={EventsExplore} />
        <Route path="/community" component={CommunityRedirect} />
        <Route path="/events/feature" component={CommunityFeature} />
        <Route path="/community/feature" component={CommunityRedirect} />
        <Route path="/places" component={Places} />
        <Route path="/places/submit" component={PlacesSubmit} />
        <Route path="/saved" component={Saved} />
        <Route path="/waitlist" component={Waitlist} />
        <Route path="/thank-you" component={ThankYou} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
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
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
