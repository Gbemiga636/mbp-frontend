'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3, Boxes, FolderTree, LayoutDashboard, LogOut, Menu, MessageCircle,
  Package, Percent, Settings, ShoppingBag, Users, Image as ImageIcon, Layers, Star, X,
} from 'lucide-react';
import { useAdmin } from '@/components/admin/AdminProvider';
import { Spinner } from '@/components/ui/Spinner';
import styles from './AdminShell.module.css';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree },
  { href: '/admin/collections', label: 'Collections', icon: Layers },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/promotions', label: 'Promotions', icon: Percent },
  { href: '/admin/content', label: 'Content', icon: ImageIcon },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/messages', label: 'Messages', icon: MessageCircle },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, authFetch } = useAdmin();
  const [live, setLive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const isLogin = pathname === '/admin/login';

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLogin || !user) return;
    const tick = () => {
      authFetch('/api/admin/analytics/summary')
        .then((r) => r.json())
        .then((j) => setLive(Number(j.liveViewers || 0)))
        .catch(() => null);
    };
    tick();
    const t = window.setInterval(tick, 15000);
    return () => window.clearInterval(t);
  }, [isLogin, user, authFetch]);

  useEffect(() => {
    if (!isLogin && !user) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('mbp_admin_token') : null;
      if (!token) router.replace('/admin/login');
    }
  }, [isLogin, user, router]);

  if (isLogin) return <>{children}</>;

  if (!user) {
    return (
      <div className={styles.loading}>
        <Spinner label="Checking session" />
      </div>
    );
  }

  const nav = (
    <>
      <div className={styles.brand}>
        <strong>MBP Admin</strong>
        <span>{user.email}</span>
      </div>
      <div className={styles.live} title="People on the site right now">
        <span className={styles.dot} />
        <div>
          <strong>{live}</strong>
          <div>viewing now</div>
        </div>
      </div>
      <nav>
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={active ? styles.active : ''}>
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button type="button" className={styles.logout} onClick={() => { logout(); router.push('/admin/login'); }}>
        <LogOut size={16} /> Sign out
      </button>
    </>
  );

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <button type="button" className={styles.menuBtn} aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((v) => !v)}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <strong>MBP Admin</strong>
        <span className={styles.topLive}>
          <i className={styles.dot} /> {live} live
        </span>
      </header>

      <div className={`${styles.drawer} ${menuOpen ? styles.open : ''}`}>
        <div className={styles.scrim} onClick={() => setMenuOpen(false)} />
        <aside className={styles.sidebar}>{nav}</aside>
      </div>

      <div className={styles.main}>{children}</div>
    </div>
  );
}
