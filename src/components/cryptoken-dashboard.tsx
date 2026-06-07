"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  Bell,
  Bot,
  Check,
  ChevronDown,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Gauge,
  LockKeyhole,
  LogOut,
  Mail,
  Pause,
  Play,
  Plus,
  QrCode,
  Search,
  Send,
  ShieldAlert,
  ShoppingCart,
  SlidersHorizontal,
  WalletCards,
  X,
} from "lucide-react";
import { navItems } from "@/lib/mock-data";
import type { AlertItem, MarketModel, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

const TokenPriceChart = dynamic(() => import("./price-charts").then((module) => module.TokenPriceChart), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

const WalletBalanceChart = dynamic(() => import("./price-charts").then((module) => module.WalletBalanceChart), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

type Role = "admin" | "operator";
type AuthStatus = "checking" | "login" | "ready" | "offline";
type PlanStatus = "Pending" | "Approved" | "Cancelled" | "Blocked";

type AuthUser = {
  username: string;
  role: Role;
  label: string;
};

type Permissions = {
  canManageSettings: boolean;
  canOperatePlans: boolean;
};

type PurchasePlan = {
  id: string;
  modelName: string;
  quantity: string;
  costUsd: number;
  source: string;
  rule: string;
  status: PlanStatus;
};

type CartStatus = "Pending" | "WaitingApproval" | "Approved" | "Cancelled" | "Blocked";

type PurchaseCartItem = {
  id: string;
  modelId: string;
  modelName: string;
  provider: string;
  quantityMTok: number;
  quantity: string;
  inputPriceUsd: number;
  outputPriceUsd: number;
  maxInputPriceUsdPerMTok: number;
  maxOutputPriceUsdPerMTok: number;
  maxBudgetUsd: number;
  costUsd: number;
  status: CartStatus;
  reason: string;
};

type PurchaseCart = {
  id: string;
  source: string;
  status: CartStatus;
  totalCostUsd: number;
  rule: string;
  items: PurchaseCartItem[];
};

type DashboardSettings = {
  singleLimit: number;
  dailyBudget: number;
  triggerPrice: number;
  autoPay: boolean;
  walletAuthorized: boolean;
  agentPaused: boolean;
  agentControlEnabled: boolean;
  payerAddress: string;
  settlementNetwork: SettlementNetworkId;
  paymentAsset: PaymentAsset;
  walletAddress: string;
  walletLimitUsd: number;
};

type DashboardState = {
  user: AuthUser;
  permissions: Permissions;
  settings: DashboardSettings;
  todaySpend: number;
  purchasePlan: PurchasePlan;
  purchaseCart: PurchaseCart;
  marketModels: MarketModel[];
  alerts: AlertItem[];
  transactions: Transaction[];
  x402Payments: X402Payment[];
};

type X402Payment = {
  id: string;
  orderId: string;
  planId: string;
  cartId?: string;
  modelName: string;
  amount: string;
  asset: string;
  assetType?: PaymentAsset | "erc20" | "native";
  assetAddress?: string | null;
  network: string;
  recipientAddress: string;
  transactionHash?: string;
  payerAddress?: string | null;
  status: "PaymentRequired" | "PendingConfirmation" | "WaitingApproval" | "Failed";
  source: string;
  updatedAt: string;
};

type PaymentSuccess = {
  amount: string;
  asset: string;
  transactionHash: string;
};

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

type ApiError = Error & {
  status?: number;
};

type SettlementNetworkId =
  | "arbitrum-sepolia"
  | "arbitrum-one"
  | "ethereum-mainnet"
  | "ethereum-sepolia"
  | "base"
  | "base-sepolia"
  | "op-mainnet"
  | "op-sepolia"
  | "polygon-pos"
  | "polygon-amoy"
  | "avalanche"
  | "avalanche-fuji";

type PaymentAsset = "USDC" | "NATIVE";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

const apiBase = (process.env.NEXT_PUBLIC_AGENT_API_BASE || "http://127.0.0.1:4010").replace(/\/$/, "");
const publicBasePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
const githubArchiveUrl = "https://github.com/125801427/cryptoken-version-archives";
const demoVideoUrl = "https://www.bilibili.com/video/BV1vcEx6VEGN/?vd_source=a0baab210e21ebd2e4f88e7c2752ecc8";

function publicAsset(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${publicBasePath}${normalizedPath}`;
}

const settlementNetworks: Record<
  SettlementNetworkId,
  {
    id: SettlementNetworkId;
    label: string;
    shortLabel: string;
    chainId: string;
    chainIdDecimal: string;
    rpcUrl: string;
    usdcAddress: string;
    nativePaymentAmount: string;
    blockExplorerUrl: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    riskLabel: string;
    testnet: boolean;
  }
> = {
  "arbitrum-sepolia": {
    id: "arbitrum-sepolia",
    label: "Arbitrum Sepolia",
    shortLabel: "测试网",
    chainId: "0x66eee",
    chainIdDecimal: "421614",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    nativePaymentAmount: "0.00001",
    blockExplorerUrl: "https://sepolia.arbiscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    riskLabel: "测试币",
    testnet: true,
  },
  "arbitrum-one": {
    id: "arbitrum-one",
    label: "Arbitrum One",
    shortLabel: "主网",
    chainId: "0xa4b1",
    chainIdDecimal: "42161",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    usdcAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    nativePaymentAmount: "0.00001",
    blockExplorerUrl: "https://arbiscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    riskLabel: "真钱",
    testnet: false,
  },
  "ethereum-mainnet": {
    id: "ethereum-mainnet",
    label: "Ethereum",
    shortLabel: "主网",
    chainId: "0x1",
    chainIdDecimal: "1",
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    usdcAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    nativePaymentAmount: "0.00001",
    blockExplorerUrl: "https://etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    riskLabel: "真钱",
    testnet: false,
  },
  "ethereum-sepolia": {
    id: "ethereum-sepolia",
    label: "Ethereum Sepolia",
    shortLabel: "测试网",
    chainId: "0xaa36a7",
    chainIdDecimal: "11155111",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    nativePaymentAmount: "0.00001",
    blockExplorerUrl: "https://sepolia.etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    riskLabel: "测试币",
    testnet: true,
  },
  base: {
    id: "base",
    label: "Base",
    shortLabel: "主网",
    chainId: "0x2105",
    chainIdDecimal: "8453",
    rpcUrl: "https://mainnet.base.org",
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    nativePaymentAmount: "0.00001",
    blockExplorerUrl: "https://basescan.org",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    riskLabel: "真钱",
    testnet: false,
  },
  "base-sepolia": {
    id: "base-sepolia",
    label: "Base Sepolia",
    shortLabel: "测试网",
    chainId: "0x14a34",
    chainIdDecimal: "84532",
    rpcUrl: "https://sepolia.base.org",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    nativePaymentAmount: "0.00001",
    blockExplorerUrl: "https://sepolia.basescan.org",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    riskLabel: "测试币",
    testnet: true,
  },
  "op-mainnet": {
    id: "op-mainnet",
    label: "OP Mainnet",
    shortLabel: "主网",
    chainId: "0xa",
    chainIdDecimal: "10",
    rpcUrl: "https://mainnet.optimism.io",
    usdcAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    nativePaymentAmount: "0.00001",
    blockExplorerUrl: "https://optimistic.etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    riskLabel: "真钱",
    testnet: false,
  },
  "op-sepolia": {
    id: "op-sepolia",
    label: "OP Sepolia",
    shortLabel: "测试网",
    chainId: "0xaa37dc",
    chainIdDecimal: "11155420",
    rpcUrl: "https://sepolia.optimism.io",
    usdcAddress: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    nativePaymentAmount: "0.00001",
    blockExplorerUrl: "https://sepolia-optimism.etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    riskLabel: "测试币",
    testnet: true,
  },
  "polygon-pos": {
    id: "polygon-pos",
    label: "Polygon PoS",
    shortLabel: "主网",
    chainId: "0x89",
    chainIdDecimal: "137",
    rpcUrl: "https://polygon-rpc.com",
    usdcAddress: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    nativePaymentAmount: "0.05",
    blockExplorerUrl: "https://polygonscan.com",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    riskLabel: "真钱",
    testnet: false,
  },
  "polygon-amoy": {
    id: "polygon-amoy",
    label: "Polygon Amoy",
    shortLabel: "测试网",
    chainId: "0x13882",
    chainIdDecimal: "80002",
    rpcUrl: "https://rpc-amoy.polygon.technology",
    usdcAddress: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
    nativePaymentAmount: "0.05",
    blockExplorerUrl: "https://amoy.polygonscan.com",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    riskLabel: "测试币",
    testnet: true,
  },
  avalanche: {
    id: "avalanche",
    label: "Avalanche C-Chain",
    shortLabel: "主网",
    chainId: "0xa86a",
    chainIdDecimal: "43114",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    usdcAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    nativePaymentAmount: "0.0005",
    blockExplorerUrl: "https://snowtrace.io",
    nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
    riskLabel: "真钱",
    testnet: false,
  },
  "avalanche-fuji": {
    id: "avalanche-fuji",
    label: "Avalanche Fuji",
    shortLabel: "测试网",
    chainId: "0xa869",
    chainIdDecimal: "43113",
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
    usdcAddress: "0x5425890298aed601595a70AB815c96711a31Bc65",
    nativePaymentAmount: "0.0005",
    blockExplorerUrl: "https://testnet.snowtrace.io",
    nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
    riskLabel: "测试币",
    testnet: true,
  },
};
const defaultCommand = "按每个模型 3 美元以内预算创建多模型采购篮，只有低于触发价的模型才能加入。";
const timeRanges = ["1H", "24H", "7D"] as const;
const marketFilters = ["All", "Low", "Watch", "High"] as const;
const marketFilterLabels: Record<(typeof marketFilters)[number], string> = {
  All: "全部",
  Low: "低风险",
  Watch: "观察",
  High: "高风险",
};

function hasPositiveHexBalance(hexValue: string) {
  try {
    return BigInt(hexValue || "0x0") > BigInt(0);
  } catch {
    return false;
  }
}

const connectionSteps = [
  "连接 MetaMask，付款前只读取钱包账户。",
  "在钱包扩展里人工确认所选资产转账。",
  "确认链上到账后再批准采购篮入账。",
];

const platformFlowSteps = [
  "用户或客户 Agent 提交模型 token 采购请求。",
  "平台解析模型、预算、触发价和付款方式。",
  "风控检查单笔限额、日预算、重复频率和钱包授权。",
  "通过后生成待付款采购篮；风险项会被阻断或要求人工处理。",
];

const defaultAgentAction = "purchase.cart.create";

const agentAccessPayloads: Record<string, string> = {
  "purchase.cart.create": `{
  "requestId": "req-20260602-0001",
  "clientAgentId": "acme-support-agent",
  "issuedAt": "2026-06-02T09:30:00+08:00",
  "signature": "hmac-sha256:cbce896372d302b5b6f546eb393b3b7b44d6d4e5b57fb1dc45c20537435ac7c1",
  "action": "purchase.cart.create",
  "payload": {
    "items": [
      { "model": "DeepSeek V4 Pro", "maxBudgetUsd": 5, "maxInputPriceUsdPerMTok": 0.435 },
      { "model": "DeepSeek V4 Flash", "maxBudgetUsd": 3, "maxInputPriceUsdPerMTok": 0.14 }
    ],
    "callbackUrl": "https://client.example.com/cryptoken/callback"
  }
}`,
  "purchase.cart.cancel": `{
  "requestId": "req-20260602-0002",
  "clientAgentId": "acme-support-agent",
  "issuedAt": "2026-06-02T09:31:00+08:00",
  "signature": "hmac-sha256:b279e712bb1beffcb182c819f4283c56bc45193be17113d67b697faad9faf263",
  "action": "purchase.cart.cancel",
  "payload": {
    "cartId": "cart-001",
    "reason": "client budget changed"
  }
}`,
  "risk.emergency_stop": `{
  "requestId": "req-20260602-0003",
  "clientAgentId": "acme-support-agent",
  "issuedAt": "2026-06-02T09:32:00+08:00",
  "signature": "hmac-sha256:c7f62a07d137ba20bb0510c44abbbca0a2f8de265db8fc9f52b833d554ea6e1f",
  "action": "risk.emergency_stop",
  "payload": {
    "reason": "client risk signal",
    "scope": "wallet_and_pending_plans"
  }
}`,
  "wallet.authorization.request": `{
  "requestId": "req-20260602-0004",
  "clientAgentId": "acme-support-agent",
  "issuedAt": "2026-06-02T09:33:00+08:00",
  "signature": "hmac-sha256:1ca21dc1a1ea51368becca622474b4ece12371116551e95d9164b0661e3947c6",
  "action": "wallet.authorization.request",
  "payload": {
    "walletAddress": "0x7e12...a94f",
    "maxSinglePaymentUsd": 5,
    "dailyBudgetUsd": 24
  }
}`,
};

const agentAccessEndpoints = [
  { label: "登录", value: "POST /api/auth/login", helper: "复制登录接口" },
  { label: "会话", value: "GET /api/auth/me", helper: "复制会话接口" },
  { label: "状态", value: "GET /api/state", helper: "复制状态接口" },
  { label: "Agent 控制", value: "POST /api/agent/control", helper: "复制控制接口" },
  { label: "OpenAPI", value: "GET /agent-control.openapi.json", helper: "打开 OpenAPI" },
];

const x402Endpoints = [
  { label: "402 要求", value: "GET /api/x402/payment-required", helper: "复制 x402 付款要求接口" },
  { label: "结算", value: "POST /api/x402/settle", helper: "复制 x402 结算接口" },
  { label: "监听", value: "POST /api/x402/payment-webhook", helper: "复制 x402 监听接口" },
  { label: "OpenAPI", value: "GET /x402-protocol.openapi.json", helper: "打开 x402 OpenAPI" },
];

const agentControlActions = [
  "purchase.cart.create",
  "purchase.cart.cancel",
  "risk.emergency_stop",
  "wallet.authorization.request",
];

const agentActionHints: Record<string, { operator: string; admin: string }> = {
  "purchase.cart.create": { operator: "操作员可提交", admin: "创建多模型采购篮" },
  "purchase.cart.cancel": { operator: "操作员可提交", admin: "取消待处理采购篮" },
  "risk.emergency_stop": { operator: "需要管理员", admin: "管理员可急停" },
  "wallet.authorization.request": { operator: "需要管理员", admin: "管理员可授权" },
};

const helpTopics = [
  {
    title: "登录与角色",
    items: [
      "管理员账号：admin / Cryptoken@2026。",
      "操作员账号：operator / Operator@2026。",
      "管理员管理 Agent 控制、急停和钱包授权；操作员处理采购篮。",
    ],
  },
  {
    title: "付款安全",
    items: [
      "付款账户来自当前连接的 MetaMask，不在平台里写死。",
      "x402 付款要求只返回配置的收款地址。",
      "后端按所选网络和资产校验真实链上交易后才能批准。",
    ],
  },
  {
    title: "x402 支付层",
    items: [
      "平台生成 402 Payment Required 和 PAYMENT-REQUIRED 载荷。",
      "MetaMask 按用户选择发送 USDC 或当前网络原生币转账。",
      "监听器校验资产类型、付款地址、收款地址、金额和交易状态。",
    ],
  },
  {
    title: "采购流程",
    items: [
      "用户或客户 Agent 提交模型、预算、触发价和回调数据。",
      "平台创建可付款、可批准、可取消的待处理采购篮。",
      "只有付款和风控都通过后，批准动作才会写入库存账本。",
    ],
  },
  {
    title: "Agent 控制 API",
    items: [
      "主控制接口是 POST /api/agent/control。",
      "允许动作包括创建采购篮、取消采购篮、急停和钱包授权请求。",
      "控制 API 受会话、角色、签名、幂等键和 Agent 控制开关保护。",
    ],
  },
  {
    title: "上线检查",
    items: [
      "确认 OpenAPI 契约与前端动作、后端实现一致。",
      "确认所有菜单可点击，关键按钮至少 44px 高。",
      "先用小额测试转账，并在 MetaMask 中核对收款地址。",
    ],
  },
];

const faqs = [
  { question: "如何防止误采购？", answer: "急停会关闭自动付款并锁定待处理采购篮。" },
  { question: "付款后能退款吗？", answer: "已确认链上付款遵循钱包和链上规则；未批准采购篮不会执行入账。" },
  { question: "为什么需要人工批准？", answer: "付款到账后仍需人工确认，避免高风险或错误采购直接入库。" },
];


const statusStyles = {
  Success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20",
  Pending: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
  Blocked: "bg-rose-500/10 text-rose-700 ring-rose-500/20",
};

const planStatusStyles = {
  Pending: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
  WaitingApproval: "bg-sky-500/10 text-sky-700 ring-sky-500/20",
  Approved: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20",
  Cancelled: "bg-stone-200 text-stone-700 ring-stone-300",
  Blocked: "bg-rose-500/10 text-rose-700 ring-rose-500/20",
};

const severityStyles = {
  critical: "border-rose-500/40 bg-rose-500/10 text-rose-950",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-950",
  info: "border-sky-500/40 bg-sky-500/10 text-sky-950",
};

const ruleStyles = {
  neutral: "bg-stone-100 text-stone-700",
  success: "bg-emerald-500/10 text-emerald-700",
  warning: "bg-amber-500/10 text-amber-700",
  danger: "bg-rose-500/10 text-rose-700",
};

async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, ...requestOptions } = options;
  const headers = new Headers(options.headers);
  const init: RequestInit = {
    ...requestOptions,
    credentials: "include",
    headers,
  };

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${apiBase}${path}`, init);
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
  let data: unknown = null;
  if (contentType.includes("application/json") && rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { message: rawText };
    }
  }
  if (!response.ok) {
    const errorBody = data as { message?: string; error?: string } | null;
    const error = new Error(errorBody?.message || errorBody?.error || `HTTP ${response.status}`) as ApiError;
    error.status = response.status;
    throw error;
  }

  return data as T;
}

function usdcUnitsHex(amount: string) {
  return usdcUnits(amount).toString(16).padStart(64, "0");
}

function tokenUnits(amount: string, decimals: number) {
  const [wholePart, decimalPart = ""] = amount.split(".");
  return (
    BigInt((wholePart || "0").replace(/\D/g, "") || "0") * BigInt(10) ** BigInt(decimals) +
    BigInt((decimalPart.slice(0, decimals).padEnd(decimals, "0") || "0").replace(/\D/g, "") || "0")
  );
}

function tokenUnitsHex(amount: string, decimals: number) {
  return `0x${tokenUnits(amount, decimals).toString(16)}`;
}

function usdcUnits(amount: string) {
  return tokenUnits(amount, 6);
}

function hasEnoughUsdcBalance(hexValue: string, amount: string) {
  try {
    return BigInt(hexValue || "0x0") >= usdcUnits(amount);
  } catch {
    return false;
  }
}

function hasEnoughTokenBalance(hexValue: string, amount: string, decimals: number) {
  try {
    return BigInt(hexValue || "0x0") >= tokenUnits(amount, decimals);
  } catch {
    return false;
  }
}

function gasWithBufferHex(estimatedGas: string, minimumGas = BigInt(30000)) {
  const gas = BigInt(estimatedGas || "0x0");
  const buffered = (gas * BigInt(13)) / BigInt(10) + BigInt(1);
  const finalGas = buffered > minimumGas ? buffered : minimumGas;
  return `0x${finalGas.toString(16)}`;
}

function erc20TransferData(to: string, amount: string) {
  const normalizedTo = to.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalizedTo)) {
    throw new Error("收款地址不是有效的 EVM 地址。");
  }

  return `0xa9059cbb${normalizedTo.slice(2).padStart(64, "0")}${usdcUnitsHex(amount)}`;
}

