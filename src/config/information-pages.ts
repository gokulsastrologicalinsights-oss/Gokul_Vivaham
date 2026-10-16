import type { Metadata } from 'next';

export const informationPages = [
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/refund-policy', label: 'Refund & Cancellation' },
] as const;

export function informationMetadata(title: string, description: string): Metadata {
  return { title: title + ' | Gokul Vivaham', description, robots: { index: true, follow: true } };
}
