"use client";

import { useMemo, useState } from "react";
import { Search, ImageIcon, Sparkles, Upload } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { rngFor, pick } from "@/lib/mock/rng";
import { ALL_CLIENTS } from "@/lib/mock/clients";

const CATEGORIES = ["All", "Brand", "Doctor", "Location", "Treatment", "Before/After", "Clinic", "Team", "Equipment", "Patient Education", "AI Generated"];

const GRADIENTS = [
  "linear-gradient(135deg,#14403d,#2c6e63)",
  "linear-gradient(135deg,#6b4de0,#9457c9)",
  "linear-gradient(135deg,#b5730a,#e0a53c)",
  "linear-gradient(135deg,#2860c9,#5a8fe0)",
  "linear-gradient(135deg,#1f7a4d,#4fae7d)",
  "linear-gradient(135deg,#b3392f,#d97a6e)",
];

function generateMediaItems(count: number) {
  const rng = rngFor("media-library");
  return Array.from({ length: count }, (_, i) => {
    const category = pick(rng, CATEGORIES.slice(1));
    const client = pick(rng, ALL_CLIENTS);
    return {
      id: `media-${i}`,
      category,
      client: client.name,
      gradient: pick(rng, GRADIENTS),
      title: `${category} asset #${i + 1}`,
      isAI: category === "AI Generated",
    };
  });
}

const ITEMS = generateMediaItems(48);

export default function MediaLibraryPage() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return ITEMS.filter((item) => (category === "All" || item.category === category) && (item.client.toLowerCase().includes(query.toLowerCase()) || item.title.toLowerCase().includes(query.toLowerCase())));
  }, [category, query]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Media Library"
        subtitle="Brand, clinic, doctor, and treatment assets — organized per client and location."
        actions={<Button variant="primary" size="md"><Upload className="h-3.5 w-3.5" /> Upload</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex h-8 w-64 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5">
          <Search className="h-3.5 w-3.5 text-[var(--color-ink-tertiary)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search media..." className="w-full bg-transparent text-[13px] outline-none" />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn("rounded-full px-3 py-1 text-[12px] font-medium", category === c ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)]")}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <ImageIcon className="h-6 w-6 text-[var(--color-ink-tertiary)]" />
          <p className="text-[13.5px] text-[var(--color-ink-tertiary)]">No media found for this filter.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {filtered.map((item) => (
            <div key={item.id} className="group overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="relative flex aspect-square items-center justify-center" style={{ background: item.gradient }}>
                <ImageIcon className="h-6 w-6 text-white/70" />
                {item.isAI && (
                  <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/30 px-1.5 py-0.5 text-[9.5px] font-medium text-white backdrop-blur-sm">
                    <Sparkles className="h-2.5 w-2.5" /> AI
                  </span>
                )}
              </div>
              <div className="p-2">
                <div className="truncate text-[11.5px] font-medium text-[var(--color-ink)]">{item.client}</div>
                <Badge variant="neutral" className="mt-1 text-[10px]">{item.category}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
