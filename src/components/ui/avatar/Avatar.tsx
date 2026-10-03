'use client';
export default function Avatar({ src, alt, size = 'md' }: { src?: string; alt: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-8 w-8', md: 'h-12 w-12', lg: 'h-16 w-16' };
  return (
    <div className={`${sizes[size]} rounded-full bg-zinc-200 overflow-hidden flex items-center justify-center border border-zinc-300`}>
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : <span className="text-zinc-500 text-xs font-bold">{alt[0]}</span>}
    </div>
  );
}
