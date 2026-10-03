'use client';
export default function Tabs({ tabs, activeTab, onChange }: { tabs: string[]; activeTab: string; onChange: (tab: string) => void }) {
  return (
    <div className="flex border-b border-zinc-200">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`py-2 px-4 text-xs font-semibold ${activeTab === tab ? 'border-b-2 border-maroon-600 text-maroon-600' : 'text-zinc-500'}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
