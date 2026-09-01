"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/badge";
import { CampaignDetailView } from "@/components/domain/ReputationTabs";
import { REVIEW_CAMPAIGNS } from "@/lib/mock/operations";
import { useRuntimeStore, getCustomCampaigns } from "@/lib/runtime-store";
import { getClient } from "@/lib/mock/clients";

const STATUS_VARIANT: Record<string, "success" | "warning" | "critical" | "neutral" | "info"> = {
  active: "success", paused: "warning", draft: "neutral", completed: "info",
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  useRuntimeStore();
  const { id } = use(params);
  const campaign = [...getCustomCampaigns(), ...REVIEW_CAMPAIGNS].find((c) => c.id === id);
  if (!campaign) notFound();
  const client = getClient(campaign.clientId);
  const location = client?.locations.find((l) => l.id === campaign.locationId);

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={[{ label: "Reputation", href: "/reputation" }, { label: "Campaigns", href: "/reputation" }, { label: campaign.name }]}
        title={<span className="flex items-center gap-2.5">{campaign.name}<Badge variant={STATUS_VARIANT[campaign.status]} className="capitalize">{campaign.status}</Badge></span>}
        subtitle={`${client?.name ?? ""} — ${location?.name ?? ""} · ${campaign.trigger} · ${campaign.channel} · ${campaign.language}`}
      />
      <CampaignDetailView campaign={campaign} />
    </div>
  );
}
