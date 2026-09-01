"use client";

import Link from "next/link";
import { Stethoscope } from "lucide-react";
import type { Scope } from "@/lib/scope-context";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getScopedClients } from "@/lib/scope-selectors";
import { getDoctorBenchmark } from "@/lib/mock/benchmarks";
import { formatNumber } from "@/lib/utils";

// Internal-only doctor performance comparison (section 20) — a doctor can
// practice at multiple locations, so this rolls their numbers up across all
// of them. Never surfaced to clients, never used to publicly rank doctors.
export function ReputationDoctorsTab({ scope }: { scope: Scope }) {
  const clients = getScopedClients(scope);
  const doctors = clients.flatMap((c) => c.doctors);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Doctor Benchmarking</CardTitle>
          <CardDescription>{doctors.length} doctor{doctors.length !== 1 ? "s" : ""} · internal agency analytics only</CardDescription>
        </div>
      </CardHeader>
      <div className="flex flex-col divide-y divide-[var(--color-border)] px-5 pb-3">
        {doctors.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--color-ink-tertiary)]">No doctors in this scope.</p>
        ) : doctors.map((doctor) => {
          const bench = getDoctorBenchmark(doctor);
          return (
            <div key={doctor.id} className="flex flex-col gap-2.5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]"><Stethoscope className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-[var(--color-ink)]">{doctor.name}</div>
                  <div className="text-[11.5px] text-[var(--color-ink-tertiary)]">{doctor.specialty} · {bench.locations.length} location{bench.locations.length !== 1 ? "s" : ""}</div>
                </div>
                <Badge variant={bench.velocity >= 0 ? "success" : "critical"}>{bench.velocity >= 0 ? "+" : ""}{bench.velocity}% velocity</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Metric label="Requests" value={formatNumber(bench.totalRequests)} />
                <Metric label="Reviews" value={formatNumber(bench.totalReviews)} />
                <Metric label="Avg. rating" value={bench.averageRating.toFixed(1)} />
                <Metric label="Positive sentiment" value={`${bench.positiveSentimentShare}%`} />
                <Metric label="Locations" value={String(bench.locations.length)} />
              </div>
              {(bench.bestLocation || bench.weakestLocation) && (
                <div className="flex flex-wrap gap-1.5 text-[11.5px]">
                  {bench.bestLocation && (
                    <Link href={`/clients/${doctor.clientId}/locations/${bench.bestLocation.id}`} className="rounded-full bg-[var(--color-success-soft)] px-2.5 py-1 font-medium text-[var(--color-success-strong)] hover:opacity-80">
                      Best: {bench.bestLocation.name} ({bench.bestLocation.healthOverall})
                    </Link>
                  )}
                  {bench.weakestLocation && bench.weakestLocation.id !== bench.bestLocation?.id && (
                    <Link href={`/clients/${doctor.clientId}/locations/${bench.weakestLocation.id}`} className="rounded-full bg-[var(--color-warning-soft)] px-2.5 py-1 font-medium text-[var(--color-warning-strong)] hover:opacity-80">
                      Weakest: {bench.weakestLocation.name} ({bench.weakestLocation.healthOverall})
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[14px] font-semibold tabular-nums text-[var(--color-ink)]">{value}</div>
      <div className="text-[10.5px] text-[var(--color-ink-tertiary)]">{label}</div>
    </div>
  );
}