function erc20BalanceOfData(address: string) {
  const normalizedAddress = address.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalizedAddress)) {
    throw new Error("钱包地址不是有效的 EVM 地址。");
  }

  return `0x70a08231${normalizedAddress.slice(2).padStart(64, "0")}`;
}

function formatTokenBalance(hexValue: string, decimals = 18, precision = 6) {
  const units = BigInt(hexValue || "0x0");
  const scale = BigInt(10) ** BigInt(decimals);
  const whole = units / scale;
  const fraction = (units % scale)
    .toString()
    .padStart(decimals, "0")
    .slice(0, precision)
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function formatUsdcBalance(hexValue: string) {
  return formatTokenBalance(hexValue, 6, 6);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    Success: "成功",
    Pending: "待处理",
    PendingConfirmation: "等待链上确认",
    PaymentRequired: "待付款",
    WaitingApproval: "等待批准",
    Approved: "已批准",
    Cancelled: "已取消",
    Blocked: "已阻断",
    Failed: "失败",
  };
  return labels[status] || status;
}

function Panel({ children, className, ...props }: React.ComponentPropsWithoutRef<"section">) {
  return (
    <section
      {...props}
      className={cn(
        "min-w-0 scroll-mt-28 rounded-lg border border-stone-200 bg-white shadow-[0_16px_42px_rgba(28,25,23,0.07)] transition-shadow hover:shadow-[0_20px_56px_rgba(28,25,23,0.11)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function PanelHeader({
  title,
  action,
  eyebrow,
}: Readonly<{
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-4 border-b border-stone-200 px-5">
      <div className="min-w-0">
        {eyebrow ? <p className="text-[16px] font-medium uppercase text-stone-500">{eyebrow}</p> : null}
        <h2 className="truncate text-lg font-semibold text-stone-950">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-full min-h-24 items-center justify-center rounded-md bg-stone-50 text-[16px] text-stone-400">
      正在加载行情
    </div>
  );
}

function BrandLogo({ size = "md" }: Readonly<{ size?: "sm" | "md" | "lg" }>) {
  const imageSize = size === "lg" ? 44 : size === "sm" ? 32 : 40;

  return (
    <Image
      src={publicAsset("/cryptoken-logo.jpg")}
      alt="Cryptoken"
      width={imageSize}
      height={imageSize}
      className={cn(
        "shrink-0 rounded-md object-cover ring-1 ring-white/25",
        size === "lg" ? "size-11" : size === "sm" ? "size-8" : "size-10",
      )}
      priority={size === "lg"}
    />
  );
}

function NavigationItems({
  activeSection,
  mobile = false,
  onNavigate,
}: Readonly<{
  activeSection: string;
  mobile?: boolean;
  onNavigate: (sectionId: string) => void;
}>) {
  return (
    <>
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          data-testid={`${mobile ? "mobile-nav" : "nav"}-${item.id}`}
          aria-current={activeSection === item.id ? "page" : undefined}
          className={cn(
            mobile
              ? "flex h-12 shrink-0 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-[16px] text-stone-700"
              : "flex h-12 w-full items-center gap-3 rounded-md px-3 text-[16px] text-stone-300 transition hover:bg-white/10 hover:text-white",
            activeSection === item.id &&
              (mobile
                ? "border-stone-950 bg-stone-950 text-white"
                : "bg-white text-stone-950 hover:bg-white hover:text-stone-950"),
          )}
        >
          <item.icon size={mobile ? 16 : 18} />
          {item.label}
        </button>
      ))}
    </>
  );
}

function AgentStateButton({
  agentPaused,
  compact = false,
  disabled = false,
  onToggle,
}: Readonly<{
  agentPaused: boolean;
  compact?: boolean;
  disabled?: boolean;
  onToggle: () => void;
}>) {
  return (
    <button
      className={cn(
        "flex min-h-12 items-center gap-2 rounded-md px-3 text-[16px] font-medium disabled:cursor-not-allowed disabled:opacity-50",
        compact && "px-4 text-[17px]",
        compact
          ? agentPaused
            ? "bg-emerald-600 text-white"
            : "bg-rose-600 text-white"
          : agentPaused
            ? "bg-rose-500/10 text-rose-700"
            : "bg-emerald-500/10 text-emerald-700",
      )}
      onClick={onToggle}
      disabled={disabled}
      data-testid={compact ? "emergency-stop" : "agent-status"}
    >
      {agentPaused ? <Play size={15} /> : <Pause size={15} />}
      {compact ? (agentPaused ? "恢复" : "急停") : agentPaused ? "恢复 AI" : "暂停 AI"}
    </button>
  );
}

function OverviewCard({
  label,
  value,
  meta,
  Icon,
}: Readonly<{
  label: string;
  value: string;
  meta: string;
  Icon: React.ComponentType<{ size?: number }>;
}>) {
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-[16px] font-medium text-stone-500">{label}</p>
        <div className="flex size-10 items-center justify-center rounded-md bg-stone-100 text-stone-700">
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-normal text-stone-950">{value}</p>
      <p className="mt-1 text-[16px] text-stone-500">{meta}</p>
    </Panel>
  );
}

