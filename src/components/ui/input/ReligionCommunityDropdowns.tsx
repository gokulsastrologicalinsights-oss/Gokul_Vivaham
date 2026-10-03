import { useState, useEffect } from 'react';
import { useReligionCommunities } from '@/hooks/useReligionCommunities';
import { RELIGIONS } from '@/constants/religion-community-mapping';

interface ReligionCommunityDropdownsProps {
  religion: string;
  community: string;
  onReligionChange: (v: string) => void;
  onCommunityChange: (v: string) => void;
  disabled?: boolean;
  isPremiumGated?: boolean;
  onUpgradePrompt?: () => void;
  errors?: {
    religion?: string;
    community?: string;
  };
  labelClassName?: string;
  selectClassName?: string;
  showLabels?: boolean;
  inlineLayout?: boolean;
  allowAllReligionsOption?: boolean;
  allowAllCommunitiesOption?: boolean;
  religionLabel?: string;
  communityLabel?: string;
}

export default function ReligionCommunityDropdowns({
  religion,
  community,
  onReligionChange,
  onCommunityChange,
  disabled = false,
  isPremiumGated = false,
  onUpgradePrompt,
  errors = {},
  labelClassName = "text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider",
  selectClassName = "h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-100 dark:bg-zinc-900 w-full",
  showLabels = true,
  inlineLayout = false,
  allowAllReligionsOption = false,
  allowAllCommunitiesOption = false,
  religionLabel = "Religion",
  communityLabel = "Caste / Community"
}: ReligionCommunityDropdownsProps) {
  const { communities, loading } = useReligionCommunities();
  const [availableCommunities, setAvailableCommunities] = useState<string[]>([]);

  // Update filtered list of Communities when Religion changes
  useEffect(() => {
    if (religion && communities[religion]) {
      setAvailableCommunities(communities[religion]);
    } else {
      setAvailableCommunities([]);
    }
  }, [religion, communities]);

  const handleReligionSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onReligionChange(value);
    // Reset child dropdown
    onCommunityChange('');
  };

  const handleCommunitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onCommunityChange(value);
  };

  const handleWrapperClick = () => {
    if (isPremiumGated && onUpgradePrompt) {
      onUpgradePrompt();
    }
  };

  const containerClass = inlineLayout 
    ? "grid grid-cols-1 sm:grid-cols-2 gap-4 w-full" 
    : "flex flex-col gap-4 w-full";

  return (
    <div className={containerClass} onClick={handleWrapperClick}>
      {/* Dropdown 1: Religion */}
      <div className="flex flex-col gap-1 text-left flex-1">
        {showLabels && (
          <label className={labelClassName}>
            {religionLabel}
          </label>
        )}
        <select
          value={religion}
          onChange={handleReligionSelect}
          disabled={disabled}
          className={`${selectClassName} ${disabled ? 'bg-zinc-50 dark:bg-zinc-850/50 cursor-not-allowed text-zinc-400 dark:text-zinc-550' : ''}`}
        >
          <option value="" className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
            {allowAllReligionsOption ? "All Religions" : "Select Religion"}
          </option>
          {RELIGIONS.map(r => (
            <option key={r} value={r} className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
              {r}
            </option>
          ))}
        </select>
        {errors.religion && <span className="text-[11px] text-red-500 font-semibold mt-0.5">{errors.religion}</span>}
      </div>

      {/* Dropdown 2: Caste / Community */}
      <div className="flex flex-col gap-1 text-left flex-1">
        {showLabels && (
          <label className={labelClassName}>
            {communityLabel} {isPremiumGated && <span className="text-[9px] text-gold-600 font-bold ml-1">Premium</span>}
          </label>
        )}
        <select
          value={isPremiumGated ? "" : community}
          onChange={handleCommunitySelect}
          disabled={disabled || !religion || isPremiumGated}
          className={`${selectClassName} ${(!religion || isPremiumGated || disabled) ? 'bg-zinc-50 dark:bg-zinc-850/50 cursor-not-allowed text-zinc-400 dark:text-zinc-550' : ''}`}
        >
          {isPremiumGated ? (
            <option value="">🔒 Premium Gated</option>
          ) : (
            <>
              <option value="" className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                {!religion 
                  ? 'Select Religion First' 
                  : (allowAllCommunitiesOption ? 'All Communities' : 'Select Caste / Community')
                }
              </option>
              {availableCommunities.map(c => (
                <option key={c} value={c} className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                  {c}
                </option>
              ))}
            </>
          )}
        </select>
        {errors.community && <span className="text-[11px] text-red-500 font-semibold mt-0.5">{errors.community}</span>}
      </div>
    </div>
  );
}
