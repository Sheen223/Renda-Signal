import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const signals = sqliteTable("signals", {
  id: text("id").primaryKey(),
  chainId: integer("chain_id").notNull().default(137),
  contractRequestId: text("contract_request_id"),
  senderXId: text("sender_x_id").notNull(),
  senderHandle: text("sender_handle").notNull(),
  targetXId: text("target_x_id").notNull(),
  targetHandle: text("target_handle").notNull(),
  employerWallet: text("employer_wallet").notNull(),
  employeeWallet: text("employee_wallet"),
  title: text("title").notNull(),
  terms: text("terms").notNull(),
  amountAtomic: text("amount_atomic").notNull(),
  attentionAtomic: text("attention_atomic").notNull(),
  acceptBy: integer("accept_by").notNull(),
  deliverBy: integer("deliver_by").notNull(),
  status: text("status").notNull().default("draft"),
  fundingHash: text("funding_hash"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(),
  signalId: text("signal_id").notNull(),
  submitterWallet: text("submitter_wallet").notNull(),
  publicUrl: text("public_url"),
  objectKey: text("object_key"),
  contentHash: text("content_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const identityLinks = sqliteTable("identity_links", {
  xUserId: text("x_user_id").primaryKey(),
  xHandle: text("x_handle").notNull(),
  wallet: text("wallet").notNull(),
  signature: text("signature").notNull(),
  linkedAt: integer("linked_at").notNull(),
});
