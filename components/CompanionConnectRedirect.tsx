"use client";

import { useEffect } from "react";

export function CompanionConnectRedirect({ target }: { target: string }) {
  useEffect(() => {
    window.location.replace(target);
  }, [target]);

  return (
    <p className="mt-6 text-sm text-neutral-500">
      Redirecting to SplitMeta on your PC…{" "}
      <a href={target} className="text-red-400 hover:underline">
        Click here
      </a>{" "}
      if nothing happens.
    </p>
  );
}
