import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleBar, HealthRing, TrendTag } from "@/components/ui/health";

export function PortfolioHealth({
  scores, overall, trend,
}: {
  scores: { google: number; reputation: number; website: number; social: number; ads: number; leads: number };
  overall: number;
  trend: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Health</CardTitle>
        <TrendTag value={trend} />
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <HealthRing score={overall} size={92} strokeWidth={8} label="/ 100" />
        <div className="flex-1 flex flex-col gap-3">
          <ModuleBar label="Google Presence" score={scores.google} />
          <ModuleBar label="Reputation" score={scores.reputation} />
          <ModuleBar label="Website & SEO" score={scores.website} />
          <ModuleBar label="Social" score={scores.social} />
          <ModuleBar label="Ads" score={scores.ads} />
          <ModuleBar label="Lead Management" score={scores.leads} />
        </div>
      </CardContent>
    </Card>
  );
}
