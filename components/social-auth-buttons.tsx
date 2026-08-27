import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SocialProvider = "google";

type SocialAuthButtonsProps = {
  disabled?: boolean;
  pendingProvider?: SocialProvider | null;
  onSelect: (provider: SocialProvider) => void | Promise<void>;
};

const providers: Array<{
  id: SocialProvider;
  label: string;
  pendingLabel: string;
  icon: typeof GoogleBrandIcon;
}> = [
  {
    id: "google",
    label: "Kontynuuj z Google",
    pendingLabel: "Łączenie z Google…",
    icon: GoogleBrandIcon,
  },
];

function GoogleBrandIcon() {
  return (
    <span
      className="social-brand-icon google-brand-icon"
      aria-hidden="true"
      data-brand-icon="google"
    />
  );
}

export function SocialAuthButtons({
  disabled = false,
  pendingProvider = null,
  onSelect,
}: SocialAuthButtonsProps) {
  const interactionLocked = disabled || pendingProvider !== null;

  return (
    <div className="social-buttons" aria-label="Logowanie społecznościowe">
      {providers.map((provider) => {
        const Icon = provider.icon;
        const isPending = pendingProvider === provider.id;

        return (
          <Button
            key={provider.id}
            className="social-auth-button"
            variant="outline"
            type="button"
            disabled={interactionLocked}
            aria-label={provider.label}
            aria-busy={isPending}
            data-provider={provider.id}
            onClick={() => onSelect(provider.id)}
          >
            <span className="social-auth-icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="social-auth-copy">
              <span className={isPending ? "social-auth-label is-hidden" : "social-auth-label"}>
                {provider.label}
              </span>
              {isPending && (
                <span className="social-auth-loading" aria-live="polite">
                  <LoaderCircle aria-hidden="true" />
                  {provider.pendingLabel}
                </span>
              )}
            </span>
            <span className="social-auth-balance" aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
}
