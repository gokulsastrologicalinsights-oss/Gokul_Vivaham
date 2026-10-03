import { useState, useEffect } from 'react';
import { 
   RASIS, 
   RASI_DISPLAY_NAMES, 
   getNakshatrasForRasi, 
   getPadamsForRasiNakshatra 
} from '@/constants/rasi-nakshatra-mapping';

interface RasiStarDropdownsProps {
  rasi: string;
  nakshatra: string;
  padam: string;
  onRasiChange: (v: string) => void;
  onNakshatraChange: (v: string) => void;
  onPadamChange: (v: string) => void;
  disabled?: boolean;
  isPremiumGated?: boolean;
  onUpgradePrompt?: () => void;
  errors?: {
    rasi?: string;
    nakshatra?: string;
    padam?: string;
  };
  // Customize element container or label styling
  labelClassName?: string;
  selectClassName?: string;
  showLabels?: boolean;
  inlineLayout?: boolean;
}

export default function RasiStarDropdowns({
  rasi,
  nakshatra,
  padam,
  onRasiChange,
  onNakshatraChange,
  onPadamChange,
  disabled = false,
  isPremiumGated = false,
  onUpgradePrompt,
  errors = {},
  labelClassName = "text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider",
  selectClassName = "h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-zinc-800 dark:text-zinc-100 dark:bg-zinc-900 w-full",
  showLabels = true,
  inlineLayout = false
}: RasiStarDropdownsProps) {
  const [stars, setStars] = useState<string[]>([]);
  const [padams, setPadams] = useState<string[]>([]);

  // Update filtered list of Stars when Rasi changes
  useEffect(() => {
    if (rasi) {
      setStars(getNakshatrasForRasi(rasi));
    } else {
      setStars([]);
    }
  }, [rasi]);

  // Update filtered list of Padams when Rasi or Star changes
  useEffect(() => {
    if (rasi && nakshatra) {
      setPadams(getPadamsForRasiNakshatra(rasi, nakshatra));
    } else {
      setPadams([]);
    }
  }, [rasi, nakshatra]);

  const handleRasiSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onRasiChange(value);
    // Reset child dropdowns
    onNakshatraChange('');
    onPadamChange('');
  };

  const handleStarSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onNakshatraChange(value);
    // Reset child dropdown
    onPadamChange('');
  };

  const handlePadamSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onPadamChange(value);
  };

  const handleWrapperClick = () => {
    if (isPremiumGated && onUpgradePrompt) {
      onUpgradePrompt();
    }
  };

  const containerClass = inlineLayout 
    ? "grid grid-cols-1 sm:grid-cols-3 gap-4 w-full" 
    : "flex flex-col gap-4 w-full";

  return (
    <div className={containerClass} onClick={handleWrapperClick}>
      {/* Dropdown 1: Rasi */}
      <div className="flex flex-col gap-1 text-left flex-1">
        {showLabels && (
          <label className={labelClassName}>
            Rasi {isPremiumGated && <span className="text-[9px] text-gold-600 font-bold ml-1">Premium</span>}
          </label>
        )}
        <select
          value={isPremiumGated ? "" : rasi}
          onChange={handleRasiSelect}
          disabled={disabled || isPremiumGated}
          className={`${selectClassName} ${isPremiumGated ? 'bg-zinc-100 dark:bg-zinc-850 cursor-pointer text-zinc-400 dark:text-zinc-550' : ''}`}
        >
          {isPremiumGated ? (
            <option value="">🔒 Premium Gated</option>
          ) : (
            <>
              <option value="" className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">Select Rasi</option>
              {RASIS.map(r => (
                <option key={r} value={r} className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                  {RASI_DISPLAY_NAMES[r] || r}
                </option>
              ))}
            </>
          )}
        </select>
        {errors.rasi && <span className="text-[11px] text-red-500 font-semibold mt-0.5">{errors.rasi}</span>}
      </div>

      {/* Dropdown 2: Star / Nakshatra */}
      <div className="flex flex-col gap-1 text-left flex-1">
        {showLabels && (
          <label className={labelClassName}>
            Star / Nakshatra {isPremiumGated && <span className="text-[9px] text-gold-600 font-bold ml-1">Premium</span>}
          </label>
        )}
        <select
          value={isPremiumGated ? "" : nakshatra}
          onChange={handleStarSelect}
          disabled={disabled || !rasi || isPremiumGated}
          className={`${selectClassName} ${(!rasi || isPremiumGated) ? 'bg-zinc-50 dark:bg-zinc-850/50 cursor-not-allowed text-zinc-400 dark:text-zinc-550' : ''}`}
        >
          {isPremiumGated ? (
            <option value="">🔒 Premium Gated</option>
          ) : (
            <>
              <option value="" className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                {!rasi ? 'Select Rasi First' : 'Select Star'}
              </option>
              {stars.map(s => (
                <option key={s} value={s} className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                  {s}
                </option>
              ))}
            </>
          )}
        </select>
        {errors.nakshatra && <span className="text-[11px] text-red-500 font-semibold mt-0.5">{errors.nakshatra}</span>}
      </div>

      {/* Dropdown 3: Padam */}
      <div className="flex flex-col gap-1 text-left flex-1">
        {showLabels && (
          <label className={labelClassName}>
            Padam {isPremiumGated && <span className="text-[9px] text-gold-600 font-bold ml-1">Premium</span>}
          </label>
        )}
        <select
          value={isPremiumGated ? "" : padam}
          onChange={handlePadamSelect}
          disabled={disabled || !nakshatra || isPremiumGated}
          className={`${selectClassName} ${(!nakshatra || isPremiumGated) ? 'bg-zinc-50 dark:bg-zinc-850/50 cursor-not-allowed text-zinc-400 dark:text-zinc-550' : ''}`}
        >
          {isPremiumGated ? (
            <option value="">🔒 Premium Gated</option>
          ) : (
            <>
              <option value="" className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                {!nakshatra ? 'Select Star First' : 'Select Padam'}
              </option>
              {padams.map(p => (
                <option key={p} value={p} className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                  Padam {p}
                </option>
              ))}
            </>
          )}
        </select>
        {errors.padam && <span className="text-[11px] text-red-500 font-semibold mt-0.5">{errors.padam}</span>}
      </div>
    </div>
  );
}
