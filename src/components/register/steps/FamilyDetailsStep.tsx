'use client';

import TextInput from '../../ui/input/TextInput';

interface FamilyDetailsStepProps {
  formData: any;
  handleChange: (e: any) => void;
  errors: any;
}

export default function FamilyDetailsStep({
  formData,
  handleChange,
  errors
}: FamilyDetailsStepProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-350">
      
      <div>
        <TextInput
          label="Father Name"
          type="text"
          name="fatherName"
          value={formData.fatherName}
          onChange={handleChange}
          placeholder="Father's full name"
          error={errors.fatherName}
        />
      </div>

      <div>
        <TextInput
          label="Father Occupation"
          type="text"
          name="fatherOccupation"
          value={formData.fatherOccupation}
          onChange={handleChange}
          placeholder="e.g. Retired Govt Employee"
        />
      </div>

      <div>
        <TextInput
          label="Mother Name"
          type="text"
          name="motherName"
          value={formData.motherName}
          onChange={handleChange}
          placeholder="Mother's full name"
          error={errors.motherName}
        />
      </div>

      <div>
        <TextInput
          label="Mother Occupation"
          type="text"
          name="motherOccupation"
          value={formData.motherOccupation}
          onChange={handleChange}
          placeholder="e.g. Homemaker"
        />
      </div>

      <div className="md:col-span-2">
        <TextInput
          label="Siblings Details"
          type="text"
          name="siblings"
          value={formData.siblings}
          onChange={handleChange}
          placeholder="e.g. 1 Elder Brother (Married), 1 Younger Sister"
        />
      </div>

      <div>
        <TextInput
          label="Native Place"
          type="text"
          name="nativePlace"
          value={formData.nativePlace}
          onChange={handleChange}
          placeholder="e.g. Madurai, Tanjore"
          error={errors.nativePlace}
        />
      </div>

      <div className="flex flex-col gap-1 text-left">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Family Type</label>
        <select
          name="familyType"
          value={formData.familyType}
          onChange={handleChange}
          className="h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-white"
        >
          <option value="Nuclear">Nuclear Family</option>
          <option value="Joint">Joint Family</option>
        </select>
      </div>

    </div>
  );
}
