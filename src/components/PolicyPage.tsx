import type { ReactNode } from 'react';
import Link from 'next/link';
import { contactConfig } from '@/config/contact.config';
import { informationPages } from '@/config/information-pages';

export default function PolicyPage({ title, sections, children, reviewedOn }: {
  title: string;
  sections: { title: string; text: string }[];
  children?: ReactNode;
  reviewedOn?: string;
}) {
  return <article className="w-full min-w-0 max-w-4xl mx-auto px-4 py-12 md:py-16 text-left text-foreground">
    <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">{title}</h1>
    <p className="text-sm text-muted mb-6">{reviewedOn ? 'Last reviewed ' + reviewedOn : 'Effective 4 October 2026'} · Gokul Vivaham · கோகுல் விவாஹம்</p>
    <nav aria-label="On this page" className="mb-6 flex flex-wrap gap-x-5 gap-y-3 text-sm">
      {sections.map((section, index) => <a className="underline underline-offset-4" href={'#section-' + index} key={section.title}>{section.title}</a>)}
      <a className="underline underline-offset-4" href="#policy-contact">Contact and complaints</a>
    </nav>
    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-7">
      {sections.map((section, index) => <section id={'section-' + index} className="scroll-mt-28" key={section.title}>
        <h2 className="text-lg font-semibold mb-2">{section.title}</h2>
        <p className="text-sm leading-7 whitespace-pre-line">{section.text}</p>
      </section>)}
      {children}
      <section id="policy-contact" className="scroll-mt-28">
        <h2 className="text-lg font-semibold mb-2">Contact and complaints</h2>
        <p className="text-sm leading-7">{contactConfig.brand.legalName} operates as a sole proprietorship providing matrimony services. Contact the proprietor/support team at <a className="underline" href={contactConfig.email.link}>{contactConfig.email.support}</a>, <a className="underline" href={contactConfig.phone.link}>{contactConfig.phone.display}</a>, or <a className="underline" href={contactConfig.whatsapp.link}>WhatsApp</a>.</p>
        <p className="text-sm mt-2">{contactConfig.address.display}</p>
        <p className="text-sm mt-2">{contactConfig.businessHours.map(item => item.day + ': ' + item.hours).join('; ')}. Working days exclude public holidays.</p>
        <p className="text-sm leading-7 mt-2">For a privacy complaint or payment dispute, describe the issue and include your account or payment reference where relevant. Do not send passwords, OTPs, full card details or identity documents in an ordinary inquiry. We aim to acknowledge complaints within 48 hours and resolve them within one month, subject to applicable law.</p>
        <Link className="inline-block underline mt-3 text-sm" href="/contact">Open the contact and support page</Link>
      </section>
    </div>
    <nav aria-label="Information and policies" className="flex flex-wrap gap-x-5 gap-y-3 mt-6 text-sm">
      {informationPages.map(page => <Link className="underline underline-offset-4 py-2" key={page.href} href={page.href}>{page.label}</Link>)}
    </nav>
  </article>;
}
