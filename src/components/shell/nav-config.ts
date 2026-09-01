import {
  LayoutGrid, Sparkles, CheckSquare, BellRing, Users, MapPin, ClipboardList,
  ShieldCheck, Search as SearchIcon, Star, Globe, Share2, Megaphone, Target,
  PenSquare, Image as ImageIcon, CalendarDays, FileBarChart, FileText, TrendingUp,
  Plug, UserCog, Settings as SettingsIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutGrid;
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Command",
    items: [
      { label: "Overview", href: "/", icon: LayoutGrid },
      { label: "AI Command Center", href: "/ai", icon: Sparkles },
      { label: "Tasks", href: "/tasks", icon: CheckSquare, badge: 37 },
      { label: "Alerts", href: "/alerts", icon: BellRing },
    ],
  },
  {
    label: "Clients",
    items: [
      { label: "All Clients", href: "/clients", icon: Users },
      { label: "Locations", href: "/locations", icon: MapPin },
      { label: "Onboarding", href: "/onboarding", icon: ClipboardList },
      { label: "Approvals", href: "/approvals", icon: ShieldCheck },
    ],
  },
  {
    label: "Growth",
    items: [
      { label: "Google", href: "/google", icon: SearchIcon },
      { label: "Reputation", href: "/reputation", icon: Star },
      { label: "Website & SEO", href: "/seo", icon: Globe },
      { label: "Social", href: "/social", icon: Share2 },
      { label: "Ads", href: "/ads", icon: Megaphone },
      { label: "Leads", href: "/leads", icon: Target },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Content Studio", href: "/content", icon: PenSquare },
      { label: "Media Library", href: "/content/media", icon: ImageIcon },
      { label: "Calendar", href: "/content/calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Reporting",
    items: [
      { label: "Reports", href: "/reports", icon: FileBarChart },
      { label: "Client Reports", href: "/reports/client", icon: FileText },
      { label: "Performance", href: "/reports/performance", icon: TrendingUp },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Integrations", href: "/integrations", icon: Plug },
      { label: "Team", href: "/settings/team", icon: UserCog },
      { label: "Settings", href: "/settings", icon: SettingsIcon },
    ],
  },
];
