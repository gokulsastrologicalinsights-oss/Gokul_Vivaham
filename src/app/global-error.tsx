'use client';

import { contactConfig } from '@/config/contact.config';

// This boundary replaces the root layout, including its providers and styles.
export default function GlobalError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: '64px 24px', background: '#faf8f5', color: '#252525', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
        <main role="alert" style={{ maxWidth: 560, margin: '0 auto' }}>
          <h1>Gokul Vivaham is temporarily unavailable</h1>
          <p>Please try again. If the problem continues, contact support.</p>
          <button onClick={() => unstable_retry()} style={{ padding: '12px 24px', background: '#800020', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>Try again</button>
          <p><a href="/">Go home</a></p>
          <p><a href={contactConfig.email.link}>{contactConfig.email.support}</a></p>
          <p><a href={contactConfig.phone.link}>{contactConfig.phone.display}</a></p>
        </main>
      </body>
    </html>
  );
}
