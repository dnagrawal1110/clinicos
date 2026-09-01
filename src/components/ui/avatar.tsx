import { cn } from "@/lib/utils";

const PALETTE = ["#14403d", "#6b4de0", "#b5730a", "#2860c9", "#b3392f", "#1f7a4d", "#9457c9"];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initials(name: string) {
  const parts = name.replace("Dr.", "").trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}
      style={{ width: size, height: size, background: colorFor(name), fontSize: size * 0.38 }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
