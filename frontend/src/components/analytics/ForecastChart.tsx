'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface ForecastDataPoint {
  date: string;
  actual?: number;
  predicted?: number;
  lower?: number;
  upper?: number;
}

export interface ForecastChartProps {
  data: ForecastDataPoint[];
  title?: string;
  height?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const CustomForecastTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-xl backdrop-blur-md space-y-1">
        <p className="text-xs font-bold text-slate-300 mb-1">{label}</p>
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 text-xs">
            <span style={{ color: item.color }} className="font-semibold">
              {item.name}:
            </span>
            <span className="font-mono font-bold text-white">
              {item.value !== undefined && item.value !== null ? item.value : '—'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const ForecastChart: React.FC<ForecastChartProps> = ({
  data,
  title = 'AI Meal Demand Forecasting',
  height = 320,
}) => {
  return (
    <div className="w-full p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-glass">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-base font-bold text-white tracking-tight">{title}</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Historical kitchen demand vs scikit-learn forecasted orders
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
          7-Day Horizon
        </span>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
            <XAxis
              dataKey="date"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <Tooltip content={<CustomForecastTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
            />

            {/* Confidence bound shading if provided */}
            <Area
              type="monotone"
              dataKey="upper"
              name="Confidence Bound"
              stroke="transparent"
              fill="url(#confidenceFill)"
            />

            {/* Solid line for actual past demand */}
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual Demand"
              stroke="#6366F1"
              strokeWidth={3}
              dot={{ r: 4, fill: '#6366F1' }}
              activeDot={{ r: 6 }}
            />

            {/* Dashed line for predicted future demand */}
            <Line
              type="monotone"
              dataKey="predicted"
              name="AI Predicted"
              stroke="#F59E0B"
              strokeWidth={2.5}
              strokeDasharray="5 5"
              dot={{ r: 4, fill: '#F59E0B' }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ForecastChart;
