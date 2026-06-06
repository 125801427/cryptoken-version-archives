"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { priceSeries } from "@/lib/mock-data";

type ChartSize = {
  width: number;
  height: number;
};

type TokenRange = "1H" | "24H" | "7D";

const tokenSeriesByRange: Record<TokenRange, typeof priceSeries> = {
  "1H": priceSeries,
  "24H": [
    { time: "00:00", gpt55: 5, gpt: 0.75, deepseek: 0.435, claude: 3, gemini: 1.5, walletLimit: 842.2 },
    { time: "04:00", gpt55: 5, gpt: 0.75, deepseek: 0.435, claude: 3, gemini: 1.5, walletLimit: 841.2 },
    { time: "08:00", gpt55: 5, gpt: 0.75, deepseek: 0.435, claude: 3, gemini: 1.5, walletLimit: 840.4 },
    { time: "12:00", gpt55: 5, gpt: 0.75, deepseek: 0.435, claude: 3, gemini: 1.5, walletLimit: 838.4 },
    { time: "16:00", gpt55: 5, gpt: 0.75, deepseek: 0.435, claude: 3, gemini: 1.5, walletLimit: 836.1 },
    { time: "20:00", gpt55: 5, gpt: 0.75, deepseek: 0.435, claude: 3, gemini: 1.5, walletLimit: 835.4 },
    { time: "24:00", gpt55: 5, gpt: 0.75, deepseek: 0.435, claude: 3, gemini: 1.5, walletLimit: 835.1 },
  ],
  "7D": [
    { time: "Mon", gpt55: 5, gpt: 0.75, deepseek: 0.435, claude: 3, gemini: 1.5, walletLimit: 858.4 },
    { time: "Tue", gpt55: 5, gpt: 0.75, deepseek: 0.435, claude: 3, gemini: 1.5, walletLimit: 852.1 },
    { time: "Wed", gpt55: 5, gpt: 0.75, deepseek: 0.435, claude: 3, gemini: 1.5, walletLimit: 848.7 },
    { time: "Thu", gpt55: 5, gpt: 0.75, deepseek: 0.435, claude: 3, gemini: 1.5, walletLimit: 844.6 },
    { time: "Fri", gpt55: 5, gpt: 0.75, deepseek: 0.435, claude: 3, gemini: 1.5, walletLimit: 840.2 },
    { time: "Sat", gpt55: 5, gpt: 0.75, deepseek: 0.435, claude: 3, gemini: 1.5, walletLimit: 837.8 },
    { time: "Sun", gpt55: 5, gpt: 0.75, deepseek: 0.435, claude: 3, gemini: 1.5, walletLimit: 835.1 },
  ],
};

function useChartSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ChartSize | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

export function TokenPriceChart({ range = "1H" }: { range?: TokenRange }) {
  const { ref, size } = useChartSize();
  const data = useMemo(() => tokenSeriesByRange[range], [range]);

  return (
    <div ref={ref} className="h-full w-full">
      {size ? (
      <LineChart width={size.width} height={size.height} data={data} margin={{ left: 8, right: 14, top: 12, bottom: 6 }}>
        <CartesianGrid stroke="#e7e5e4" vertical={false} />
        <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "#78716c", fontSize: 16 }} />
        <YAxis
          domain={[0, "auto"]}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#78716c", fontSize: 16 }}
          tickFormatter={(value) => `$${Number(value).toFixed(1)}`}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(3)} / 1M input tokens`, ""]}
          contentStyle={{
            borderRadius: 8,
            borderColor: "#e7e5e4",
            boxShadow: "0 18px 45px rgba(28,25,23,.12)",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 16, paddingTop: 8 }} />
        <Line type="monotone" dataKey="gpt55" name="GPT-5.5" stroke="#6366f1" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="claude" name="Claude Sonnet 4.6" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="gpt" name="GPT-5.4 mini" stroke="#0ea5e9" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="deepseek" name="DeepSeek V4 Pro" stroke="#10b981" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="gemini" name="Gemini 3.5 Flash" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
      </LineChart>
      ) : null}
    </div>
  );
}

export function WalletBalanceChart() {
  const { ref, size } = useChartSize();

  return (
    <div ref={ref} className="h-full w-full">
      {size ? (
      <LineChart width={size.width} height={size.height} data={priceSeries}>
        <Line type="monotone" dataKey="walletLimit" stroke="#f59e0b" strokeWidth={2} dot={false} />
      </LineChart>
      ) : null}
    </div>
  );
}
