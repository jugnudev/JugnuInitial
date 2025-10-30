import { Link, useLocation } from 'wouter';
import { Target, Users, BarChart3, Tag, Building2, Users2, Briefcase } from 'lucide-react';

export default function AdminNav() {
  const [location] = useLocation();

  const navItems = [
    { path: '/admin/promote', label: 'Campaigns', icon: Target },
    { path: '/admin/leads', label: 'Leads', icon: Users },
    { path: '/admin/analytics', label: 'Visitor Analytics', icon: BarChart3 },
    { path: '/admin/organizers', label: 'Organizer Applications', icon: Building2 },
    { path: '/admin/communities', label: 'Communities', icon: Users2 },
    { path: '/admin/careers', label: 'Careers', icon: Briefcase },
  ];

  return (
    <div className="bg-black/60 border-b border-copper-500/20 mb-6">
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex gap-2 py-3">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <button
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                    ${isActive 
                      ? 'bg-copper-500 text-black font-semibold' 
                      : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}