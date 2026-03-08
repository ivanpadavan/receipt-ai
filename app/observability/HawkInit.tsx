"use client";

import HawkCatcher from "@hawk.so/javascript";
import { useEffect } from "react";

const hawkToken = process.env.NEXT_PUBLIC_HAWK_INTEGRATION_TOKEN;
const hawkRelease = process.env.NEXT_PUBLIC_HAWK_RELEASE;
let isHawkInitialized = false;

export function HawkInit() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !hawkToken ||
      !hawkRelease ||
      isHawkInitialized
    ) {
      return;
    }

    new HawkCatcher({
      token: hawkToken,
      release: hawkRelease,
    });
    isHawkInitialized = true;
  }, []);

  return null;
}
