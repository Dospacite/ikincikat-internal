"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function PendingButton({
  children,
  pending = "Kaydediliyor…",
  ...props
}: React.ComponentProps<typeof Button> & { pending?: string }) {
  const status = useFormStatus();
  return (
    <Button type="submit" disabled={status.pending} {...props}>
      {status.pending ? pending : children}
    </Button>
  );
}
