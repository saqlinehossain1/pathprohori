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
    <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200/90 space-y-2.5">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search safety hazards, road blockages, unlit areas..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 focus:bg-white transition-colors placeholder:text-slate-400 font-normal"
        />
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none touch-pan-x">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
          <Filter className="w-3 h-3 text-slate-400" /> Filter:
        </span>
        {filterTabs.map((tab) => {
          const isSelected = activeFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => onFilterChange(tab)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
