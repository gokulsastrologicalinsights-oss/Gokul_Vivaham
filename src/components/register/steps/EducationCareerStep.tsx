'use client';

import TextInput from '../../ui/input/TextInput';

interface EducationCareerStepProps {
  formData: any;
  handleChange: (e: any) => void;
  errors: any;
}

export default function EducationCareerStep({
  formData,
  handleChange,
  errors
}: EducationCareerStepProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-350">
      
      <div className="md:col-span-2">
        <TextInput
          label="Education Details"
          type="text"
          name="education"
          value={formData.education}
          onChange={handleChange}
          placeholder="e.g. BE Computer Science, MBA Marketing"
          error={errors.education}
        />
      </div>

      <div>
        <TextInput
          label="Occupation"
          type="text"
          name="occupation"
          value={formData.occupation}
          onChange={handleChange}
          placeholder="e.g. Software Engineer, Doctor, Teacher"
          error={errors.occupation}
        />
      </div>

      <div>
        <TextInput
          label="Company Name"
          type="text"
          name="companyName"
          value={formData.companyName}
          onChange={handleChange}
          placeholder="e.g. Google, TCS, Private Ltd"
        />
      </div>

      <div>
        <TextInput
          label="Annual Income (INR)"
          type="text"
          name="annualIncome"
          value={formData.annualIncome}
          onChange={handleChange}
          placeholder="e.g. ₹8,00,000"
          error={errors.annualIncome}
        />
      </div>

      <div>
        <TextInput
          label="Work Location"
          type="text"
          name="workLocation"
          value={formData.workLocation}
          onChange={handleChange}
          placeholder="e.g. Chennai, Bangalore, Singapore"
          error={errors.workLocation}
        />
      </div>

    </div>
  );
}
