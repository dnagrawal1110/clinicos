import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] text-[var(--color-ink-tertiary)]">
      <span className="font-medium text-[var(--color-ink-secondary)]">MixMedia</span>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3" />
          {item.href ? (
            <Link href={item.href} className="hover:text-[var(--color-ink)]">{item.label}</Link>
          ) : (
            <span className={i === items.length - 1 ? "text-[var(--color-ink-secondary)]" : ""}>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
