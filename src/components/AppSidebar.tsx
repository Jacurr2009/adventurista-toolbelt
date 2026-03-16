import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, BookOpen, Menu, X, Dices, Map } from 'lucide-react';

export function AppSidebar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/', label: 'CHARACTERS', icon: Users },
    { to: '/create', label: 'NEW BUILD', icon: Plus },
    { to: '/dice', label: 'DICE ROLLER', icon: Dices },
    { to: '/maps', label: 'MAPS', icon: Map },
    { to: '/resources', label: 'RESOURCES', icon: BookOpen },
  ];

  const nav = (
    <nav className="flex-1 p-2">
      {links.map(link => {
        const active = location.pathname === link.to;
        return (
          <Link key={link.to} to={link.to} onClick={() => setOpen(false)}>
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
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[240px] min-h-screen bg-sidebar border-r border-sidebar-border flex-col shrink-0">
        <div className="p-4 border-b border-sidebar-border">
          <h1 className="font-display text-sm tracking-widest text-foreground">TACTICAL<br/>SLATE</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">CHARACTER ENGINE</p>
        </div>
        {nav}
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest">v1.0 // LOCAL STORE</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 py-3">
        <span className="font-display text-xs tracking-widest text-foreground">TACTICAL SLATE</span>
        <button onClick={() => setOpen(!open)} className="text-foreground">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span className="sr-only">MENU</span>
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-background/60 z-40 pt-12"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="md:hidden fixed top-12 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border"
            >
              {nav}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
