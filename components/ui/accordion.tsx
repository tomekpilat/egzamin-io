"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;

function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={cn("border-b", className)} {...props} />;
}

function AccordionTrigger({ className, children, headingLabel, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger> & { headingLabel?: string }) {
  return (
    <AccordionPrimitive.Header asChild>
      <h2 className="flex" aria-label={headingLabel}>
        <AccordionPrimitive.Trigger data-slot="accordion-trigger" className={cn("flex flex-1 items-center justify-between gap-4 text-left outline-none", className)} {...props}>
          {children}
          <ChevronDown data-slot="accordion-chevron" className="size-4 shrink-0 transition-transform duration-200" aria-hidden="true" />
        </AccordionPrimitive.Trigger>
      </h2>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return <AccordionPrimitive.Content data-slot="accordion-content" className={cn("overflow-hidden", className)} {...props}>{children}</AccordionPrimitive.Content>;
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
