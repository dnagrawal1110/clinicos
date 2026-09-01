"use client";

import type { Client, Location } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRuntimeStore } from "@/lib/runtime-store";
import {
  OverviewTab, GoogleTab, ReviewsTab, ContentTab, SeoTab, SocialTab, AdsTab, LeadsTab, ReportsTab,
} from "./LocationTabs";

export function LocationWorkspaceView({ client, location }: { client: Client; location: Location }) {
  useRuntimeStore(); // subscribe so live ReviewFlow completions are reflected without a manual refresh
  return (
    <Tabs defaultValue="overview">
      <TabsList className="mb-5">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="google">Google</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
        <TabsTrigger value="content">Content</TabsTrigger>
        <TabsTrigger value="seo">SEO</TabsTrigger>
        <TabsTrigger value="social">Social</TabsTrigger>
        <TabsTrigger value="ads">Ads</TabsTrigger>
        <TabsTrigger value="leads">Leads</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="overview"><OverviewTab location={location} client={client} /></TabsContent>
      <TabsContent value="google"><GoogleTab location={location} /></TabsContent>
      <TabsContent value="reviews"><ReviewsTab location={location} client={client} /></TabsContent>
      <TabsContent value="content"><ContentTab location={location} /></TabsContent>
      <TabsContent value="seo"><SeoTab location={location} /></TabsContent>
      <TabsContent value="social"><SocialTab location={location} /></TabsContent>
      <TabsContent value="ads"><AdsTab location={location} /></TabsContent>
      <TabsContent value="leads"><LeadsTab location={location} /></TabsContent>
      <TabsContent value="reports"><ReportsTab location={location} client={client} /></TabsContent>
    </Tabs>
  );
}
