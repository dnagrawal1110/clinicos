"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isLiveMode } from "@/lib/integration-mode";
import { allLocations, getLocation as getMockLocation, getLocationBySlug as getMockLocationBySlug } from "@/lib/mock/clients";
import type { Location, ModuleScores } from "@/lib/types";

interface LocationRow {
  id: string;
  client_id: string;
  slug: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  hours: string | null;
  status: Location["status"];
  google_connected: boolean;
  rating: number;
  review_count: number;
  reviews_this_month: number;
  review_delta_30d: number;
  scores: ModuleScores;
  health_overall: number;
  services: number;
  photos: number;
  posts_active: boolean;
  leads_this_month: number;
  ad_spend_this_month: number;
  has_ads: boolean;
  last_activity: string | null;
}

function mapRow(row: LocationRow): Omit<Location, "doctorIds"> {
  return {
    id: row.id,
    clientId: row.client_id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    address: row.address ?? "",
    phone: row.phone ?? "",
    hours: row.hours ?? "",
    status: row.status,
    googleConnected: row.google_connected,
    rating: row.rating,
    reviewCount: row.review_count,
    reviewsThisMonth: row.reviews_this_month,
    reviewDelta30d: row.review_delta_30d,
    scores: row.scores,
    healthOverall: row.health_overall,
    services: row.services,
    photos: row.photos,
    postsActive: row.posts_active,
    leadsThisMonth: row.leads_this_month,
    adSpendThisMonth: row.ad_spend_this_month,
    hasAds: row.has_ads,
    lastActivity: row.last_activity ?? "",
  };
}

export async function listLocations(clientId?: string) {
  if (!isLiveMode()) {
    const all = allLocations();
    return clientId ? all.filter((l) => l.clientId === clientId) : all;
  }
  const supabase = getSupabaseBrowserClient();
  let query = supabase.from("locations").select("*");
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as LocationRow[]).map(mapRow);
}

export async function getLocationById(id: string) {
  if (!isLiveMode()) return getMockLocation(id) ?? null;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("locations").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as LocationRow) : null;
}

export async function getLocationBySlug(slug: string) {
  if (!isLiveMode()) return getMockLocationBySlug(slug) ?? null;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("locations").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as LocationRow) : null;
}
