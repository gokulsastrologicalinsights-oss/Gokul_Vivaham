import { NextResponse } from 'next/server';
import { informationPages } from '@/config/information-pages';
export async function GET() {
  const paths = ['/', '/pricing', ...informationPages.map(page => page.href), '/data-deletion'];
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gokulvivaham.vercel.app').replace(/\/$/, '');
  const xml = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    paths.map(path => '<url><loc>' + origin + path + '</loc></url>').join('') + '</urlset>';
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } });
}
