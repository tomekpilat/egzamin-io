"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

type AccountMenuTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  displayName: string;
  email: string;
};

export const AccountMenuTrigger = forwardRef<HTMLButtonElement, AccountMenuTriggerProps>(function AccountMenuTrigger(
  { displayName, email, className = "", ...props },
  ref,
) {
  return (
    <button ref={ref} type="button" className={className} aria-label={`Menu konta: ${displayName}`} {...props}>
      <span className="dashboard-account">
        <span className="dashboard-account-avatar">{displayName.slice(0, 2).toUpperCase()}</span>
        <span className="dashboard-account-copy"><b>{displayName}</b><small>{email}</small></span>
      </span>
      <ChevronDown className="dashboard-session-chevron" aria-hidden="true" />
    </button>
  );
});
