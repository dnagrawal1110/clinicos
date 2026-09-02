"use client";

import type { Client } from "@/lib/types";
import type { Scope } from "@/lib/scope-context";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRuntimeStore } from "@/lib/runtime-store";
import {
  ClientOverviewTab, ClientLocationsTab, ClientGoogleTab, ClientReputationTab,
  ClientWebsiteTab, ClientSocialTab, ClientAdsTab, ClientLeadsTab, ClientTasksTab, ClientReportsTab,
} from "./ClientTabs";
import { ClientIntegrationsTab } from "./ClientIntegrationsTab";

export function ClientWorkspaceView({ client, scope }: { client: Client; scope: Scope }) {
  useRuntimeStore();
  return (
    <Tabs defaultValue="overview">
      <TabsList className="mb-5">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="locations">Locations</TabsTrigger>
        <TabsTrigger value="google">Google</TabsTrigger>
        <TabsTrigger value="reputation">Reputation</TabsTrigger>
        <TabsTrigger value="website">Website</TabsTrigger>
        <TabsTrigger value="social">Social</TabsTrigger>
        <TabsTrigger value="ads">Ads</TabsTrigger>
        <TabsTrigger value="leads">Leads</TabsTrigger>
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
      </TabsList>
      <TabsContent value="overview"><ClientOverviewTab client={client} /></TabsContent>
      <TabsContent value="locations"><ClientLocationsTab client={client} /></TabsContent>
      <TabsContent value="google"><ClientGoogleTab client={client} /></TabsContent>
      <TabsContent value="reputation"><ClientReputationTab client={client} scope={scope} /></TabsContent>
      <TabsContent value="website"><ClientWebsiteTab client={client} /></TabsContent>
      <TabsContent value="social"><ClientSocialTab client={client} scope={scope} /></TabsContent>
      <TabsContent value="ads"><ClientAdsTab client={client} scope={scope} /></TabsContent>
      <TabsContent value="leads"><ClientLeadsTab client={client} scope={scope} /></TabsContent>
      <TabsContent value="tasks"><ClientTasksTab client={client} scope={scope} /></TabsContent>
      <TabsContent value="reports"><ClientReportsTab client={client} /></TabsContent>
      <TabsContent value="integrations"><ClientIntegrationsTab client={client} /></TabsContent>
    </Tabs>
  );
}
