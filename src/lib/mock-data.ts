import {
  Activity,
  Bot,
  CircleHelp,
  History,
  LayoutDashboard,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import type { AgentRule, AlertItem, MarketModel, NavItem, Transaction } from "./types";

export const navItems: NavItem[] = [
  { id: "overview", label: "总览", icon: LayoutDashboard, active: true },
  { id: "market", label: "模型市场", icon: Activity },
  { id: "agent", label: "AI 购物车", icon: Bot },
  { id: "wallet", label: "钱包", icon: WalletCards },
  { id: "risk", label: "风控", icon: ShieldCheck },
  { id: "history", label: "流水", icon: History },
  { id: "guide", label: "帮助", icon: CircleHelp },
];

export const marketModels: MarketModel[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    inputPriceUsd: 2.5,
    outputPriceUsd: 10,
    cachedInputPriceUsd: 1.25,
    tokenPriceCrypto: "0.000033 BTC",
    unit: "1M input tokens",
    inventory: 12000000,
    change24h: -0.2,
    risk: "Low",
    accent: "bg-sky-500",
    source: "OpenAI API pricing",
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek-R1",
    provider: "DeepSeek",
    inputPriceUsd: 0.435,
    outputPriceUsd: 0.87,
    cachedInputPriceUsd: 0.003625,
    tokenPriceCrypto: "0.435 USDT",
    unit: "1M input tokens",
    inventory: 25000000,
    change24h: 0.1,
    risk: "Watch",
    accent: "bg-emerald-500",
    source: "DeepSeek API pricing",
  },
  {
    id: "claude-sonnet",
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    inputPriceUsd: 3,
    outputPriceUsd: 15,
    cachedInputPriceUsd: 0.3,
    tokenPriceCrypto: "0.00144 ETH",
    unit: "1M input tokens",
    inventory: 8000000,
    change24h: -0.4,
    risk: "Low",
    accent: "bg-violet-500",
    source: "Anthropic pricing",
  },
  {
    id: "gemini-2-5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    inputPriceUsd: 0.3,
    outputPriceUsd: 2.5,
    cachedInputPriceUsd: 0.03,
    tokenPriceCrypto: "0.300 USDT",
    unit: "1M input tokens",
    inventory: 18000000,
    change24h: 0,
    risk: "Low",
    accent: "bg-amber-500",
    source: "Google Gemini pricing",
  },
];

export const priceSeries = [
  { time: "09:00", gpt: 2.5, deepseek: 0.435, btc: 75.8 },
  { time: "10:00", gpt: 2.5, deepseek: 0.435, btc: 75.6 },
  { time: "11:00", gpt: 2.49, deepseek: 0.434, btc: 75.4 },
  { time: "12:00", gpt: 2.5, deepseek: 0.435, btc: 75.9 },
  { time: "13:00", gpt: 2.51, deepseek: 0.436, btc: 76.1 },
  { time: "14:00", gpt: 2.5, deepseek: 0.435, btc: 75.7 },
  { time: "15:00", gpt: 2.5, deepseek: 0.435, btc: 75.8 },
];

export const agentRules: AgentRule[] = [
  { label: "单次购买上限", value: "$5.00", tone: "success" },
  { label: "每日总预算", value: "$24.00", tone: "neutral" },
  { label: "自动触发价", value: "<= $0.435 / 1M", tone: "warning" },
  { label: "付款授权", value: "小额自动", tone: "success" },
];

export const alerts: AlertItem[] = [
  {
    title: "超预算购买被拦截",
    detail: "GPT-4o 采购计划比单次上限高 $3.40",
    severity: "critical",
    time: "15:08",
  },
  {
    title: "重复购买频率偏高",
    detail: "DeepSeek-R1 在 10 分钟内触发 3 次",
    severity: "warning",
    time: "14:52",
  },
  {
    title: "钱包余额低于提醒线",
    detail: "USDT 可用余额低于今日预算的 30%",
    severity: "info",
    time: "13:37",
  },
];

export const transactions: Transaction[] = [
  {
    id: "tx-1402",
    time: "15:02",
    asset: "DeepSeek-R1",
    amount: "0.57M input tokens",
    cost: "0.248 USDT / $0.25",
    status: "Success",
    hash: "0x91a4...e12b",
  },
  {
    id: "tx-1398",
    time: "14:44",
    asset: "GPT-4o",
    amount: "0.25M input tokens",
    cost: "0.0000082 BTC / $0.62",
    status: "Pending",
    hash: "0x48cf...77a9",
  },
  {
    id: "tx-1391",
    time: "13:19",
    asset: "Gemini 2.5 Flash",
    amount: "2.80M input tokens",
    cost: "0.84 USDT / $0.84",
    status: "Blocked",
    hash: "policy-limit",
  },
];
