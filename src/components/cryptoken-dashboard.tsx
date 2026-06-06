"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
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
  Zap,
} from "lucide-react";
import { alerts, marketModels, navItems, transactions } from "@/lib/mock-data";
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

type PlanStatus = "Pending" | "Approved" | "Cancelled" | "Blocked";

type PurchasePlan = {
  id: string;
  modelName: string;
  quantity: string;
  costUsd: number;
  source: string;
  rule: string;
  status: PlanStatus;
};

const defaultSingleLimit = 5;
const defaultDailyBudget = 24;
const defaultTriggerPrice = 0.435;
const defaultCommand =
  "用最低价买 DeepSeek-R1 的 token，预算不超过 10 美元，价格不高于 $0.435 / 1M input tokens 时优先成交。";

const initialPlan: PurchasePlan = {
  id: "plan-001",
  modelName: "DeepSeek-R1",
  quantity: "11.08M input tokens",
  costUsd: 4.82,
  source: "自然语言策略",
  rule: "价格不高于 $0.435 / 1M input tokens 时优先成交",
  status: "Pending",
};

const timeRanges = ["1H", "24H", "7D"] as const;
const marketFilters = ["All", "Low", "Watch", "High"] as const;
const walletAddress = "0x7e12...a94f";
const pricingNote =
  "价格口径：官方 API 标准输入/输出价，单位为 USD / 1M tokens；币价折算按 BTC 约 $75.8k、ETH 约 $2.08k、USDT 约 $1.00 估算。";

const connectionSteps = [
  "点击连接钱包，选择 Gate Pay 或 Coinbase。",
  "使用手机扫码确认只读余额和小额付款授权。",
  "设置单笔限额、每日预算和自动触发价后，再让 AI 生成采购计划。",
];

const faqs = [
  { question: "AI 乱买怎么办？", answer: "急停会立即关闭自动付款，并把待执行计划置为 Blocked。" },
  { question: "能退款吗？", answer: "已链上确认的付款按模型平台和钱包规则处理，未批准计划不会扣款。" },
  { question: "为什么要人工确认？", answer: "$5 以上或被风控标记的计划必须人工批准。" },
];

const statusStyles = {
  Success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20",
  Pending: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
  Blocked: "bg-rose-500/10 text-rose-700 ring-rose-500/20",
};

