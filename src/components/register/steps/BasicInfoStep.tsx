'use client';

import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import TextInput from '../../ui/input/TextInput';

interface BasicInfoStepProps {
  formData: any;
  handleChange: (e: any) => void;
  errors: any;
  setErrors: any;
}

export default function BasicInfoStep({
  formData,
  handleChange,
  errors,
  setErrors,
}: BasicInfoStepProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-350">

      <div className="md:col-span-2">
        <TextInput
          label="Full Name"
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Enter your full name as per ID proof"
          error={errors.fullName}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="register-gender" className="text-xs font-bold text-zinc-500 uppercase tracking-wider text-left">Gender</label>
        <select
          id="register-gender" name="gender"
          value={formData.gender}
          onChange={handleChange}
          className="h-11 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-white"
        >
          <option value="">Select Gender</option>
          <option value="Female">Bride (Female)</option>
          <option value="Male">Groom (Male)</option>
        </select>
        {errors.gender && <span className="text-[11px] text-red-500 font-semibold text-left">{errors.gender}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="register-dob" className="text-xs font-bold text-zinc-500 uppercase tracking-wider text-left">Date of Birth</label>
        <input
          type="date"
          id="register-dob" name="dob"
          value={formData.dob}
          onChange={handleChange}
          className="h-11 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-white"
        />
        {errors.dob && <span className="text-[11px] text-red-500 font-semibold text-left">{errors.dob}</span>}
        {formData.age && (
          <span className="text-xs text-gold-650 font-bold mt-1 text-left">Calculated Age: {formData.age} yrs</span>
        )}
      </div>

      <div className="flex flex-col gap-1 md:col-span-2">
        <TextInput
          label="Email Address"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="e.g. name@domain.com"
          error={errors.email}
          icon={<Mail className="h-4 w-4" />}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-1 relative text-left">
        <label htmlFor="register-password" className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Password</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            id="register-password" name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Min 6 characters"
            className="w-full h-11 pl-11 pr-10 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-maroon-500 text-white"
            autoComplete="new-password"
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-650"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <span className="text-[11px] text-red-500 font-semibold">{errors.password}</span>}
      </div>

      <div>
        <TextInput
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Re-enter password"
          error={errors.confirmPassword}
          autoComplete="new-password"
        />
      </div>

    </div>
  );
}

