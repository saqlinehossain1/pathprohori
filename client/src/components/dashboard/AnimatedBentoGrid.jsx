import React from 'react';
import { BentoGrid, BentoCard } from '../ui/BentoGrid';
import { ShieldAlert, Mic, Activity, Trash2, Lock, ShieldCheck } from 'lucide-react';
import Marquee from '../ui/Marquee';

const marqueeHazardItems = [
  { text: 'Broken Streetlight near Green Valley Gate', severity: 'High' },
  { text: 'CNG Driver Deviation Alert on Airport Road', severity: 'Med' },
  { text: 'Sidewalk Construction near Central Park', severity: 'Low' },
  { text: 'Unlit Alleyway reported near Mohakhali Flyover', severity: 'High' },
];

export const AnimatedBentoGrid = () => {
  const bentoItems = [
    {
      Icon: ShieldAlert,
      name: 'Live Hyperlocal Danger Feed',
      description:
        'Module 1 crowdsourced community danger warnings, heatmaps, and interactive Leaflet map pin reports.',
      href: '/live-danger-feed',
      cta: 'Explore Danger Feed',
      className: 'col-span-3 lg:col-span-2',
      background: (
        <div className="w-full bg-[#FDF7F9] p-3 flex flex-col gap-2 border-b border-[#E0D5DC]/60">
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-extrabold text-[#6B4355] flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded-full border border-[#E0D5DC] shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Community Heatmap Live
            </span>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              Active Radius: 5km
            </span>
          </div>

          <div className="w-full z-10">
            <Marquee pauseOnHover className="[--duration:22s]">
              {marqueeHazardItems.map((item, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 bg-white border border-[#E0D5DC] rounded-xl text-[11px] font-extrabold text-[#6B4355] shadow-xs flex items-center gap-2 whitespace-nowrap"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.severity === 'High'
                        ? 'bg-rose-600 animate-pulse'
                        : item.severity === 'Med'
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}
                  ></span>
                  <span>{item.text}</span>
                </div>
              ))}
            </Marquee>
          </div>
        </div>
      ),
    },
    {
      Icon: Activity,
      name: 'Real-Time Heartbeat Signal',
      description:
        '15-second active socket heartbeat monitor. Triggers automatic guardian alert if signal drops during journey.',
      href: '/log-journey',
      cta: 'View Log Journey',
      className: 'col-span-3 lg:col-span-1',
      background: (
        <div className="w-full bg-[#F0FDF4] p-3 flex flex-col justify-between border-b border-emerald-100 min-h-[5.5rem]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              15s Active Ping Loop
            </span>
          </div>

          {/* EKG / Heartbeat Animated Graphic */}
          <div className="flex items-center justify-center gap-1.5 h-10 opacity-90 mt-1">
            <div className="w-1.5 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
            <div className="w-1.5 h-10 bg-emerald-600 rounded-full animate-pulse [animation-delay:0.4s]"></div>
            <div className="w-1.5 h-4 bg-emerald-500 rounded-full animate-pulse [animation-delay:0.1s]"></div>
            <div className="w-1.5 h-8 bg-emerald-500 rounded-full animate-pulse [animation-delay:0.3s]"></div>
          </div>
        </div>
      ),
    },
    {
      Icon: Mic,
      name: 'Voice Trigger & Duress Mode',
      description:
        'Hands-free speech recognition listens for your secret emergency phrase ("Lavender Moonlight") or silent duress PIN.',
      href: '/voice-settings',
      cta: 'Setup Voice Controls',
      className: 'col-span-3 lg:col-span-1',
      background: (
        <div className="w-full bg-sky-50 p-3 flex flex-col justify-between border-b border-sky-100 min-h-[5.5rem]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-sky-800 bg-white px-2.5 py-0.5 rounded-full border border-sky-200 shadow-xs">
              Phrase: "Lavender Moonlight"
            </span>
          </div>

          {/* Animated Sound Wave Bars */}
          <div className="flex items-center justify-center gap-2 h-10 mt-1">
            <div className="w-1.5 h-4 bg-sky-500 rounded-full animate-bounce"></div>
            <div className="w-1.5 h-8 bg-sky-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
            <div className="w-1.5 h-5 bg-sky-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            <div className="w-1.5 h-10 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.1s]"></div>
            <div className="w-1.5 h-4 bg-sky-500 rounded-full animate-bounce [animation-delay:0.3s]"></div>
          </div>
        </div>
      ),
    },
    {
      Icon: Trash2,
      name: '48-Hour Automatic Privacy Purge',
      description:
        'Module 3 privacy policy automatically deletes historical journey GPS breadcrumbs and raw logs after 48 hours.',
      href: '/profile',
      cta: 'Privacy Settings',
      className: 'col-span-3 lg:col-span-2',
      background: (
        <div className="w-full bg-[#FDF7F9] p-3 flex flex-col gap-2 border-b border-[#E0D5DC]/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#6B4355] bg-white px-2.5 py-0.5 rounded-full border border-[#E0D5DC] shadow-xs flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#6B4355]" />
              Zero Permanent Storage
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Module 3 Auto-Purge Active
            </span>
          </div>

          <div className="flex items-center justify-around p-2 bg-white border border-[#E0D5DC] rounded-xl text-xs font-extrabold text-[#6B4355] shadow-xs">
            <div className="text-center">
              <span className="text-[9px] text-gray-500 block">Step 1</span>
              <span>GPS Broadcast</span>
            </div>
            <span>→</span>
            <div className="text-center">
              <span className="text-[9px] text-gray-500 block">Step 2</span>
              <span>48-hr Holding</span>
            </div>
            <span>→</span>
            <div className="text-center text-rose-600">
              <span className="text-[9px] text-rose-500 block">Step 3</span>
              <span>Auto Deletion</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 py-4">
      <div>
        <h3 className="text-lg font-extrabold text-[#2D2329]">Safety Ecosystem Architecture</h3>
        <p className="text-xs text-[#8C7A87] font-medium">
          Interactive overview of PATHPROHORI core safety modules.
        </p>
      </div>

      <BentoGrid>
        {bentoItems.map((item, idx) => (
          <BentoCard key={idx} {...item} />
        ))}
      </BentoGrid>
    </div>
  );
};

export default AnimatedBentoGrid;
