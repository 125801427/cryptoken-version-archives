import type { LucideIcon } from "lucide-react";

export type MarketModel = {
  id: string;
  name: string;
  provider: string;
  inputPriceUsd: number;
  outputPriceUsd: number;
  cachedInputPriceUsd?: number;
  tokenPriceCrypto: string;
  unit: string;
  inventory: number;
  change24h: number;
  risk: "Low" | "Watch" | "High";
  accent: string;
  source: string;
};

export type AgentRule = {
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning" | "danger";
};

export type AlertItem = {
  title: string;
  detail: string;
  severity: "critical" | "warning" | "info";
  time: string;
};

export type Transaction = {
  id: string;
  time: string;
  asset: string;
  amount: string;
  cost: string;
  status: "Success" | "Pending" | "Blocked";
  hash: string;
};

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
};
