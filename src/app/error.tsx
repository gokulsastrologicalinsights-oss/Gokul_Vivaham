'use client';

import Link from 'next/link';

export default function ErrorPage({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-24 text-center" role="alert">
      <h1 className="text-3xl font-bold">We couldn’t load this page</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-300">Please try again. If the problem continues, contact our support team.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button onClick={() => unstable_retry()} className="rounded-lg bg-[#800020] px-6 py-3 font-semibold text-white">Try again</button>
        <Link href="/" className="rounded-lg border border-zinc-400 px-6 py-3">Go home</Link>
        <Link href="/contact" className="rounded-lg border border-zinc-400 px-6 py-3">Contact support</Link>
      </div>
    </section>
  );
}
