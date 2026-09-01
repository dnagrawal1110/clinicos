import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AD_CAMPAIGNS } from "@/lib/mock/operations";
import { getClient } from "@/lib/mock/clients";
import { formatINR } from "@/lib/utils";

export default async function CampaignDetailPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const campaign = AD_CAMPAIGNS.find((c) => c.id === campaignId);
  if (!campaign) notFound();
  const client = getClient(campaign.clientId);
  const location = client?.locations.find((l) => l.id === campaign.locationId);

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={[{ label: "Ads", href: "/ads" }, { label: campaign.name }]}
        title={campaign.name}
        subtitle={`${client?.name ?? ""} — ${location?.name ?? ""} · ${campaign.service} · ${campaign.landingPage}`}
        actions={<Badge variant={campaign.status === "active" ? "success" : "warning"} className="capitalize">{campaign.status}</Badge>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Platform" value={<span className="capitalize">{campaign.platform}</span>} />
        <StatCard label="Spend" value={formatINR(campaign.spend)} />
        <StatCard label="Leads" value={campaign.leads} />
        <StatCard label="CPL" value={formatINR(campaign.cpl)} />
        <StatCard label="Appointments" value={campaign.appointments} />
        <StatCard label="CPA" value={formatINR(campaign.cpa)} />
      </div>

      <Card>
        <CardHeader><CardTitle>Campaign → Location relationship</CardTitle></CardHeader>
        <div className="flex flex-wrap items-center gap-2 px-5 pb-5 pt-2 text-[13px]">
          <Badge variant="info" className="capitalize">{campaign.platform}</Badge>
          <span className="text-[var(--color-ink-tertiary)]">→</span>
          <Badge variant="neutral">{client?.name}</Badge>
          <span className="text-[var(--color-ink-tertiary)]">→</span>
          <Badge variant="neutral">{location?.name}</Badge>
          <span className="text-[var(--color-ink-tertiary)]">→</span>
          <Badge variant="neutral">{campaign.service}</Badge>
          <span className="text-[var(--color-ink-tertiary)]">→</span>
          <Badge variant="neutral">{campaign.landingPage}</Badge>
        </div>
      </Card>
    </div>
  );
}
