import type React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ReviewFlow — Share your experience",
};

export default function ReviewFlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4f7f5_0%,#eef2ef_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-4 py-8 sm:py-12">
        {children}
      </div>
    </div>
  );
}
