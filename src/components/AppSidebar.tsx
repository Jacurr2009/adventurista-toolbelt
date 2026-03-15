import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Plus, BookOpen } from 'lucide-react';

export function AppSidebar() {
  const location = useLocation();

  const links = [
    { to: '/', label: 'CHARACTERS', icon: Users },
    { to: '/create', label: 'NEW BUILD', icon: Plus },
    { to: '/resources', label: 'RESOURCES', icon: BookOpen },
  ];

  return (
    <aside className="w-[240px] min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <h1 className="font-display text-sm tracking-widest text-foreground">TACTICAL<br/>SLATE</h1>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">CHARACTER ENGINE</p>
      </div>
      <nav className="flex-1 p-2">
        {links.map(link => {
          const active = location.pathname === link.to;
          return (
            <Link key={link.to} to={link.to}>
              <motion.div
                className={`flex items-center gap-3 px-3 py-2 rounded-sm text-[11px] uppercase tracking-widest font-bold transition-colors ${
                  active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </motion.div>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">v1.0 // LOCAL STORE</p>
      </div>
    </aside>
  );
}
