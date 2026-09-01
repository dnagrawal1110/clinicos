import { Activity } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,#f7f6f3_0%,#eef2ef_55%,#e7edea_100%)] px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--color-primary)] text-white">
            <Activity className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-[20px] font-semibold tracking-tight text-[var(--color-ink)]">ClinicOS</h1>
          <p className="mt-1 text-[13px] text-[var(--color-ink-tertiary)]">The operating system for clinic growth.</p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-7 shadow-[var(--shadow-sm)]">
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Sign in to your agency workspace</h2>
          <form className="mt-5 flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--color-ink-secondary)]">Work email</span>
              <input type="email" defaultValue="deepak@mixmedia.agency" className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[var(--color-primary)]" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--color-ink-secondary)]">Password</span>
              <input type="password" defaultValue="••••••••••" className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[var(--color-primary)]" />
            </label>
            <Link href="/" className="mt-1.5 w-full rounded-[var(--radius-sm)] bg-[var(--color-primary)] py-2.5 text-center text-[13.5px] font-semibold text-white hover:bg-[var(--color-primary-strong)]">
              Sign in
            </Link>
          </form>
          <div className="mt-4 flex items-center gap-3 text-[11.5px] text-[var(--color-ink-tertiary)]">
            <div className="h-px flex-1 bg-[var(--color-border)]" /> or <div className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <button className="mt-4 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] py-2.5 text-[13.5px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)]">
            Continue with Google SSO
          </button>
        </div>

        <p className="mt-6 text-center text-[11.5px] text-[var(--color-ink-tertiary)]">
          Internal agency access only. Contact your Super Admin for an invite.
        </p>
      </div>
    </div>
  );
}
