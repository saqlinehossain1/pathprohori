import React from 'react';
import { Search, Filter } from 'lucide-react';

export const IncidentFilterBar = ({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
}) => {
  const filterTabs = ['All', '5km Radius', '20km Radius', 'Verified', 'High Alert'];

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-3xl shadow-card border border-[#EFEAEF] space-y-3 sm:space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 text-[#8C7A87] absolute left-4 top-3.5" />
        <input
          type="text"
          placeholder="Search by area, street light outage, crowd..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 sm:py-3 rounded-2xl bg-[#F9F8FA] border border-[#E0D5DC] text-xs font-semibold text-[#2D2329] focus:outline-none focus:ring-2 focus:ring-[#6B4355]"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x -mx-1 px-1">
        <span className="text-[10px] font-extrabold text-[#8C7A87] uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
          <Filter className="w-3 h-3" /> Filter:
        </span>
        {filterTabs.map((tab) => {
          const isSelected = activeFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => onFilterChange(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                isSelected
                  ? 'bg-[#6B4355] text-white shadow-sm'
                  : 'bg-[#F9F8FA] text-[#6B4355] border border-[#E0D5DC] hover:bg-[#FDF7F9]'
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
