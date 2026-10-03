'use client';
export default function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return <div className="text-xs font-semibold text-zinc-400">Step {currentStep} of {totalSteps}</div>;
}
