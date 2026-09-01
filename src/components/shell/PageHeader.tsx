import type { ReactNode } from "react";
import { Breadcrumb, type Crumb } from "./Breadcrumb";

export function PageHeader({
  title, subtitle, breadcrumb, actions, meta,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumb?: Crumb[];
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        {breadcrumb && <Breadcrumb items={breadcrumb} />}
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--color-ink)]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13.5px] text-[var(--color-ink-tertiary)]">{subtitle}</p>}
        {meta && <div className="mt-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
