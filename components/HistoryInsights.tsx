import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell 
} from 'recharts';
import { Clock, BarChart2, Folder, Calendar, Award, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { Recording, Folder as FolderType } from '../types';

interface HistoryInsightsProps {
  recordings: Recording[];
  folders: FolderType[];
}

const colorMap: Record<string, string> = {
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  sky: '#0ea5e9',
  violet: '#8b5cf6',
};

export const HistoryInsights: React.FC<HistoryInsightsProps> = ({ recordings, folders }) => {
  // 1. Calculate General Statistics
  const totalClips = recordings.length;
  
  const totalDurationSeconds = recordings.reduce((sum, r) => sum + r.duration, 0);
  const totalDurationHours = Math.round((totalDurationSeconds / 3600) * 10) / 10;
  const totalDurationMinutes = Math.round(totalDurationSeconds / 60);

  const averageDurationMinutes = totalClips > 0 
    ? Math.round((totalDurationSeconds / totalClips) / 60) 
    : 0;

  // 2. Aggregate Data for Folder Bar Chart
  const chartData = folders.map(folder => {
    const folderRecordings = recordings.filter(r => r.folderId === folder.id);
    const seconds = folderRecordings.reduce((sum, r) => sum + r.duration, 0);
    const minutes = Math.round((seconds / 60) * 10) / 10;
    const colorKey = folder.color || 'indigo';
    return {
      id: folder.id,
      name: folder.name,
      minutes,
      count: folderRecordings.length,
      fillColor: colorMap[colorKey] || colorMap.indigo
    };
  });

  // Include uncategorized
  const uncategorizedRecordings = recordings.filter(r => !r.folderId);
  const uncategorizedSeconds = uncategorizedRecordings.reduce((sum, r) => sum + r.duration, 0);
  const uncategorizedMinutes = Math.round((uncategorizedSeconds / 60) * 10) / 10;
  chartData.push({
    id: 'uncategorized',
    name: 'Uncategorized',
    minutes: uncategorizedMinutes,
    count: uncategorizedRecordings.length,
    fillColor: '#94a3b8'
  });

  // Find Top Category
  const sortedByTime = [...chartData].sort((a, b) => b.minutes - a.minutes);
  const topCategoryItem = totalClips > 0 && sortedByTime[0]?.minutes > 0 ? sortedByTime[0] : null;

  // 3. Aggregate Duration Trend Data over the chronologically sorted daily meetings
  const trendData = React.useMemo(() => {
    const dailyMap: Record<string, { dateStr: string; minutes: number; count: number; rawDate: Date }> = {};
    
    recordings.forEach(rec => {
      if (!rec.timestamp) return;
      const date = new Date(rec.timestamp);
      const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const minutes = Math.round((rec.duration / 60) * 10) / 10;
      
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].minutes = Math.round((dailyMap[dateKey].minutes + minutes) * 10) / 10;
        dailyMap[dateKey].count += 1;
      } else {
        dailyMap[dateKey] = {
          dateStr: dateKey,
          minutes,
          count: 1,
          rawDate: new Date(date.getFullYear(), date.getMonth(), date.getDate())
        };
      }
    });

    return Object.values(dailyMap).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
  }, [recordings]);

  // Formatting helper for duration on charts
  const formatYAxis = (value: number) => {
    return `${value}m`;
  };

  return (
    <motion.div 
      layout 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-6" 
      id="insights-section"
    >
      {/* KPI Stats Grid */}
      <motion.div layout className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* KPI 1: Total Duration */}
        <motion.div 
          layout 
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: 0.02 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-3xs hover:shadow-2xs transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Time</span>
            <div className="p-1 px-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-xl font-extrabold text-slate-950 dark:text-white leading-none">
              {totalDurationMinutes >= 60 ? `${totalDurationHours} hrs` : `${totalDurationMinutes} mins`}
            </h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Across filtered recordings</p>
          </div>
        </motion.div>

        {/* KPI 2: Total Recorded Clips */}
        <motion.div 
          layout 
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: 0.04 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-3xs hover:shadow-2xs transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Clips</span>
            <div className="p-1 px-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 dark:text-emerald-400">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-xl font-extrabold text-slate-950 dark:text-white leading-none">
              {totalClips} {totalClips === 1 ? 'Clip' : 'Clips'}
            </h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Found in active timeframe</p>
          </div>
        </motion.div>

        {/* KPI 3: Average Duration */}
        <motion.div 
          layout 
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: 0.06 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-3xs hover:shadow-2xs transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Avg Length</span>
            <div className="p-1 px-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-500 dark:text-sky-400">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-xl font-extrabold text-slate-950 dark:text-white leading-none">
              {averageDurationMinutes} mins
            </h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Per meeting on average</p>
          </div>
        </motion.div>

        {/* KPI 4: Top Category */}
        <motion.div 
          layout 
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: 0.08 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-3xs hover:shadow-2xs transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Top Focus</span>
            <div className="p-1 px-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-xl font-extrabold text-slate-950 dark:text-white leading-none truncate max-w-full">
              {topCategoryItem ? topCategoryItem.name : 'None yet'}
            </h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
              {topCategoryItem ? `${topCategoryItem.minutes} mins spent` : 'Assign categories to compare'}
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Charts section: side-by-side or stacked fallback */}
      {totalDurationSeconds === 0 ? (
        <motion.div 
          layout
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-3xs"
        >
          <div className="h-[280px] flex flex-col items-center justify-center text-center py-10">
            <Folder className="w-8 h-8 text-slate-300 dark:text-slate-755 mb-2.5" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300">No Duration Data</h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-[240px]">
              No active folder assignments within this timeframe. Try adjusting your date picker filters.
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Category Chart Card */}
          <motion.div 
            layout
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.12 }}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-3xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2.5 mb-6">
                <div className="p-2 bg-fs-primary/10 rounded-xl text-fs-primary">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Time Spent Per Meeting Folder</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Cumulative minutes of discussion recorded</p>
                </div>
              </div>

              <div className="h-[280px] text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    key={`barchart-${totalClips}-${totalDurationSeconds}`}
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      vertical={false} 
                      stroke="rgba(148, 163, 184, 0.12)" 
                    />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    />
                    <YAxis 
                      tickFormatter={formatYAxis}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(148, 163, 184, 0.05)', radius: 8 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl shadow-xl text-slate-200 text-[10px] space-y-1 font-sans">
                              <p className="font-bold border-b border-slate-800 pb-1 text-white">{data.name}</p>
                              <p className="flex justify-between gap-5 text-slate-400">
                                <span>Total Time:</span> 
                                <span className="font-extrabold text-emerald-400">{data.minutes} mins</span>
                              </p>
                              <p className="flex justify-between gap-5 text-slate-400">
                                <span>Meetings:</span> 
                                <span className="font-bold text-slate-200">{data.count}</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="minutes" 
                      radius={[8, 8, 0, 0]} 
                      maxBarSize={45}
                      isAnimationActive={true}
                      animationDuration={400}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fillColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          {/* Chronological Duration Trend Card */}
          <motion.div 
            layout
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.18 }}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-3xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2.5 mb-6">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Recording Duration Trend</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Chronological meeting length patterns</p>
                </div>
              </div>

              <div className="h-[280px] text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    key={`linechart-${totalClips}-${totalDurationSeconds}`}
                    data={trendData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      vertical={false} 
                      stroke="rgba(148, 163, 184, 0.12)" 
                    />
                    <XAxis 
                      dataKey="dateStr" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    />
                    <YAxis 
                      tickFormatter={formatYAxis}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    />
                    <Tooltip 
                      cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '2 2' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl shadow-xl text-slate-200 text-[10px] space-y-1 font-sans">
                              <p className="font-bold border-b border-slate-800 pb-1 text-white">{data.dateStr}</p>
                              <p className="flex justify-between gap-5 text-slate-400">
                                <span>Total Time:</span> 
                                <span className="font-extrabold text-indigo-400">{data.minutes} mins</span>
                              </p>
                              <p className="flex justify-between gap-5 text-slate-400">
                                <span>Meetings:</span> 
                                <span className="font-bold text-slate-200">{data.count}</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="minutes" 
                      stroke="#6366f1" 
                      strokeWidth={2.5}
                      dot={{ r: 4.5, strokeWidth: 1.5, stroke: '#6366f1', fill: '#ffffff' }}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
                      isAnimationActive={true}
                      animationDuration={500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
