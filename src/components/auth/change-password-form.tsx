"use client";

import { useActionState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { changePasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm({ forced = false }: { forced?: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, {});
  return (
    <form action={action} className="form-stack">
      <div className="field-stack">
        <Label htmlFor="currentPassword">
          {forced ? "Geçici parola" : "Mevcut parola"}
        </Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="field-stack">
        <Label htmlFor="newPassword">Yeni parola</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
        <p className="text-sm text-muted-foreground">
          En az 12 karakter kullanın.
        </p>
      </div>
      <div className="field-stack">
        <Label htmlFor="confirmation">Yeni parola tekrarı</Label>
        <Input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <KeyRound aria-hidden="true" />
        )}
        {pending ? "Parola değiştiriliyor…" : "Parolayı değiştir"}
      </Button>
    </form>
  );
}
