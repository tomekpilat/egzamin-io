import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SocialProvider = "google" | "facebook";

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
  {
    id: "facebook",
    label: "Kontynuuj z Facebookiem",
    pendingLabel: "Łączenie z Facebookiem…",
    icon: FacebookBrandIcon,
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

function FacebookBrandIcon() {
  return (
    <svg
      className="social-brand-icon facebook-brand-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      data-brand-icon="facebook"
    >
      <path fill="#FFF" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.02 10.125 11.927v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971h-1.513c-1.49 0-1.956.931-1.956 1.887v2.263h3.328l-.532 3.49h-2.796V24C19.612 23.093 24 18.099 24 12.073Z" />
      <path fill="#1877F2" d="m16.671 15.563.532-3.49h-3.328V9.81c0-.956.466-1.887 1.956-1.887h1.513V4.952s-1.373-.236-2.686-.236c-2.741 0-4.533 1.672-4.533 4.697v2.66H7.078v3.49h3.047V24a12.12 12.12 0 0 0 3.75 0v-8.437h2.796Z" />
    </svg>
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
