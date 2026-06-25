ALTER TABLE "transactions" ADD COLUMN "paid" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recurrence" varchar(16) DEFAULT 'none' NOT NULL;