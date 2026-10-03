'use client';
export default function ProfileHeader({ name }: { name: string }) {
  return <div className="p-6 bg-zinc-50 border-b font-serif text-lg font-bold">{name}</div>;
}
