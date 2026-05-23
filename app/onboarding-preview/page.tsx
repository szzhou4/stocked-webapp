"use client";
import { useState } from "react";
import OnboardingModal from "@/components/OnboardingModal";

export default function OnboardingPreviewPage() {
  const [show, setShow] = useState(true);
  const [slide, setSlide] = useState(0);
  return (
    <div className="min-h-screen bg-gray-800 flex flex-col items-center justify-center gap-4 p-8">
      <p className="text-white text-sm">Onboarding preview — <button onClick={() => setShow(true)} className="underline">Reset</button></p>
      {show && <OnboardingModal onDismiss={() => setShow(false)} initialSlide={slide} />}
      <div className="flex gap-2 mt-4">
        {[0,1,2,3,4].map(i => (
          <button key={i} onClick={() => { setSlide(i); setShow(true); }}
            className="bg-white text-gray-800 rounded px-3 py-1 text-xs font-medium">
            Slide {i+1}
          </button>
        ))}
      </div>
    </div>
  );
}
