import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useEvents, useGallery } from "@/lib/events";
import logoImage from "@assets/Upscaled Logo copy_1754763190534.png";
import { Button } from "@/components/ui/button";
import { UserPlus, User, LogOut, Settings, Loader2, Shield, BarChart3 } from "lucide-react";
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
                href="/waitlist"
                className={`transition-colors duration-200 font-medium ${
                  location === '/waitlist' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-waitlist"
              >
                Join
              </Link>
              
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
                    size="sm" 
                    className="ml-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200 border-0"
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
              className="text-text hover:text-accent focus-ring p-2 transition-colors duration-200"
              data-testid="nav-mobile-toggle"
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-bg/95 backdrop-blur-lg border-t border-white/10">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/"
                className={`block w-full text-left px-3 py-2 transition-colors duration-200 font-medium ${
                  location === '/' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-mobile-home"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/story"
                className={`block w-full text-left px-3 py-2 transition-colors duration-200 font-medium ${
                  location === '/story' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-mobile-story"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Story
              </Link>
              <Link
                href="/events"
                className={`block w-full text-left px-3 py-2 transition-colors duration-200 font-medium ${
                  location === '/events' || location.startsWith('/explore')
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-mobile-events"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Events
              </Link>
              <Link
                href="/deals"
                className={`block w-full text-left px-3 py-2 transition-colors duration-200 font-medium ${
                  location === '/deals' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-mobile-deals"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Deals
              </Link>
              {showCommunities && (
                <Link
                  href="/communities"
                  className={`block w-full text-left px-3 py-2 transition-colors duration-200 font-medium ${
                    location === '/communities' || location.startsWith('/communities/')
                      ? 'text-accent' 
                      : 'text-text hover:text-accent'
                  }`}
                  data-testid="nav-mobile-communities"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Communities
                </Link>
              )}
              <Link
                href="/promote"
                className={`block w-full text-left px-3 py-2 transition-colors duration-200 font-medium ${
                  location === '/promote' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-mobile-promote"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Promote
              </Link>

              <Link
                href="/waitlist"
                className={`block w-full text-left px-3 py-2 transition-colors duration-200 font-medium ${
                  location === '/waitlist' 
                    ? 'text-accent' 
                    : 'text-text hover:text-accent'
                }`}
                data-testid="nav-mobile-waitlist"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Join
              </Link>
              
              {/* Authentication - Mobile */}
              <div className="px-3 py-2">
                {authLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : isAuthenticated ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.profilePicture} />
                        <AvatarFallback className="bg-orange-500 text-white text-sm">
                          {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user?.firstName && user?.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user?.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </div>
                    <Link href="/account/profile">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-left"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start text-left text-red-600 hover:text-red-600"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        signOutMutation.mutate();
                      }}
                      disabled={signOutMutation.isPending}
                    >
                      {signOutMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4 mr-2" />
                      )}
                      {signOutMutation.isPending ? 'Signing out...' : 'Sign Out'}
                    </Button>
                  </div>
                ) : (
                  <Link href="/account/signup">
                    <Button 
                      size="sm" 
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 border-0"
                      data-testid="nav-mobile-signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Sign Up
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
