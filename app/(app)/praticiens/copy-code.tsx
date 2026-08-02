"use client";

import { useState } from "react";

export default function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* presse-papiers indisponible */
        }
      }}
      className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-brand-dark ring-1 ring-brand/30"
    >
      {copied ? "Copié ✓" : "Copier"}
    </button>
  );
}
