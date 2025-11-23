import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useEvents, useGallery } from "@/lib/events";
import logoImage from "@assets/Upscaled Logo copy_1754763190534.png";
import { Button } from "@/components/ui/button";
import { UserPlus, User, LogOut, Settings, Loader2, Shield, BarChart3, Receipt, Menu, X, Home, Calendar, Tag, Users, Megaphone, ChevronRight, Bell, Sparkles, Coins, DollarSign } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { BetaBadge } from "@/components/BetaBadge";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: events = [] } = useEvents();
  const { data: galleryImages = [] } = useGallery();
  
  // Check authentication state
  const { data: authData, isLoading: authLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const isAuthenticated = !!(authData as any)?.user;
  const user = (authData as any)?.user;

  // Sign out mutation that properly calls backend
  const signOutMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/auth/signout'),
    onSuccess: () => {
      // Clear auth cache and localStorage
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      localStorage.removeItem('community_auth_token');
      // Redirect to home
      window.location.href = '/';
    },
    onError: () => {
      // Even if backend fails, clear client state
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      localStorage.removeItem('community_auth_token');
      window.location.href = '/';
    }
  });
  
  // Determine what nav items to show
  const hasTicketsAvailable = events.some(event => 
    (event.buyUrl || event.eventbriteId || event.ticketTailorId) && !event.soldOut
  );
  const showEvents = hasTicketsAvailable;
  const showGallery = galleryImages.length > 0;
  const showCommunities = import.meta.env.VITE_ENABLE_COMMUNITIES === 'true';



  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-lg bg-bg/80 border-b border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/">
              <img 
                src={logoImage}
                alt="Jugnu - Find Your Frequency"
                className="h-8 cursor-pointer"
                data-testid="nav-logo"
              />
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex h-12 items-center gap-x-6">
              <Link
                href="/"
                className={`transition-colors duration-200 font-medium ${
                  location === '/' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-home"
              >
                Home
              </Link>
              <Link
                href="/story"
                className={`transition-colors duration-200 font-medium ${
                  location === '/story' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-story"
              >
                Story
              </Link>
              <Link
                href="/events"
                className={`transition-colors duration-200 font-medium ${
                  location === '/events' || location.startsWith('/explore')
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-events"
              >
                Events
              </Link>
              <Link
                href="/deals"
                className={`transition-colors duration-200 font-medium ${
                  location === '/deals' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-deals"
              >
                Deals
              </Link>
              {showCommunities && (
                <div className="flex items-center gap-2">
                  <Link
                    href="/communities"
                    className={`transition-colors duration-200 font-medium ${
                      location === '/communities' || location.startsWith('/communities/')
                        ? 'text-accent' 
                        : 'text-text hover:text-accent'
                    }`}
                    data-testid="nav-communities"
                  >
                    Communities
                  </Link>
                  <BetaBadge size="sm" variant="subtle" showIcon={false} />
                </div>
              )}
              <Link
                href="/promote"
                className={`transition-colors duration-200 font-medium ${
                  location === '/promote' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-promote"
              >
                Promote
              </Link>
              <Link
                href="/pricing"
                className={`transition-colors duration-200 font-medium ${
                  location === '/pricing' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-pricing"
              >
                Pricing
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  href="/loyalty"
                  className={`transition-colors duration-200 font-medium ${
                    location === '/loyalty' || location.startsWith('/loyalty/')
                      ? 'text-accent' 
                      : 'text-text hover:text-accent'
                  }`}
                  data-testid="nav-loyalty"
                >
                  Loyalty
                </Link>
                <ComingSoonBadge size="sm" variant="subtle" showIcon={false} />
              </div>
              
              {/* Notification Bell - Show for authenticated users */}
              {isAuthenticated && (
                <NotificationBell />
              )}
              
              {/* Authentication - Show different content based on auth state */}
              {authLoading ? (
                <div className="ml-4 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="ml-4 flex items-center gap-2 text-text hover:text-accent"
                      data-testid="nav-user-menu"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.profileImageUrl} />
                        <AvatarFallback className="bg-orange-500 text-white text-sm">
                          {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline font-medium">
                        {user?.firstName || 'Account'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-2">
                      <p className="text-sm font-medium text-foreground">
                        {user?.firstName && user?.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : user?.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account/profile" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/tickets/my-tickets" className="flex items-center gap-2 cursor-pointer" data-testid="nav-my-orders">
                        <Receipt className="h-4 w-4" />
                        My Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/profile#settings" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    
                    {/* Admin Menu Items - Only show for admin users */}
                    {(user?.role === 'admin' || user?.role === 'organizer') && (
                      <>
                        <DropdownMenuSeparator />
                        {user?.role === 'admin' && (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href="/admin/communities" className="flex items-center gap-2 cursor-pointer">
                                <Shield className="h-4 w-4" />
                                Admin Dashboard
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/admin/organizers" className="flex items-center gap-2 cursor-pointer">
                                <BarChart3 className="h-4 w-4" />
                                Manage Organizers
                              </Link>
                            </DropdownMenuItem>
                          </>
                        )}
                      </>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="flex items-center gap-2 text-red-600 focus:text-red-600 cursor-pointer"
                      onClick={() => signOutMutation.mutate()}
                      disabled={signOutMutation.isPending}
                    >
                      {signOutMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                      {signOutMutation.isPending ? 'Signing out...' : 'Sign Out'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/account/signup">
                  <Button 
                    className="ml-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-4 touch-target shadow-lg hover:shadow-xl transition-all duration-200 border-0"
                    data-testid="nav-signup"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Sign Up
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="relative p-2.5 rounded-xl bg-gradient-to-r from-[#c0580f]/10 to-[#d3541e]/10 backdrop-blur-md border border-white/10 hover:border-[#c0580f]/30 transition-all duration-300 shadow-lg hover:shadow-[#c0580f]/20"
              data-testid="nav-mobile-toggle"
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="h-5 w-5 text-white" />
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-gradient-to-r from-[#c0580f] to-[#d3541e] rounded-full animate-pulse" />
            </button>
          </div>
        </div>

        {/* Premium Mobile Navigation Sheet */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent 
            side="left" 
            className="w-[85%] max-w-sm p-0 bg-gradient-to-b from-[#0B0B0F] via-[#0B0B0F]/98 to-[#0B0B0F]/95 backdrop-blur-xl border-r border-white/10 [&>button]:hidden"
          >
            {/* Header with Logo */}
            <SheetHeader className="bg-gradient-to-r from-[#c0580f]/20 to-[#d3541e]/20 backdrop-blur-md border-b border-white/10 px-6 py-5">
              <SheetTitle className="flex items-center justify-between">
                <img 
                  src={logoImage}
                  alt="Jugnu"
                  className="h-8"
                />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5 text-white/70" />
                </button>
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1 h-[calc(100vh-80px)]">
              <div className="px-4 py-6">
                {/* Main Navigation Links */}
                <nav className="space-y-1">
                  <Link
                    href="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 touch-target ${
                      location === '/' 
                        ? 'bg-gradient-to-r from-[#c0580f]/20 to-[#d3541e]/20 text-[#d3541e] border border-[#c0580f]/20' 
                        : 'hover:bg-white/5 text-white/90 hover:text-white'
                    }`}
                    data-testid="nav-mobile-home"
                  >
                    <Home className="h-5 w-5" />
                    <span className="font-medium text-base">Home</span>
                  </Link>

                  <Link
                    href="/story"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 touch-target ${
                      location === '/story' 
                        ? 'bg-gradient-to-r from-[#c0580f]/20 to-[#d3541e]/20 text-[#d3541e] border border-[#c0580f]/20' 
                        : 'hover:bg-white/5 text-white/90 hover:text-white'
                    }`}
                    data-testid="nav-mobile-story"
                  >
                    <Sparkles className="h-5 w-5" />
                    <span className="font-medium text-base">Story</span>
                  </Link>

                  <Link
                    href="/events"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 touch-target ${
                      location === '/events' || location.startsWith('/explore')
                        ? 'bg-gradient-to-r from-[#c0580f]/20 to-[#d3541e]/20 text-[#d3541e] border border-[#c0580f]/20' 
                        : 'hover:bg-white/5 text-white/90 hover:text-white'
                    }`}
                    data-testid="nav-mobile-events"
                  >
                    <Calendar className="h-5 w-5" />
                    <span className="font-medium text-base">Events</span>
                  </Link>

                  <Link
                    href="/deals"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 touch-target ${
                      location === '/deals' 
                        ? 'bg-gradient-to-r from-[#c0580f]/20 to-[#d3541e]/20 text-[#d3541e] border border-[#c0580f]/20' 
                        : 'hover:bg-white/5 text-white/90 hover:text-white'
                    }`}
                    data-testid="nav-mobile-deals"
                  >
                    <Tag className="h-5 w-5" />
                    <span className="font-medium text-base">Deals</span>
                  </Link>

                  {showCommunities && (
                    <Link
                      href="/communities"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 touch-target ${
                        location === '/communities' || location.startsWith('/communities/')
                          ? 'bg-gradient-to-r from-[#c0580f]/20 to-[#d3541e]/20 text-[#d3541e] border border-[#c0580f]/20' 
                          : 'hover:bg-white/5 text-white/90 hover:text-white'
                      }`}
                      data-testid="nav-mobile-communities"
                    >
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Users className="h-5 w-5" />
                        <span className="font-medium text-base">Communities</span>
                      </div>
                      <BetaBadge size="sm" variant="subtle" showIcon={false} />
                    </Link>
                  )}

                  <Link
                    href="/promote"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 touch-target ${
                      location === '/promote' 
                        ? 'bg-gradient-to-r from-[#c0580f]/20 to-[#d3541e]/20 text-[#d3541e] border border-[#c0580f]/20' 
                        : 'hover:bg-white/5 text-white/90 hover:text-white'
                    }`}
                    data-testid="nav-mobile-promote"
                  >
                    <Megaphone className="h-5 w-5" />
                    <span className="font-medium text-base">Promote</span>
                  </Link>

                  <Link
                    href="/pricing"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 touch-target ${
                      location === '/pricing' 
                        ? 'bg-gradient-to-r from-[#c0580f]/20 to-[#d3541e]/20 text-[#d3541e] border border-[#c0580f]/20' 
                        : 'hover:bg-white/5 text-white/90 hover:text-white'
                    }`}
                    data-testid="nav-mobile-pricing"
                  >
                    <DollarSign className="h-5 w-5" />
                    <span className="font-medium text-base">Pricing</span>
                  </Link>

                  <Link
                    href="/loyalty"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 touch-target ${
                      location === '/loyalty' || location.startsWith('/loyalty/')
                        ? 'bg-gradient-to-r from-[#c0580f]/20 to-[#d3541e]/20 text-[#d3541e] border border-[#c0580f]/20' 
                        : 'hover:bg-white/5 text-white/90 hover:text-white'
                    }`}
                    data-testid="nav-mobile-loyalty"
                  >
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Coins className="h-5 w-5" />
                      <span className="font-medium text-base">Loyalty</span>
                    </div>
                    <ComingSoonBadge size="sm" variant="subtle" showIcon={false} />
                  </Link>
                </nav>

                {/* Separator */}
                <Separator className="my-6 bg-white/10" />

                {/* User Section */}
                {authLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#c0580f]" />
                    <span className="ml-2 text-sm text-white/60">Loading...</span>
                  </div>
                ) : isAuthenticated ? (
                  <div className="space-y-4">
                    {/* User Profile Card */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-[#c0580f]/10 to-[#d3541e]/10 backdrop-blur-sm border border-white/10">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-12 w-12 border-2 border-[#c0580f]/30">
                          <AvatarImage src={user?.profileImageUrl} />
                          <AvatarFallback className="bg-gradient-to-r from-[#c0580f] to-[#d3541e] text-white text-sm font-semibold">
                            {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">
                            {user?.firstName && user?.lastName 
                              ? `${user.firstName} ${user.lastName}`
                              : 'Guest User'}
                          </p>
                          <p className="text-xs text-white/60 truncate">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Profile Actions */}
                    <nav className="space-y-1">
                      <Link
                        href="/account/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white/90 hover:text-white transition-all duration-200 touch-target"
                        data-testid="nav-mobile-profile"
                      >
                        <User className="h-5 w-5" />
                        <span className="font-medium text-base">Profile</span>
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </Link>

                      <Link
                        href="/tickets/my-tickets"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white/90 hover:text-white transition-all duration-200 touch-target"
                        data-testid="nav-mobile-orders"
                      >
                        <Receipt className="h-5 w-5" />
                        <span className="font-medium text-base">My Orders</span>
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </Link>

                      <Link
                        href="/notifications"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white/90 hover:text-white transition-all duration-200 touch-target"
                        data-testid="nav-mobile-notifications"
                      >
                        <Bell className="h-5 w-5" />
                        <span className="font-medium text-base">Notifications</span>
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </Link>

                      <Link
                        href="/account/profile#settings"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white/90 hover:text-white transition-all duration-200 touch-target"
                        data-testid="nav-mobile-settings"
                      >
                        <Settings className="h-5 w-5" />
                        <span className="font-medium text-base">Settings</span>
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </Link>
                    </nav>

                    {/* Admin Section */}
                    {(user?.role === 'admin' || user?.role === 'organizer') && (
                      <>
                        <Separator className="my-4 bg-white/10" />
                        <nav className="space-y-1">
                          {user?.role === 'admin' && (
                            <>
                              <Link
                                href="/admin/communities"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white/90 hover:text-white transition-all duration-200 touch-target"
                              >
                                <Shield className="h-5 w-5" />
                                <span className="font-medium text-base">Admin Dashboard</span>
                                <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                              </Link>
                              <Link
                                href="/admin/organizers"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white/90 hover:text-white transition-all duration-200 touch-target"
                              >
                                <BarChart3 className="h-5 w-5" />
                                <span className="font-medium text-base">Manage Organizers</span>
                                <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                              </Link>
                            </>
                          )}
                        </nav>
                      </>
                    )}

                    {/* Sign Out Button */}
                    <Separator className="my-4 bg-white/10" />
                    <Button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        signOutMutation.mutate();
                      }}
                      disabled={signOutMutation.isPending}
                      className="w-full h-12 bg-gradient-to-r from-[#c0580f] to-[#d3541e] hover:from-[#d3541e] hover:to-[#c0580f] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 touch-target"
                      data-testid="nav-mobile-signout"
                    >
                      {signOutMutation.isPending ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Signing out...
                        </>
                      ) : (
                        <>
                          <LogOut className="h-5 w-5 mr-2" />
                          Sign Out
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Link href="/account/signup" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button 
                        className="w-full h-12 bg-gradient-to-r from-[#c0580f] to-[#d3541e] hover:from-[#d3541e] hover:to-[#c0580f] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 border-0"
                        data-testid="nav-mobile-signup"
                      >
                        <UserPlus className="h-5 w-5 mr-2" />
                        Sign Up
                      </Button>
                    </Link>
                    <Link href="/account/signin" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button 
                        variant="outline"
                        className="w-full h-12 border-white/20 hover:border-[#c0580f]/50 text-white hover:text-[#d3541e] hover:bg-[#c0580f]/10"
                        data-testid="nav-mobile-signin"
                      >
                        Sign In
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
