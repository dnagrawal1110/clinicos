"use client";

import Link from "next/link";
import { Star, MessageSquareText, TrendingUp, Percent, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreateCampaignDialog } from "@/components/domain/CreateCampaignDialog";
import {
  ReputationOverviewTab, ReputationCampaignsTab, ReputationRequestsTab, ReputationFeedbackTab,
  ReputationInsightsTab, ReputationGoogleReviewsTab, ReputationLinksTab, ReputationAutomationTab, ReputationSettingsTab,
} from "@/components/domain/ReputationTabs";
import { ReputationWorkQueueTab } from "@/components/domain/ReputationWorkQueueTab";
import { ReputationAccountsTab } from "@/components/domain/ReputationAccountsTab";
import { ReputationMessageLibraryTab } from "@/components/domain/ReputationMessageLibraryTab";
import { ReputationDoctorsTab } from "@/components/domain/ReputationDoctorsTab";
import { useScope } from "@/lib/scope-context";
import { useRuntimeStore } from "@/lib/runtime-store";
import { getScopedCampaigns, getScopedLocations, aggregateLocations } from "@/lib/scope-selectors";
import { formatNumber } from "@/lib/utils";

export default function ReputationPage() {
  useRuntimeStore();
  const { scope, scopeMeta } = useScope();
  const locations = getScopedLocations(scope);
  const agg = aggregateLocations(locations);
  const campaigns = getScopedCampaigns(scope);

  const totalRequests = campaigns.reduce((a, c) => a + c.requestsSent, 0);
  const totalFeedback = campaigns.reduce((a, c) => a + c.feedbackReceived, 0);
  const totalGenerated = campaigns.reduce((a, c) => a + c.reviewsGenerated, 0);
  const conversionRate = Math.round((totalGenerated / (totalRequests || 1)) * 100);

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={scope.type !== "all" ? scopeMeta.crumbs.concat({ label: "Reputation" }) : undefined}
        title="Reputation"
        subtitle={
          scope.type === "all" ? "Review campaigns, patient feedback, and ReviewFlow performance across the portfolio."
            : scope.type === "client" ? `Review performance across ${scopeMeta.client?.name}'s ${locations.length} location${locations.length !== 1 ? "s" : ""}.`
              : `Review performance for ${scopeMeta.title}.`
        }
        actions={
          <>
            <Link href={`/review${scopeMeta.location ? `/${scopeMeta.location.slug}` : ""}`} target="_blank">
              <Button variant="outline" size="md"><ExternalLink className="h-3.5 w-3.5" /> Preview ReviewFlow</Button>
            </Link>
            <CreateCampaignDialog scope={scope} />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Total Reviews" value={formatNumber(agg.reviewsTotal)} icon={<Star className="h-4 w-4" />} />
        <StatCard label="Avg. Rating" value={agg.ratingAvg.toFixed(1)} />
        <StatCard label="Reviews This Month" value={`+${formatNumber(agg.reviewsThisMonth)}`} trend={{ value: 12 }} />
        <StatCard label="Review Requests" value={formatNumber(totalRequests)} icon={<MessageSquareText className="h-4 w-4" />} />
        <StatCard label="Feedback Received" value={formatNumber(totalFeedback)} />
        <StatCard label="Reviews Completed" value={formatNumber(totalGenerated)} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Conversion Rate" value={`${conversionRate}%`} icon={<Percent className="h-4 w-4" />} />
      </div>

      <Card>
        <Tabs defaultValue="overview">
          <div className="overflow-x-auto px-5 pt-2">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="workqueue">Work Queue</TabsTrigger>
              <TabsTrigger value="accounts">My Accounts</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="feedback">Feedback Inbox</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
              <TabsTrigger value="google">Google Reviews</TabsTrigger>
              <TabsTrigger value="doctors">Doctors</TabsTrigger>
              <TabsTrigger value="messages">Message Library</TabsTrigger>
              <TabsTrigger value="links">Links & QR</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </div>
          <div className="p-5">
            <TabsContent value="overview"><ReputationOverviewTab scope={scope} /></TabsContent>
            <TabsContent value="workqueue"><ReputationWorkQueueTab scope={scope} /></TabsContent>
            <TabsContent value="accounts"><ReputationAccountsTab /></TabsContent>
            <TabsContent value="campaigns"><ReputationCampaignsTab scope={scope} /></TabsContent>
            <TabsContent value="requests"><ReputationRequestsTab scope={scope} /></TabsContent>
            <TabsContent value="feedback"><ReputationFeedbackTab scope={scope} /></TabsContent>
            <TabsContent value="insights"><ReputationInsightsTab scope={scope} /></TabsContent>
            <TabsContent value="google"><ReputationGoogleReviewsTab scope={scope} /></TabsContent>
            <TabsContent value="doctors"><ReputationDoctorsTab scope={scope} /></TabsContent>
            <TabsContent value="messages"><ReputationMessageLibraryTab /></TabsContent>
            <TabsContent value="links"><ReputationLinksTab scope={scope} /></TabsContent>
            <TabsContent value="automation"><ReputationAutomationTab /></TabsContent>
            <TabsContent value="settings"><ReputationSettingsTab scope={scope} /></TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
