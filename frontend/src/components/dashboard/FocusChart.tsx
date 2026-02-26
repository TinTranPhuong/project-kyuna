import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, YAxis, Cell } from 'recharts';

interface FocusChartProps {
  dailyData?: { day: string; minutes: number }[];
}

// Fallback data if none provided by the parent
const defaultData = [
  { day: 'Mon', minutes: 45 },
  { day: 'Tue', minutes: 120 },
  { day: 'Wed', minutes: 90 },
  { day: 'Thu', minutes: 60 },
  { day: 'Fri', minutes: 150 },
  { day: 'Sat', minutes: 30 },
  { day: 'Sun', minutes: 0 },
];

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-800 border border-white/10 px-3 py-2 rounded-lg shadow-xl backdrop-blur-md">
        <p className="text-sm font-bold text-white">{payload[0].value} minutes</p>
      </div>
    );
  }
  return null;
};

export const FocusChart = ({ dailyData = defaultData }: FocusChartProps) => {
  return (
    <div className="w-full h-[200px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dailyData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <XAxis 
            dataKey="day" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#ffffff80', fontSize: 12 }} 
            dy={10}
          />
          <YAxis hide domain={[0, 'dataMax + 20']} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
            {dailyData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.minutes > 0 ? '#14b8a6' : '#ffffff10'} 
                className="transition-all duration-300 hover:opacity-80"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};