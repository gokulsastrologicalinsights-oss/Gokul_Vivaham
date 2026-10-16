import type { ReactNode } from 'react';
import { informationMetadata } from '@/config/information-pages';
export const metadata = informationMetadata('About Us', 'Gokul Vivaham helps adults and families explore suitable matrimonial introductions through profile discovery, preferences and optional horoscope services.');
export default function Layout({ children }: { children: ReactNode }) { return children; }
