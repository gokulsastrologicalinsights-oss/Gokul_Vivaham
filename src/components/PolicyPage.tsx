import Link from 'next/link';
import { contactConfig } from '@/config/contact.config';

export default function PolicyPage({title,sections}:{title:string;sections:{title:string;text:string}[]}) {
  return <article className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-left text-foreground">
    <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">{title}</h1>
    <p className="text-sm text-muted mb-8">Effective 4 October 2026 · Gokul Vivaham · கோகுல் விவாஹம்</p>
    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-7">
      {sections.map(section=><section key={section.title}><h2 className="text-lg font-semibold mb-2">{section.title}</h2><p className="text-sm leading-relaxed whitespace-pre-line">{section.text}</p></section>)}
      <section><h2 className="text-lg font-semibold mb-2">Contact and complaints</h2>
        <p className="text-sm leading-relaxed">Gokul Vivaham is operated as a sole proprietorship. Contact the proprietor/support team at <a className="underline" href={contactConfig.email.link}>{contactConfig.email.support}</a>, <a className="underline" href={contactConfig.phone.link}>{contactConfig.phone.display}</a>, or <a className="underline" href={contactConfig.whatsapp.link}>WhatsApp</a>.</p>
        <p className="text-sm mt-2">{contactConfig.address.display}</p>
        <p className="text-sm mt-2">Support: Monday–Friday, 11:00 AM–5:00 PM IST. Working days exclude weekends and public holidays.</p>
      </section>
    </div>
    <nav aria-label="Policies" className="flex flex-wrap gap-5 mt-6 text-sm underline"><Link href="/terms">Terms</Link><Link href="/privacy-policy">Privacy</Link><Link href="/refund-policy">Refunds and cancellations</Link></nav>
  </article>;
}
