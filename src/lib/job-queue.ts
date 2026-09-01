// Job queue architecture (section 21/22). Real automation execution must
// happen server-side — a Supabase Edge Function on a cron schedule (or an
// external worker) polling a jobs table, never the browser. This module
// defines the job shape and an in-memory runner that exists ONLY for local
// development/demo purposes (e.g. simulating "WhatsApp delivered" a few
// seconds after a mock send) — it is explicitly not wired into anything
// that would need to survive a page reload, and must never be mistaken for
// the production implementation.
export type JobType =
  | "send_review_request" | "send_reminder" | "expire_request"
  | "refresh_google_reviews" | "refresh_google_profile"
  | "generate_report" | "calculate_reputation_score" | "detect_anomaly";

export interface Job<T = Record<string, unknown>> {
  id: string;
  type: JobType;
  payload: T;
  runAt: string; // ISO — the job is eligible to run at or after this time
  attempts: number;
  maxAttempts: number;
  status: "pending" | "running" | "done" | "failed" | "dead-letter";
  lastError?: string;
}

export interface JobQueue {
  enqueue<T>(type: JobType, payload: T, opts?: { runAt?: string; maxAttempts?: number }): string;
  // A real worker calls this in a loop; the dev-mode runner below is the
  // only thing that ever calls it in this codebase today.
  claimDue(now: string): Job[];
  markDone(jobId: string): void;
  markFailed(jobId: string, error: string): void;
}

// Table this maps to conceptually: a `jobs` table with the same columns as
// the Job interface above, claimed via `SELECT ... FOR UPDATE SKIP LOCKED`
// or a Postgres-native queue extension (pgmq). Not created as an actual
// migration in this pass since nothing server-side exists yet to consume
// it — add it alongside the first real worker, not before.
export function createInMemoryJobQueue(): JobQueue {
  const jobs = new Map<string, Job>();
  let seq = 0;

  return {
    enqueue(type, payload, opts) {
      seq += 1;
      const id = `job-${seq}`;
      jobs.set(id, {
        id, type, payload: payload as Record<string, unknown>,
        runAt: opts?.runAt ?? new Date().toISOString(),
        attempts: 0, maxAttempts: opts?.maxAttempts ?? 3, status: "pending",
      });
      return id;
    },
    claimDue(now) {
      const due = [...jobs.values()].filter((j) => j.status === "pending" && j.runAt <= now);
      due.forEach((j) => { j.status = "running"; j.attempts += 1; });
      return due;
    },
    markDone(jobId) {
      const job = jobs.get(jobId);
      if (job) job.status = "done";
    },
    markFailed(jobId, error) {
      const job = jobs.get(jobId);
      if (!job) return;
      job.lastError = error;
      job.status = job.attempts >= job.maxAttempts ? "dead-letter" : "pending";
    },
  };
}
