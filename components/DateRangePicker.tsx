import React from 'react';
import { Calendar, RefreshCw, ChevronRight } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  preset: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onPresetChange: (preset: string) => void;
  totalCount: number;
  filteredCount: number;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  preset,
  onStartDateChange,
  onEndDateChange,
  onPresetChange,
  totalCount,
  filteredCount
}) => {
  const handlePresetClick = (selectedPreset: string) => {
    onPresetChange(selectedPreset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (selectedPreset === 'all') {
      onStartDateChange('');
      onEndDateChange('');
    } else if (selectedPreset === 'today') {
      onStartDateChange(todayStr);
      onEndDateChange(todayStr);
    } else if (selectedPreset === '7days') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      onStartDateChange(past.toISOString().split('T')[0]);
      onEndDateChange(todayStr);
    } else if (selectedPreset === '30days') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      onStartDateChange(past.toISOString().split('T')[0]);
      onEndDateChange(todayStr);
    } else if (selectedPreset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      onStartDateChange(firstDay.toISOString().split('T')[0]);
      onEndDateChange(todayStr);
    }
  };

  const hasActiveFilters = startDate !== '' || endDate !== '';

  const handleReset = () => {
    onPresetChange('all');
    onStartDateChange('');
    onEndDateChange('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-3xs hover:shadow-2xs transition-all duration-300 space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-50 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-xl">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Date Timeframe Filter</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Filter clips and charts to specific meeting date windows</p>
          </div>
        </div>

        {/* Counter Badge & Reset trigger */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="group text-[10px] text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-1.5 rounded-xl border border-rose-100 dark:border-rose-900/40 font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
              Reset Dates
            </button>
          )}
          <span className="text-[10px] font-extrabold bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-xl">
            Showing {filteredCount} of {totalCount} clips
          </span>
        </div>
      </div>

      {/* Preset Buttons & Custom Calendar Selectors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Preset Column */}
        <div className="lg:col-span-7 flex flex-wrap gap-1.5">
          {['all', 'today', '7days', '30days', 'this_month'].map((p) => {
            const labels: Record<string, string> = {
              all: 'All Time',
              today: 'Today',
              '7days': 'Last 7 Days',
              '30days': 'Last 30 Days',
              this_month: 'This Month'
            };
            const isSelected = preset === p;
            return (
              <button
                key={p}
                onClick={() => handlePresetClick(p)}
                type="button"
                className={`px-3 py-1.5 text-[10px] font-extrabold rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-500 dark:border-indigo-500 dark:text-slate-950 shadow-sm'
                    : 'bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {/* Custom Input Column */}
        <div className="lg:col-span-5 flex items-center gap-2">
          {/* Start Date */}
          <div className="flex-1 relative">
            <span className="absolute -top-2 left-2 px-1 text-[8.5px] font-black text-indigo-500 dark:text-indigo-400 bg-white dark:bg-slate-900 leading-none">START</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                onStartDateChange(e.target.value);
                onPresetChange('custom');
              }}
              className="block w-full text-[10px] font-extrabold px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200"
            />
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />

          {/* End Date */}
          <div className="flex-1 relative">
            <span className="absolute -top-2 left-2 px-1 text-[8.5px] font-black text-indigo-500 dark:text-indigo-400 bg-white dark:bg-slate-900 leading-none">END</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                onEndDateChange(e.target.value);
                onPresetChange('custom');
              }}
              className="block w-full text-[10px] font-extrabold px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