const planStatusStyles = {
  Pending: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
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

function Panel({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"section">) {
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
      loading market data
    </div>
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
              ? "flex h-11 shrink-0 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-[16px] text-stone-700"
              : "flex h-11 w-full items-center gap-3 rounded-md px-3 text-[16px] text-stone-300 transition hover:bg-white/10 hover:text-white",
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
  onToggle,
}: Readonly<{
  agentPaused: boolean;
  compact?: boolean;
  onToggle: () => void;
}>) {
  return (
    <button
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-md px-3 text-[16px] font-medium",
        compact && "min-h-12 px-4 text-[17px]",
        compact
          ? agentPaused
            ? "bg-emerald-600 text-white"
            : "bg-rose-600 text-white"
          : agentPaused
            ? "bg-rose-500/10 text-rose-700"
            : "bg-emerald-500/10 text-emerald-700",
      )}
      onClick={onToggle}
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

function extractBudget(command: string) {
  const budgetMatch = command.match(/(?:不超过|预算|上限|限额)\D*(\d+(?:\.\d+)?)/);
  return budgetMatch ? Number(budgetMatch[1]) : 10;
}

function modelFromCommand(command: string) {
  const normalized = command.toLowerCase();
  return (
    marketModels.find((model) => normalized.includes(model.name.toLowerCase())) ??
    marketModels.find((model) => normalized.includes(model.provider.toLowerCase())) ??
    marketModels[1]
  );
}

function buildPlan(
  model: MarketModel,
  command: string,
  source: string,
  paused: boolean,
  singleLimit: number,
  triggerPrice: number,
): PurchasePlan {
  const budget = extractBudget(command);
  const costUsd = Math.min(Math.max(budget * 0.48, 0.25), singleLimit);
  const quantityM = Math.max(0.05, costUsd / model.inputPriceUsd);

  return {
    id: `plan-${model.id}`,
    modelName: model.name,
    quantity: `${quantityM.toFixed(2)}M input tokens`,
    costUsd,
    source,
    rule:
      command.includes("低于") || command.includes("不高于")
        ? `价格不高于 $${triggerPrice.toFixed(3)} / 1M input tokens 时优先成交`
        : "按当前最低报价生成待确认计划",
    status: paused ? "Blocked" : "Pending",
  };
}

function alertFor(title: string, detail: string, severity: AlertItem["severity"]): AlertItem {
  return {
    title,
    detail,
    severity,
    time: "刚刚",
  };
}

function transactionFor(plan: PurchasePlan, count: number): Transaction {
  return {
    id: `tx-${1403 + count}`,
    time: "刚刚",
    asset: plan.modelName,
    amount: plan.quantity,
    cost: `$${plan.costUsd.toFixed(2)} / ${plan.costUsd.toFixed(2)} USDT`,
    status: "Success",
    hash: `0x${plan.modelName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6)}...${1403 + count}`,
  };
}

function chainExplorerUrl(hash: string) {
  return hash.startsWith("0x") ? `https://etherscan.io/search?f=0&q=${encodeURIComponent(hash)}` : null;
}

export default function CryptokenDashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const [command, setCommand] = useState(defaultCommand);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState<(typeof timeRanges)[number]>("1H");
  const [marketFilter, setMarketFilter] = useState<(typeof marketFilters)[number]>("All");
  const [showAlertPeek, setShowAlertPeek] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [autoPay, setAutoPay] = useState(true);
  const [agentPaused, setAgentPaused] = useState(false);
  const [singleLimit, setSingleLimit] = useState(defaultSingleLimit);
  const [dailyBudget, setDailyBudget] = useState(defaultDailyBudget);
  const [triggerPrice, setTriggerPrice] = useState(defaultTriggerPrice);
  const [planSelected, setPlanSelected] = useState(true);
  const [purchasePlan, setPurchasePlan] = useState<PurchasePlan>(initialPlan);
  const [localAlerts, setLocalAlerts] = useState<AlertItem[]>(alerts);
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>(transactions);
  const [actionNote, setActionNote] = useState("等待用户确认当前采购计划。");

  const canActOnPlan = purchasePlan.status === "Pending";
  const canApprove = canActOnPlan && planSelected;
  const strategyScore = useMemo(() => {
    if (agentPaused) {
      return 48;
    }

    if (!autoPay) {
      return 72;
    }

    return purchasePlan.status === "Approved" ? 86 : 78;
  }, [agentPaused, autoPay, purchasePlan.status]);

  const pendingCount = localTransactions.filter((tx) => tx.status === "Pending").length + (canActOnPlan ? 1 : 0);
  const blockedCount = localTransactions.filter((tx) => tx.status === "Blocked").length + (agentPaused ? 1 : 0);
  const todaySpend = 7.86 + (purchasePlan.status === "Approved" ? purchasePlan.costUsd : 0);
  const dailyUsage = Math.min(100, (todaySpend / dailyBudget) * 100);
  const ruleCards = [
    { label: "单次购买上限", value: `$${singleLimit.toFixed(2)}`, tone: "success" as const },
    { label: "每日总预算", value: `$${dailyBudget.toFixed(2)}`, tone: "neutral" as const },
    { label: "自动触发价", value: `<= $${triggerPrice.toFixed(3)} / 1M`, tone: "warning" as const },
    { label: "付款授权", value: autoPay ? "小额自动" : "逐笔确认", tone: autoPay ? ("success" as const) : ("warning" as const) },
  ];
  const overviewCards = [
    { label: "可用余额", value: "$18,420.28", meta: "USDT / BTC / ETH", Icon: WalletCards },
    {
      label: "今日采购",
      value: `$${todaySpend.toFixed(2)}`,
      meta: `${dailyUsage.toFixed(1)}% of daily cap`,
      Icon: ShoppingCart,
    },
    { label: "策略待处理", value: String(pendingCount), meta: "pending approval", Icon: Bot },
    {
      label: "风控拦截",
      value: String(blockedCount),
      meta: agentPaused ? "emergency stop" : "last 60 minutes",
      Icon: ShieldAlert,
    },
  ];

  const visibleMarketModels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return marketModels.filter((model) => {
      const matchesFilter = marketFilter === "All" || model.risk === marketFilter;
      const matchesSearch =
        query.length === 0 ||
        model.name.toLowerCase().includes(query) ||
        model.provider.toLowerCase().includes(query) ||
        model.tokenPriceCrypto.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [marketFilter, searchQuery]);

  const pushAlert = (alert: AlertItem) => {
    setLocalAlerts((current) => [alert, ...current].slice(0, 4));
  };

  const handleNavClick = (sectionId: string) => {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ block: "start", behavior: "auto" });
  };

  const handleTimeRange = () => {
    setTimeRange((current) => {
      const currentIndex = timeRanges.indexOf(current);
      const next = timeRanges[(currentIndex + 1) % timeRanges.length];
      setActionNote(`价格曲线已切换到 ${next} 观察窗口。`);
      return next;
    });
  };

  const handleMarketFilter = () => {
    setMarketFilter((current) => {
      const currentIndex = marketFilters.indexOf(current);
      const next = marketFilters[(currentIndex + 1) % marketFilters.length];
      setActionNote(next === "All" ? "模型市场已显示全部风险等级。" : `模型市场已筛选 ${next} 风险等级。`);
      return next;
    });
  };

  const handleCopyWallet = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopyStatus("copied");
      setActionNote("钱包地址已复制到剪贴板。");
      pushAlert(alertFor("钱包地址已复制", walletAddress, "info"));
      window.setTimeout(() => setCopyStatus("idle"), 1600);
    } catch {
      setCopyStatus("failed");
      setActionNote("浏览器拒绝剪贴板权限，请手动复制钱包地址。");
      pushAlert(alertFor("复制失败", "浏览器未授予剪贴板权限。", "warning"));
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    }
  };

  const handleGeneratePlan = () => {
    const model = modelFromCommand(command);
    const nextPlan = buildPlan(model, command, "自然语言策略", agentPaused, singleLimit, triggerPrice);
    setPurchasePlan(nextPlan);
    setPlanSelected(true);

    if (agentPaused) {
      setActionNote("AI 已暂停，新计划被风控锁定，需恢复后再执行。");
      pushAlert(alertFor("计划生成但未执行", "急停状态下所有新交易都会被锁定。", "critical"));
      return;
    }

    setActionNote(`${model.name} 采购计划已生成，等待批准或取消。`);
    pushAlert(alertFor("采购计划已生成", `${model.name} 已进入待确认购物车。`, "info"));
  };

  const handleMarketPlan = (model: MarketModel) => {
    const nextCommand = `购买 ${model.name} 的 token，预算不超过 5 美元，按当前最低价生成计划。`;
    const nextPlan = buildPlan(model, nextCommand, "模型市场快捷计划", agentPaused, singleLimit, triggerPrice);
    setCommand(nextCommand);
    setPurchasePlan(nextPlan);
    setPlanSelected(true);

    if (agentPaused) {
      setActionNote("AI 已暂停，市场快捷计划被阻止执行。");
      pushAlert(alertFor("快捷计划被急停拦截", `${model.name} 采购请求未进入付款队列。`, "critical"));
      return;
    }

    setActionNote(`${model.name} 已从市场加入待确认购物车。`);
    pushAlert(alertFor("商品已加入计划", `${model.name} 已等待人工确认。`, "info"));
  };

  const handleApprove = () => {
    if (!canApprove) {
      return;
    }

    setPurchasePlan((current) => ({ ...current, status: "Approved" }));
    setLocalTransactions((current) => [transactionFor(purchasePlan, current.length), ...current]);
    setPlanSelected(false);
    setActionNote(`${purchasePlan.modelName} 已批准并写入交易日志。`);
    pushAlert(alertFor("采购已批准", `${purchasePlan.modelName} 付款请求已进入成功队列。`, "info"));
  };

  const handleCancel = () => {
    if (!canActOnPlan) {
      return;
    }

    setPurchasePlan((current) => ({ ...current, status: "Cancelled" }));
    setPlanSelected(false);
    setActionNote(`${purchasePlan.modelName} 采购计划已取消。`);
    pushAlert(alertFor("采购计划已取消", "购物车已清空，不会产生付款。", "warning"));
  };

  const handleEmergencyStop = () => {
    setAgentPaused(true);
    setAutoPay(false);
    setPurchasePlan((current) => (current.status === "Pending" ? { ...current, status: "Blocked" } : current));
    setPlanSelected(false);
    setActionNote("急停已触发：AI 自动付款关闭，新交易全部阻断。");
    pushAlert(alertFor("紧急停止已触发", "自动付款已关闭，后续交易需人工恢复。", "critical"));
  };

  const handleResumeAgent = () => {
    setAgentPaused(false);
    setActionNote("AI 已恢复运行，但自动付款保持当前授权状态。");
    pushAlert(alertFor("AI 已恢复运行", "系统恢复生成采购计划，付款仍受限额控制。", "info"));
  };

  const handleAutoPayToggle = () => {
    setAutoPay((current) => {
      const next = !current;
      setActionNote(next ? "小额自动付款已开启，仍受 $5 单笔限额约束。" : "小额自动付款已关闭，每笔付款都需要确认。");
      pushAlert(
        alertFor(
          next ? "自动付款已开启" : "自动付款已关闭",
          next ? "$5 以下交易允许自动付款。" : "所有付款将进入人工确认。",
          next ? "info" : "warning",
        ),
      );
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-stone-200 bg-stone-950 text-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-400 text-stone-950">
            <Zap size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[16px] font-semibold">Cryptoken</p>
            <p className="text-[16px] text-stone-400">AI token treasury</p>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          <NavigationItems activeSection={activeSection} onNavigate={handleNavClick} />
        </nav>
        <div className="absolute inset-x-3 bottom-3 rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-[16px] font-medium text-emerald-100">
            <LockKeyhole size={17} />
            policy guard active
          </div>
          <p className="text-[16px] leading-6 text-stone-300">自动付款限额 $5，超限交易进入人工确认队列。</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="flex size-11 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white lg:hidden"
                onClick={() => handleNavClick("overview")}
                aria-label="返回总览"
                data-testid="mobile-overview-icon"
              >
                <Zap size={18} />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold text-stone-950">
                  <span className="sm:hidden">币元控制台</span>
                  <span className="hidden sm:inline">币元交易控制台</span>
                </h1>
                <p className="hidden text-[16px] text-stone-500 sm:block">AI 智能体模型 token 采购与钱包风控</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="hidden h-11 min-w-64 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 text-[16px] text-stone-500 md:flex">
                <Search size={16} />
                <input
                  className="min-w-0 flex-1 bg-transparent text-stone-900 outline-none placeholder:text-stone-500"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索模型、交易、钱包地址"
                  data-testid="global-search"
                />
              </label>
              <button
                className={cn(
                  "relative flex size-11 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-700",
                  showAlertPeek && "border-amber-300 bg-amber-50 text-amber-700",
                )}
                onClick={() => {
                  setShowAlertPeek((current) => !current);
                  handleNavClick("risk");
                }}
                aria-pressed={showAlertPeek}
                aria-label={showAlertPeek ? "隐藏风控提醒" : "查看风控提醒"}
                data-testid="notification-bell"
              >
                <Bell size={17} />
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-rose-500" />
              </button>
              <button
                className="flex h-11 items-center gap-2 whitespace-nowrap rounded-md bg-stone-950 px-3 text-[16px] font-medium text-white"
                onClick={handleGeneratePlan}
                data-testid="new-strategy"
              >
                <Plus size={16} />
                新策略
              </button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto border-t border-stone-200 px-4 py-2 lg:hidden">
            <NavigationItems activeSection={activeSection} mobile onNavigate={handleNavClick} />
          </nav>
          {showAlertPeek ? (
            <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-[16px] text-amber-900 sm:px-6" data-testid="alert-peek">
              <span className="font-semibold">{localAlerts[0]?.title}</span>
              <span className="ml-2 text-amber-800">{localAlerts[0]?.detail}</span>
            </div>
          ) : null}
        </header>

        <div className="space-y-5 p-4 sm:p-6">
          <section id="overview" className="grid scroll-mt-28 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((card) => (
              <OverviewCard key={card.label} {...card} />
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
            <Panel id="price">
              <PanelHeader
                title="实时价格曲线"
                eyebrow="market timing"
                action={
                  <button
                    className="flex h-11 items-center gap-2 rounded-md border border-stone-200 px-3 text-[16px] font-medium text-stone-700"
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

            <Panel id="agent">
              <PanelHeader
                title="AI 智能体控制"
                eyebrow="agent cart"
                action={
                  <AgentStateButton
                    agentPaused={agentPaused}
                    onToggle={agentPaused ? handleResumeAgent : handleEmergencyStop}
                  />
                }
              />
              <div className="space-y-4 p-5">
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                  <label className="text-[16px] font-medium text-stone-700" htmlFor="agent-command">
                    指令
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
                      className="flex h-11 items-center gap-2 rounded-md bg-emerald-600 px-3 text-[16px] font-medium text-white disabled:bg-stone-300 disabled:text-stone-500"
                      onClick={handleGeneratePlan}
                      data-testid="generate-plan"
                    >
                      <Send size={15} />
                      生成计划
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-lg border border-stone-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[16px] font-medium text-stone-700" htmlFor="single-limit">
                        单次购买上限
                      </label>
                      <span className="font-mono text-[16px] font-semibold">${singleLimit.toFixed(2)}</span>
                    </div>
                    <input
                      id="single-limit"
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={singleLimit}
                      onChange={(event) => setSingleLimit(Number(event.target.value))}
                      className="mt-3 h-11 w-full accent-emerald-600"
                      data-testid="single-limit"
                    />
                  </div>
                  <div className="rounded-lg border border-stone-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[16px] font-medium text-stone-700" htmlFor="daily-budget">
                        每日总预算
                      </label>
                      <span className="font-mono text-[16px] font-semibold">${dailyBudget.toFixed(0)}</span>
                    </div>
                    <input
                      id="daily-budget"
                      type="range"
                      min="5"
                      max="100"
                      step="1"
                      value={dailyBudget}
                      onChange={(event) => setDailyBudget(Number(event.target.value))}
                      className="mt-3 h-11 w-full accent-emerald-600"
                      data-testid="daily-budget"
                    />
                  </div>
                  <div className="rounded-lg border border-stone-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[16px] font-medium text-stone-700" htmlFor="trigger-price">
                        自动触发价
                      </label>
                      <span className="font-mono text-[16px] font-semibold">${triggerPrice.toFixed(3)}</span>
                    </div>
                    <input
                      id="trigger-price"
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.005"
                      value={triggerPrice}
                      onChange={(event) => setTriggerPrice(Number(event.target.value))}
                      className="mt-3 h-11 w-full accent-emerald-600"
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

          <section className="grid gap-5 xl:grid-cols-[1fr_1fr_0.9fr]">
            <Panel id="market" className="xl:col-span-2">
              <PanelHeader
                title="模型 token 市场"
                eyebrow="inventory"
                action={
                  <button
                    className="flex h-11 items-center gap-2 rounded-md border border-stone-200 px-3 text-[16px] font-medium text-stone-700"
                    onClick={handleMarketFilter}
                    data-testid="market-filter"
                  >
                    <SlidersHorizontal size={15} />
                    {marketFilter === "All" ? "筛选" : marketFilter}
                  </button>
                }
              />
              <div className="divide-y divide-stone-200">
                {visibleMarketModels.length === 0 ? (
                  <div className="px-5 py-8 text-[16px] text-stone-500" data-testid="market-empty">
                    没有匹配的模型。请调整搜索词或风险筛选。
                  </div>
                ) : null}
                {visibleMarketModels.map((model) => (
                  <div key={model.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1.1fr_0.7fr_0.7fr_auto] md:items-center">
                    <div className="flex items-center gap-3">
                      <div className={cn("size-10 rounded-lg", model.accent)} />
                      <div>
                        <p className="text-[17px] font-semibold text-stone-950">{model.name}</p>
                        <p className="text-[16px] text-stone-500">{model.provider}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[16px] text-stone-500">输入价</p>
                      <p className="font-mono text-[16px] font-semibold">${model.inputPriceUsd.toFixed(3)} / {model.unit}</p>
                      <p className="text-[16px] text-stone-500">{model.tokenPriceCrypto}</p>
                    </div>
                    <div>
                      <p className="text-[16px] text-stone-500">输出价 / 可用量</p>
                      <p className="font-mono text-[16px] font-semibold">${model.outputPriceUsd.toFixed(2)} / 1M</p>
                      <p className="font-mono text-[16px] text-stone-500">{(model.inventory / 1000000).toFixed(1)}M tokens</p>
                      <p className={cn("text-[16px]", model.change24h < 0 ? "text-emerald-600" : "text-rose-600")}>
                        {model.change24h > 0 ? "+" : ""}
                        {model.change24h.toFixed(1)}% 结算偏移
                      </p>
                    </div>
                    <button
                      className="flex h-11 items-center justify-center gap-2 rounded-md bg-stone-950 px-3 text-[16px] font-medium text-white"
                      onClick={() => handleMarketPlan(model)}
                      data-testid={`market-plan-${model.id}`}
                    >
                      <ShoppingCart size={15} />
                      加入计划
                    </button>
                  </div>
                ))}
              </div>
              <div className="border-t border-stone-200 bg-stone-50 px-5 py-3 text-[16px] text-stone-600">
                {pricingNote}
              </div>
            </Panel>

            <Panel id="wallet">
              <PanelHeader title="钱包" eyebrow="treasury" />
              <div className="space-y-4 p-5">
                <div className="rounded-lg bg-stone-950 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <p className="text-[16px] text-stone-300">Gate Pay 钱包</p>
                    <button
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-md bg-white/10 px-2 text-[16px]"
                      aria-label="复制钱包地址"
                      onClick={handleCopyWallet}
                      data-testid="copy-wallet"
                    >
                      {copyStatus === "copied" ? "已复制" : copyStatus === "failed" ? "失败" : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="mt-6 break-all font-mono text-[16px]">{walletAddress}</p>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-[16px]">
                    <span>USDT 842.20</span>
                    <span>BTC 0.031</span>
                    <span>ETH 1.84</span>
                  </div>
                </div>
                <button
                  className="flex w-full items-center justify-between rounded-lg border border-stone-200 p-3 text-left"
                  onClick={handleAutoPayToggle}
                  aria-pressed={autoPay}
                  data-testid="wallet-autopay"
                >
                  <div>
                    <p className="text-[16px] font-medium">允许小额自动付款</p>
                    <p className="text-[16px] text-stone-500">{autoPay ? "$5 以下" : "每笔确认"}</p>
                  </div>
                  <div className={cn("h-6 w-11 rounded-full p-1 transition", autoPay ? "bg-emerald-500" : "bg-stone-300")}>
                    <div className={cn("size-4 rounded-full bg-white transition", autoPay && "ml-auto")} />
                  </div>
                </button>
                <div className="h-36" data-testid="wallet-chart">
                  <WalletBalanceChart />
                </div>
              </div>
            </Panel>
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <Panel id="risk">
              <PanelHeader
                title="安全与监控"
                eyebrow="risk engine"
                action={
                  <AgentStateButton
                    agentPaused={agentPaused}
                    compact
                    onToggle={agentPaused ? handleResumeAgent : handleEmergencyStop}
                  />
                }
              />
              <div className="space-y-3 p-5" data-testid="alerts-list">
                {localAlerts.map((alert, index) => (
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

            <Panel id="history">
              <PanelHeader title="交易历史与日志" eyebrow="audit trail" />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-[16px]">
                  <thead className="border-b border-stone-200 bg-stone-50 text-[16px] uppercase text-stone-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">时间</th>
                      <th className="px-5 py-3 font-medium">商品</th>
                      <th className="px-5 py-3 font-medium">数量</th>
                      <th className="px-5 py-3 font-medium">花费</th>
                      <th className="px-5 py-3 font-medium">状态</th>
                      <th className="px-5 py-3 font-medium">链上 ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200" data-testid="transaction-list">
                    {localTransactions.map((tx) => (
                      <tr key={tx.id} className="bg-white">
                        <td className="px-5 py-4 font-mono text-stone-500">{tx.time}</td>
                        <td className="px-5 py-4 font-medium">{tx.asset}</td>
                        <td className="px-5 py-4 text-stone-600">{tx.amount}</td>
                        <td className="px-5 py-4 font-mono text-stone-700">{tx.cost}</td>
                        <td className="px-5 py-4">
                          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[16px] font-semibold ring-1", statusStyles[tx.status])}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-stone-500">
                          {chainExplorerUrl(tx.hash) ? (
                            <a
                              className="inline-flex min-h-11 items-center gap-1 rounded-md text-sky-700 underline-offset-4 hover:underline"
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

          <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <Panel className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[16px] font-medium uppercase text-stone-500">pending cart</p>
                  <h2 className="text-lg font-semibold">待确认购物车</h2>
                </div>
                <CircleDollarSign className="shrink-0 text-emerald-600" size={22} />
              </div>
              <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4" data-testid="purchase-plan">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="relative flex min-h-11 items-center gap-3 text-[17px] font-semibold text-stone-950">
                    <input
                      type="checkbox"
                      checked={planSelected}
                      disabled={!canActOnPlan}
                      onChange={(event) => setPlanSelected(event.target.checked)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      data-testid="plan-selected"
                    />
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-md border text-white",
                        planSelected ? "border-emerald-600 bg-emerald-600" : "border-stone-300 bg-white",
                        !canActOnPlan && "opacity-50",
                      )}
                      aria-hidden="true"
                    >
                      {planSelected ? <Check size={15} /> : null}
                    </span>
                    {purchasePlan.modelName}
                  </label>
                  <span className={cn("rounded-full px-2.5 py-1 text-[16px] font-semibold ring-1", planStatusStyles[purchasePlan.status])}>
                    {purchasePlan.status}
                  </span>
                </div>
                <div className="mt-3 grid gap-3 text-[16px] text-stone-600 sm:grid-cols-3">
                  <p>
                    数量
                    <span className="mt-1 block font-mono font-semibold text-stone-950">{purchasePlan.quantity}</span>
                  </p>
                  <p>
                    预计花费
                    <span className="mt-1 block font-mono font-semibold text-stone-950">${purchasePlan.costUsd.toFixed(2)}</span>
                  </p>
                  <p>
                    来源
                    <span className="mt-1 block font-medium text-stone-950">{purchasePlan.source}</span>
                  </p>
                </div>
                <p className="mt-3 text-[16px] text-stone-500">{purchasePlan.rule}</p>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  className="flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 text-[16px] font-medium text-white disabled:bg-stone-300 disabled:text-stone-500"
                  onClick={handleApprove}
                  disabled={!canApprove}
                  data-testid="approve-plan"
                >
                  <Check size={16} />
                  批准 ${purchasePlan.costUsd.toFixed(2)}
                </button>
                <button
                  className="flex h-11 items-center justify-center gap-2 rounded-md border border-stone-200 text-[16px] font-medium text-stone-700 disabled:bg-stone-100 disabled:text-stone-400"
                  onClick={handleCancel}
                  disabled={!canActOnPlan}
                  data-testid="cancel-plan"
                >
                  <X size={16} />
                  取消计划
                </button>
              </div>
            </Panel>

            <Panel className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[16px] font-medium uppercase text-stone-500">execution quality</p>
                  <h2 className="text-lg font-semibold">策略健康度</h2>
                </div>
                <Gauge className="text-sky-600" size={22} />
              </div>
              <div className="mt-5 h-3 rounded-full bg-stone-100">
                <div className="h-3 rounded-full bg-emerald-500 transition-all" style={{ width: `${strategyScore}%` }} />
              </div>
              <p className="mt-3 text-[16px] text-stone-500" data-testid="strategy-health">
                {strategyScore}% 策略在预算范围内完成或等待确认。
              </p>
              <div className="mt-5 grid gap-3 text-[16px] sm:grid-cols-2">
                <div className="rounded-lg border border-stone-200 p-3">
                  <p className="text-stone-500">AI 状态</p>
                  <p className={cn("mt-1 font-semibold", agentPaused ? "text-rose-700" : "text-emerald-700")}>
                    {agentPaused ? "已暂停" : "运行中"}
                  </p>
                </div>
                <div className="rounded-lg border border-stone-200 p-3">
                  <p className="text-stone-500">付款模式</p>
                  <p className={cn("mt-1 font-semibold", autoPay ? "text-emerald-700" : "text-amber-700")}>
                    {autoPay ? "小额自动" : "逐笔确认"}
                  </p>
                </div>
              </div>
            </Panel>
          </section>

          <Panel id="guide" className="p-5" data-testid="guide-panel">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[16px] font-medium uppercase text-stone-500">onboarding</p>
                <h2 className="text-lg font-semibold">帮助与连接指南</h2>
              </div>
              <a
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-stone-950 px-3 text-[16px] font-medium text-white"
                href="mailto:support@cryptoken.example"
                data-testid="guide-support"
              >
                <Mail size={16} />
                联系支持
              </a>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
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
          </Panel>
        </div>
      </div>
    </main>
  );
}
