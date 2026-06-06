import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const statePath = join(__dirname, "data", "state.json");
const port = Number(process.env.CRYPTOKEN_API_PORT || 4010);
const host = process.env.CRYPTOKEN_API_HOST || "127.0.0.1";
const sessionCookie = "cryptoken_session";
const sessionMaxAgeSeconds = 60 * 60 * 24;
const sessionMaxAgeMs = sessionMaxAgeSeconds * 1000;
const agentSignatureSecret = process.env.CRYPTOKEN_AGENT_SECRET || "cryptoken-local-demo-secret";
const defaultSettlementNetwork = process.env.CRYPTOKEN_SETTLEMENT_NETWORK || "arbitrum-sepolia";
const receiverWalletAddress = process.env.CRYPTOKEN_RECEIVER_ADDRESS || "<RECEIVER_WALLET_ADDRESS>";
const erc20TransferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const settlementNetworks = {
  "arbitrum-sepolia": {
    id: "arbitrum-sepolia",
    label: "Arbitrum Sepolia",
    chainId: "0x66eee",
    rpcUrl: process.env.CRYPTOKEN_ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
    usdcAddress: (process.env.CRYPTOKEN_ARBITRUM_SEPOLIA_USDC_ADDRESS || "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d").toLowerCase(),
    nativeAsset: "ETH",
    nativePaymentAmount: "0.00001",
  },
  "arbitrum-one": {
    id: "arbitrum-one",
    label: "Arbitrum One",
    chainId: "0xa4b1",
    rpcUrl: process.env.CRYPTOKEN_ARBITRUM_ONE_RPC_URL || "https://arb1.arbitrum.io/rpc",
    usdcAddress: (process.env.CRYPTOKEN_ARBITRUM_ONE_USDC_ADDRESS || "0xaf88d065e77c8cC2239327C5EDb3A432268e5831").toLowerCase(),
    nativeAsset: "ETH",
    nativePaymentAmount: "0.00001",
  },
  "ethereum-mainnet": {
    id: "ethereum-mainnet",
    label: "Ethereum",
    chainId: "0x1",
    rpcUrl: process.env.CRYPTOKEN_ETHEREUM_RPC_URL || "https://ethereum-rpc.publicnode.com",
    usdcAddress: (process.env.CRYPTOKEN_ETHEREUM_USDC_ADDRESS || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48").toLowerCase(),
    nativeAsset: "ETH",
    nativePaymentAmount: "0.00001",
  },
  "ethereum-sepolia": {
    id: "ethereum-sepolia",
    label: "Ethereum Sepolia",
    chainId: "0xaa36a7",
    rpcUrl: process.env.CRYPTOKEN_ETHEREUM_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    usdcAddress: (process.env.CRYPTOKEN_ETHEREUM_SEPOLIA_USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238").toLowerCase(),
    nativeAsset: "ETH",
    nativePaymentAmount: "0.00001",
  },
  base: {
    id: "base",
    label: "Base",
    chainId: "0x2105",
    rpcUrl: process.env.CRYPTOKEN_BASE_RPC_URL || "https://mainnet.base.org",
    usdcAddress: (process.env.CRYPTOKEN_BASE_USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913").toLowerCase(),
    nativeAsset: "ETH",
    nativePaymentAmount: "0.00001",
  },
  "base-sepolia": {
    id: "base-sepolia",
    label: "Base Sepolia",
    chainId: "0x14a34",
    rpcUrl: process.env.CRYPTOKEN_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    usdcAddress: (process.env.CRYPTOKEN_BASE_SEPOLIA_USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e").toLowerCase(),
    nativeAsset: "ETH",
    nativePaymentAmount: "0.00001",
  },
  "op-mainnet": {
    id: "op-mainnet",
    label: "OP Mainnet",
    chainId: "0xa",
    rpcUrl: process.env.CRYPTOKEN_OP_RPC_URL || "https://mainnet.optimism.io",
    usdcAddress: (process.env.CRYPTOKEN_OP_USDC_ADDRESS || "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85").toLowerCase(),
    nativeAsset: "ETH",
    nativePaymentAmount: "0.00001",
  },
  "op-sepolia": {
    id: "op-sepolia",
    label: "OP Sepolia",
    chainId: "0xaa37dc",
    rpcUrl: process.env.CRYPTOKEN_OP_SEPOLIA_RPC_URL || "https://sepolia.optimism.io",
    usdcAddress: (process.env.CRYPTOKEN_OP_SEPOLIA_USDC_ADDRESS || "0x5fd84259d66Cd46123540766Be93DFE6D43130D7").toLowerCase(),
    nativeAsset: "ETH",
    nativePaymentAmount: "0.00001",
  },
  "polygon-pos": {
    id: "polygon-pos",
    label: "Polygon PoS",
    chainId: "0x89",
    rpcUrl: process.env.CRYPTOKEN_POLYGON_RPC_URL || "https://polygon-rpc.com",
    usdcAddress: (process.env.CRYPTOKEN_POLYGON_USDC_ADDRESS || "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359").toLowerCase(),
    nativeAsset: "POL",
    nativePaymentAmount: "0.05",
  },
  "polygon-amoy": {
    id: "polygon-amoy",
    label: "Polygon Amoy",
    chainId: "0x13882",
    rpcUrl: process.env.CRYPTOKEN_POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
    usdcAddress: (process.env.CRYPTOKEN_POLYGON_AMOY_USDC_ADDRESS || "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582").toLowerCase(),
    nativeAsset: "POL",
    nativePaymentAmount: "0.05",
  },
  avalanche: {
    id: "avalanche",
    label: "Avalanche C-Chain",
    chainId: "0xa86a",
    rpcUrl: process.env.CRYPTOKEN_AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
    usdcAddress: (process.env.CRYPTOKEN_AVALANCHE_USDC_ADDRESS || "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E").toLowerCase(),
    nativeAsset: "AVAX",
    nativePaymentAmount: "0.0005",
  },
  "avalanche-fuji": {
    id: "avalanche-fuji",
    label: "Avalanche Fuji",
    chainId: "0xa869",
    rpcUrl: process.env.CRYPTOKEN_AVALANCHE_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
    usdcAddress: (process.env.CRYPTOKEN_AVALANCHE_FUJI_USDC_ADDRESS || "0x5425890298aed601595a70AB815c96711a31Bc65").toLowerCase(),
    nativeAsset: "AVAX",
    nativePaymentAmount: "0.0005",
  },
};
const legacyReceiverWalletAddresses = new Set([
  "0x7e1200000000000000000000000000000000a94f",
  "<PAYER_WALLET_ADDRESS>",
]);
let statefulRequestQueue = Promise.resolve();

const accounts = {
  admin: { username: "admin", password: "Cryptoken@2026", role: "admin" },
  operator: { username: "operator", password: "Operator@2026", role: "operator" },
};

const configuredAllowedOrigins = (process.env.CRYPTOKEN_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  "http://127.0.0.1:4000",
  "http://localhost:4000",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  ...configuredAllowedOrigins,
]);

const initialMarketModels = [
  {
    id: "gpt-5-5",
    name: "GPT-5.5",
    provider: "OpenAI",
    inputPriceUsd: 5,
    outputPriceUsd: 30,
    cachedInputPriceUsd: 0.5,
    unit: "1M input tokens",
    inventory: 4800000,
    change24h: -0.2,
    risk: "High",
    accent: "bg-indigo-500",
    source: "OpenAI API pricing",
  },
  {
    id: "gpt-5-4",
    name: "GPT-5.4",
    provider: "OpenAI",
    inputPriceUsd: 2.5,
    outputPriceUsd: 15,
    cachedInputPriceUsd: 0.25,
    unit: "1M input tokens",
    inventory: 7200000,
    change24h: 0,
    risk: "Watch",
    accent: "bg-blue-500",
    source: "OpenAI API pricing",
  },
  {
    id: "gpt-5-4-mini",
    name: "GPT-5.4 mini",
    provider: "OpenAI",
    inputPriceUsd: 0.75,
    outputPriceUsd: 4.5,
    cachedInputPriceUsd: 0.075,
    unit: "1M input tokens",
    inventory: 12000000,
    change24h: -0.1,
    risk: "Low",
    accent: "bg-sky-500",
    source: "OpenAI API pricing",
  },
  {
    id: "gpt-5-4-nano",
    name: "GPT-5.4 nano",
    provider: "OpenAI",
    inputPriceUsd: 0.2,
    outputPriceUsd: 1.25,
    cachedInputPriceUsd: 0.02,
    unit: "1M input tokens",
    inventory: 42000000,
    change24h: 0.1,
    risk: "Low",
    accent: "bg-cyan-500",
    source: "OpenAI API pricing",
  },
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    provider: "DeepSeek",
    inputPriceUsd: 0.435,
    outputPriceUsd: 0.87,
    cachedInputPriceUsd: 0.003625,
    unit: "1M input tokens",
    inventory: 25000000,
    change24h: 0.1,
    risk: "Watch",
    accent: "bg-emerald-500",
    source: "DeepSeek API pricing",
  },
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    provider: "DeepSeek",
    inputPriceUsd: 0.14,
    outputPriceUsd: 0.28,
    cachedInputPriceUsd: 0.0028,
    unit: "1M input tokens",
    inventory: 64000000,
    change24h: 0,
    risk: "Low",
    accent: "bg-lime-500",
    source: "DeepSeek API pricing",
  },
  {
    id: "claude-sonnet",
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    inputPriceUsd: 3,
    outputPriceUsd: 15,
    cachedInputPriceUsd: 0.3,
    unit: "1M input tokens",
    inventory: 8000000,
    change24h: -0.4,
    risk: "Low",
    accent: "bg-violet-500",
    source: "Anthropic pricing",
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    inputPriceUsd: 1,
    outputPriceUsd: 5,
    cachedInputPriceUsd: 0.1,
    unit: "1M input tokens",
    inventory: 14000000,
    change24h: -0.1,
    risk: "Low",
    accent: "bg-fuchsia-500",
    source: "Anthropic pricing",
  },
  {
    id: "gemini-3-5-flash",
    name: "Gemini 3.5 Flash",
    provider: "Google",
    inputPriceUsd: 1.5,
    outputPriceUsd: 9,
    cachedInputPriceUsd: 0.15,
    unit: "1M input tokens",
    inventory: 11000000,
    change24h: 0,
    risk: "Watch",
    accent: "bg-rose-500",
    source: "Google Gemini pricing",
  },
  {
    id: "gemini-3-1-pro-preview",
    name: "Gemini 3.1 Pro Preview",
    provider: "Google",
    inputPriceUsd: 0.5,
    outputPriceUsd: 3,
    cachedInputPriceUsd: 0.05,
    unit: "1M input tokens",
    inventory: 9000000,
    change24h: 0.2,
    risk: "Watch",
    accent: "bg-pink-500",
    source: "Google Gemini pricing",
  },
  {
    id: "gemini-3-1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    provider: "Google",
    inputPriceUsd: 0.25,
    outputPriceUsd: 1.5,
    cachedInputPriceUsd: 0.025,
    unit: "1M input tokens",
    inventory: 52000000,
    change24h: -0.1,
    risk: "Low",
    accent: "bg-yellow-500",
    source: "Google Gemini pricing",
  },
  {
    id: "mistral-large-3",
    name: "Mistral Large 3",
    provider: "Mistral AI",
    inputPriceUsd: 0.5,
    outputPriceUsd: 1.5,
    unit: "1M input tokens",
    inventory: 16000000,
    change24h: 0,
    risk: "Low",
    accent: "bg-orange-500",
    source: "Mistral AI pricing",
  },
  {
    id: "mistral-small-4",
    name: "Mistral Small 4",
    provider: "Mistral AI",
    inputPriceUsd: 0.1,
    outputPriceUsd: 0.3,
    unit: "1M input tokens",
    inventory: 58000000,
    change24h: 0.1,
    risk: "Low",
    accent: "bg-red-500",
    source: "Mistral AI pricing",
  },
  {
    id: "devstral-small-2",
    name: "Devstral Small 2",
    provider: "Mistral AI",
    inputPriceUsd: 0.1,
    outputPriceUsd: 0.3,
    unit: "1M input tokens",
    inventory: 28000000,
    change24h: -0.2,
    risk: "Watch",
    accent: "bg-stone-500",
    source: "Mistral AI pricing",
  },
];

const retiredMarketModelIds = new Set(["gemini-2-5-pro", "gemini-2-5-flash", "gemini-2-5-flash-lite"]);
const retiredModelNameMap = new Map([
  ["Gemini 2.5 Pro", "Gemini 3.1 Pro Preview"],
  ["Gemini 2.5 Flash", "Gemini 3.5 Flash"],
  ["Gemini 2.5 Flash-Lite", "Gemini 3.1 Flash-Lite"],
]);

const initialState = {
  version: 1,
  sessions: {},
  settings: {
    singleLimit: 5,
    dailyBudget: 24,
    triggerPrice: 0.435,
    autoPay: true,
    walletAuthorized: true,
    agentPaused: false,
    agentControlEnabled: false,
    payerAddress: "",
    settlementNetwork: settlementNetworks[defaultSettlementNetwork] ? defaultSettlementNetwork : "arbitrum-sepolia",
    paymentAsset: "USDC",
    walletAddress: receiverWalletAddress,
    walletLimitUsd: 842.2,
  },
  todaySpend: 7.86,
  purchasePlan: {
    id: "plan-001",
    modelName: "DeepSeek V4 Pro",
    quantity: "11.08M input tokens",
    costUsd: 4.82,
    source: "natural-language-strategy",
    rule: "Execute when price is not above $0.435 / 1M input tokens.",
    status: "Pending",
  },
  purchaseCart: {
    id: "cart-001",
    source: "natural-language-strategy",
    status: "Pending",
    totalCostUsd: 4.82,
    rule: "Multi-model cart waiting for payment and approval.",
    items: [
      {
        id: "cart-item-deepseek-v4-pro",
        modelId: "deepseek-v4-pro",
        modelName: "DeepSeek V4 Pro",
        provider: "DeepSeek",
        quantityMTok: 11.08,
        quantity: "11.08M input tokens",
        inputPriceUsd: 0.435,
        outputPriceUsd: 0.87,
        maxInputPriceUsdPerMTok: 0.435,
        maxOutputPriceUsdPerMTok: 0.87,
        maxBudgetUsd: 5,
        costUsd: 4.82,
        status: "Pending",
        reason: "Eligible under trigger price.",
      },
    ],
  },
  marketModels: initialMarketModels,
  agentRequests: [],
  x402Payments: [],
  tokenInventory: {
    "deepseek-v4-pro": 11.08,
  },
  alerts: [
    {
      title: "Purchase blocked by budget",
      detail: "GPT-5.4 mini plan is $3.40 above the single-payment limit.",
      severity: "critical",
      time: "15:08",
    },
    {
      title: "Repeated purchase frequency",
      detail: "DeepSeek V4 Pro was triggered 3 times within 10 minutes.",
      severity: "warning",
      time: "14:52",
    },
    {
      title: "Wallet balance notice",
      detail: "Available wallet limit is below 30% of today's budget.",
      severity: "info",
      time: "13:37",
    },
  ],
  transactions: [
    {
      id: "tx-1402",
      time: "15:02",
      asset: "DeepSeek V4 Pro",
      amount: "0.57M input tokens",
      cost: "$0.25",
      status: "Success",
      hash: "0x91a4...e12b",
    },
    {
      id: "tx-1398",
      time: "14:44",
      asset: "GPT-5.4 mini",
      amount: "0.83M input tokens",
      cost: "$0.62",
      status: "Pending",
      hash: "0x48cf...77a9",
    },
    {
      id: "tx-1391",
      time: "13:19",
      asset: "Gemini 2.5 Flash",
      amount: "2.80M input tokens",
      cost: "$0.84",
      status: "Blocked",
      hash: "policy-limit",
    },
  ],
};

function nowLabel() {
  return "刚刚";
}

function permissionsFor(role) {
  return {
    canManageSettings: role === "admin",
    canOperatePlans: role === "admin" || role === "operator",
  };
}

function publicUser(session) {
  if (!session) {
    return null;
  }

  return {
    username: session.username,
    role: session.role,
    label: session.role === "admin" ? "管理员" : "操作员",
  };
}

function sanitizeState(state, session) {
  const safeState = { ...state };
  delete safeState.sessions;
  return {
    ...safeState,
    user: publicUser(session),
    permissions: permissionsFor(session.role),
  };
}

async function ensureState() {
  await mkdir(dirname(statePath), { recursive: true });
  if (!existsSync(statePath)) {
    await writeState(initialState);
  }
}

function mergeMarketModels(savedModels) {
  const savedById = new Map(savedModels.filter((model) => model?.id).map((model) => [model.id, model]));
  const canonicalModels = initialMarketModels.map((model) => ({ ...(savedById.get(model.id) || {}), ...model }));
  const extraModels = savedModels.filter(
    (model) => model?.id && !retiredMarketModelIds.has(model.id) && !initialMarketModels.some((known) => known.id === model.id),
  );
  return [...canonicalModels, ...extraModels];
}

function replaceRetiredModelNames(value) {
  if (typeof value !== "string") {
    return value;
  }

  let nextValue = value;
  for (const [retiredName, currentName] of retiredModelNameMap.entries()) {
    nextValue = nextValue.replaceAll(retiredName, currentName);
  }
  return nextValue;
}

function migrateRetiredModelNames(items) {
  return items.map((item) =>
    Object.fromEntries(Object.entries(item).map(([key, value]) => [key, replaceRetiredModelNames(value)])),
  );
}

function legacyPlanToCart(plan = initialState.purchasePlan) {
  const model = initialMarketModels.find((item) => item.name === plan.modelName) || initialMarketModels[0];
  const quantityMatch = String(plan.quantity || "").match(/(\d+(?:\.\d+)?)/);
  const quantityMTok = quantityMatch ? Number(quantityMatch[1]) : Number(plan.costUsd || 1) / Number(model.inputPriceUsd || 1);
  const costUsd = Number(plan.costUsd || 0);
  return {
    id: String(plan.id || "plan-001").replace(/^plan-/, "cart-"),
    source: plan.source || "legacy-plan",
    status: plan.status || "Pending",
    totalCostUsd: costUsd,
    rule: plan.rule || "Migrated from single purchase plan.",
    items: [
      {
        id: `cart-item-${model.id}`,
        modelId: model.id,
        modelName: model.name,
        provider: model.provider,
        quantityMTok: Number(quantityMTok.toFixed(2)),
        quantity: `${Number(quantityMTok.toFixed(2))}M input tokens`,
        inputPriceUsd: model.inputPriceUsd,
        outputPriceUsd: model.outputPriceUsd,
        maxInputPriceUsdPerMTok: model.inputPriceUsd,
        maxOutputPriceUsdPerMTok: model.outputPriceUsd,
        maxBudgetUsd: Math.max(costUsd, 1),
        costUsd,
        status: plan.status || "Pending",
        reason: "Migrated from single purchase plan.",
      },
    ],
  };
}

function normalizeCart(cart, fallbackPlan) {
  const baseCart = cart && typeof cart === "object" ? cart : legacyPlanToCart(fallbackPlan);
  const items = Array.isArray(baseCart.items) ? baseCart.items : [];
  const normalizedItems = items.map((item, index) => {
    const model = initialMarketModels.find((marketModel) => marketModel.id === item.modelId || marketModel.name === item.modelName) || initialMarketModels[0];
    const quantityMTok = Number(item.quantityMTok || String(item.quantity || "").match(/(\d+(?:\.\d+)?)/)?.[1] || 0);
    const costUsd = Number(item.costUsd || 0);
    return {
      id: item.id || `cart-item-${model.id}-${index}`,
      modelId: item.modelId || model.id,
      modelName: replaceRetiredModelNames(item.modelName || model.name),
      provider: item.provider || model.provider,
      quantityMTok: Number(quantityMTok.toFixed(2)),
      quantity: item.quantity || `${Number(quantityMTok.toFixed(2))}M input tokens`,
      inputPriceUsd: Number(item.inputPriceUsd || model.inputPriceUsd),
      outputPriceUsd: Number(item.outputPriceUsd || model.outputPriceUsd),
      maxInputPriceUsdPerMTok: Number(item.maxInputPriceUsdPerMTok || item.inputPriceUsd || model.inputPriceUsd),
      maxOutputPriceUsdPerMTok: Number(item.maxOutputPriceUsdPerMTok || item.outputPriceUsd || model.outputPriceUsd),
      maxBudgetUsd: Number(item.maxBudgetUsd || Math.max(costUsd, 1)),
      costUsd,
      status: item.status || "Pending",
      reason: item.reason || "Ready for approval.",
    };
  });
  const totalCostUsd = Number(normalizedItems.reduce((sum, item) => sum + Number(item.costUsd || 0), 0).toFixed(2));
  return {
    id: baseCart.id || `cart-${Date.now()}`,
    source: baseCart.source || "cart",
    status: baseCart.status || "Pending",
    totalCostUsd,
    rule: baseCart.rule || "Multi-model cart waiting for payment and approval.",
    items: normalizedItems,
  };
}

async function readState() {
  await ensureState();
  const raw = await readFile(statePath, "utf8");
  const state = JSON.parse(raw);
  const savedMarketModels = Array.isArray(state.marketModels) ? state.marketModels : [];
  const settings = { ...initialState.settings, ...(state.settings || {}) };
  const purchasePlan = Object.fromEntries(
    Object.entries(state.purchasePlan || initialState.purchasePlan).map(([key, value]) => [key, replaceRetiredModelNames(value)]),
  );
  const purchaseCart = normalizeCart(state.purchaseCart, purchasePlan);
  if (
    typeof settings.walletAddress !== "string" ||
    settings.walletAddress.includes("...") ||
    legacyReceiverWalletAddresses.has(settings.walletAddress.toLowerCase())
  ) {
    settings.walletAddress = initialState.settings.walletAddress;
  }
  settings.payerAddress = "";
  if (!settlementNetworks[settings.settlementNetwork]) {
    settings.settlementNetwork = initialState.settings.settlementNetwork;
  }
  if (!["USDC", "NATIVE"].includes(settings.paymentAsset)) {
    settings.paymentAsset = initialState.settings.paymentAsset;
  }
  const x402Payments = (Array.isArray(state.x402Payments) ? state.x402Payments : []).map((payment) => ({
    ...payment,
    assetType: payment.assetType || (payment.assetAddress ? "erc20" : "native"),
    recipientAddress:
      typeof payment.recipientAddress === "string" &&
      legacyReceiverWalletAddresses.has(payment.recipientAddress.toLowerCase())
        ? initialState.settings.walletAddress
        : payment.recipientAddress,
  }));
  return {
    ...initialState,
    ...state,
    settings,
    sessions: state.sessions || {},
    marketModels: mergeMarketModels(savedMarketModels),
    agentRequests: Array.isArray(state.agentRequests) ? state.agentRequests : [],
    x402Payments,
    tokenInventory: state.tokenInventory && typeof state.tokenInventory === "object" ? state.tokenInventory : initialState.tokenInventory,
    alerts: migrateRetiredModelNames(Array.isArray(state.alerts) ? state.alerts : initialState.alerts),
    transactions: migrateRetiredModelNames(Array.isArray(state.transactions) ? state.transactions : initialState.transactions),
    purchasePlan,
    purchaseCart,
  };
}

async function writeState(state) {
  await mkdir(dirname(statePath), { recursive: true });
  const tmpPath = `${statePath}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(tmpPath, statePath);
}

async function runStatefulRequest(work) {
  const run = statefulRequestQueue.then(work, work);
  statefulRequestQueue = run.catch(() => {});
  return run;
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Cryptoken-Agent-Id, X-Cryptoken-Timestamp, X-Cryptoken-Signature, Idempotency-Key, PAYMENT-SIGNATURE");
  res.setHeader("Access-Control-Expose-Headers", "PAYMENT-REQUIRED, PAYMENT-RESPONSE");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Vary", "Origin");
}

function sendJson(req, res, status, body, extraHeaders = {}) {
  setCors(req, res);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

function sendError(req, res, status, message) {
  sendJson(req, res, status, { error: message, message });
}

function base64Json(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Invalid JSON");
    error.status = 400;
    throw error;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => part.includes("="))
      .map((part) => {
        const index = part.indexOf("=");
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function cookieHeader(token) {
  return `${sessionCookie}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${sessionMaxAgeSeconds}`;
}

function clearCookieHeader() {
  return `${sessionCookie}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

async function getSession(req, state) {
  const token = parseCookies(req)[sessionCookie];
  if (!token || !state.sessions[token]) {
    return { token: null, session: null };
  }

  const session = state.sessions[token];
  const createdAt = new Date(session.createdAt).getTime();
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > sessionMaxAgeMs) {
    delete state.sessions[token];
    await writeState(state);
    return { token: null, session: null };
  }

  return { token, session };
}

async function requireAuth(req, res, state) {
  const auth = await getSession(req, state);
  if (!auth.session) {
    sendError(req, res, 401, "Unauthorized");
    return null;
  }

  return auth;
}

function requireAdmin(req, res, session) {
  if (session.role !== "admin") {
    sendError(req, res, 403, "Forbidden");
    return false;
  }
  return true;
}

function apiError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function findModel(state, modelNameOrId) {
  const normalized = String(modelNameOrId || "").toLowerCase();
  const model =
    state.marketModels.find((model) => model.id.toLowerCase() === normalized) ||
    state.marketModels.find((model) => model.name.toLowerCase() === normalized) ||
    state.marketModels.find((model) => normalized.includes(model.name.toLowerCase()));

  if (!model) {
    throw apiError(400, "未知模型");
  }

  return model;
}

function extractBudget(command, fallback = 10) {
  const budgetMatch = String(command || "").match(/(?:under|below|budget|limit|maxBudgetUsd|不超过|预算|上限|限额)\D*(\d+(?:\.\d+)?)/i);
  return budgetMatch ? Number(budgetMatch[1]) : fallback;
}

function cartBlockReason(state, totalCostUsd) {
  if (state.settings.agentPaused) {
    return "Agent 已暂停";
  }
  if (!state.settings.walletAuthorized) {
    return "钱包未授权";
  }
  if (totalCostUsd > Number(state.settings.singleLimit || 0)) {
    return "超过单笔付款限额";
  }
  if (Number(state.todaySpend || 0) + totalCostUsd > Number(state.settings.dailyBudget || 0)) {
    return "超过每日预算";
  }
  return null;
}

function buildCartItem(state, model, options = {}) {
  const maxInputPriceUsdPerMTok = Number(options.maxInputPriceUsdPerMTok || options.triggerPriceUsdPerMTok || state.settings.triggerPrice || model.inputPriceUsd);
  const maxOutputPriceUsdPerMTok = Number(options.maxOutputPriceUsdPerMTok || Math.max(model.outputPriceUsd, maxInputPriceUsdPerMTok * 2));
  const maxBudgetUsd = Math.max(Number(options.maxBudgetUsd || 0.05), 0.01);
  const eligible = model.inputPriceUsd <= maxInputPriceUsdPerMTok && model.outputPriceUsd <= maxOutputPriceUsdPerMTok;
  const costUsd = Number(Math.min(maxBudgetUsd, Math.max(maxBudgetUsd * 0.48, 0.01)).toFixed(2));
  const quantityMTok = Number(Math.max(Number(options.targetQuantityMTok || 0), costUsd / model.inputPriceUsd).toFixed(2));
  return {
    id: options.id || `cart-item-${model.id}-${Date.now().toString(16)}`,
    modelId: model.id,
    modelName: model.name,
    provider: model.provider,
    quantityMTok,
    quantity: `${quantityMTok.toFixed(2)}M input tokens`,
    inputPriceUsd: model.inputPriceUsd,
    outputPriceUsd: model.outputPriceUsd,
    maxInputPriceUsdPerMTok,
    maxOutputPriceUsdPerMTok,
    maxBudgetUsd,
    costUsd,
    status: eligible ? "Pending" : "Blocked",
    reason: eligible
      ? `输入单价不高于 $${maxInputPriceUsdPerMTok.toFixed(3)} / 1M。`
      : `价格高于触发价：输入 $${model.inputPriceUsd.toFixed(3)}，输出 $${model.outputPriceUsd.toFixed(3)}。`,
  };
}

function cartToPlan(cart) {
  const firstItem = cart.items[0] || initialState.purchaseCart.items[0];
  return {
    id: cart.id.replace(/^cart-/, "plan-"),
    modelName: cart.items.length > 1 ? `${cart.items.length} model token basket` : firstItem.modelName,
    quantity: `${cart.items.reduce((sum, item) => sum + Number(item.quantityMTok || 0), 0).toFixed(2)}M input tokens`,
    costUsd: cart.totalCostUsd,
    source: cart.source,
    rule: cart.rule,
    status: cart.status === "WaitingApproval" ? "Pending" : cart.status,
  };
}

function recalculateCart(state, cart) {
  const items = Array.isArray(cart.items) ? cart.items : [];
  const totalCostUsd = Number(items.reduce((sum, item) => sum + Number(item.costUsd || 0), 0).toFixed(2));
  const blockReason = items.length === 0 ? "采购篮为空" : cartBlockReason(state, totalCostUsd);
  const status = blockReason ? "Blocked" : cart.status === "Approved" ? "Approved" : "Pending";
  return {
    ...cart,
    status,
    totalCostUsd,
    rule: blockReason || `Agent 已按每模型触发价选择 ${items.length} 个模型。`,
    items: items.map((item) => ({ ...item, status: blockReason ? "Blocked" : "Pending", reason: blockReason || item.reason })),
  };
}

function settlementNetworkConfig(networkId) {
  return settlementNetworks[networkId] || settlementNetworks["arbitrum-sepolia"];
}

function paymentAcceptForState(state) {
  const cart = state.purchaseCart || legacyPlanToCart(state.purchasePlan);
  const network = settlementNetworkConfig(state.settings.settlementNetwork);
  const useNative = state.settings.paymentAsset === "NATIVE";
  return {
    scheme: "exact",
    network: network.id,
    networkLabel: network.label,
    asset: useNative ? network.nativeAsset : "USDC",
    assetType: useNative ? "native" : "erc20",
    assetAddress: useNative ? null : network.usdcAddress,
    amount: useNative ? network.nativePaymentAmount : Number(cart.totalCostUsd || state.settings.singleLimit || 1).toFixed(2),
    recipientAddress: state.settings.walletAddress,
    resource: `/api/x402/settle`,
    mimeType: "application/json",
  };
}

function buildCart(state, { command, model, models, items, maxBudgetUsd, source = "natural-language-strategy" }) {
  const commandText = String(command || "");
  const configuredItems = Array.isArray(items) ? items : [];
  const configuredModels = Array.isArray(models) ? models : model ? [model] : [];
  const explicitRows = [
    ...configuredItems.map((item) => ({ model: item.model || item.modelId || item.modelName, options: item })),
    ...configuredModels.map((modelName) => ({ model: modelName, options: { maxBudgetUsd } })),
  ];

  let cartItems = explicitRows
    .map((row) => buildCartItem(state, findModel(state, row.model), { ...row.options, maxBudgetUsd: row.options.maxBudgetUsd || maxBudgetUsd || 0.05 }))
    .filter((item) => item.status === "Pending");

  if (cartItems.length === 0) {
    const trigger = Number(state.settings.triggerPrice || 0.435);
    cartItems = state.marketModels
      .filter((marketModel) => marketModel.inputPriceUsd <= trigger)
      .sort((left, right) => left.inputPriceUsd - right.inputPriceUsd)
      .slice(0, 3)
      .map((marketModel) =>
        buildCartItem(state, marketModel, {
          maxInputPriceUsdPerMTok: trigger,
          maxOutputPriceUsdPerMTok: Math.max(marketModel.outputPriceUsd, trigger * 2),
          maxBudgetUsd: Number(maxBudgetUsd || extractBudget(commandText, 1.5) || 1.5),
        }),
      );
  }

  const totalCostUsd = Number(cartItems.reduce((sum, item) => sum + item.costUsd, 0).toFixed(2));
  const blockReason = cartItems.length === 0 ? "没有模型低于触发价" : cartBlockReason(state, totalCostUsd);
  const cart = {
    id: `cart-${Date.now()}`,
    source,
    status: blockReason ? "Blocked" : "Pending",
    totalCostUsd,
    rule: blockReason || `Agent 已按每模型触发价选择 ${cartItems.length} 个模型。`,
    items: cartItems.map((item) => ({ ...item, status: blockReason ? "Blocked" : item.status, reason: blockReason || item.reason })),
  };
  return cart;
}

function buildX402PaymentRequired(state) {
  const cart = state.purchaseCart || legacyPlanToCart(state.purchasePlan);
  return {
    x402Version: 2,
    orderId: cart.id,
    cartId: cart.id,
    description: `Cryptoken multi-model token basket: ${cart.items.map((item) => item.modelName).join(", ")}`,
    payerPolicy: "connected-wallet",
    accepts: [paymentAcceptForState(state)],
  };
}

function latestX402Payment(state, orderId) {
  return (Array.isArray(state.x402Payments) ? state.x402Payments : []).find((payment) => payment.orderId === orderId) || null;
}

function recordX402Payment(state, { orderId, transactionHash, paymentSignature, payerAddress, source = "payment-signature", status = "WaitingApproval" }) {
  const cart = state.purchaseCart || legacyPlanToCart(state.purchasePlan);
  const paymentRequired = buildX402PaymentRequired(state);
  const accept = paymentRequired.accepts[0];
  const paymentOrderId = orderId || cart.id;
  const existing = latestX402Payment(state, paymentOrderId);
  const payment = {
    id: existing?.id || `x402-${Date.now().toString(16)}`,
    orderId: paymentOrderId,
    planId: cart.id,
    cartId: cart.id,
    modelName: cart.items.length > 1 ? `${cart.items.length} model basket` : cart.items[0]?.modelName || "Model token basket",
    amount: accept.amount,
    asset: accept.asset,
    assetType: accept.assetType,
    network: accept.network,
    assetAddress: accept.assetAddress,
    recipientAddress: accept.recipientAddress,
    transactionHash: transactionHash || existing?.transactionHash || null,
    paymentSignature: paymentSignature ? String(paymentSignature).slice(0, 24) : existing?.paymentSignature || null,
    payerAddress: payerAddress || existing?.payerAddress || null,
    status,
    source,
    updatedAt: new Date().toISOString(),
  };

  const withoutCurrent = (Array.isArray(state.x402Payments) ? state.x402Payments : []).filter(
    (item) => item.orderId !== payment.orderId,
  );
  state.x402Payments = [payment, ...withoutCurrent].slice(0, 20);
  return payment;
}

function sendX402PaymentRequired(req, res, state) {
  const paymentRequired = buildX402PaymentRequired(state);
  return sendJson(req, res, 402, paymentRequired, {
    "PAYMENT-REQUIRED": base64Json(paymentRequired),
  });
}

function buildX402SettlementResponse(state, paymentSignature, txHash) {
  const cart = state.purchaseCart || legacyPlanToCart(state.purchasePlan);
  const accept = paymentAcceptForState(state);
  return {
    success: true,
    orderId: cart.id,
    cartId: cart.id,
    scheme: "exact",
    network: accept.network,
    asset: accept.asset,
    assetType: accept.assetType,
    assetAddress: accept.assetAddress,
    amount: accept.amount,
    transactionHash: txHash || `0xx402${Date.now().toString(16)}`,
    paymentSignature: String(paymentSignature).slice(0, 18),
    nextAction: "manual_plan_approval_required",
    settledAt: new Date().toISOString(),
  };
}

function addressTopic(address) {
  const normalized = String(address || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    return null;
  }
  return `0x${normalized.slice(2).padStart(64, "0")}`;
}

function topicAddress(topic) {
  const normalized = String(topic || "").toLowerCase();
  if (!/^0x[a-f0-9]{64}$/.test(normalized)) {
    return null;
  }
  return `0x${normalized.slice(-40)}`;
}

function usdcUnits(amount) {
  const [wholePart, decimalPart = ""] = String(amount || "0").split(".");
  const whole = BigInt(wholePart || "0") * 1_000_000n;
  const decimals = BigInt((decimalPart.slice(0, 6).padEnd(6, "0") || "0").replace(/\D/g, "") || "0");
  return whole + decimals;
}

function tokenUnits(amount, decimals = 18) {
  const [wholePart, decimalPart = ""] = String(amount || "0").split(".");
  const safeWhole = (wholePart || "0").replace(/\D/g, "") || "0";
  const safeDecimals = (decimalPart.slice(0, decimals).padEnd(decimals, "0") || "0").replace(/\D/g, "") || "0";
  return BigInt(safeWhole) * 10n ** BigInt(decimals) + BigInt(safeDecimals);
}

function normalizeAddress(address) {
  const normalized = String(address || "").toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(normalized) ? normalized : null;
}

async function rpcCall(method, params = [], networkId) {
  const network = settlementNetworkConfig(networkId);
  const response = await fetch(network.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  if (!response.ok) {
    throw apiError(502, "Arbitrum RPC unavailable");
  }
  const data = await response.json();
  if (data.error) {
    throw apiError(502, data.error.message || "Arbitrum RPC error");
  }
  return data.result;
}

async function verifyX402Transfer(payment) {
  const txHash = String(payment?.transactionHash || "");
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return { status: "Invalid", reason: "Invalid transaction hash" };
  }

  const network = settlementNetworkConfig(payment.network);
  const receipt = await rpcCall("eth_getTransactionReceipt", [txHash], network.id);
  if (!receipt) {
    return { status: "PendingConfirmation" };
  }
  if (receipt.status !== "0x1") {
    return { status: "Failed", reason: "Transaction failed" };
  }

  if (payment.assetType === "native" || !payment.assetAddress) {
    const transaction = await rpcCall("eth_getTransactionByHash", [txHash], network.id);
    if (!transaction) {
      return { status: "PendingConfirmation" };
    }

    const recipientAddress = normalizeAddress(payment.recipientAddress);
    const payerAddress = normalizeAddress(payment.payerAddress);
    const transactionTo = normalizeAddress(transaction.to);
    const transactionFrom = normalizeAddress(transaction.from);
    const expectedAmount = tokenUnits(payment.amount, 18);
    const transactionValue = BigInt(transaction.value || "0x0");
    if (!recipientAddress || transactionTo !== recipientAddress) {
      return { status: "Invalid", reason: "Native transfer recipient mismatch" };
    }
    if (payerAddress && transactionFrom !== payerAddress) {
      return { status: "Invalid", reason: "Native transfer payer mismatch" };
    }
    if (transactionValue < expectedAmount) {
      return { status: "Invalid", reason: `${network.nativeAsset} transfer amount is below required value` };
    }
    return { status: "WaitingApproval", receipt, transaction };
  }

  const recipientTopic = addressTopic(payment.recipientAddress);
  const payerTopic = payment.payerAddress ? addressTopic(payment.payerAddress) : null;
  const expectedAmount = usdcUnits(payment.amount);
  const transferLog = (receipt.logs || []).find((log) => {
    const topics = log.topics || [];
    if (String(log.address || "").toLowerCase() !== network.usdcAddress) return false;
    if (String(topics[0] || "").toLowerCase() !== erc20TransferTopic) return false;
    if (recipientTopic && String(topics[2] || "").toLowerCase() !== recipientTopic.toLowerCase()) return false;
    if (payerTopic && String(topics[1] || "").toLowerCase() !== payerTopic.toLowerCase()) return false;
    return BigInt(log.data || "0x0") >= expectedAmount;
  });

  if (!transferLog) {
    return { status: "Invalid", reason: "USDC transfer log not found" };
  }

  return { status: "WaitingApproval", receipt };
}

async function findReceiverTransfer(payment, fromBlock = "latest") {
  if (payment.assetType === "native" || !payment.assetAddress) {
    return { status: "PendingConfirmation", reason: "Native transfer requires a transaction hash" };
  }

  const recipientTopic = addressTopic(payment.recipientAddress);
  if (!recipientTopic) {
    return { status: "Invalid", reason: "Invalid recipient address" };
  }
  const payerTopic = payment.payerAddress ? addressTopic(payment.payerAddress) : null;
  const expectedAmount = usdcUnits(payment.amount);
  const network = settlementNetworkConfig(payment.network);
  const latestBlockHex = await rpcCall("eth_blockNumber", [], network.id);
  const latestBlock = Number.parseInt(latestBlockHex, 16);
  const configuredFromBlock = typeof fromBlock === "number" ? fromBlock : latestBlock - 8000;
  const safeFromBlock = Math.max(0, configuredFromBlock);
  const logs = await rpcCall("eth_getLogs", [
    {
      address: network.usdcAddress,
      fromBlock: `0x${safeFromBlock.toString(16)}`,
      toBlock: latestBlockHex,
      topics: [erc20TransferTopic, payerTopic, recipientTopic],
    },
  ], network.id);
  const matchingLog = (Array.isArray(logs) ? logs : []).find((log) => {
    if (String(log.address || "").toLowerCase() !== network.usdcAddress) return false;
    const topics = log.topics || [];
    if (String(topics[0] || "").toLowerCase() !== erc20TransferTopic) return false;
    if (recipientTopic && String(topics[2] || "").toLowerCase() !== recipientTopic.toLowerCase()) return false;
    if (payerTopic && String(topics[1] || "").toLowerCase() !== payerTopic.toLowerCase()) return false;
    return BigInt(log.data || "0x0") >= expectedAmount;
  });

  if (!matchingLog) {
    return { status: "PendingConfirmation", latestBlock };
  }

  return {
    status: "WaitingApproval",
    latestBlock,
    log: matchingLog,
    transactionHash: matchingLog.transactionHash,
    payerAddress: topicAddress(matchingLog.topics?.[1]),
    recipientAddress: topicAddress(matchingLog.topics?.[2]),
  };
}

function markCartWaitingApproval(state, payment, title = "x402 chain payment confirmed") {
  payment.status = "WaitingApproval";
  payment.updatedAt = new Date().toISOString();
  state.purchaseCart = { ...(state.purchaseCart || legacyPlanToCart(state.purchasePlan)), status: "WaitingApproval" };
  state.purchasePlan = cartToPlan(state.purchaseCart);
  pushAlert(state, title, `${payment.modelName} received ${payment.asset} and is waiting for manual approval.`, "info");
}

async function reconcilePendingX402Payments() {
  await runStatefulRequest(async () => {
    const state = await readState();
    const pendingPayments = (state.x402Payments || []).filter((payment) => payment.status === "PendingConfirmation");
    if (pendingPayments.length === 0) return;

    let changed = false;
    for (const payment of pendingPayments) {
      try {
        const hasTxHash = /^0x[a-fA-F0-9]{64}$/.test(String(payment.transactionHash || ""));
        const verification = hasTxHash ? await verifyX402Transfer(payment) : await findReceiverTransfer(payment);
        if (verification.status === "WaitingApproval" || verification.status === "Failed" || verification.status === "Invalid") {
          if (verification.status === "WaitingApproval") {
            if (verification.transactionHash) {
              payment.transactionHash = verification.transactionHash;
            }
            markCartWaitingApproval(state, payment);
          } else {
            payment.status = "Failed";
            payment.updatedAt = new Date().toISOString();
          }
          changed = true;
          if (verification.status !== "WaitingApproval") {
            pushAlert(state, "x402 chain payment rejected", `${payment.modelName} transaction did not pass payment verification.`, "critical");
          }
        }
      } catch {
        try {
          const verification = await findReceiverTransfer(payment);
          if (verification.status === "WaitingApproval") {
            if (verification.transactionHash) {
              payment.transactionHash = verification.transactionHash;
            }
            markCartWaitingApproval(state, payment, "x402 receiver listener confirmed");
            changed = true;
          }
        } catch {
          // Keep the payment pending; the next poll can retry.
        }
      }
    }

    if (changed) {
      await writeState(state);
    }
  });
}

function pushAlert(state, title, detail, severity = "info") {
  state.alerts = [{ title, detail, severity, time: nowLabel() }, ...state.alerts].slice(0, 8);
}

function createTransaction(plan, count) {
  return {
    id: `tx-${1403 + count}`,
    time: nowLabel(),
    asset: plan.modelName,
    amount: plan.quantity,
    cost: `$${Number(plan.costUsd).toFixed(2)}`,
    status: "Success",
    hash: `0x${plan.modelName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6)}...${1403 + count}`,
  };
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function agentRequestKey(req, body) {
  return String(body.requestId || body.idempotencyKey || req.headers["idempotency-key"] || "");
}

function agentSignatureBase(requestKey, action, clientAgentId, payload) {
  return [
    requestKey,
    clientAgentId,
    payload?.issuedAt || "",
    action,
    stableStringify(payload?.data || {}),
  ].join("\n");
}

function agentSignaturePayload(req, body, payload) {
  return {
    issuedAt: body.issuedAt || req.headers["x-cryptoken-timestamp"] || "",
    data: payload || {},
  };
}

function expectedAgentSignature(req, body, action, clientAgentId, payload) {
  return `hmac-sha256:${createHmac("sha256", agentSignatureSecret)
    .update(agentSignatureBase(agentRequestKey(req, body), action, clientAgentId, agentSignaturePayload(req, body, payload)))
    .digest("hex")}`;
}

function verifyAgentSignature(req, body, action, clientAgentId, payload) {
  const providedSignature = String(body.signature || req.headers["x-cryptoken-signature"] || "");
  if (!providedSignature) {
    throw apiError(401, "Missing agent signature");
  }

  const expected = expectedAgentSignature(req, body, action, clientAgentId, payload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw apiError(401, "Invalid agent signature");
  }
}

function agentRequestHash(req, body, action, clientAgentId, payload) {
  return createHash("sha256")
    .update(agentSignatureBase(agentRequestKey(req, body), action, clientAgentId, agentSignaturePayload(req, body, payload)))
    .digest("hex");
}

function buildAgentRequestAudit(req, body, action, status = "accepted") {
  const headerAgentId = req.headers["x-cryptoken-agent-id"];
  const headerTimestamp = req.headers["x-cryptoken-timestamp"];
  const headerSignature = req.headers["x-cryptoken-signature"];
  const idempotencyKey = req.headers["idempotency-key"] || body.idempotencyKey || body.requestId || null;
  const clientAgentId = String(body.clientAgentId || headerAgentId || "unknown");
  const payload = body.payload || {};

  return {
    requestId: String(body.requestId || idempotencyKey || `req-${Date.now()}`),
    clientAgentId,
    action,
    status,
    issuedAt: body.issuedAt || headerTimestamp || null,
    signaturePresent: Boolean(body.signature || headerSignature),
    idempotencyKey,
    requestHash: agentRequestHash(req, body, action, clientAgentId, payload),
    receivedAt: new Date().toISOString(),
  };
}

function pushAgentRequest(state, audit) {
  state.agentRequests = [audit, ...(Array.isArray(state.agentRequests) ? state.agentRequests : [])].slice(0, 30);
}

function findIdempotentAgentRequest(state, idempotencyKey) {
  if (!idempotencyKey) {
    return null;
  }
  return (Array.isArray(state.agentRequests) ? state.agentRequests : []).find((request) => request.idempotencyKey === idempotencyKey) || null;
}

async function handlePlanCreate(req, res, state, session, body, source = "natural-language-strategy") {
  if (!permissionsFor(session.role).canOperatePlans) {
    return sendError(req, res, 403, "Forbidden");
  }

  state.purchaseCart = buildCart(state, { ...body, source });
  state.purchasePlan = cartToPlan(state.purchaseCart);
  pushAlert(
    state,
    state.purchaseCart.status === "Blocked" ? "采购篮已创建但被拦截" : "多模型采购篮已创建",
    `${state.purchaseCart.items.length} 个模型条目，合计 $${state.purchaseCart.totalCostUsd.toFixed(2)}。`,
    state.purchaseCart.status === "Blocked" ? "critical" : "info",
  );
  await writeState(state);
  return sendJson(req, res, 202, sanitizeState(state, session));
}

function approveCart(state) {
  const cart = state.purchaseCart || legacyPlanToCart(state.purchasePlan);
  const payment = latestX402Payment(state, cart.id);
  if (!payment || payment.status !== "WaitingApproval") {
    throw apiError(403, "Payment is not confirmed");
  }
  const blockReason = cartBlockReason(state, Number(cart.totalCostUsd || 0));
  if (blockReason) {
    state.purchaseCart = { ...cart, status: "Blocked", rule: blockReason, items: cart.items.map((item) => ({ ...item, status: "Blocked", reason: blockReason })) };
    state.purchasePlan = cartToPlan(state.purchaseCart);
    throw apiError(403, blockReason);
  }
  state.purchaseCart = {
    ...cart,
    status: "Approved",
    items: cart.items.map((item) => ({ ...item, status: "Approved", reason: "已批准并写入平台库存。" })),
  };
  state.purchasePlan = cartToPlan(state.purchaseCart);
  state.tokenInventory = state.tokenInventory && typeof state.tokenInventory === "object" ? state.tokenInventory : {};
  for (const item of state.purchaseCart.items) {
    state.tokenInventory[item.modelId] = Number((Number(state.tokenInventory[item.modelId] || 0) + Number(item.quantityMTok || 0)).toFixed(2));
  }
  const existingCount = Array.isArray(state.transactions) ? state.transactions.length : 0;
  const transactions = state.purchaseCart.items.map((item, index) => createTransaction(item, existingCount + index));
  state.transactions = [...transactions, ...(Array.isArray(state.transactions) ? state.transactions : [])];
  state.todaySpend = Number((Number(state.todaySpend || 0) + Number(state.purchaseCart.totalCostUsd || 0)).toFixed(2));
  return state.purchaseCart;
}

async function handleRequest(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || `${host}:${port}`}`);
  const pathname = url.pathname;

  try {
    if (req.method === "GET" && pathname === "/health") {
      return sendJson(req, res, 200, { ok: true });
    }

    return await runStatefulRequest(async () => {
    const state = await readState();

    if (req.method === "POST" && pathname === "/api/auth/login") {
      const body = await readJson(req);
      const username = String(body.username || "");
      const password = String(body.password || "");
      const account = accounts[username];
      if (!account || account.password !== password) {
        return sendError(req, res, 401, "Invalid credentials");
      }

      const token = randomBytes(32).toString("hex");
      state.sessions[token] = {
        username: account.username,
        role: account.role,
        createdAt: new Date().toISOString(),
      };
      await writeState(state);
      return sendJson(
        req,
        res,
        200,
        { user: publicUser(state.sessions[token]) },
        { "Set-Cookie": cookieHeader(token) },
      );
    }

    if (req.method === "POST" && pathname === "/api/auth/logout") {
      const token = parseCookies(req)[sessionCookie];
      if (token && state.sessions[token]) {
        delete state.sessions[token];
        await writeState(state);
      }
      return sendJson(req, res, 200, { ok: true }, { "Set-Cookie": clearCookieHeader() });
    }

    if (req.method === "GET" && pathname === "/api/auth/me") {
      const auth = await requireAuth(req, res, state);
      if (!auth) return;
      return sendJson(req, res, 200, { user: publicUser(auth.session) });
    }

    const auth = await requireAuth(req, res, state);
    if (!auth) return;
    const { session } = auth;

    if (req.method === "GET" && pathname === "/api/state") {
      return sendJson(req, res, 200, sanitizeState(state, session));
    }

    if (req.method === "GET" && pathname === "/api/x402/payment-required") {
      return sendX402PaymentRequired(req, res, state);
    }

    if (req.method === "POST" && pathname === "/api/x402/listen-transfer") {
      const body = await readJson(req);
      const payment = recordX402Payment(state, {
        orderId: body.orderId || state.purchaseCart?.id || state.purchasePlan?.id,
        payerAddress: body.payerAddress || null,
        source: "receiver-address-listener",
        status: "PendingConfirmation",
      });
      try {
        const verification = await findReceiverTransfer(payment);
        if (verification.status === "WaitingApproval") {
          if (verification.transactionHash) {
            payment.transactionHash = verification.transactionHash;
          }
          markCartWaitingApproval(state, payment, "x402 receiver listener confirmed");
        } else {
          pushAlert(
            state,
            "x402 receiver listener armed",
            payment.assetType === "native"
              ? `${payment.modelName} needs a submitted ${payment.asset} transaction hash for verification.`
              : `${payment.modelName} is listening for ${payment.asset} transfer to the receiver address.`,
            "info",
          );
        }
      } catch {
        pushAlert(state, "x402 receiver listener armed", `${payment.modelName} is waiting for payment verification.`, "info");
      }
      await writeState(state);
      return sendJson(req, res, 202, sanitizeState(state, session));
    }

    if (req.method === "POST" && pathname === "/api/x402/settle") {
      const body = await readJson(req);
      const paymentSignature = req.headers["payment-signature"] || body.paymentSignature;
      const transactionHash = body.transactionHash || body.txHash;
      if (!paymentSignature || !transactionHash) {
        return sendX402PaymentRequired(req, res, state);
      }

      const settlement = buildX402SettlementResponse(state, paymentSignature, transactionHash);
      const payment = recordX402Payment(state, {
        orderId: body.orderId || settlement.orderId,
        transactionHash: settlement.transactionHash,
        paymentSignature,
        payerAddress: body.payerAddress || null,
        source: "payment-signature",
        status: "PendingConfirmation",
      });
      const verification = await verifyX402Transfer(payment);
      if (verification.status !== "WaitingApproval") {
        await writeState(state);
        return sendJson(req, res, 202, sanitizeState(state, session));
      }
      payment.status = "WaitingApproval";
      payment.updatedAt = new Date().toISOString();
      state.purchaseCart = { ...(state.purchaseCart || legacyPlanToCart(state.purchasePlan)), status: "WaitingApproval" };
      state.purchasePlan = cartToPlan(state.purchaseCart);
      pushAlert(state, "x402 付款已记录", `${state.purchaseCart.items.length} 个模型条目已到账，等待人工批准。`, "info");
      await writeState(state);
      return sendJson(req, res, 200, { settlement, ...sanitizeState(state, session) }, {
        "PAYMENT-RESPONSE": base64Json(settlement),
      });
    }

    if (req.method === "POST" && pathname === "/api/x402/track-transfer") {
      const body = await readJson(req);
      const payment = recordX402Payment(state, {
        orderId: body.orderId,
        transactionHash: body.transactionHash || body.txHash,
        payerAddress: body.payerAddress || null,
        source: "wallet-transaction",
        status: "PendingConfirmation",
      });

      try {
        const verification = await verifyX402Transfer(payment);
        if (verification.status === "WaitingApproval") {
          payment.status = "WaitingApproval";
          payment.updatedAt = new Date().toISOString();
          state.purchaseCart = { ...(state.purchaseCart || legacyPlanToCart(state.purchasePlan)), status: "WaitingApproval" };
          state.purchasePlan = cartToPlan(state.purchaseCart);
          pushAlert(state, "x402 chain payment confirmed", `${payment.modelName} received ${payment.asset} and is waiting for manual approval.`, "info");
        } else {
          pushAlert(state, "x402 chain payment submitted", `${payment.modelName} transaction is waiting for chain confirmation.`, "info");
        }
      } catch {
        pushAlert(state, "x402 chain payment submitted", `${payment.modelName} transaction is waiting for listener confirmation.`, "info");
      }

      await writeState(state);
      return sendJson(req, res, 202, sanitizeState(state, session));
    }

    if (req.method === "POST" && pathname === "/api/x402/payment-webhook") {
      const body = await readJson(req);
      const payment = recordX402Payment(state, {
        orderId: body.orderId,
        transactionHash: body.transactionHash || body.txHash,
        paymentSignature: body.paymentSignature,
        payerAddress: body.payerAddress || null,
        source: body.source || "webhook",
        status: "PendingConfirmation",
      });
      const verification = await verifyX402Transfer(payment);
      if (verification.status !== "WaitingApproval") {
        await writeState(state);
        return sendJson(req, res, 202, sanitizeState(state, session));
      }
      payment.status = "WaitingApproval";
      payment.updatedAt = new Date().toISOString();
      state.purchaseCart = { ...(state.purchaseCart || legacyPlanToCart(state.purchasePlan)), status: "WaitingApproval" };
      state.purchasePlan = cartToPlan(state.purchaseCart);
      pushAlert(state, "x402 collection listener", `${payment.modelName} payment event is waiting for manual approval.`, "info");
      await writeState(state);
      return sendJson(req, res, 202, sanitizeState(state, session));
    }

    if (req.method === "POST" && pathname === "/api/plans") {
      const body = await readJson(req);
      return handlePlanCreate(req, res, state, session, body, body.source || "natural-language-strategy");
    }

    if (req.method === "POST" && pathname === "/api/carts") {
      const body = await readJson(req);
      return handlePlanCreate(req, res, state, session, body, body.source || "cart");
    }

    const removeItemMatch = pathname.match(/^\/api\/carts\/([^/]+)\/items\/([^/]+)\/remove$/);
    if (req.method === "POST" && removeItemMatch) {
      if (!permissionsFor(session.role).canOperatePlans) {
        return sendError(req, res, 403, "Forbidden");
      }
      const cart = state.purchaseCart || legacyPlanToCart(state.purchasePlan);
      if (cart.id !== decodeURIComponent(removeItemMatch[1]) || cart.status !== "Pending") {
        return sendError(req, res, 400, "Cart is not editable");
      }
      const itemId = decodeURIComponent(removeItemMatch[2]);
      state.purchaseCart = recalculateCart(state, { ...cart, items: cart.items.filter((item) => item.id !== itemId) });
      state.purchasePlan = cartToPlan(state.purchaseCart);
      pushAlert(state, "Cart item removed", `${state.purchaseCart.items.length} item(s) remain in the cart.`, "warning");
      await writeState(state);
      return sendJson(req, res, 200, sanitizeState(state, session));
    }

    const updateItemMatch = pathname.match(/^\/api\/carts\/([^/]+)\/items\/([^/]+)$/);
    if (req.method === "POST" && updateItemMatch) {
      if (!permissionsFor(session.role).canOperatePlans) {
        return sendError(req, res, 403, "Forbidden");
      }
      const cart = state.purchaseCart || legacyPlanToCart(state.purchasePlan);
      if (cart.id !== decodeURIComponent(updateItemMatch[1]) || cart.status !== "Pending") {
        return sendError(req, res, 400, "Cart is not editable");
      }
      const body = await readJson(req);
      const itemId = decodeURIComponent(updateItemMatch[2]);
      const items = cart.items.map((item) => {
        if (item.id !== itemId) return item;
        const model = findModel(state, item.modelId);
        const maxBudgetUsd = typeof body.maxBudgetUsd === "number" ? body.maxBudgetUsd : item.maxBudgetUsd;
        const targetQuantityMTok = typeof body.targetQuantityMTok === "number" ? body.targetQuantityMTok : item.targetQuantityMTok;
        return buildCartItem(state, model, {
          id: item.id,
          maxBudgetUsd,
          targetQuantityMTok,
          maxInputPriceUsdPerMTok: typeof body.maxInputPriceUsdPerMTok === "number" ? body.maxInputPriceUsdPerMTok : item.maxInputPriceUsdPerMTok,
          maxOutputPriceUsdPerMTok: typeof body.maxOutputPriceUsdPerMTok === "number" ? body.maxOutputPriceUsdPerMTok : item.maxOutputPriceUsdPerMTok,
        });
      });
      state.purchaseCart = recalculateCart(state, { ...cart, status: "Pending", items });
      state.purchasePlan = cartToPlan(state.purchaseCart);
      pushAlert(state, "Cart item updated", `${state.purchaseCart.items.length} item(s), total $${state.purchaseCart.totalCostUsd.toFixed(2)}.`, "info");
      await writeState(state);
      return sendJson(req, res, 200, sanitizeState(state, session));
    }

    const approveMatch = pathname.match(/^\/api\/(?:plans|carts)\/([^/]+)\/approve$/);
    if (req.method === "POST" && approveMatch) {
      if (!permissionsFor(session.role).canOperatePlans) {
        return sendError(req, res, 403, "Forbidden");
      }
      const cart = state.purchaseCart || legacyPlanToCart(state.purchasePlan);
      const requestedId = decodeURIComponent(approveMatch[1]);
      if (![cart.id, state.purchasePlan.id].includes(requestedId) || !["Pending", "WaitingApproval"].includes(cart.status)) {
        return sendError(req, res, 400, "Cart is not pending");
      }
      try {
        const approvedCart = approveCart(state);
        pushAlert(state, "采购篮已批准", `${approvedCart.items.length} 个模型条目已写入库存。`, "info");
        await writeState(state);
        return sendJson(req, res, 200, sanitizeState(state, session));
      } catch (error) {
        pushAlert(state, "采购批准被拦截", error.message, "critical");
        await writeState(state);
        return sendError(req, res, error.status || 403, error.message);
      }
    }

    const cancelMatch = pathname.match(/^\/api\/(?:plans|carts)\/([^/]+)\/cancel$/);
    if (req.method === "POST" && cancelMatch) {
      if (!permissionsFor(session.role).canOperatePlans) {
        return sendError(req, res, 403, "Forbidden");
      }
      const cart = state.purchaseCart || legacyPlanToCart(state.purchasePlan);
      const requestedId = decodeURIComponent(cancelMatch[1]);
      if (![cart.id, state.purchasePlan.id].includes(requestedId) || !["Pending", "WaitingApproval"].includes(cart.status)) {
        return sendError(req, res, 400, "Cart is not pending");
      }
      state.purchaseCart = { ...cart, status: "Cancelled", items: cart.items.map((item) => ({ ...item, status: "Cancelled" })) };
      state.purchasePlan = cartToPlan(state.purchaseCart);
      pushAlert(state, "采购篮已取消", `${state.purchaseCart.items.length} 个模型条目不会进入付款队列。`, "warning");
      await writeState(state);
      return sendJson(req, res, 200, sanitizeState(state, session));
    }

    if (req.method === "POST" && pathname === "/api/risk/emergency-stop") {
      if (!requireAdmin(req, res, session)) return;
      state.settings.agentPaused = true;
      state.settings.autoPay = false;
      if (["Pending", "WaitingApproval"].includes(state.purchaseCart?.status)) {
        state.purchaseCart = { ...state.purchaseCart, status: "Blocked", items: state.purchaseCart.items.map((item) => ({ ...item, status: "Blocked", reason: "已触发急停" })) };
        state.purchasePlan = cartToPlan(state.purchaseCart);
      }
      pushAlert(state, "已触发急停", "自动付款已关闭，待处理采购篮已锁定。", "critical");
      await writeState(state);
      return sendJson(req, res, 200, sanitizeState(state, session));
    }

    if (req.method === "POST" && pathname === "/api/risk/resume") {
      if (!requireAdmin(req, res, session)) return;
      state.settings.agentPaused = false;
      pushAlert(state, "Agent 已恢复", "系统可以重新生成采购篮。", "info");
      await writeState(state);
      return sendJson(req, res, 200, sanitizeState(state, session));
    }

    if (req.method === "POST" && pathname === "/api/settings/agent-control") {
      if (!requireAdmin(req, res, session)) return;
      const body = await readJson(req);
      state.settings.agentControlEnabled = Boolean(body.enabled);
      pushAlert(state, state.settings.agentControlEnabled ? "Agent 控制已开启" : "Agent 控制已关闭", "外部 Agent 控制状态已更新。", "info");
      await writeState(state);
      return sendJson(req, res, 200, sanitizeState(state, session));
    }

    if (req.method === "POST" && pathname === "/api/settings/settlement-network") {
      if (!permissionsFor(session.role).canOperatePlans) {
        return sendError(req, res, 403, "Forbidden");
      }
      const body = await readJson(req);
      const nextNetwork = String(body.network || "");
      if (!settlementNetworks[nextNetwork]) {
        return sendError(req, res, 400, "不支持的结算网络");
      }
      state.settings.settlementNetwork = nextNetwork;
      pushAlert(state, "结算网络已切换", `当前网络：${settlementNetworks[nextNetwork].label}。`, nextNetwork === "arbitrum-one" ? "warning" : "info");
      await writeState(state);
      return sendJson(req, res, 200, sanitizeState(state, session));
    }

    if (req.method === "POST" && pathname === "/api/settings/payment-asset") {
      if (!permissionsFor(session.role).canOperatePlans) {
        return sendError(req, res, 403, "Forbidden");
      }
      const body = await readJson(req);
      const nextAsset = String(body.asset || "").toUpperCase();
      if (!["USDC", "NATIVE"].includes(nextAsset)) {
        return sendError(req, res, 400, "不支持的付款资产");
      }
      state.settings.paymentAsset = nextAsset;
      const network = settlementNetworkConfig(state.settings.settlementNetwork);
      pushAlert(
        state,
        "付款资产已切换",
        nextAsset === "NATIVE" ? `当前使用 ${network.nativeAsset} 原生币付款。` : "当前使用 USDC 付款。",
        nextAsset === "NATIVE" && !String(network.id).includes("sepolia") && network.id !== "polygon-amoy" && network.id !== "avalanche-fuji"
          ? "warning"
          : "info",
      );
      await writeState(state);
      return sendJson(req, res, 200, sanitizeState(state, session));
    }

    if (req.method === "POST" && pathname === "/api/settings/rules") {
      if (!requireAdmin(req, res, session)) return;
      const body = await readJson(req);
      if (typeof body.singleLimit === "number") state.settings.singleLimit = body.singleLimit;
      if (typeof body.dailyBudget === "number") state.settings.dailyBudget = body.dailyBudget;
      if (typeof body.triggerPrice === "number") state.settings.triggerPrice = body.triggerPrice;
      await writeState(state);
      return sendJson(req, res, 200, sanitizeState(state, session));
    }

    if (req.method === "POST" && pathname === "/api/wallet/authorization") {
      if (!requireAdmin(req, res, session)) return;
      const body = await readJson(req);
      state.settings.walletAuthorized = Boolean(body.authorized);
      state.settings.autoPay = Boolean(body.authorized);
      if (!state.settings.walletAuthorized && ["Pending", "WaitingApproval"].includes(state.purchaseCart?.status)) {
        state.purchaseCart = { ...state.purchaseCart, status: "Blocked", rule: "钱包未授权", items: state.purchaseCart.items.map((item) => ({ ...item, status: "Blocked", reason: "钱包未授权" })) };
        state.purchasePlan = cartToPlan(state.purchaseCart);
      }
      pushAlert(state, state.settings.walletAuthorized ? "钱包授权已启用" : "钱包授权已关闭", "钱包授权状态已更新。", "info");
      await writeState(state);
      return sendJson(req, res, 200, sanitizeState(state, session));
    }

    if (req.method === "POST" && pathname === "/api/agent/control") {
      if (!state.settings.agentControlEnabled) {
        return sendError(req, res, 403, "Agent 控制已关闭");
      }
      const body = await readJson(req);
      const action = String(body.action || "");
      const payload = body.payload || {};
      const clientAgentId = String(body.clientAgentId || req.headers["x-cryptoken-agent-id"] || "unknown");
      const audit = buildAgentRequestAudit(req, body, action);
      verifyAgentSignature(req, body, action, clientAgentId, payload);
      const existingAgentRequest = findIdempotentAgentRequest(state, audit.idempotencyKey);
      if (existingAgentRequest) {
        if (existingAgentRequest.requestHash !== audit.requestHash || existingAgentRequest.action !== action) {
          return sendError(req, res, 409, "Idempotency key reused with different request");
        }
        return sendJson(req, res, 202, {
          ...sanitizeState(state, session),
          idempotency: { replayed: true, key: audit.idempotencyKey },
        });
      }

      pushAgentRequest(state, audit);

      if (action === "purchase.plan.create" || action === "purchase.cart.create") {
        return handlePlanCreate(req, res, state, session, payload, `Agent:${clientAgentId}`);
      }

      if (action === "purchase.plan.cancel" || action === "purchase.cart.cancel") {
        if (!permissionsFor(session.role).canOperatePlans) {
          return sendError(req, res, 403, "Forbidden");
        }
        if (!["Pending", "WaitingApproval"].includes(state.purchaseCart?.status)) {
          return sendError(req, res, 400, "Cart is not pending");
        }
        state.purchaseCart = { ...state.purchaseCart, status: "Cancelled", items: state.purchaseCart.items.map((item) => ({ ...item, status: "Cancelled" })) };
        state.purchasePlan = cartToPlan(state.purchaseCart);
        pushAlert(state, "Agent 已取消采购篮", `${state.purchaseCart.items.length} 个模型条目已取消。`, "warning");
        await writeState(state);
        return sendJson(req, res, 202, sanitizeState(state, session));
      }

      if (action === "risk.emergency_stop") {
        if (!requireAdmin(req, res, session)) return;
        state.settings.agentPaused = true;
        state.settings.autoPay = false;
        if (["Pending", "WaitingApproval"].includes(state.purchaseCart?.status)) {
          state.purchaseCart = { ...state.purchaseCart, status: "Blocked", items: state.purchaseCart.items.map((item) => ({ ...item, status: "Blocked", reason: "已触发急停" })) };
          state.purchasePlan = cartToPlan(state.purchaseCart);
        }
        pushAlert(state, "Agent 已触发急停", "自动付款已关闭。", "critical");
        await writeState(state);
        return sendJson(req, res, 202, sanitizeState(state, session));
      }

      if (action === "wallet.authorization.request") {
        if (!requireAdmin(req, res, session)) return;
        state.settings.walletAuthorized = true;
        state.settings.autoPay = true;
        pushAlert(state, "Agent 已请求钱包授权", "钱包授权已启用，等待人工复核。", "info");
        await writeState(state);
        return sendJson(req, res, 202, sanitizeState(state, session));
      }

      state.agentRequests[0] = { ...state.agentRequests[0], status: "rejected" };
      await writeState(state);
      return sendError(req, res, 400, "Unsupported action");
    }

    return sendError(req, res, 404, "Not found");
    });
  } catch (error) {
    const status = error.status || 500;
    return sendError(req, res, status, status === 500 ? "Internal server error" : error.message);
  }
}

await ensureState();
setInterval(() => {
  void reconcilePendingX402Payments();
}, 15_000).unref();

createServer(handleRequest).listen(port, host, () => {
  console.log(`Cryptoken API listening on http://${host}:${port}`);
});
