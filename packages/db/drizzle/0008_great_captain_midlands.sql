ALTER TYPE "public"."wallet_provider" ADD VALUE 'cash';--> statement-breakpoint
ALTER TYPE "public"."wallet_provider" ADD VALUE 'card';--> statement-breakpoint
ALTER TYPE "public"."wallet_provider" ADD VALUE 'savings';--> statement-breakpoint
ALTER TYPE "public"."wallet_provider" ADD VALUE 'crypto';--> statement-breakpoint
ALTER TYPE "public"."wallet_provider" ADD VALUE 'investment';--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "color" varchar(16);--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "color" varchar(16);--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "is_credit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "credit_limit_minor" integer DEFAULT 0 NOT NULL;