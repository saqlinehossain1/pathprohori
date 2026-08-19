import React from 'react';
import Marquee from '../ui/Marquee';
import { ShieldCheck, MapPin, UserCheck, Star, Activity, AlertTriangle } from 'lucide-react';

const reviews = [
  {
    name: 'Md Saqline Hossain',
    username: '@saqline_commuter',
    body: 'The live danger feed accurately warned me about dark alley lighting near Gulshan. Incredible safety app!',
    img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    type: 'Commuter Review',
  },
  {
    name: 'Badrunnaher Pantho',
    username: '@pantho_guardian',
    body: 'Receiving live 15-second heartbeat pings when my sister travels late at night gives me total peace of mind.',
    img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    type: 'Guardian Shield',
  },
  {
    name: 'Mehedi Hasan Shovon',
    username: '@shovon_operator',
    body: 'Automatic 48-hour privacy purge ensures user GPS coordinates are never stored permanently. Enterprise safety standards.',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    type: 'Privacy Tech',
  },
  {
    name: 'Jamshedul Alam Khan',
    username: '@hridoy_admin',
    body: 'Hyperlocal community danger reporting helps commuters avoid hazardous stretches across Dhaka in real-time.',
    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    type: 'Community Alert',
  },
  {
    name: 'Nusrat Jahan',
    username: '@nusrat_student',
    body: 'Voice trigger duress mode works seamlessly! Saying the secret emergency phrase instantly alerts assigned guardians.',
    img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
    type: 'Voice Safety',
  },
  {
    name: 'Tanvir Ahmed',
    username: '@tanvir_rider',
    body: 'Log Journey feature lets me track CNG & Rickshaw rides live with full GPS trail export. Highly recommended!',
    img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    type: 'Transit Log',
  },
];

const firstRow = reviews.slice(0, 3);
const secondRow = reviews.slice(3);

const ReviewCard = ({ img, name, username, body, type }) => {
  return (
    <figure className="relative w-80 cursor-pointer overflow-hidden rounded-3xl border border-slate-200/80 p-4 bg-white/95 backdrop-blur-xl shadow-card hover:shadow-glass hover:-translate-y-1 transition-all duration-300">
      <div className="flex flex-row items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
        <div className="flex items-center gap-2.5">
          <img className="rounded-full object-cover w-9 h-9 border border-slate-800" alt={name} src={img} />
          <div className="flex flex-col">
            <figcaption className="text-xs font-extrabold text-slate-900 leading-tight font-display">{name}</figcaption>
            <p className="text-[10px] font-semibold text-slate-400">{username}</p>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-900 text-white border border-slate-800 font-display shadow-xs">
          {type}
        </span>
      </div>
      <blockquote className="text-xs text-slate-600 font-medium leading-relaxed">{body}</blockquote>
    </figure>
  );
};

export const LiveCommunityMarquee = () => {
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 font-display">
            <ShieldCheck className="w-5 h-5 text-rose-600" />
            Live Safety Stream & Commuter Testimonials
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Real-time crowdsourced community feedback & safety heartbeat pings.
          </p>
        </div>

        <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Community Verified Active
        </span>
      </div>

      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4 border border-slate-200/80 shadow-card">
        <Marquee pauseOnHover className="[--duration:30s]">
          {firstRow.map((review) => (
            <ReviewCard key={review.username} {...review} />
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover className="[--duration:30s] mt-2">
          {secondRow.map((review) => (
            <ReviewCard key={review.username} {...review} />
          ))}
        </Marquee>

        {/* Gradient edge masks for smooth fade-in/out */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-gradient-to-r from-slate-50 to-transparent"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-gradient-to-l from-slate-50 to-transparent"></div>
      </div>
    </div>
  );
};

export default LiveCommunityMarquee;
