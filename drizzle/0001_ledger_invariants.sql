ALTER TABLE "credit_transactions"
  ADD CONSTRAINT "credit_transactions_reverses_fk"
  FOREIGN KEY ("reverses_transaction_id") REFERENCES "credit_transactions"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "posting_slots"
  ADD CONSTRAINT "posting_slots_id_posting_unique" UNIQUE ("id", "posting_id");
--> statement-breakpoint
ALTER TABLE "applications"
  ADD CONSTRAINT "applications_slot_belongs_to_posting_fk"
  FOREIGN KEY ("slot_id", "posting_id") REFERENCES "posting_slots"("id", "posting_id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "posting_slots"
  ADD CONSTRAINT "posting_slots_precision_valid" CHECK (
    ("precision" = 'DATE_ONLY' AND "calendar_date" IS NOT NULL AND "starts_at" IS NULL AND "ends_at" IS NULL)
    OR
    ("precision" = 'TIMED' AND "calendar_date" IS NOT NULL AND "starts_at" IS NOT NULL AND ("ends_at" IS NULL OR "ends_at" > "starts_at"))
  );
--> statement-breakpoint
ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_distinct_members" CHECK ("owner_id" <> "participant_id");
--> statement-breakpoint
ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_distinct_credit_parties" CHECK ("payer_id" <> "recipient_id");
--> statement-breakpoint
CREATE FUNCTION prevent_append_only_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_change();
--> statement-breakpoint
CREATE TRIGGER credit_transactions_append_only BEFORE UPDATE OR DELETE ON "credit_transactions"
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_change();
--> statement-breakpoint
CREATE TRIGGER credit_entries_append_only BEFORE UPDATE OR DELETE ON "credit_entries"
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_change();
--> statement-breakpoint
CREATE FUNCTION validate_credit_transaction_entries() RETURNS trigger AS $$
DECLARE
  transaction_type credit_transaction_type;
  entry_count integer;
  entry_sum bigint;
BEGIN
  SELECT "type" INTO transaction_type FROM "credit_transactions" WHERE "id" = NEW."transaction_id";
  SELECT COUNT(*), COALESCE(SUM("delta"), 0) INTO entry_count, entry_sum
    FROM "credit_entries" WHERE "transaction_id" = NEW."transaction_id";
  IF transaction_type = 'EXCHANGE' AND (entry_count <> 2 OR entry_sum <> 0) THEN
    RAISE EXCEPTION 'Exchange credit transaction must contain two balanced entries';
  END IF;
  IF transaction_type = 'ADMIN_ADJUSTMENT' AND entry_count <> 1 THEN
    RAISE EXCEPTION 'Admin adjustment must contain exactly one entry';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER credit_entries_balanced
  AFTER INSERT ON "credit_entries"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION validate_credit_transaction_entries();
