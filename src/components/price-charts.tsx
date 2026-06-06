"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
    { time: "00:00", gpt: 2.5, deepseek: 0.435, btc: 75.1 },
    { time: "04:00", gpt: 2.51, deepseek: 0.436, btc: 75.4 },
    { time: "08:00", gpt: 2.5, deepseek: 0.435, btc: 75.8 },
    { time: "12:00", gpt: 2.5, deepseek: 0.435, btc: 76.2 },
    { time: "16:00", gpt: 2.49, deepseek: 0.434, btc: 75.6 },
    { time: "20:00", gpt: 2.5, deepseek: 0.435, btc: 75.9 },
    { time: "24:00", gpt: 2.5, deepseek: 0.435, btc: 75.8 },
  ],
  "7D": [
    { time: "Mon", gpt: 2.5, deepseek: 0.435, btc: 74.9 },
    { time: "Tue", gpt: 2.5, deepseek: 0.435, btc: 75.2 },
    { time: "Wed", gpt: 2.49, deepseek: 0.434, btc: 75.8 },
    { time: "Thu", gpt: 2.5, deepseek: 0.435, btc: 76.4 },
    { time: "Fri", gpt: 2.51, deepseek: 0.436, btc: 76.1 },
    { time: "Sat", gpt: 2.5, deepseek: 0.435, btc: 75.5 },
    { time: "Sun", gpt: 2.5, deepseek: 0.435, btc: 75.8 },
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
  const data = useMemo(() => {
    const series = tokenSeriesByRange[range];
    const baseline = series[0];

    return series.map((point) => ({
      ...point,
      gptIndex: (point.gpt / baseline.gpt) * 100,
      deepseekIndex: (point.deepseek / baseline.deepseek) * 100,
    }));
  }, [range]);

  return (
    <div ref={ref} className="h-full w-full">
      {size ? (
      <AreaChart width={size.width} height={size.height} data={data} margin={{ left: 8, right: 12, top: 12, bottom: 0 }}>
        <defs>
          <linearGradient id="deepseekFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e7e5e4" vertical={false} />
        <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "#78716c", fontSize: 16 }} />
        <YAxis
          domain={[99.4, 100.5]}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#78716c", fontSize: 16 }}
          tickFormatter={(value) => `${Number(value).toFixed(1)}`}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            borderColor: "#e7e5e4",
            boxShadow: "0 18px 45px rgba(28,25,23,.12)",
          }}
        />
        <Area
          type="monotone"
          dataKey="deepseekIndex"
          name="DeepSeek 指数"
          stroke="#10b981"
          fill="url(#deepseekFill)"
          strokeWidth={2.5}
        />
        <Line type="monotone" dataKey="gptIndex" name="GPT-4o 指数" stroke="#0ea5e9" strokeWidth={2.5} dot={false} />
      </AreaChart>
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
        <Line type="monotone" dataKey="btc" stroke="#f59e0b" strokeWidth={2} dot={false} />
      </LineChart>
      ) : null}
    </div>
  );
}
