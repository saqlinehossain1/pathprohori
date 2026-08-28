import React from 'react';
import { Search, Filter } from 'lucide-react';

export const IncidentFilterBar = ({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
}) => {
  const filterTabs = ['All', 'My Reports', '5km Radius', '20km Radius', 'Verified', 'High Alert'];

  return (
    <div className="bg-white/95 backdrop-blur-xl p-3.5 sm:p-4 rounded-3xl shadow-card border border-slate-200/80 space-y-3 sm:space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          placeholder="Search by area, street light outage, crowd..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 sm:py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition-all placeholder:text-slate-400 font-medium"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x -mx-1 px-1">
        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0 font-display">
          <Filter className="w-3 h-3 text-slate-400" /> Filter:
        </span>
        {filterTabs.map((tab) => {
          const isSelected = activeFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => onFilterChange(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-sm border border-slate-900 ring-2 ring-rose-500/30'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default IncidentFilterBar;
