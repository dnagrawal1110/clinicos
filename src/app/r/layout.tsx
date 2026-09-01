import type React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ReviewFlow — Share your experience",
};

// Mirrors src/app/review/layout.tsx exactly — same public, mobile-first
// shell, kept as a separate layout (not shared) so this surface can
// diverge toward a genuinely separate deployable app later (section 66)
// without dragging /review/:slug along with it.
export default function TokenReviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4f7f5_0%,#eef2ef_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-4 py-8 sm:py-12">
        {children}
      </div>
    </div>
  );
}
