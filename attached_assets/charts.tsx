
import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChartDataPoint } from '../types'; // Assuming types.ts is in the parent directory

interface KpiTrendChartProps {
  data: ChartDataPoint[];
  kpiName: string;
}

export const KpiTrendChart: React.FC<KpiTrendChartProps> = ({ data, kpiName }) => {
  if (!data || data.length === 0) {
    return <p className="text-slate-500 text-center py-4">No data available for {kpiName} chart.</p>;
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="periodId" tick={{ fontSize: 12, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
          <RechartsTooltip
            contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
          />
          <Legend wrapperStyle={{ fontSize: 14 }} />
          <Line type="monotone" dataKey="actualValue" name="Actual" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="targetValue" name="Target" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

interface KpiStatusGaugeProps {
  value: number; // Percentage value (0-100)
  target: number;
  title: string;
}

export const KpiStatusGauge: React.FC<KpiStatusGaugeProps> = ({ value, target, title }) => {
  const percentage = Math.min(Math.max(value, 0), 100); // Cap between 0 and 100

  let color = 'fill-status-red-text'; // Default red
  if (percentage >= 95) {
    color = 'fill-status-green-text';
  } else if (percentage >= 70) {
    color = 'fill-status-yellow-text';
  }
  
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-2">
      <h4 className="text-sm font-medium text-slate-600 mb-2 text-center h-10">{title}</h4>
      <div className="relative w-32 h-32">
        <svg className="w-full h-full" viewBox="0 0 150 150">
          {/* Background circle */}
          <circle
            className="text-slate-200"
            strokeWidth="12"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="75"
            cy="75"
          />
          {/* Progress circle */}
          <circle
            className={color}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="75"
            cy="75"
            transform="rotate(-90 75 75)"
          />
          {/* Text in center */}
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className={`text-2xl font-semibold ${color.replace('fill-','text-')}`}>
            {`${percentage.toFixed(0)}%`}
          </text>
        </svg>
      </div>
      <p className="text-xs text-slate-500 mt-2">Target: {target}%</p>
    </div>
  );
};

interface KpiComparisonBarChartProps {
  data: { name: string; actual: number | null; target: number | null }[];
  title: string;
}

export const KpiComparisonBarChart: React.FC<KpiComparisonBarChartProps> = ({ data, title }) => {
  if (!data || data.length === 0) {
    return <p className="text-slate-500 text-center py-4">No data available for {title} chart.</p>;
  }

  return (
    <div className="h-80 w-full">
      <h4 className="text-md font-semibold text-slate-700 mb-2 text-center">{title}</h4>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={100} interval={0} />
          <RechartsTooltip 
            contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="actual" name="Actual" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={15} />
          <Bar dataKey="target" name="Target" fill="#10b981" radius={[0, 4, 4, 0]} barSize={15} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
