'use client';

import TextInput from '../../ui/input/TextInput';
import RasiStarDropdowns from '../../ui/input/RasiStarDropdowns';
import ReligionCommunityDropdowns from '../../ui/input/ReligionCommunityDropdowns';
import SelectInput from '../../ui/input/SelectInput';

// Helper to format cm to feet and inches
const formatHeightCm = (cm: number) => {
  const inches = cm / 2.54;
  const feet = Math.floor(inches / 12);
  const remainingInches = Math.round(inches % 12);
  
  if (remainingInches === 12) {
    return `${cm} cm (${feet + 1}'0")`;
  }
  return `${cm} cm (${feet}'${remainingInches}")`;
};

// Generates height options from 120 cm to 220 cm
const heightOptions = Array.from({ length: 101 }, (_, i) => 120 + i);

// Generates weight options from 30 kg to 150 kg
const weightOptions = Array.from({ length: 121 }, (_, i) => 30 + i);


interface PersonalDetailsStepProps {
  formData: any;
  handleChange: (e: any) => void;
  errors: any;
}

export default function PersonalDetailsStep({
  formData,
  handleChange,
  errors
}: PersonalDetailsStepProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-350">
      
      <div className="flex flex-col gap-1 text-left">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Marital Status</label>
        <select
          name="maritalStatus"
          value={formData.maritalStatus}
          onChange={handleChange}
          className="h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-white"
        >
          <option value="">Select Status</option>
          <option value="Never Married">Never Married</option>
          <option value="Widowed">Widowed</option>
          <option value="Divorced">Divorced</option>
          <option value="Awaiting Divorce">Awaiting Divorce</option>
        </select>
        {errors.maritalStatus && <span className="text-[11px] text-red-500 font-semibold">{errors.maritalStatus}</span>}
      </div>

      <div>
        <TextInput
          label="Mother Tongue"
          type="text"
          name="motherTongue"
          value={formData.motherTongue}
          onChange={handleChange}
          placeholder="e.g. Tamil"
          error={errors.motherTongue}
        />
      </div>

      <div className="md:col-span-2">
        <ReligionCommunityDropdowns
          religion={formData.religion}
          community={formData.caste}
          onReligionChange={(v) => handleChange({ target: { name: 'religion', value: v } } as any)}
          onCommunityChange={(v) => handleChange({ target: { name: 'caste', value: v } } as any)}
          errors={{ religion: errors.religion, community: errors.caste }}
          inlineLayout={true}
          selectClassName="h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-white dark:bg-zinc-900 w-full"
        />
      </div>



      <div className="md:col-span-2">
        <RasiStarDropdowns
          rasi={formData.rasi}
          nakshatra={formData.star}
          padam={formData.padam}
          onRasiChange={(v) => handleChange({ target: { name: 'rasi', value: v } })}
          onNakshatraChange={(v) => handleChange({ target: { name: 'star', value: v } })}
          onPadamChange={(v) => handleChange({ target: { name: 'padam', value: v } })}
          errors={{ rasi: errors.rasi, nakshatra: errors.star, padam: errors.padam }}
          inlineLayout={true}
          selectClassName="h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-white dark:bg-zinc-900 w-full"
        />
      </div>



      <div>
        <SelectInput
          label="Height (cm)"
          name="height"
          value={formData.height}
          onChange={handleChange}
          error={errors.height}
        >
          <option value="" className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
            Select Height
          </option>
          {heightOptions.map((cm) => (
            <option key={cm} value={cm} className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
              {formatHeightCm(cm)}
            </option>
          ))}
        </SelectInput>
      </div>

      <div>
        <SelectInput
          label="Weight (kg)"
          name="weight"
          value={formData.weight}
          onChange={handleChange}
          error={errors.weight}
        >
          <option value="" className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
            Select Weight
          </option>
          {weightOptions.map((kg) => (
            <option key={kg} value={kg} className="text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
              {kg} kg
            </option>
          ))}
        </SelectInput>
      </div>

      <div className="flex flex-col gap-1 text-left">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Physical Status</label>
        <select
          name="physicalStatus"
          value={formData.physicalStatus}
          onChange={handleChange}
          className="h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-white"
        >
          <option value="Normal">Normal</option>
          <option value="Physically Challenged">Physically Challenged</option>
        </select>
      </div>

    </div>
  );
}
