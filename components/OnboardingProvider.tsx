"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import OnboardingModal from "./OnboardingModal";

const STORAGE_KEY_PREFIX = "stocked_onboarded_v1_";

export default function OnboardingProvider() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) return;
        const key = STORAGE_KEY_PREFIX + user.id;
        if (!localStorage.getItem(key)) {
          setShow(true);
        }
      });
  }, []);

  function dismiss() {
    setShow(false);
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (user) localStorage.setItem(STORAGE_KEY_PREFIX + user.id, "1");
      });
  }

  if (!show) return null;
  return <OnboardingModal onDismiss={dismiss} />;
}
