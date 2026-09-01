import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { OnboardingWizard } from "@/components/domain/OnboardingWizard";
import { ALL_CLIENTS } from "@/lib/mock/clients";

export default function OnboardingPage() {
  const onboarding = ALL_CLIENTS.filter((c) => c.status === "onboarding");

  return (
    <div className="animate-fade-in">
      <PageHeader title="Onboarding" subtitle={`${onboarding.length} client${onboarding.length !== 1 ? "s" : ""} currently onboarding · Create Client → Add Doctor → Add Locations → Connect Google → Connect Website → Connect Social → Connect Ads → Create Review Campaign → Run Initial Audit → Generate First Report`} />

      {onboarding.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-[13.5px] text-[var(--color-ink-tertiary)]">No clients currently onboarding.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {onboarding.map((client) => (
            <OnboardingWizard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
