"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { createPostingAction } from "@/actions/domain";
import { FlexibleAvailabilityBuilder } from "@/components/flexible-availability-builder";
import { PendingButton } from "@/components/pending-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type SlotRow = { id: number };

export function PostingForm() {
  const [schedule, setSchedule] = useState("FLEXIBLE");
  const [slots, setSlots] = useState<SlotRow[]>([{ id: 1 }]);
  return (
    <form action={createPostingAction} className="form-stack max-w-2xl">
      <div className="field-stack">
        <Label htmlFor="title">İlan adı</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={120}
          placeholder="Örn. Dekor taşımak için yardım"
        />
      </div>
      <div className="field-stack">
        <Label htmlFor="description">Açıklama</Label>
        <Textarea
          id="description"
          name="description"
          required
          maxLength={3000}
          placeholder="Beklentiyi, yeri ve önemli ayrıntıları yazın."
        />
      </div>
      <fieldset className="field-stack">
        <legend className="font-medium">Kredi yönü</legend>
        <RadioGroup
          name="direction"
          defaultValue="OWNER_RECEIVES"
          className="grid gap-3 sm:grid-cols-2"
        >
          <Label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-lg border p-4">
            <RadioGroupItem value="OWNER_RECEIVES" />
            Bu ilanla kredi alacağım
          </Label>
          <Label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-lg border p-4">
            <RadioGroupItem value="OWNER_PAYS" />
            Bu ilanla kredi vereceğim
          </Label>
        </RadioGroup>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field-stack">
          <Label htmlFor="creditAmount">Kredi</Label>
          <Input
            id="creditAmount"
            name="creditAmount"
            type="number"
            min="1"
            step="1"
            required
          />
        </div>
        <div className="field-stack">
          <Label htmlFor="pricingUnit">Hesaplama</Label>
          <Select name="pricingUnit" defaultValue="OVERALL">
            <SelectTrigger id="pricingUnit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OVERALL">İşin tamamı için</SelectItem>
              <SelectItem value="HOURLY">Saat başına</SelectItem>
              <SelectItem value="DAILY">Gün başına</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="field-stack">
        <Label htmlFor="scheduleMode">Uygunluk</Label>
        <Select
          name="scheduleMode"
          value={schedule}
          onValueChange={(value) => {
            setSchedule(value);
            if (value === "ONE_TIME") setSlots([{ id: Date.now() }]);
          }}
        >
          <SelectTrigger id="scheduleMode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FLEXIBLE">Esnek tarih aralığı</SelectItem>
            <SelectItem value="ONE_TIME">Tek bir tarih / saat</SelectItem>
            <SelectItem value="MULTIPLE_SLOTS">Birden fazla seçenek</SelectItem>
          </SelectContent>
        </Select>
        {schedule !== "FLEXIBLE" && (
          <p className="text-sm text-muted-foreground">
            Saatleri boş bırakırsanız yalnızca günü belirtmiş olursunuz.
          </p>
        )}
      </div>
      <div hidden={schedule !== "FLEXIBLE"}>
        <FlexibleAvailabilityBuilder active={schedule === "FLEXIBLE"} />
      </div>
      {schedule !== "FLEXIBLE" && (
        <div className="grid gap-3">
          {slots.map((slot, index) => (
            <Card key={slot.id} className="py-4">
              <CardContent className="grid gap-3 px-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                <div className="field-stack">
                  <Label htmlFor={`date-${slot.id}`}>Tarih</Label>
                  <Input
                    id={`date-${slot.id}`}
                    type="date"
                    name="slotDate"
                    required
                  />
                </div>
                <div className="field-stack">
                  <Label htmlFor={`start-${slot.id}`}>Başlangıç</Label>
                  <Input id={`start-${slot.id}`} type="time" name="slotStart" />
                </div>
                <div className="field-stack">
                  <Label htmlFor={`end-${slot.id}`}>Bitiş</Label>
                  <Input id={`end-${slot.id}`} type="time" name="slotEnd" />
                </div>
                {schedule === "MULTIPLE_SLOTS" && slots.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setSlots((rows) =>
                        rows.filter((_, rowIndex) => rowIndex !== index),
                      )
                    }
                    aria-label="Zaman seçeneğini sil"
                  >
                    <Trash2 />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {schedule === "MULTIPLE_SLOTS" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setSlots((rows) => [...rows, { id: Date.now() }])}
            >
              <Plus />
              Zaman seçeneği ekle
            </Button>
          )}
        </div>
      )}
      <PendingButton className="w-full sm:w-auto" pending="İlan yayımlanıyor…">
        İlanı yayımla
      </PendingButton>
    </form>
  );
}
