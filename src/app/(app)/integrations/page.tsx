"use client";

import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useScope } from "@/lib/scope-context";
import { useRuntimeStore } from "@/lib/runtime-store";
import {
  IntegrationsOverviewTab, SyncCenterTab, MappingReviewTab, IntegrationActivityLogTab,
} from "@/components/domain/IntegrationsTabs";

export default function IntegrationsPage() {
  useRuntimeStore();
  const { scope, scopeMeta } = useScope();

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumb={scope.type !== "all" ? scopeMeta.crumbs.concat({ label: "Integrations" }) : undefined}
        title="Integrations"
        subtitle="Connection Health Center — Google, Meta, WhatsApp, Ads, and websites across the portfolio."
      />
      <Card>
        <Tabs defaultValue="overview">
          <div className="overflow-x-auto px-5 pt-2">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sync">Sync Center</TabsTrigger>
              <TabsTrigger value="mapping">Data Mapping Review</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
            </TabsList>
          </div>
          <div className="p-5">
            <TabsContent value="overview"><IntegrationsOverviewTab scope={scope} /></TabsContent>
            <TabsContent value="sync"><SyncCenterTab scope={scope} /></TabsContent>
            <TabsContent value="mapping"><MappingReviewTab /></TabsContent>
            <TabsContent value="activity"><IntegrationActivityLogTab /></TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
