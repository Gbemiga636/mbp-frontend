import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'xyuqcztzktqladitoell.supabase.co' },
    ],
  },
  async rewrites() {
    const api = process.env.API_PROXY_URL || 'http://127.0.0.1:4000';
    if (process.env.NODE_ENV === 'development') {
      return [{ source: '/api/:path*', destination: `${api}/api/:path*` }];
    }
    return [];
  },
  async redirects() {
    return [
      { source: '/store.html', destination: '/shop', permanent: true },
      { source: '/cart.html', destination: '/cart', permanent: true },
      { source: '/gallery.html', destination: '/gallery', permanent: true },
      { source: '/contact.html', destination: '/contact', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/account', destination: '/', permanent: false },
      { source: '/admin/login.html', destination: '/admin/login', permanent: true },
      { source: '/admin/home.html', destination: '/admin', permanent: true },
      { source: '/admin/store.html', destination: '/admin/products', permanent: true },
      { source: '/admin/orders.html', destination: '/admin/orders', permanent: true },
      { source: '/admin/gallery.html', destination: '/admin/content', permanent: true },
      { source: '/admin/delivery.html', destination: '/admin/settings', permanent: true },
      { source: '/admin/restore.html', destination: '/admin/settings', permanent: true },
    ];
  },
};

export default nextConfig;