function AuthShell({
  title,
  children,
}: Readonly<{
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 p-4 text-stone-950">
      <section className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-6 shadow-[0_16px_42px_rgba(28,25,23,0.07)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center overflow-hidden rounded-lg bg-sky-100">
            <BrandLogo size="lg" />
          </div>
          <div>
            <p className="text-[18px] font-semibold">Cryptoken</p>
            <h1 className="text-[16px] text-stone-500">{title}</h1>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}

function LoginScreen({
  error,
  busy,
  username,
  password,
  onUsername,
  onPassword,
  onSubmit,
}: Readonly<{
  error: string;
  busy: boolean;
  username: string;
  password: string;
  onUsername: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  return (
    <AuthShell title="登录">
      <form className="space-y-4" onSubmit={onSubmit} data-testid="login-form">
        <label className="block text-[16px] font-medium text-stone-700" htmlFor="login-username">
          账号
          <input
            id="login-username"
            className="mt-2 h-12 w-full rounded-md border border-stone-200 px-3 text-[16px] text-stone-950 outline-none ring-emerald-500/20 transition focus:ring-4"
            value={username}
            onChange={(event) => onUsername(event.target.value)}
            autoComplete="username"
            data-testid="login-username"
          />
        </label>
        <label className="block text-[16px] font-medium text-stone-700" htmlFor="login-password">
          密码
          <input
            id="login-password"
            className="mt-2 h-12 w-full rounded-md border border-stone-200 px-3 text-[16px] text-stone-950 outline-none ring-emerald-500/20 transition focus:ring-4"
            type="password"
            value={password}
            onChange={(event) => onPassword(event.target.value)}
            autoComplete="current-password"
            data-testid="login-password"
          />
        </label>
        {error ? (
          <div className="rounded-md bg-rose-500/10 p-3 text-[16px] font-medium text-rose-700" data-testid="login-error">
            {error}
          </div>
        ) : null}
        <button
          className="flex h-12 w-full items-center justify-center rounded-md bg-stone-950 text-[16px] font-medium text-white disabled:bg-stone-300 disabled:text-stone-500"
          disabled={busy}
          data-testid="login-submit"
        >
          {busy ? "登录中" : "登录"}
        </button>
        <div className="rounded-md bg-stone-50 p-3 text-[16px] leading-7 text-stone-600" data-testid="login-demo-accounts">
          <p className="font-medium text-stone-800">PS 演示账号</p>
          <p>
            管理员：<span className="font-mono text-stone-950">admin / Cryptoken@2026</span>
          </p>
          <p>
            操作员：<span className="font-mono text-stone-950">operator / Operator@2026</span>
          </p>
        </div>
      </form>
    </AuthShell>
  );
}

function chainExplorerUrl(hash: string) {
  return hash.startsWith("0x") ? `https://etherscan.io/search?f=0&q=${encodeURIComponent(hash)}` : null;
}

export default function CryptokenDashboard() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [appState, setAppState] = useState<DashboardState | null>(null);
  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("Cryptoken@2026");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [command, setCommand] = useState(defaultCommand);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState<(typeof timeRanges)[number]>("1H");
  const [marketFilter, setMarketFilter] = useState<(typeof marketFilters)[number]>("All");
  const [showAlertPeek, setShowAlertPeek] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [showAgentAccess, setShowAgentAccess] = useState(false);
  const [selectedAgentAction, setSelectedAgentAction] = useState(defaultAgentAction);
  const [planSelected, setPlanSelected] = useState(true);
  const [actionNote, setActionNote] = useState("正在等待 API 状态。");
  const [connectedWalletAddress, setConnectedWalletAddress] = useState("");
  const [connectedUsdcBalance, setConnectedUsdcBalance] = useState("");
  const [connectedNativeBalance, setConnectedNativeBalance] = useState("");
  const [walletConnectStatus, setWalletConnectStatus] = useState<"idle" | "connected" | "unavailable" | "error">("idle");
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccess | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const hasSessionHint = window.localStorage.getItem("cryptoken-session") === "1";
        if (!hasSessionHint) {
          const health = await fetch(`${apiBase}/health`);
          if (!health.ok) {
            throw new Error(`HTTP ${health.status}`);
          }
          if (!cancelled) {
            setAuthStatus("login");
          }
          return;
        }

        const me = await apiRequest<{ user: AuthUser }>("/api/auth/me");
        const state = await apiRequest<DashboardState>("/api/state");
        if (!cancelled) {
          setUser(me.user);
          setAppState(state);
          setPlanSelected(["Pending", "WaitingApproval"].includes(state.purchaseCart.status));
          setAuthStatus("ready");
          setActionNote("API 状态已同步。");
        }
      } catch (error) {
        if (cancelled) return;
        const status = (error as ApiError).status;
        window.localStorage.removeItem("cryptoken-session");
        setUser(null);
        setAppState(null);
        setAuthStatus(status === 401 ? "login" : "offline");
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleApiError = (error: unknown) => {
    const apiError = error as ApiError;
    if (apiError.status === 401) {
      window.localStorage.removeItem("cryptoken-session");
      setUser(null);
      setAppState(null);
      setAuthStatus("login");
      setLoginError("");
      return;
    }

    setActionNote(apiError.status === 403 ? "权限不足。" : apiError.message || "API 请求失败。");
  };

  const runStateAction = async (action: () => Promise<DashboardState>, note: string) => {
    setBusy(true);
    try {
      const state = await action();
      setAppState(state);
      setUser(state.user);
      setActionNote(note);
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setLoginError("");
    try {
      const result = await apiRequest<{ user: AuthUser }>("/api/auth/login", {
        method: "POST",
        body: { username: loginUsername, password: loginPassword },
      });
      const state = await apiRequest<DashboardState>("/api/state");
      setUser(result.user);
      setAppState(state);
      window.localStorage.setItem("cryptoken-session", "1");
      setPlanSelected(["Pending", "WaitingApproval"].includes(state.purchaseCart.status));
      setAuthStatus("ready");
      setActionNote("登录成功。");
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.status === 401) {
        setLoginError("账号或密码错误。");
        setAuthStatus("login");
      } else {
        setAuthStatus("offline");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await apiRequest<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    } catch {
      // Logout should still reset local state if the API is already gone.
    } finally {
      setUser(null);
      setAppState(null);
      window.localStorage.removeItem("cryptoken-session");
      setPlanSelected(true);
      setAuthStatus("login");
      setBusy(false);
    }
  };

  const pendingAutoVerifyPayment =
    appState?.x402Payments?.find(
      (payment) =>
        payment.orderId === appState.purchaseCart.id &&
        payment.status === "PendingConfirmation" &&
        Boolean(payment.transactionHash),
    ) ?? null;
  const pendingAutoVerifyKey = pendingAutoVerifyPayment
    ? `${pendingAutoVerifyPayment.orderId}:${pendingAutoVerifyPayment.transactionHash}`
    : "";

  useEffect(() => {
    if (authStatus !== "ready" || !pendingAutoVerifyPayment?.transactionHash) {
      return;
    }

    const paymentToVerify = pendingAutoVerifyPayment;
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;

    async function pollPayment() {
      attempts += 1;
      try {
        const state = await apiRequest<DashboardState>("/api/x402/track-transfer", {
          method: "POST",
          body: {
            orderId: paymentToVerify.orderId,
            transactionHash: paymentToVerify.transactionHash,
            payerAddress: paymentToVerify.payerAddress || connectedWalletAddress || undefined,
          },
        });
        if (cancelled) return;

        setAppState(state);
        setUser(state.user);
        const updatedPayment =
          state.x402Payments?.find((payment) => payment.orderId === paymentToVerify.orderId) ?? paymentToVerify;
        if (state.purchaseCart.status === "WaitingApproval" || updatedPayment.status === "WaitingApproval") {
          setActionNote("付款已到账，采购篮等待人工批准。");
          setPaymentSuccess({
            amount: updatedPayment.amount,
            asset: updatedPayment.asset,
            transactionHash: updatedPayment.transactionHash || paymentToVerify.transactionHash || "",
          });
          return;
        }

        if (attempts < 30) {
          timer = window.setTimeout(pollPayment, 4000);
        } else {
          setActionNote("链上确认仍在等待中，可稍后自动刷新或手动刷新。");
        }
      } catch (error) {
        if (cancelled) return;
        const apiError = error as ApiError;
        if (apiError.status === 401) {
          window.localStorage.removeItem("cryptoken-session");
          setUser(null);
          setAppState(null);
          setAuthStatus("login");
          return;
        }
        if (attempts < 30) {
          timer = window.setTimeout(pollPayment, 5000);
        } else {
          setActionNote(apiError.message || "自动验证到账暂时失败，请手动刷新。");
        }
      }
    }

    timer = window.setTimeout(() => {
      setActionNote("链上付款已提交，正在自动验证到账。");
      void pollPayment();
    }, 2500);
    return () => {
      cancelled = true;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [authStatus, connectedWalletAddress, pendingAutoVerifyKey, pendingAutoVerifyPayment]);

  if (authStatus === "checking") {
    return (
      <AuthShell title="连接中">
        <div className="rounded-md bg-stone-50 p-4 text-[16px] text-stone-600" data-testid="auth-checking">
          正在连接 API
        </div>
      </AuthShell>
    );
  }

  if (authStatus === "offline") {
    return (
      <AuthShell title="API 离线">
        <div className="space-y-4">
          <div className="rounded-md bg-rose-500/10 p-4 text-[16px] font-medium text-rose-700" data-testid="api-offline">
            {apiBase}
          </div>
          <button
            className="flex h-12 w-full items-center justify-center rounded-md bg-stone-950 text-[16px] font-medium text-white"
            onClick={() => {
              setAuthStatus("checking");
              window.location.reload();
            }}
            data-testid="api-retry"
          >
            重试
          </button>
        </div>
      </AuthShell>
    );
  }

  if (authStatus === "login" || !user || !appState) {
    return (
      <LoginScreen
        error={loginError}
        busy={busy}
        username={loginUsername}
        password={loginPassword}
        onUsername={setLoginUsername}
        onPassword={setLoginPassword}
        onSubmit={handleLogin}
      />
    );
  }

  const { permissions, settings, purchaseCart } = appState;
  const currentNetwork = settlementNetworks[settings.settlementNetwork] || settlementNetworks["arbitrum-sepolia"];
  const canManage = permissions.canManageSettings;
  const canOperate = permissions.canOperatePlans;
  const canActOnPlan = purchaseCart.status === "Pending";
  const canApprove = purchaseCart.status === "WaitingApproval" && planSelected && canOperate;
  const paymentActionNote =
    purchaseCart.status === "Pending"
      ? null
      : purchaseCart.status === "WaitingApproval"
        ? "付款已到账，可以批准入账。"
        : purchaseCart.rule;
  const currentPlanX402Payment = (appState.x402Payments ?? []).find((payment) => payment.orderId === purchaseCart.id) ?? null;
  const selectedCartItems = purchaseCart.items;
  const pendingCount = appState.transactions.filter((tx) => tx.status === "Pending").length + (["Pending", "WaitingApproval"].includes(purchaseCart.status) ? purchaseCart.items.length : 0);
  const blockedCount = appState.transactions.filter((tx) => tx.status === "Blocked").length + (settings.agentPaused ? 1 : 0);
  const dailyUsage = Math.min(100, (appState.todaySpend / settings.dailyBudget) * 100);
  const strategyScore = settings.agentPaused ? 48 : settings.autoPay ? (purchaseCart.status === "Approved" ? 86 : 78) : 72;
  const activePageLabel = navItems.find((item) => item.id === activeSection)?.label ?? "总览";
  const selectedAgentAccessPayload = agentAccessPayloads[selectedAgentAction] ?? agentAccessPayloads[defaultAgentAction];
  const latestX402Payment = currentPlanX402Payment;
  const x402Amount = purchaseCart.totalCostUsd.toFixed(2);
  const currentPaymentAsset = settings.paymentAsset === "NATIVE" ? "NATIVE" : "USDC";
  const currentPaymentSymbol = currentPaymentAsset === "NATIVE" ? currentNetwork.nativeCurrency.symbol : "USDC";
  const currentPaymentAmount = currentPaymentAsset === "NATIVE" ? currentNetwork.nativePaymentAmount : x402Amount;
  const currentPaymentAssetLabel =
    currentPaymentAsset === "NATIVE" ? `${currentNetwork.nativeCurrency.symbol} 原生币` : "USDC 稳定币";
  const currentPaymentAssetAddress = currentPaymentAsset === "NATIVE" ? null : currentNetwork.usdcAddress;
  const displayedPayerAddress = currentPlanX402Payment?.payerAddress || connectedWalletAddress || "连接 MetaMask 后确定";
  const paymentPreflightIssue =
    !connectedWalletAddress
      ? "请先连接钱包并刷新余额。"
      : currentPaymentAsset === "USDC" && connectedUsdcBalance && Number(connectedUsdcBalance) < Number(currentPaymentAmount)
        ? `${currentNetwork.label} 上 USDC 不足，需要 ${currentPaymentAmount} USDC。`
        : currentPaymentAsset === "USDC" && connectedNativeBalance === "0"
          ? `${currentNetwork.label} 上缺少 ${currentNetwork.nativeCurrency.symbol} 网络费。`
          : currentPaymentAsset === "NATIVE" && Number(connectedNativeBalance || "0") <= Number(currentPaymentAmount)
            ? `${currentNetwork.label} 上 ${currentNetwork.nativeCurrency.symbol} 不足，需要 ${currentPaymentAmount} ${currentNetwork.nativeCurrency.symbol}，还要预留网络费。`
            : null;
  const paymentStage =
    purchaseCart.status === "Approved"
      ? "approved"
      : purchaseCart.status === "WaitingApproval" || currentPlanX402Payment?.status === "WaitingApproval"
      ? "paid"
      : currentPlanX402Payment?.status === "PendingConfirmation"
        ? "confirming"
        : currentPlanX402Payment
          ? "submitted"
          : "ready";
  const paymentStageLabel: Record<typeof paymentStage, string> = {
    ready: "待付款",
    submitted: "已提交",
    confirming: "自动验证中",
    paid: "已到账",
    approved: "已批准入账",
  };
  const paymentProgressPercent =
    paymentStage === "paid" || paymentStage === "approved" ? 100 : paymentStage === "confirming" ? 66 : paymentStage === "submitted" ? 42 : 18;
  const paymentStatusSteps = [
    { label: "发起付款", done: Boolean(currentPlanX402Payment), active: paymentStage === "ready" || paymentStage === "submitted" },
    { label: "链上确认", done: paymentStage === "paid" || paymentStage === "approved", active: paymentStage === "confirming" },
    { label: paymentStage === "approved" ? "已批准入账" : "等待批准", done: paymentStage === "approved", active: paymentStage === "paid" },
  ];
  const x402PaymentRequired = {
    x402Version: 2,
    orderId: purchaseCart.id,
    cartId: purchaseCart.id,
    description: `Cryptoken multi-model token basket: ${purchaseCart.items.map((item) => item.modelName).join(", ")}`,
    payerPolicy: "connected-wallet",
    accepts: [
      {
        scheme: "exact",
        network: currentNetwork.id,
        networkLabel: currentNetwork.label,
        asset: currentPaymentSymbol,
        assetType: currentPaymentAsset === "NATIVE" ? "native" : "erc20",
        assetAddress: currentPaymentAssetAddress,
        amount: currentPaymentAmount,
        recipientAddress: settings.walletAddress,
        resource: "/api/x402/settle",
        mimeType: "application/json",
      },
    ],
  };
  const x402ProtocolPayload = JSON.stringify(
    {
      step1: {
        request: "GET /api/x402/payment-required",
        response: "402 Payment Required",
        header: "PAYMENT-REQUIRED: base64url(JSON)",
        body: x402PaymentRequired,
      },
      step2: {
        wallet: "MetaMask 确认转账",
        chainId: currentNetwork.chainIdDecimal,
        token: currentPaymentAssetAddress || `${currentNetwork.nativeCurrency.symbol} native coin`,
        method:
          currentPaymentAsset === "NATIVE"
            ? `${currentNetwork.nativeCurrency.symbol} native transfer(recipient, amount)`
            : "USDC.transfer(recipient, amount)",
      },
      step3: {
        listener: "POST /api/x402/track-transfer",
        result: `校验 ${currentPaymentSymbol} 到账后等待人工批准`,
      },
    },
    null,
    2,
  );
  const x402PaymentSummary = JSON.stringify(
    {
      orderId: purchaseCart.id,
      cartId: purchaseCart.id,
      amount: currentPaymentAmount,
      asset: currentPaymentSymbol,
      assetType: currentPaymentAsset === "NATIVE" ? "native" : "erc20",
      network: currentNetwork.id,
      payerAddress: connectedWalletAddress || "MetaMask 当前连接账户",
      recipientAddress: settings.walletAddress,
      nextAction: currentPaymentAsset === "NATIVE" ? "metamask_native_transfer" : "metamask_usdc_transfer",
    },
    null,
    2,
  );

  const ruleCards = [
    { label: "单笔限额", value: `$${settings.singleLimit.toFixed(2)}`, tone: "success" as const },
    { label: "日预算", value: `$${settings.dailyBudget.toFixed(2)}`, tone: "neutral" as const },
    { label: "默认触发价", value: `<= $${settings.triggerPrice.toFixed(3)} / 1M`, tone: "warning" as const },
    { label: "付款授权", value: settings.autoPay ? "已启用" : "手动", tone: settings.autoPay ? ("success" as const) : ("warning" as const) },
  ];

  const overviewCards = [
    { label: "钱包额度", value: `$${settings.walletLimitUsd.toFixed(2)}`, meta: "钱包付款限额", Icon: WalletCards },
    {
      label: "今日支出",
      value: `$${appState.todaySpend.toFixed(2)}`,
      meta: `已用日预算 ${dailyUsage.toFixed(1)}%`,
      Icon: ShoppingCart,
    },
    { label: "待处理", value: String(pendingCount), meta: "等待审批", Icon: Bot },
    {
      label: "已阻断",
      value: String(blockedCount),
      meta: settings.agentPaused ? "急停中" : "最近 60 分钟",
      Icon: ShieldAlert,
    },
  ];

  const query = searchQuery.trim().toLowerCase();
  const visibleMarketModels = appState.marketModels.filter((model) => {
    const matchesFilter = marketFilter === "All" || model.risk === marketFilter;
    const matchesSearch =
      query.length === 0 ||
      model.name.toLowerCase().includes(query) ||
      model.provider.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const handleNavClick = (sectionId: string) => {
    setActiveSection(sectionId);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const handleTimeRange = () => {
    setTimeRange((current) => {
      const currentIndex = timeRanges.indexOf(current);
      return timeRanges[(currentIndex + 1) % timeRanges.length];
    });
  };

  const handleMarketFilter = () => {
    setMarketFilter((current) => {
      const currentIndex = marketFilters.indexOf(current);
      return marketFilters[(currentIndex + 1) % marketFilters.length];
    });
  };

  const updateRules = (patch: Partial<Pick<DashboardSettings, "singleLimit" | "dailyBudget" | "triggerPrice">>) => {
    if (!canManage) {
      setActionNote("权限不足。");
      return;
    }

    void runStateAction(
      () =>
        apiRequest<DashboardState>("/api/settings/rules", {
          method: "POST",
          body: patch,
        }),
      "规则已更新。",
    );
  };

  const handleGeneratePlan = () => {
    setPlanSelected(true);
    void runStateAction(
      () =>
        apiRequest<DashboardState>("/api/carts", {
          method: "POST",
          body: { command, source: "natural-language-strategy" },
        }),
      "多模型采购篮已创建。",
    );
  };

  const cartItemPayload = (model: MarketModel, maxBudgetUsd = 0.05) => ({
    model: model.id,
    maxBudgetUsd,
    maxInputPriceUsdPerMTok: model.inputPriceUsd,
    maxOutputPriceUsdPerMTok: model.outputPriceUsd,
  });

  const existingEditableCartItems = () =>
    purchaseCart.status === "Pending"
      ? purchaseCart.items.map((item) => ({
          model: item.modelId,
          maxBudgetUsd: item.maxBudgetUsd,
          targetQuantityMTok: item.quantityMTok,
          maxInputPriceUsdPerMTok: item.maxInputPriceUsdPerMTok,
          maxOutputPriceUsdPerMTok: item.maxOutputPriceUsdPerMTok,
        }))
      : [];

  const handleSingleMarketPlan = (model: MarketModel) => {
    const nextCommand = `单独采购 ${model.name}，使用 0.05 USDC 以内的小额测试预算。`;
    setCommand(nextCommand);
    setPlanSelected(true);
    void runStateAction(
      () =>
        apiRequest<DashboardState>("/api/carts", {
          method: "POST",
          body: {
            command: nextCommand,
            items: [cartItemPayload(model)],
            source: "market-single",
          },
        }),
      `${model.name} 单模型采购篮已创建。`,
    );
  };

  const handleMarketPlan = (model: MarketModel) => {
    const nextCommand = `把 ${model.name} 加入当前采购篮，使用 0.05 USDC 以内的小额测试预算。`;
    const existingItems = existingEditableCartItems();
    setCommand(nextCommand);
    setPlanSelected(true);
    void runStateAction(
      () =>
        apiRequest<DashboardState>("/api/carts", {
          method: "POST",
          body: {
            command: nextCommand,
            items: [
              ...existingItems,
              cartItemPayload(model),
            ],
            source: "market-shortcut",
          },
        }),
      `${model.name} 已加入采购篮。`,
    );
  };

  const handleApprove = () => {
    if (!canApprove) return;
    void runStateAction(
      () => apiRequest<DashboardState>(`/api/carts/${encodeURIComponent(purchaseCart.id)}/approve`, { method: "POST" }),
      "采购篮已批准。",
    );
    setPlanSelected(false);
  };

  const handleCancel = () => {
    if (!canActOnPlan || !canOperate) return;
    void runStateAction(
      () => apiRequest<DashboardState>(`/api/carts/${encodeURIComponent(purchaseCart.id)}/cancel`, { method: "POST" }),
      "采购篮已取消。",
    );
    setPlanSelected(false);
  };

  const handleRemoveCartItem = (item: PurchaseCartItem) => {
    if (!canActOnPlan || !canOperate) return;
    void runStateAction(
      () => apiRequest<DashboardState>(`/api/carts/${encodeURIComponent(purchaseCart.id)}/items/${encodeURIComponent(item.id)}/remove`, { method: "POST" }),
      `${item.modelName} 已移出采购篮。`,
    );
  };

  const handleUpdateCartItemBudget = (item: PurchaseCartItem, maxBudgetUsd: number) => {
    if (!canActOnPlan || !canOperate) return;
    void runStateAction(
      () =>
        apiRequest<DashboardState>(`/api/carts/${encodeURIComponent(purchaseCart.id)}/items/${encodeURIComponent(item.id)}`, {
          method: "POST",
          body: { maxBudgetUsd },
        }),
      `${item.modelName} 预算已更新。`,
    );
  };

  const handleEmergencyToggle = () => {
    if (!canManage) {
      setActionNote("权限不足。");
      return;
    }

    void runStateAction(
      () =>
        apiRequest<DashboardState>(settings.agentPaused ? "/api/risk/resume" : "/api/risk/emergency-stop", {
          method: "POST",
        }),
      settings.agentPaused ? "Agent 已恢复。" : "已触发急停。",
    );
  };

  const handleAutoPayToggle = () => {
    if (!canManage) {
      setActionNote("权限不足。");
      return;
    }

    void runStateAction(
      () =>
        apiRequest<DashboardState>("/api/wallet/authorization", {
          method: "POST",
          body: { authorized: !settings.walletAuthorized },
        }),
      !settings.walletAuthorized ? "钱包授权已启用。" : "钱包授权已关闭。",
    );
  };

  const handleAgentControlToggle = () => {
    if (!canManage) {
      setActionNote("权限不足。");
      return;
    }

    void runStateAction(
      () =>
        apiRequest<DashboardState>("/api/settings/agent-control", {
          method: "POST",
          body: { enabled: !settings.agentControlEnabled },
        }),
      !settings.agentControlEnabled ? "Agent 控制已开启。" : "Agent 控制已关闭。",
    );
  };

  const handleSettlementNetworkChange = (network: SettlementNetworkId) => {
    if (!canOperate) {
      setActionNote("权限不足。");
      return;
    }
    setConnectedWalletAddress("");
    setConnectedUsdcBalance("");
    setConnectedNativeBalance("");
    setWalletConnectStatus("idle");
    const nextNetwork = settlementNetworks[network];
    void runStateAction(
      () =>
        apiRequest<DashboardState>("/api/settings/settlement-network", {
          method: "POST",
          body: { network },
        }),
      nextNetwork.testnet
        ? `已切换到 ${nextNetwork.label}，付款资产可继续选择。`
        : `已切换到 ${nextNetwork.label} 主网，付款会使用真实资产。`,
    );
  };

  const handlePaymentAssetChange = (asset: PaymentAsset) => {
    if (!canOperate) {
      setActionNote("权限不足。");
      return;
    }

    void runStateAction(
      () =>
        apiRequest<DashboardState>("/api/settings/payment-asset", {
          method: "POST",
          body: { asset },
        }),
      asset === "NATIVE"
        ? `付款资产已切换为 ${currentNetwork.nativeCurrency.symbol} 原生币。`
        : "付款资产已切换为 USDC。",
    );
  };

  const copyText = async (text: string, successNote: string, fallbackNote = "Copy failed.") => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      copied = document.execCommand("copy");
      textarea.remove();
    }
    setActionNote(copied ? successNote : fallbackNote);
  };

  const handleAgentEndpoint = (endpoint: (typeof agentAccessEndpoints)[number]) => {
    if (endpoint.value.includes("/agent-control.openapi.json")) {
      window.open(publicAsset("/agent-control.openapi.json"), "_blank", "noopener,noreferrer");
      setActionNote("已打开 OpenAPI 契约。");
      return;
    }

    void copyText(endpoint.value, `${endpoint.label} 接口已复制。`, `${endpoint.label} 接口已选中。`);
  };

  const handleAgentAction = (action: string) => {
    setSelectedAgentAction(action);
    void copyText(action, `${action} 已复制。`, "示例已切换。");
  };

  const handleX402Endpoint = (endpoint: (typeof x402Endpoints)[number]) => {
    if (endpoint.value.includes("/x402-protocol.openapi.json")) {
      window.open(publicAsset("/x402-protocol.openapi.json"), "_blank", "noopener,noreferrer");
      setActionNote("已打开 x402 OpenAPI。");
      return;
    }

    void copyText(endpoint.value, `${endpoint.label} 接口已复制。`, `${endpoint.label} 接口已选中。`);
  };

  const ensureSettlementNetwork = async (ethereum: EthereumProvider) => {
    try {
      await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: currentNetwork.chainId }] });
    } catch (switchError) {
      const code = (switchError as { code?: number }).code;
      if (code !== 4902) {
        throw switchError;
      }
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
            {
              chainId: currentNetwork.chainId,
              chainName: currentNetwork.label,
              nativeCurrency: currentNetwork.nativeCurrency,
              rpcUrls: [currentNetwork.rpcUrl],
              blockExplorerUrls: [currentNetwork.blockExplorerUrl],
            },
        ],
      });
    }
  };

  const connectWallet = async () => {
    const ethereum = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    if (!ethereum?.request) {
      setWalletConnectStatus("unavailable");
      await copyText(x402PaymentSummary, "已复制付款信息，请安装或打开 MetaMask。", "已生成付款信息。");
      window.open("https://metamask.io/", "_blank", "noopener,noreferrer");
      setActionNote("没有检测到 MetaMask 扩展，已打开 MetaMask 官网。");
      return null;
    }

    const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
    const walletAddress = accounts[0];
    if (!walletAddress) {
      throw new Error("MetaMask 没有返回钱包账户。");
    }

    await ensureSettlementNetwork(ethereum);
    const [balanceHex, nativeBalanceHex] = (await Promise.all([
      ethereum.request({
        method: "eth_call",
        params: [
          {
            to: currentNetwork.usdcAddress,
            data: erc20BalanceOfData(walletAddress),
          },
          "latest",
        ],
      }),
      ethereum.request({ method: "eth_getBalance", params: [walletAddress, "latest"] }),
    ])) as [string, string];

    setConnectedWalletAddress(walletAddress);
    setConnectedUsdcBalance(formatUsdcBalance(balanceHex));
    setConnectedNativeBalance(formatTokenBalance(nativeBalanceHex, currentNetwork.nativeCurrency.decimals, 6));
    setWalletConnectStatus("connected");
    setActionNote(
      currentPaymentAsset === "USDC" && !hasEnoughUsdcBalance(balanceHex, currentPaymentAmount)
        ? `${currentNetwork.label} 上的 USDC 不足，需要 ${currentPaymentAmount} USDC。`
        : currentPaymentAsset === "USDC" && !hasPositiveHexBalance(nativeBalanceHex)
          ? `钱包已连接，但 ${currentNetwork.label} 上没有 ${currentNetwork.nativeCurrency.symbol}，无法支付网络费。`
          : currentPaymentAsset === "NATIVE" &&
              !hasEnoughTokenBalance(nativeBalanceHex, currentPaymentAmount, currentNetwork.nativeCurrency.decimals)
            ? `钱包已连接，但 ${currentNetwork.label} 上 ${currentNetwork.nativeCurrency.symbol} 不足。`
            : `钱包已连接，${currentNetwork.label} 的 USDC 和 ${currentNetwork.nativeCurrency.symbol} 余额已刷新。`,
    );
    return { walletAddress, nativeBalanceHex, usdcBalanceHex: balanceHex };
  };

  const handleConnectWallet = async () => {
    setBusy(true);
    try {
      await connectWallet();
    } catch (error) {
      setWalletConnectStatus("error");
      setActionNote((error as Error).message || "连接钱包失败。");
    } finally {
      setBusy(false);
    }
  };

  const handleX402PaymentRequired = async () => {
    const json = JSON.stringify(x402PaymentRequired);
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    const encoded = window
      .btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    await copyText(encoded, "已复制 PAYMENT-REQUIRED，并开始监听收款地址。", "已生成 PAYMENT-REQUIRED。");
    try {
      const state = await apiRequest<DashboardState>("/api/x402/listen-transfer", {
        method: "POST",
        body: {
          orderId: purchaseCart.id,
          payerAddress: connectedWalletAddress || undefined,
        },
      });
      setAppState(state);
      setUser(state.user);
    } catch (error) {
      setActionNote((error as Error).message || "监听收款地址失败。");
    }
  };

  const handleOpenMetaMaskPayment = async () => {
    const ethereum = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    if (!ethereum?.request) {
      await copyText(x402PaymentSummary, "已复制付款信息，请安装或打开 MetaMask。", "已生成付款信息。");
      window.open("https://metamask.io/", "_blank", "noopener,noreferrer");
      setActionNote("没有检测到 MetaMask 扩展，已打开 MetaMask 官网。");
      return;
    }

    setBusy(true);
    try {
      const wallet = await connectWallet();
      if (!wallet) {
        return;
      }
      if (!hasPositiveHexBalance(wallet.nativeBalanceHex)) {
        throw new Error(`当前网络缺少 ${currentNetwork.nativeCurrency.symbol}，无法支付网络费。`);
      }
      if (currentPaymentAsset === "USDC" && !hasEnoughUsdcBalance(wallet.usdcBalanceHex, currentPaymentAmount)) {
        throw new Error(`${currentNetwork.label} 上 USDC 不足，需要 ${currentPaymentAmount} USDC。`);
      }
      if (
        currentPaymentAsset === "NATIVE" &&
        !hasEnoughTokenBalance(wallet.nativeBalanceHex, currentPaymentAmount, currentNetwork.nativeCurrency.decimals)
      ) {
        throw new Error(
          `${currentNetwork.label} 上 ${currentNetwork.nativeCurrency.symbol} 不足，需要 ${currentPaymentAmount} ${currentNetwork.nativeCurrency.symbol}。`,
        );
      }

      const transactionParams:
        | { from: string; to: string; value: string; data?: never; gas?: string }
        | { from: string; to: string; value: string; data: string; gas?: string } =
        currentPaymentAsset === "NATIVE"
          ? {
              from: wallet.walletAddress,
              to: settings.walletAddress,
              value: tokenUnitsHex(currentPaymentAmount, currentNetwork.nativeCurrency.decimals),
            }
          : {
              from: wallet.walletAddress,
              to: currentNetwork.usdcAddress,
              value: "0x0",
              data: erc20TransferData(settings.walletAddress, currentPaymentAmount),
            };
      try {
        const estimatedGas = (await ethereum.request({
          method: "eth_estimateGas",
          params: [transactionParams],
        })) as string;
        transactionParams.gas = gasWithBufferHex(
          estimatedGas,
          currentPaymentAsset === "NATIVE" ? BigInt(30000) : BigInt(70000),
        );
      } catch {
        transactionParams.gas = currentPaymentAsset === "NATIVE" ? "0x7530" : "0x11170";
      }

      const transactionHash = (await ethereum.request({
        method: "eth_sendTransaction",
        params: [transactionParams],
      })) as string;

      const state = await apiRequest<DashboardState>("/api/x402/track-transfer", {
        method: "POST",
        body: {
          orderId: purchaseCart.id,
          transactionHash,
          payerAddress: wallet.walletAddress,
        },
      });
      setAppState(state);
      setUser(state.user);
      const updatedPayment = state.x402Payments?.find((payment) => payment.orderId === purchaseCart.id);
      if (state.purchaseCart.status === "WaitingApproval" || updatedPayment?.status === "WaitingApproval") {
        setActionNote("付款已到账，采购篮等待人工批准。");
        setPaymentSuccess({
          amount: updatedPayment?.amount || currentPaymentAmount,
          asset: updatedPayment?.asset || currentPaymentSymbol,
          transactionHash,
        });
      } else {
        setActionNote("链上付款已提交，正在自动验证到账。");
      }
    } catch (error) {
      setActionNote((error as Error).message || "MetaMask 付款未完成。");
    } finally {
      setBusy(false);
    }
  };

  const handleX402CollectionConfirm = async () => {
    if (!currentPlanX402Payment?.transactionHash) {
      void runStateAction(
        () =>
          apiRequest<DashboardState>("/api/x402/listen-transfer", {
            method: "POST",
            body: {
              orderId: purchaseCart.id,
              payerAddress: connectedWalletAddress || undefined,
            },
          }),
        "已刷新收款监听。",
      );
      return;
    }

    setBusy(true);
    try {
      const state = await apiRequest<DashboardState>("/api/x402/track-transfer", {
          method: "POST",
          body: {
            orderId: purchaseCart.id,
            transactionHash: currentPlanX402Payment.transactionHash,
            payerAddress: currentPlanX402Payment.payerAddress || connectedWalletAddress || undefined,
          },
        });
      setAppState(state);
      setUser(state.user);
      const updatedPayment = state.x402Payments?.find((payment) => payment.orderId === purchaseCart.id) ?? currentPlanX402Payment;
      if (state.purchaseCart.status === "WaitingApproval" || updatedPayment.status === "WaitingApproval") {
        setActionNote("付款已到账，采购篮等待人工批准。");
        setPaymentSuccess({
          amount: updatedPayment.amount,
          asset: updatedPayment.asset,
          transactionHash: updatedPayment.transactionHash || currentPlanX402Payment.transactionHash,
        });
      } else {
        setActionNote("链上交易校验已刷新，仍在等待确认。");
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusy(false);
    }
  };

  const handleCopyWallet = async () => {
    try {
      await navigator.clipboard.writeText(settings.walletAddress);
      setCopyStatus("copied");
      setActionNote("收款地址已复制。");
      window.setTimeout(() => setCopyStatus("idle"), 1600);
    } catch {
      setCopyStatus("failed");
      setActionNote("复制失败。");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    }
  };

  return (
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-stone-200 bg-stone-950 text-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-sky-100">
            <BrandLogo />
          </div>
          <div>
            <p className="text-[16px] font-semibold">Cryptoken</p>
            <p className="text-[16px] text-stone-400">AI token 金库</p>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          <NavigationItems activeSection={activeSection} onNavigate={handleNavClick} />
        </nav>
        <div className="absolute inset-x-3 bottom-3 rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4">
          <div className="flex items-center gap-2 text-[16px] font-medium text-emerald-100">
            <LockKeyhole size={17} />
            API 已连接
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="flex size-12 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white lg:hidden"
                onClick={() => handleNavClick("overview")}
                aria-label="返回总览"
                data-testid="mobile-overview-icon"
              >
                <BrandLogo size="sm" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold text-stone-950 sm:text-2xl">币元 · {activePageLabel}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="hidden h-12 min-w-64 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 text-[16px] text-stone-500 md:flex">
                <Search size={16} />
                <input
                  className="h-full min-w-0 flex-1 bg-transparent text-stone-900 outline-none placeholder:text-stone-500"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索模型、交易、钱包地址"
                  data-testid="global-search"
                />
              </label>
              <div className="hidden h-12 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-[16px] sm:flex" data-testid="user-badge">
                <span className="font-medium">{user.username}</span>
                <span className="text-stone-500">{user.label}</span>
              </div>
              <button
                className={cn(
                  "relative flex size-12 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-700",
                  showAlertPeek && "border-amber-300 bg-amber-50 text-amber-700",
                )}
                onClick={() => {
                  setShowAlertPeek((current) => !current);
                  handleNavClick("risk");
                }}
                aria-pressed={showAlertPeek}
                aria-label={showAlertPeek ? "隐藏告警" : "查看告警"}
                data-testid="notification-bell"
              >
                <Bell size={17} />
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-rose-500" />
              </button>
              <button
                className="flex h-12 min-w-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-stone-950 px-3 text-[16px] font-medium text-white disabled:bg-stone-300 disabled:text-stone-500"
                onClick={() => {
                  handleNavClick("agent");
                  handleGeneratePlan();
                }}
                disabled={busy}
                aria-label="新建策略"
                data-testid="new-strategy"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">新建策略</span>
              </button>
              <button
                className="flex h-12 min-w-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-stone-200 bg-white px-3 text-[16px] font-medium text-stone-700"
                onClick={handleLogout}
                aria-label="退出登录"
                data-testid="logout"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">退出</span>
              </button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto border-t border-stone-200 px-4 py-2 lg:hidden">
            <NavigationItems activeSection={activeSection} mobile onNavigate={handleNavClick} />
          </nav>
          {showAlertPeek ? (
            <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-[16px] text-amber-900 sm:px-6" data-testid="alert-peek">
              <span className="font-semibold">{appState.alerts[0]?.title}</span>
              <span className="ml-2 text-amber-800">{appState.alerts[0]?.detail}</span>
            </div>
          ) : null}
        </header>

        <div className="space-y-5 p-4 sm:p-6">
          <section className={cn("grid scroll-mt-28 gap-3 lg:grid-cols-2", activeSection !== "overview" && "hidden")} data-testid="home-resource-links">
            <a
              className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-stone-950 bg-stone-950 px-4 py-3 text-white shadow-[0_16px_42px_rgba(28,25,23,0.16)] transition hover:bg-stone-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
              href={githubArchiveUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className="flex min-w-0 items-center gap-3">
                <ExternalLink className="shrink-0" size={22} />
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold">GitHub 公开仓库</span>
                  <span className="mt-1 block text-[16px] leading-6 text-stone-200">
                    源码与 demo 演示视频都在这个链接中，README 里有清晰的视频入口。
                  </span>
                </span>
              </span>
              <ExternalLink className="shrink-0" size={20} />
            </a>
            <a
              className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sky-950 shadow-[0_16px_42px_rgba(28,25,23,0.08)] transition hover:bg-sky-100 focus:outline-none focus:ring-4 focus:ring-sky-500/30"
              href={demoVideoUrl}
              target="_blank"
              rel="noreferrer"
              data-testid="demo-video-link"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Play className="shrink-0 text-sky-700" size={22} />
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold">Demo 演示视频</span>
                  <span className="mt-1 block text-[16px] leading-6 text-sky-800">
                    打开 B 站演示视频，快速查看完整平台流程。
                  </span>
                </span>
              </span>
              <ExternalLink className="shrink-0 text-sky-700" size={20} />
            </a>
          </section>

          <section id="overview" className={cn("grid scroll-mt-28 gap-4 md:grid-cols-2 xl:grid-cols-4", activeSection !== "overview" && "hidden")}>
            {overviewCards.map((card) => (
              <OverviewCard key={card.label} {...card} />
            ))}
          </section>

          <section className={cn("grid gap-5", activeSection === "overview" || activeSection === "agent" ? "xl:grid-cols-[1fr]" : "hidden")}>
            <Panel id="price" className={cn(activeSection !== "overview" && "hidden")}>
              <PanelHeader
                title="模型 token 定价"
                eyebrow="市场时机"
                action={
                  <button
                    className="flex h-12 items-center gap-2 rounded-md border border-stone-200 px-3 text-[16px] font-medium text-stone-700"
                    onClick={handleTimeRange}
                    data-testid="time-range"
                  >
                    {timeRange}
                    <ChevronDown size={15} />
                  </button>
                }
              />
              <div className="h-80 px-2 py-5 sm:px-5" data-testid="price-chart">
                <TokenPriceChart range={timeRange} />
              </div>
            </Panel>

            <Panel id="agent" className={cn(activeSection !== "agent" && "hidden")}>
              <PanelHeader
                title="平台执行智能体"
                eyebrow="编排"
                action={
                  canManage ? (
                    <AgentStateButton agentPaused={settings.agentPaused} disabled={busy} onToggle={handleEmergencyToggle} />
                  ) : null
                }
              />
              <div className="space-y-4 p-5">
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                  <label className="text-[16px] font-medium text-stone-700" htmlFor="agent-command">
                    Agent 指令
                  </label>
                  <textarea
                    id="agent-command"
                    className="mt-3 min-h-28 w-full resize-none rounded-md border border-stone-200 bg-white p-3 text-[17px] leading-7 outline-none ring-emerald-500/20 transition focus:ring-4"
                    value={command}
                    onChange={(event) => setCommand(event.target.value)}
                    data-testid="agent-command"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      className="flex h-12 items-center gap-2 rounded-md bg-emerald-600 px-3 text-[16px] font-medium text-white disabled:bg-stone-300 disabled:text-stone-500"
                      onClick={handleGeneratePlan}
                      disabled={busy || !canOperate}
                      data-testid="generate-plan"
                    >
                      <Send size={15} />
                      生成采购篮
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-lg border border-stone-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[16px] font-medium text-stone-700" htmlFor="single-limit">
                        单笔付款限额
                      </label>
                      <span className="font-mono text-[16px] font-semibold">${settings.singleLimit.toFixed(2)}</span>
                    </div>
                    <input
                      id="single-limit"
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={settings.singleLimit}
                      onChange={(event) => updateRules({ singleLimit: Number(event.target.value) })}
                      disabled={!canManage}
                      className="mt-3 h-12 w-full accent-emerald-600 disabled:opacity-50"
                      data-testid="single-limit"
                    />
                  </div>
                  <div className="rounded-lg border border-stone-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[16px] font-medium text-stone-700" htmlFor="daily-budget">
                        日预算
                      </label>
                      <span className="font-mono text-[16px] font-semibold">${settings.dailyBudget.toFixed(0)}</span>
                    </div>
                    <input
                      id="daily-budget"
                      type="range"
                      min="5"
                      max="100"
                      step="1"
                      value={settings.dailyBudget}
                      onChange={(event) => updateRules({ dailyBudget: Number(event.target.value) })}
                      disabled={!canManage}
                      className="mt-3 h-12 w-full accent-emerald-600 disabled:opacity-50"
                      data-testid="daily-budget"
                    />
                  </div>
                  <div className="rounded-lg border border-stone-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[16px] font-medium text-stone-700" htmlFor="trigger-price">
                        默认每模型触发价
                      </label>
                      <span className="font-mono text-[16px] font-semibold">${settings.triggerPrice.toFixed(3)}</span>
                    </div>
                    <input
                      id="trigger-price"
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.005"
                      value={settings.triggerPrice}
                      onChange={(event) => updateRules({ triggerPrice: Number(event.target.value) })}
                      disabled={!canManage}
                      className="mt-3 h-12 w-full accent-emerald-600 disabled:opacity-50"
                      data-testid="trigger-price"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {ruleCards.map((rule) => (
                    <div key={rule.label} className="rounded-lg border border-stone-200 p-3">
                      <p className="text-[16px] text-stone-500">{rule.label}</p>
                      <p className={cn("mt-2 inline-flex rounded-md px-2 py-1 text-[16px] font-semibold", ruleStyles[rule.tone])}>
                        {rule.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-stone-200 bg-white p-3 text-[16px] text-stone-600" data-testid="action-note">
                  {actionNote}
                </div>
              </div>
            </Panel>
          </section>

          <section className={cn("grid gap-5", activeSection === "market" || activeSection === "wallet" ? "xl:grid-cols-[1fr]" : "hidden")}>
            <Panel id="market" className={cn(activeSection !== "market" && "hidden")}>
              <PanelHeader
                title="模型 token 市场"
                eyebrow="库存"
                action={
                  <button
                    className="flex h-12 items-center gap-2 rounded-md border border-stone-200 px-3 text-[16px] font-medium text-stone-700"
                    onClick={handleMarketFilter}
                    data-testid="market-filter"
                  >
                    <SlidersHorizontal size={15} />
                    {marketFilter === "All" ? "筛选" : marketFilterLabels[marketFilter]}
                  </button>
                }
              />
              <div className="divide-y divide-stone-200">
                {visibleMarketModels.length === 0 ? (
                  <div className="px-5 py-8 text-[16px] text-stone-500" data-testid="market-empty">
                    没有匹配的模型。
                  </div>
                ) : null}
                {visibleMarketModels.map((model) => (
                  <div key={model.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1.1fr_0.7fr_0.7fr_auto] lg:items-center">
                    <div className="flex items-center gap-3">
                      <div className={cn("size-10 rounded-lg", model.accent)} />
                      <div>
                        <p className="text-[17px] font-semibold text-stone-950">{model.name}</p>
                        <p className="text-[16px] text-stone-500">{model.provider}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[16px] text-stone-500">输入单价</p>
                      <p className="font-mono text-[16px] font-semibold">${model.inputPriceUsd.toFixed(3)} / {model.unit}</p>
                    </div>
                    <div>
                      <p className="text-[16px] text-stone-500">输出单价 / 库存</p>
                      <p className="font-mono text-[16px] font-semibold">${model.outputPriceUsd.toFixed(2)} / 1M</p>
                      <p className="font-mono text-[16px] text-stone-500">{(model.inventory / 1000000).toFixed(1)}M tokens</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:min-w-60">
                      <button
                        className="flex h-12 items-center justify-center gap-2 rounded-md bg-stone-950 px-3 text-[16px] font-medium text-white disabled:bg-stone-300 disabled:text-stone-500"
                        onClick={() => handleSingleMarketPlan(model)}
                        disabled={busy || !canOperate}
                        data-testid={`market-single-${model.id}`}
                      >
                        <ShoppingCart size={16} />
                        单独采购
                      </button>
                      <button
                        className="flex h-12 items-center justify-center gap-2 rounded-md border border-stone-200 px-3 text-[16px] font-medium text-stone-700 disabled:bg-stone-100 disabled:text-stone-400"
                        onClick={() => handleMarketPlan(model)}
                        disabled={busy || !canOperate}
                        data-testid={`market-plan-${model.id}`}
                      >
                        <Plus size={16} />
                        加入篮
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel id="wallet" className={cn(activeSection !== "wallet" && "hidden")}>
              <PanelHeader title="钱包" eyebrow="资金层" />
              <div className="space-y-4 p-5">
                <div className="rounded-lg bg-stone-950 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <p className="text-[16px] text-stone-300">x402 收款钱包</p>
                    <button
                      className="flex min-h-12 min-w-12 items-center justify-center rounded-md bg-white/10 px-2 text-[16px]"
                      aria-label="复制钱包地址"
                      onClick={handleCopyWallet}
                      data-testid="copy-wallet"
                    >
                      {copyStatus === "copied" ? "已复制" : copyStatus === "failed" ? "失败" : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="mt-6 break-all font-mono text-[16px]">{settings.walletAddress}</p>
                  <div className="mt-5 grid grid-cols-2 gap-2 text-[16px]">
                    <span>可用额度 ${settings.walletLimitUsd.toFixed(2)}</span>
                    <span>单笔授权 ${settings.singleLimit.toFixed(2)}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-stone-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[16px] font-medium text-stone-950">付款钱包</p>
                      <p className="mt-1 text-[16px] text-stone-500">
                        {walletConnectStatus === "connected" ? `已连接 ${currentNetwork.label}` : "付款时读取当前 MetaMask 账户"}
                      </p>
                    </div>
                    <button
                      className="inline-flex min-h-12 items-center gap-2 rounded-md bg-stone-950 px-3 text-[16px] font-medium text-white disabled:bg-stone-300 disabled:text-stone-500"
                      onClick={handleConnectWallet}
                      disabled={busy}
                      data-testid="connect-wallet"
                    >
                      <WalletCards size={16} />
                      {connectedWalletAddress ? "刷新余额" : "连接钱包"}
                    </button>
                  </div>
                  <div className="mt-4" data-testid="settlement-network-selector">
                    <label className="block text-[16px] font-medium text-stone-700" htmlFor="wallet-settlement-network">
                      结算网络
                    </label>
                    <select
                      id="wallet-settlement-network"
                      className="mt-2 h-12 w-full rounded-md border border-stone-200 bg-white px-3 text-[16px] text-stone-950 outline-none ring-emerald-500/20 transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60"
                      value={currentNetwork.id}
                      onChange={(event) => handleSettlementNetworkChange(event.target.value as SettlementNetworkId)}
                      disabled={busy || !canOperate}
                      data-testid="settlement-network-select"
                    >
                      {(Object.keys(settlementNetworks) as SettlementNetworkId[]).map((networkId) => {
                        const network = settlementNetworks[networkId];
                        return (
                          <option key={networkId} value={networkId}>
                            {network.label} · {network.shortLabel} · gas {network.nativeCurrency.symbol}
                          </option>
                        );
                      })}
                    </select>
                    <p className="mt-2 text-[16px] text-stone-600">
                      当前：{currentNetwork.label}，需要 {currentNetwork.nativeCurrency.symbol} 支付网络费，USDC 合约为{" "}
                      <span className="break-all font-mono text-stone-950">{currentNetwork.usdcAddress}</span>
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 text-[16px] text-stone-700 sm:grid-cols-3">
                    <p>
                      当前账户
                      <span className="mt-1 block break-all font-mono text-stone-950">
                        {connectedWalletAddress || "未连接"}
                      </span>
                    </p>
                    <p>
                      {currentNetwork.label} USDC
                      <span className="mt-1 block font-mono text-stone-950">
                        {connectedUsdcBalance ? `${connectedUsdcBalance} USDC` : "未读取"}
                      </span>
                    </p>
                    <p>
                      网络费余额
                      <span className="mt-1 block font-mono text-stone-950">
                        {connectedNativeBalance ? `${connectedNativeBalance} ${currentNetwork.nativeCurrency.symbol}` : "未读取"}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  className="flex min-h-12 w-full items-center justify-between rounded-lg border border-stone-200 p-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleAutoPayToggle}
                  aria-pressed={settings.walletAuthorized}
                  disabled={!canManage || busy}
                  data-testid="wallet-autopay"
                >
                  <div>
                    <p className="text-[16px] font-medium">允许付款授权</p>
                    <p className="text-[16px] text-stone-500">{settings.walletAuthorized ? "已启用" : "未授权"}</p>
                  </div>
                  <div className={cn("h-6 w-11 rounded-full p-1 transition", settings.walletAuthorized ? "bg-emerald-500" : "bg-stone-300")}>
                    <div className={cn("size-4 rounded-full bg-white transition", settings.walletAuthorized && "ml-auto")} />
                  </div>
                </button>
                <div className="h-36" data-testid="wallet-chart">
                  <WalletBalanceChart />
                </div>
              </div>
            </Panel>
          </section>

          <section className={cn("grid gap-5", activeSection === "risk" || activeSection === "history" ? "xl:grid-cols-[1fr]" : "hidden")}>
            <Panel id="risk" className={cn(activeSection !== "risk" && "hidden")}>
              <PanelHeader
                title="安全监控"
                eyebrow="风控引擎"
                action={
                  canManage ? (
                    <AgentStateButton agentPaused={settings.agentPaused} compact disabled={busy} onToggle={handleEmergencyToggle} />
                  ) : null
                }
              />
              <div className="space-y-3 p-5" data-testid="alerts-list">
                {appState.alerts.map((alert, index) => (
                  <div key={`${alert.title}-${index}`} className={cn("rounded-lg border p-4", severityStyles[alert.severity])}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{alert.title}</p>
                        <p className="mt-1 text-[16px] opacity-80">{alert.detail}</p>
                      </div>
                      <span className="shrink-0 font-mono text-[16px] opacity-70">{alert.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel id="history" className={cn(activeSection !== "history" && "hidden")}>
              <PanelHeader title="交易流水" eyebrow="审计记录" />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-[16px]">
                  <thead className="border-b border-stone-200 bg-stone-50 text-[16px] uppercase text-stone-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">时间</th>
                      <th className="px-5 py-3 font-medium">项目</th>
                      <th className="px-5 py-3 font-medium">数量</th>
                      <th className="px-5 py-3 font-medium">费用</th>
                      <th className="px-5 py-3 font-medium">状态</th>
                      <th className="px-5 py-3 font-medium">链上编号</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200" data-testid="transaction-list">
                    {appState.transactions.map((tx) => (
                      <tr key={tx.id} className="bg-white">
                        <td className="px-5 py-4 font-mono text-stone-500">{tx.time}</td>
                        <td className="px-5 py-4 font-medium">{tx.asset}</td>
                        <td className="px-5 py-4 text-stone-600">{tx.amount}</td>
                        <td className="px-5 py-4 font-mono text-stone-700">{tx.cost}</td>
                        <td className="px-5 py-4">
                          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[16px] font-semibold ring-1", statusStyles[tx.status])}>
                            {statusLabel(tx.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-stone-500">
                          {chainExplorerUrl(tx.hash) ? (
                            <a
                              className="inline-flex min-h-12 items-center gap-1 rounded-md text-sky-700 underline-offset-4 hover:underline"
                              href={chainExplorerUrl(tx.hash) ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                              data-testid={`transaction-hash-${tx.id}`}
                            >
                              {tx.hash}
                              <ExternalLink size={15} />
                            </a>
                          ) : (
                            tx.hash
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </section>

          <section className={cn("grid gap-5 xl:grid-cols-[1fr_1fr]", activeSection !== "agent" && "hidden")}>
            <Panel className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[16px] font-medium uppercase text-stone-500">待处理采购篮</p>
                  <h2 className="text-lg font-semibold">多模型采购篮</h2>
                </div>
                <CircleDollarSign className="shrink-0 text-emerald-600" size={22} />
              </div>
              <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4" data-testid="purchase-plan">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="relative flex min-h-12 items-center gap-3 text-[17px] font-semibold text-stone-950">
                    <input
                      type="checkbox"
                      checked={planSelected}
                      disabled={!["Pending", "WaitingApproval"].includes(purchaseCart.status)}
                      onChange={(event) => setPlanSelected(event.target.checked)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      data-testid="plan-selected"
                    />
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-md border text-white",
                        planSelected ? "border-emerald-600 bg-emerald-600" : "border-stone-300 bg-white",
                        !["Pending", "WaitingApproval"].includes(purchaseCart.status) && "opacity-50",
                      )}
                      aria-hidden="true"
                    >
                      {planSelected ? <Check size={15} /> : null}
                    </span>
                    {purchaseCart.items.length} 个模型
                  </label>
                  <span className={cn("rounded-full px-2.5 py-1 text-[16px] font-semibold ring-1", planStatusStyles[purchaseCart.status])}>
                    {statusLabel(purchaseCart.status)}
                  </span>
                </div>
                <div className="mt-3 grid gap-3 text-[16px] text-stone-600 sm:grid-cols-3">
                  <p>
                    合计数量
                    <span className="mt-1 block font-mono font-semibold text-stone-950">
                      {purchaseCart.items.reduce((sum, item) => sum + Number(item.quantityMTok || 0), 0).toFixed(2)}M input tokens
                    </span>
                  </p>
                  <p>
                    合计付款
                    <span className="mt-1 block font-mono font-semibold text-stone-950">${purchaseCart.totalCostUsd.toFixed(2)}</span>
                  </p>
                  <p>
                    来源
                    <span className="mt-1 block font-medium text-stone-950">{purchaseCart.source}</span>
                  </p>
                </div>
                <div className="mt-4 space-y-3" data-testid="purchase-cart-items">
                  {selectedCartItems.map((item) => (
                    <div key={item.id} className="rounded-lg border border-stone-200 bg-white p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[17px] font-semibold text-stone-950">{item.modelName}</p>
                          <p className="mt-1 text-[16px] text-stone-500">
                            {item.provider} · 输入 ${item.inputPriceUsd.toFixed(3)} / 1M · 触发价 ${item.maxInputPriceUsdPerMTok.toFixed(3)}
                          </p>
                        </div>
                        <span className={cn("rounded-full px-2.5 py-1 text-[16px] font-semibold ring-1", planStatusStyles[item.status])}>
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 text-[16px] text-stone-600 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                        <p>
                          数量
                          <span className="mt-1 block font-mono font-semibold text-stone-950">{item.quantity}</span>
                        </p>
                        <p>
                          费用
                          <span className="mt-1 block font-mono font-semibold text-stone-950">${item.costUsd.toFixed(2)}</span>
                        </p>
                        <label className="block">
                          <span className="font-medium text-stone-700">行预算 ${item.maxBudgetUsd.toFixed(2)}</span>
                          <input
                            type="range"
                            min="0.5"
                            max="10"
                            step="0.5"
                            value={item.maxBudgetUsd}
                            onChange={(event) => handleUpdateCartItemBudget(item, Number(event.target.value))}
                            disabled={!canActOnPlan || !canOperate || busy}
                            className="mt-1 h-12 w-full accent-emerald-600 disabled:opacity-50"
                            data-testid={`cart-budget-${item.modelId}`}
                          />
                        </label>
                        <button
                          className="flex h-12 items-center justify-center gap-2 rounded-md border border-stone-200 px-3 text-[16px] font-medium text-stone-700 disabled:bg-stone-100 disabled:text-stone-400"
                          onClick={() => handleRemoveCartItem(item)}
                          disabled={!canActOnPlan || !canOperate || busy || purchaseCart.items.length <= 1}
                          data-testid={`cart-remove-${item.modelId}`}
                        >
                          <X size={16} />
                          移除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[16px] text-stone-500">{purchaseCart.rule}</p>
              </div>
              <div className="mt-5 rounded-lg border border-sky-200 bg-sky-50 p-4" data-testid="plan-payment-flow">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[17px] font-semibold text-stone-950">x402 付款</p>
                    <p className="mt-1 text-[16px] text-stone-600">
                      {currentPlanX402Payment
                        ? `${currentPlanX402Payment.amount} ${currentPlanX402Payment.asset} · ${statusLabel(currentPlanX402Payment.status)}`
                        : `${currentPaymentAmount} ${currentPaymentSymbol} · 未付款`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={cn(
                        "rounded-full bg-white px-3 py-1.5 text-[16px] font-medium ring-1",
                        currentNetwork.id === "arbitrum-one"
                          ? "text-rose-800 ring-rose-200"
                          : "text-sky-800 ring-sky-200",
                      )}
                    >
                      {currentNetwork.label} · {currentNetwork.riskLabel}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1.5 text-[16px] font-medium text-sky-800 ring-1 ring-sky-200">
                      {paymentStageLabel[paymentStage]}
                    </span>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-white p-3 ring-1 ring-sky-100" data-testid="payment-status-bar">
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        paymentStage === "paid" ? "bg-emerald-500" : "bg-sky-500",
                      )}
                      style={{ width: `${paymentProgressPercent}%` }}
                    />
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {paymentStatusSteps.map((step) => (
                      <div
                        key={step.label}
                        className={cn(
                          "flex min-h-12 items-center gap-2 rounded-md px-3 text-[16px] ring-1",
                          step.done
                            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                            : step.active
                              ? "bg-sky-50 text-sky-800 ring-sky-200"
                              : "bg-stone-50 text-stone-500 ring-stone-200",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold",
                            step.done ? "bg-emerald-600 text-white" : step.active ? "bg-sky-600 text-white" : "bg-stone-200 text-stone-500",
                          )}
                        >
                          {step.done ? <Check size={15} /> : null}
                        </span>
                        {step.label}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[16px] text-stone-600">
                    {paymentStage === "confirming"
                      ? "已拿到交易哈希，系统正在自动验证链上到账。"
                      : paymentStage === "approved"
                        ? "付款已到账，采购篮已批准写入库存账本。"
                      : paymentStage === "paid"
                        ? "付款已到账，下一步需要人工批准采购篮入账。"
                        : "付款完成后会自动进入链上验证。"}
                  </p>
                </div>
                <div className="mt-3">
                  <label className="block text-[16px] font-medium text-stone-700" htmlFor="payment-settlement-network">
                    付款网络
                  </label>
                  <select
                    id="payment-settlement-network"
                    className="mt-2 h-12 w-full rounded-md border border-sky-200 bg-white px-3 text-[16px] text-stone-950 outline-none ring-sky-500/20 transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60"
                    value={currentNetwork.id}
                    onChange={(event) => handleSettlementNetworkChange(event.target.value as SettlementNetworkId)}
                    disabled={busy || !canActOnPlan || !canOperate}
                    data-testid="payment-network-select"
                  >
                    {(Object.keys(settlementNetworks) as SettlementNetworkId[]).map((networkId) => {
                      const network = settlementNetworks[networkId];
                      return (
                        <option key={`payment-${networkId}`} value={networkId}>
                          {network.label} · {network.shortLabel} · gas {network.nativeCurrency.symbol}
                        </option>
                      );
                    })}
                  </select>
                  <p
                    className={cn(
                      "mt-2 rounded-md px-3 py-2 text-[16px] ring-1",
                      currentNetwork.testnet
                        ? "bg-sky-100 text-sky-900 ring-sky-200"
                        : "bg-rose-50 text-rose-900 ring-rose-200",
                    )}
                  >
                    {currentNetwork.testnet
                      ? `当前为测试网，仍需要 ${currentNetwork.nativeCurrency.symbol} 支付测试网络费。`
                      : `当前为主网，所选付款资产和 ${currentNetwork.nativeCurrency.symbol} 网络费都是真实资产。`}
                  </p>
                </div>
                <div className="mt-3">
                  <label className="block text-[16px] font-medium text-stone-700" htmlFor="payment-asset">
                    付款资产
                  </label>
                  <select
                    id="payment-asset"
                    className="mt-2 h-12 w-full rounded-md border border-sky-200 bg-white px-3 text-[16px] text-stone-950 outline-none ring-sky-500/20 transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60"
                    value={currentPaymentAsset}
                    onChange={(event) => handlePaymentAssetChange(event.target.value as PaymentAsset)}
                    disabled={busy || !canActOnPlan || !canOperate}
                    data-testid="payment-asset-select"
                  >
                    <option value="USDC">USDC · 稳定币转账</option>
                    <option value="NATIVE">
                      {currentNetwork.nativeCurrency.symbol} · 原生币转账
                    </option>
                  </select>
                  <p
                    className={cn(
                      "mt-2 rounded-md px-3 py-2 text-[16px] ring-1",
                      currentPaymentAsset === "NATIVE" && !currentNetwork.testnet
                        ? "bg-rose-50 text-rose-900 ring-rose-200"
                        : "bg-white text-stone-700 ring-sky-100",
                    )}
                  >
                    当前选择：{currentPaymentAssetLabel}，本次付款 {currentPaymentAmount} {currentPaymentSymbol}
                    {currentPaymentAsset === "NATIVE" ? "，还需要额外预留网络费。" : "，网络费仍由原生币支付。"}
                  </p>
                </div>
                <div
                  className={cn(
                    "mt-3 rounded-md px-3 py-2 text-[16px] ring-1",
                    paymentPreflightIssue
                      ? "bg-amber-50 text-amber-900 ring-amber-200"
                      : "bg-emerald-50 text-emerald-900 ring-emerald-200",
                  )}
                  data-testid="payment-preflight"
                >
                  {paymentPreflightIssue ??
                    `付款前检查通过：需要 ${currentPaymentAmount} ${currentPaymentSymbol}，并使用 ${currentNetwork.nativeCurrency.symbol} 支付网络费。`}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <button
                    className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-stone-950 px-3 text-[16px] font-medium text-white disabled:bg-stone-300 disabled:text-stone-500"
                    onClick={handleX402PaymentRequired}
                    disabled={busy || !canActOnPlan}
                    data-testid="plan-x402-challenge"
                  >
                    <Copy size={16} />
                    生成 402
                  </button>
                  <button
                    className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-sky-200 bg-white px-3 text-[16px] font-medium text-sky-800 disabled:bg-stone-100 disabled:text-stone-400"
                    onClick={handleOpenMetaMaskPayment}
                    disabled={busy || !canActOnPlan}
                    data-testid="plan-x402-metamask"
                  >
                    <ExternalLink size={16} />
                    付款
                  </button>
                  <button
                    className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-sky-200 bg-white px-3 text-[16px] font-medium text-sky-800 disabled:bg-stone-100 disabled:text-stone-400"
                    onClick={handleX402CollectionConfirm}
                    disabled={busy || !canActOnPlan || currentPlanX402Payment?.status === "WaitingApproval"}
                    data-testid="plan-x402-webhook"
                  >
                    <Bell size={16} />
                    手动刷新
                  </button>
                </div>
                {paymentActionNote ? (
                  <p className="mt-3 rounded-md bg-white px-3 py-2 text-[16px] font-medium text-stone-700 ring-1 ring-stone-200">
                    {paymentActionNote}
                  </p>
                ) : null}
                <div className="mt-3 grid gap-2 text-[16px] text-stone-700 sm:grid-cols-2">
                  <p>
                    网络
                    <span className="mt-1 block font-mono text-stone-950">{currentNetwork.label}</span>
                  </p>
                  <p className="sm:col-span-2">
                    付款地址
                    <span className="mt-1 block max-w-full overflow-x-auto whitespace-nowrap font-mono text-stone-950">
                      {displayedPayerAddress}
                    </span>
                  </p>
                  <p className="sm:col-span-2">
                    收款地址
                    <span className="mt-1 block max-w-full overflow-x-auto whitespace-nowrap font-mono text-stone-950">
                      {settings.walletAddress}
                    </span>
                  </p>
                  <p className="sm:col-span-2">
                    交易哈希
                    <span className="mt-1 block max-w-full overflow-x-auto whitespace-nowrap font-mono text-stone-950">
                      {currentPlanX402Payment?.transactionHash ?? "等待中"}
                    </span>
                  </p>
                  <p className="sm:col-span-2">
                    资产地址
                    <span className="mt-1 block max-w-full overflow-x-auto whitespace-nowrap font-mono text-stone-950">
                      {currentPaymentAsset === "NATIVE" ? "原生币直接转账" : currentNetwork.usdcAddress}
                    </span>
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  className="flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 text-[16px] font-medium text-white disabled:bg-stone-300 disabled:text-stone-500"
                  onClick={handleApprove}
                  disabled={!canApprove || busy}
                  data-testid="approve-plan"
                >
                  <Check size={16} />
                  批准 ${purchaseCart.totalCostUsd.toFixed(2)}
                </button>
                <button
                  className="flex h-12 items-center justify-center gap-2 rounded-md border border-stone-200 text-[16px] font-medium text-stone-700 disabled:bg-stone-100 disabled:text-stone-400"
                  onClick={handleCancel}
                  disabled={!canActOnPlan || !canOperate || busy}
                  data-testid="cancel-plan"
                >
                  <X size={16} />
                  取消采购篮
                </button>
              </div>
            </Panel>

            <Panel className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[16px] font-medium uppercase text-stone-500">执行质量</p>
                  <h2 className="text-lg font-semibold">策略健康度</h2>
                </div>
                <Gauge className="text-sky-600" size={22} />
              </div>
              <div className="mt-5 h-3 rounded-full bg-stone-100">
                <div className="h-3 rounded-full bg-emerald-500 transition-all" style={{ width: `${strategyScore}%` }} />
              </div>
              <p className="mt-3 font-mono text-[18px] font-semibold text-stone-950" data-testid="strategy-health">
                {strategyScore}%
              </p>
              <div className="mt-5 grid gap-3 text-[16px] sm:grid-cols-2">
                <div className="rounded-lg border border-stone-200 p-3">
                  <p className="text-stone-500">Agent 状态</p>
                  <p className={cn("mt-1 font-semibold", settings.agentPaused ? "text-rose-700" : "text-emerald-700")}>
                    {settings.agentPaused ? "已暂停" : "运行中"}
                  </p>
                </div>
                <div className="rounded-lg border border-stone-200 p-3">
                  <p className="text-stone-500">付款模式</p>
                  <p className={cn("mt-1 font-semibold", settings.autoPay ? "text-emerald-700" : "text-amber-700")}>
                    {settings.autoPay ? "已授权" : "手动"}
                  </p>
                </div>
              </div>
            </Panel>
          </section>

          <Panel id="guide" className={cn("p-5", activeSection !== "guide" && "hidden")} data-testid="guide-panel">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[16px] font-medium uppercase text-stone-500">使用说明</p>
                <h2 className="text-lg font-semibold">帮助与接入指南</h2>
              </div>
              <a
                className="inline-flex min-h-12 items-center gap-2 rounded-md bg-stone-950 px-3 text-[16px] font-medium text-white"
                href="mailto:support@cryptoken.example"
                data-testid="guide-support"
              >
                <Mail size={16} />
                联系支持
              </a>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
              <div className="rounded-lg border border-stone-200 p-4">
                <div className="mb-4 flex items-center gap-2 text-[17px] font-semibold">
                  <QrCode size={20} className="text-emerald-600" />
                  连接钱包步骤
                </div>
                <ol className="space-y-3 text-[16px] leading-7 text-stone-700">
                  {connectionSteps.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-mono text-[16px] font-semibold text-emerald-700">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-lg border border-stone-200 p-4">
                <div className="mb-4 flex items-center gap-2 text-[17px] font-semibold">
                  <Bot size={20} className="text-sky-600" />
                  平台运行逻辑
                </div>
                <ol className="space-y-3 text-[16px] leading-7 text-stone-700">
                  {platformFlowSteps.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-500/10 font-mono text-[16px] font-semibold text-sky-700">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-lg border border-stone-200 p-4">
                <div className="mb-4 flex items-center gap-2 text-[17px] font-semibold">
                  <ShieldAlert size={20} className="text-amber-600" />
                  FAQ
                </div>
                <div className="space-y-3 text-[16px] leading-7">
                  {faqs.map((item) => (
                    <div key={item.question} className="border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                      <p className="font-semibold text-stone-950">{item.question}</p>
                      <p className="mt-1 text-stone-600">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-stone-200 p-4" data-testid="agent-access-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[17px] font-semibold">
                    <ExternalLink size={19} className="text-stone-700" />
                    客户 Agent 接入窗口
                  </div>
                  <p className="mt-2 text-[16px] leading-7 text-stone-600">
                    面向客户自有 Agent 的控制契约：客户 Agent 只提交动作、预算和回调地址，平台负责钱包授权、风控和付款确认。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canManage ? (
                    <button
                      className={cn(
                        "inline-flex min-h-12 items-center gap-2 rounded-md px-3 text-[16px] font-medium",
                        settings.agentControlEnabled ? "bg-emerald-600 text-white" : "border border-stone-200 text-stone-700",
                      )}
                      onClick={handleAgentControlToggle}
                      aria-pressed={settings.agentControlEnabled}
                      disabled={busy}
                      data-testid="agent-control-toggle"
                    >
                      <Bot size={16} />
                      {settings.agentControlEnabled ? "Agent 控制已开启" : "开启 Agent 控制"}
                    </button>
                  ) : null}
                  <button
                    className="inline-flex min-h-12 items-center gap-2 rounded-md border border-stone-200 px-3 text-[16px] font-medium text-stone-700"
                    onClick={() => setShowAgentAccess((current) => !current)}
                    aria-expanded={showAgentAccess}
                    data-testid="agent-access-toggle"
                  >
                    <ChevronDown size={16} className={cn("transition", showAgentAccess && "rotate-180")} />
                    {showAgentAccess ? "收起" : "查看接口"}
                  </button>
                </div>
              </div>

              {showAgentAccess ? (
                <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[0.9fr_1.1fr]" data-testid="agent-access-window">
                  <div className="min-w-0 space-y-3">
                    <div className="rounded-md bg-stone-950 p-3 text-white">
                      <p className="text-[16px] font-medium">接口状态</p>
                      <p className="mt-1 text-[16px] text-stone-300">
                        {settings.agentControlEnabled ? "客户 Agent 可以提交受控动作。" : "默认关闭，仅展示接口契约。"}
                      </p>
                    </div>
                    {agentAccessEndpoints.map((endpoint) => (
                      <button
                        key={endpoint.value}
                        className="group flex min-h-16 w-full items-center justify-between gap-3 rounded-md bg-stone-50 p-3 text-left transition hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                        onClick={() => handleAgentEndpoint(endpoint)}
                        title={endpoint.helper}
                        data-testid={`agent-endpoint-${endpoint.label}`}
                      >
                        <span className="min-w-0">
                          <span className="block text-[16px] font-medium text-stone-950">{endpoint.label}</span>
                          <span className="mt-1 block break-all font-mono text-[16px] text-stone-600">{endpoint.value}</span>
                        </span>
                        {endpoint.value.includes("/agent-control.openapi.json") ? (
                          <ExternalLink size={18} className="shrink-0 text-stone-400 transition group-hover:text-emerald-700" />
                        ) : (
                          <Copy size={18} className="shrink-0 text-stone-400 transition group-hover:text-emerald-700" />
                        )}
                      </button>
                    ))}
                    <div className="rounded-md bg-stone-50 p-3">
                      <p className="text-[16px] font-medium text-stone-950">动作白名单</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {agentControlActions.map((action) => (
                          <button
                            key={action}
                            className={cn(
                              "min-h-16 rounded-md px-3 py-2 text-left ring-1 transition focus:outline-none focus:ring-4 focus:ring-emerald-500/20",
                              selectedAgentAction === action
                                ? "bg-emerald-600 text-white ring-emerald-600"
                                : "bg-white text-stone-700 ring-stone-200 hover:bg-emerald-50 hover:text-emerald-800",
                            )}
                            onClick={() => handleAgentAction(action)}
                            aria-pressed={selectedAgentAction === action}
                            data-testid={`agent-action-${action}`}
                          >
                            <span className="block font-mono text-[16px]">{action}</span>
                            <span
                              className={cn(
                                "mt-1 block text-[16px]",
                                selectedAgentAction === action ? "text-emerald-50" : "text-stone-500",
                              )}
                            >
                              {(canManage ? agentActionHints[action]?.admin : agentActionHints[action]?.operator) ?? "提交请求"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-md border border-sky-200 bg-sky-50 p-3" data-testid="x402-interface-panel">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[16px] font-semibold text-stone-950">x402 支付层</p>
                          <p className="mt-1 text-[16px] text-stone-600">
                            {latestX402Payment
                              ? `${latestX402Payment.amount} ${latestX402Payment.asset} · ${statusLabel(latestX402Payment.status)}`
                              : `${currentPaymentAmount} ${currentPaymentSymbol} · 等待中`}
                          </p>
                        </div>
                        <CircleDollarSign size={20} className="shrink-0 text-sky-700" />
                      </div>
                      <div className="mt-3 grid gap-2">
                        {x402Endpoints.map((endpoint) => (
                          <button
                            key={endpoint.value}
                            className="group flex min-h-14 w-full items-center justify-between gap-3 rounded-md bg-white p-3 text-left transition hover:bg-sky-100 focus:outline-none focus:ring-4 focus:ring-sky-500/20"
                            onClick={() => handleX402Endpoint(endpoint)}
                            title={endpoint.helper}
                            data-testid={`x402-endpoint-${endpoint.label}`}
                          >
                            <span className="min-w-0">
                              <span className="block text-[16px] font-medium text-stone-950">{endpoint.label}</span>
                              <span className="mt-1 block break-all font-mono text-[16px] text-stone-600">{endpoint.value}</span>
                            </span>
                            {endpoint.value.includes("/x402-protocol.openapi.json") ? (
                              <ExternalLink size={18} className="shrink-0 text-stone-400 transition group-hover:text-sky-700" />
                            ) : (
                              <Copy size={18} className="shrink-0 text-stone-400 transition group-hover:text-sky-700" />
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <button
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-stone-950 px-3 text-[16px] font-medium text-white disabled:bg-stone-300 disabled:text-stone-500"
                          onClick={handleX402PaymentRequired}
                          disabled={busy}
                          data-testid="x402-challenge"
                        >
                          <Copy size={16} />
                          生成 402
                        </button>
                        <button
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-sky-200 bg-white px-3 text-[16px] font-medium text-sky-800 disabled:bg-stone-100 disabled:text-stone-400"
                          onClick={handleOpenMetaMaskPayment}
                          disabled={busy}
                          data-testid="x402-metamask"
                        >
                          <ExternalLink size={16} />
                          付款
                        </button>
                        <button
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-sky-200 bg-white px-3 text-[16px] font-medium text-sky-800 disabled:bg-stone-100 disabled:text-stone-400"
                          onClick={handleX402CollectionConfirm}
                          disabled={busy || latestX402Payment?.status === "WaitingApproval"}
                          data-testid="x402-webhook-demo"
                        >
                          <Bell size={16} />
                          手动刷新
                        </button>
                      </div>
                      <div className="mt-3 grid gap-2 text-[16px] text-stone-700 sm:grid-cols-3">
                  <p>
                    付款地址
                    <span className="mt-1 block break-all font-mono text-stone-950">{displayedPayerAddress}</span>
                  </p>
                  <p>
                          收款地址
                          <span className="mt-1 block break-all font-mono text-stone-950">{settings.walletAddress}</span>
                        </p>
                  <p>
                          交易哈希
                          <span className="mt-1 block break-all font-mono text-stone-950">
                            {latestX402Payment?.transactionHash ?? "等待中"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 space-y-3">
                    <pre className="w-full max-w-full overflow-x-auto rounded-md bg-stone-950 p-4 text-[16px] leading-7 text-stone-100">
                      {selectedAgentAccessPayload}
                    </pre>
                    <pre
                      className="w-full max-w-full overflow-x-auto rounded-md bg-stone-950 p-4 text-[16px] leading-7 text-sky-100"
                      data-testid="x402-protocol-example"
                    >
                      {x402ProtocolPayload}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2" data-testid="help-topics">
              {helpTopics.map((topic) => (
                <div key={topic.title} className="rounded-lg border border-stone-200 p-4">
                  <h3 className="text-[17px] font-semibold text-stone-950">{topic.title}</h3>
                  <ul className="mt-3 space-y-2 text-[16px] leading-7 text-stone-700">
                    {topic.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <Check size={17} className="mt-1 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
      {paymentSuccess ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4" role="dialog" aria-modal="true" data-testid="payment-success-modal">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[16px] font-medium uppercase text-emerald-700">付款已到账</p>
                <h2 className="mt-1 text-xl font-semibold text-stone-950">等待批准入账</h2>
              </div>
              <button
                className="flex size-12 items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50"
                onClick={() => setPaymentSuccess(null)}
                aria-label="关闭"
                data-testid="payment-success-close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3 rounded-lg bg-emerald-50 p-4 text-[16px] text-emerald-900 ring-1 ring-emerald-200">
              <p>
                金额
                <span className="ml-2 font-mono font-semibold">
                  {paymentSuccess.amount} {paymentSuccess.asset}
                </span>
              </p>
              <p>
                交易哈希
                <span className="mt-1 block max-w-full overflow-x-auto whitespace-nowrap font-mono text-emerald-950">
                  {paymentSuccess.transactionHash}
                </span>
              </p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                className="flex h-12 items-center justify-center rounded-md border border-stone-200 text-[16px] font-medium text-stone-700"
                onClick={() => setPaymentSuccess(null)}
              >
                稍后批准
              </button>
              <button
                className="flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 text-[16px] font-medium text-white disabled:bg-stone-300 disabled:text-stone-500"
                onClick={() => {
                  setPaymentSuccess(null);
                  handleApprove();
                }}
                disabled={!canApprove || busy}
                data-testid="payment-success-approve"
              >
                <Check size={16} />
                批准入账
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
