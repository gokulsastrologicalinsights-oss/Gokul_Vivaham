import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-lg font-semibold text-[#800020] dark:text-amber-400">404</p>
      <h1 className="mt-3 text-3xl font-bold">Page not found</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-300">This page may have moved or the link may be incorrect.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link href="/" className="rounded-lg bg-[#800020] px-6 py-3 font-semibold text-white">Go home</Link>
        <Link href="/contact" className="rounded-lg border border-zinc-400 px-6 py-3">Contact support</Link>
      </div>
    </section>
  );
}
