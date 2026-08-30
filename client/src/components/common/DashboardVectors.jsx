import React from 'react';

/**
 * High-quality, Pathao-inspired 3D Vector Illustrations for PathProhori cards.
 * Designed with multi-stop linear & radial gradients, glossy specular reflections,
 * soft drop shadows, and high visual richness to eliminate card emptiness.
 */

// 1. Vehicle Transit Vector: Bangladeshi Green CNG Auto-Rickshaw + Red Commuter Bike (Signature Pathao / Dhaka transit)
export const VehicleTransitVector = ({ className = "w-28 h-24" }) => (
  <svg viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      {/* Ground Ambient Shadow */}
      <radialGradient id="transitGroundShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#0f172a" stopOpacity="0.28" />
        <stop offset="60%" stopColor="#0f172a" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
      </radialGradient>

      {/* CNG Green Gradients */}
      <linearGradient id="cngBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="50%" stopColor="#059669" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <linearGradient id="cngHoodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#1E293B" />
        <stop offset="70%" stopColor="#0F172A" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
      <linearGradient id="cngGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#BAE6FD" stopOpacity="0.75" />
        <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0.85" />
      </linearGradient>

      {/* Bike Red Gradients */}
      <linearGradient id="bikeRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FB7185" />
        <stop offset="40%" stopColor="#E11D48" />
        <stop offset="100%" stopColor="#9F1239" />
      </linearGradient>
      <linearGradient id="metalChromeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#E2E8F0" />
        <stop offset="50%" stopColor="#94A3B8" />
        <stop offset="100%" stopColor="#CBD5E1" />
      </linearGradient>

      {/* Headlight Glow Filter */}
      <filter id="glowLight" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    {/* Ground Cast Shadows */}
    <ellipse cx="60" cy="118" rx="42" ry="7" fill="url(#transitGroundShadow)" />
    <ellipse cx="118" cy="120" rx="30" ry="6" fill="url(#transitGroundShadow)" />

    {/* === GREEN CNG AUTO RICKSHAW (LEFT / BACKGROUND) === */}
    <g transform="translate(10, 16)">
      {/* Back wheel */}
      <circle cx="24" cy="94" r="13" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
      <circle cx="24" cy="94" r="7" fill="#64748B" />
      <circle cx="24" cy="94" r="3" fill="#CBD5E1" />

      {/* Front wheel */}
      <circle cx="78" cy="94" r="11" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
      <circle cx="78" cy="94" r="6" fill="#64748B" />
      <circle cx="78" cy="94" r="2.5" fill="#CBD5E1" />

      {/* Chassis bottom rail */}
      <path d="M18 90 L82 90 L78 84 L22 84 Z" fill="#0F172A" />

      {/* CNG Cabin Main Body (Vibrant Emerald Dhaka Green) */}
      <path
        d="M14 84 C14 84 14 56 22 46 C26 40 38 34 52 34 L66 34 C72 34 76 42 78 52 L84 72 C85 76 83 84 76 84 L14 84 Z"
        fill="url(#cngBodyGrad)"
      />

      {/* Side Door Cutout / Wire-Mesh Grille Section */}
      <path
        d="M28 50 C28 46 34 42 42 42 L52 42 C56 42 58 46 58 50 L58 76 C58 78 56 80 52 80 L34 80 C30 80 28 78 28 76 Z"
        fill="#047857"
        stroke="#065F46"
        strokeWidth="1.5"
      />
      {/* Classic Dhaka CNG Metal Grid Mesh */}
      <path d="M34 44 L52 78 M42 43 L58 70 M28 60 L48 80 M29 70 L40 80" stroke="#34D399" strokeWidth="0.8" strokeOpacity="0.6" />

      {/* Yellow Safety Stripe (Standard BD CNG stripe) */}
      <path d="M15 72 L82 72 L80 77 L15 77 Z" fill="#FBBF24" />

      {/* Front Windshield */}
      <path
        d="M62 38 L74 46 L78 64 L64 64 Z"
        fill="url(#cngGlassGrad)"
        stroke="#38BDF8"
        strokeWidth="1"
      />
      <path d="M66 42 L72 47 L68 62" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.8" />

      {/* Black Canvas Hood / Top Roof */}
      <path
        d="M20 44 C20 44 26 30 46 28 L68 28 C74 28 80 34 82 40 L64 40 C52 40 30 42 20 44 Z"
        fill="url(#cngHoodGrad)"
      />
      <path d="M22 34 C34 30 54 29 70 30" stroke="#475569" strokeWidth="1" strokeLinecap="round" />

      {/* Front Headlight (Glowing amber/yellow) */}
      <circle cx="84" cy="74" r="4" fill="#FEF08A" filter="url(#glowLight)" />
      <circle cx="84" cy="74" r="2" fill="#FFFFFF" />

      {/* Front Handlebar & Mirror */}
      <path d="M74 54 L80 52" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
      <circle cx="80" cy="51" r="2" fill="#94A3B8" />
    </g>

    {/* === SPORTY RED COMMUTER MOTORBIKE (FOREGROUND / RIGHT) === */}
    <g transform="translate(74, 28)">
      {/* Rear Wheel */}
      <circle cx="22" cy="78" r="14" fill="#0F172A" stroke="#334155" strokeWidth="2.5" />
      <circle cx="22" cy="78" r="8" fill="#475569" />
      <circle cx="22" cy="78" r="3" fill="#E2E8F0" />
      <path d="M22 66 L22 90 M10 78 L34 78" stroke="#94A3B8" strokeWidth="1" />

      {/* Front Wheel */}
      <circle cx="68" cy="78" r="14" fill="#0F172A" stroke="#334155" strokeWidth="2.5" />
      <circle cx="68" cy="78" r="8" fill="#475569" />
      <circle cx="68" cy="78" r="3" fill="#E2E8F0" />
      <path d="M68 66 L68 90 M56 78 L80 78" stroke="#94A3B8" strokeWidth="1" />

      {/* Metallic Exhaust Pipe */}
      <path d="M26 80 L44 76 L52 74" stroke="url(#metalChromeGrad)" strokeWidth="3" strokeLinecap="round" />

      {/* Engine Block & Frame (Charcoal metal) */}
      <path d="M32 74 L48 74 L44 60 L30 62 Z" fill="#1E293B" stroke="#0F172A" strokeWidth="1" />
      <circle cx="38" cy="68" r="4" fill="#475569" />

      {/* Front Telescopic Suspension Fork */}
      <path d="M68 78 L56 46" stroke="url(#metalChromeGrad)" strokeWidth="3" strokeLinecap="round" />
      <path d="M66 68 L58 48" stroke="#0F172A" strokeWidth="1.5" />

      {/* Fuel Tank & Sleek Sporty Body (Pathao Signature Crimson Red) */}
      <path
        d="M20 52 C26 50 32 48 38 48 C44 48 52 42 56 42 C60 42 62 46 60 52 L54 60 C50 63 42 64 34 62 L20 54 Z"
        fill="url(#bikeRedGrad)"
      />
      {/* White Aerodynamic Decal Streak */}
      <path d="M36 50 C44 50 50 46 54 44" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.9" />

      {/* Comfortable Rider Seat */}
      <path d="M16 52 C22 51 32 51 36 53 L34 56 C28 57 20 56 16 52 Z" fill="#0F172A" />

      {/* Sporty Headlight & Cowling */}
      <path d="M58 43 L68 45 L62 52 Z" fill="#E11D48" />
      <polygon points="65,46 72,48 68,51" fill="#FEF08A" filter="url(#glowLight)" />

      {/* Handlebar & Rearview Mirror */}
      <path d="M54 42 L52 35 L48 36" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="48" cy="35" r="2.5" fill="#E11D48" />
      <path d="M56 40 L60 38" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* Speed trails & Motion sparks */}
    <path d="M4 80 L16 80" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 3" />
    <path d="M2 88 L12 88" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6 94 L18 94" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

// 2. Hazard Radar & Heatmap Vector (3D Danger Shield + Radar Pulse + Dhaka Hazard Beacon)
export const HazardRadarVector = ({ className = "w-28 h-24" }) => (
  <svg viewBox="0 0 150 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <radialGradient id="radarPulseGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.4" />
        <stop offset="60%" stopColor="#FB7185" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#F43F5E" stopOpacity="0" />
      </radialGradient>

      <linearGradient id="shieldFrontGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FB7185" />
        <stop offset="50%" stopColor="#E11D48" />
        <stop offset="100%" stopColor="#9F1239" />
      </linearGradient>

      <linearGradient id="shieldBackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="60%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>

      <linearGradient id="radarDishGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#E2E8F0" />
      </linearGradient>

      <filter id="hazardShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#9F1239" floodOpacity="0.25" />
      </filter>
    </defs>

    {/* Ambient radar circular scan rings */}
    <ellipse cx="75" cy="80" rx="60" ry="24" fill="url(#radarPulseGlow)" />
    <ellipse cx="75" cy="80" rx="55" ry="22" stroke="#FDA4AF" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.6" />
    <ellipse cx="75" cy="80" rx="38" ry="15" stroke="#F43F5E" strokeWidth="1.5" strokeOpacity="0.5" />
    <ellipse cx="75" cy="80" rx="20" ry="8" stroke="#E11D48" strokeWidth="2" strokeOpacity="0.7" />

    {/* Radar Sweep Sweep Cone */}
    <path d="M75 80 L130 68 A60 24 0 0 1 125 92 Z" fill="#FB7185" fillOpacity="0.2" />

    {/* 3D Isometric Base Plate / Map Grid */}
    <g transform="translate(15, 45)">
      {/* 3D Road Grid Lines */}
      <path d="M25 45 L60 30 L95 45 L60 60 Z" fill="#FFFFFF" fillOpacity="0.8" stroke="#E2E8F0" strokeWidth="1.5" />
      <path d="M40 38 L75 52 M45 52 L80 38" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 2" />
    </g>

    {/* Floating 3D Warning Beacon / Danger Pin */}
    <g transform="translate(50, 10)" filter="url(#hazardShadow)">
      {/* Back glow */}
      <circle cx="25" cy="30" r="22" fill="#FFE4E6" fillOpacity="0.7" />

      {/* Main 3D Shield */}
      <path
        d="M25 6 C38 6 48 10 48 24 C48 38 34 52 25 58 C16 52 2 38 2 24 C2 10 12 6 25 6 Z"
        fill="url(#shieldFrontGrad)"
      />

      {/* Specular Shield Highlight */}
      <path
        d="M25 9 C35 9 44 13 44 24 C44 33 34 44 25 52 C24 44 22 20 25 9 Z"
        fill="#FFFFFF"
        fillOpacity="0.25"
      />

      {/* Bold Exclamation Mark (High-contrast white) */}
      <path d="M25 18 L25 32" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="25" cy="40" r="2.8" fill="#FFFFFF" />

      {/* Warning Flash Stars */}
      <path d="M48 14 L52 14 M50 12 L50 16" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 18 L6 18 M4 16 L4 20" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* Mini Hazard Pin 1 (Top Left) */}
    <g transform="translate(18, 52)">
      <circle cx="8" cy="8" r="7" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="3" fill="#D97706" />
    </g>

    {/* Mini Hazard Pin 2 (Bottom Right) */}
    <g transform="translate(115, 62)">
      <circle cx="8" cy="8" r="7" fill="#FEE2E2" stroke="#EF4444" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="3" fill="#DC2626" />
    </g>
  </svg>
);

// 3. Satellite Telemetry & Heartbeat Ping Vector (3D GPS Satellite + Live Transmission Wave)
export const SatelliteTelemetryVector = ({ className = "w-28 h-24" }) => (
  <svg viewBox="0 0 150 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="satSolarPanelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="60%" stopColor="#0284C7" />
        <stop offset="100%" stopColor="#0369A1" />
      </linearGradient>

      <linearGradient id="satBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor="#F1F5F9" />
        <stop offset="100%" stopColor="#CBD5E1" />
      </linearGradient>

      <linearGradient id="pingWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
      </linearGradient>

      <filter id="satelliteShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="5" stdDeviation="5" floodColor="#0369A1" floodOpacity="0.25" />
      </filter>
    </defs>

    {/* Heartbeat pulse rings traveling downwards to commuter */}
    <g transform="translate(68, 70)">
      <circle cx="0" cy="0" r="14" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.7" strokeDasharray="3 3" />
      <circle cx="0" cy="8" r="26" stroke="#0284C7" strokeWidth="1.8" strokeOpacity="0.5" />
      <circle cx="0" cy="18" r="42" stroke="#0EA5E9" strokeWidth="1.5" strokeOpacity="0.3" />
      <circle cx="0" cy="28" r="58" stroke="#10B981" strokeWidth="1.2" strokeOpacity="0.2" />

      {/* Target Crosshair */}
      <circle cx="0" cy="38" r="6" fill="#E0F2FE" stroke="#0284C7" strokeWidth="2" />
      <circle cx="0" cy="38" r="2.5" fill="#0284C7" />
    </g>

    {/* 3D Telemetry Satellite (Angled 35 deg) */}
    <g transform="translate(32, 12)" filter="url(#satelliteShadow)">
      {/* Left Solar Array Wing */}
      <g transform="rotate(-20 20 40)">
        <rect x="0" y="28" width="30" height="18" rx="2" fill="url(#satSolarPanelGrad)" stroke="#0369A1" strokeWidth="1" />
        {/* Solar Cell Grid */}
        <line x1="10" y1="28" x2="10" y2="46" stroke="#BAE6FD" strokeWidth="0.8" />
        <line x1="20" y1="28" x2="20" y2="46" stroke="#BAE6FD" strokeWidth="0.8" />
        <line x1="0" y1="37" x2="30" y2="37" stroke="#BAE6FD" strokeWidth="0.8" />
        {/* Connect bar */}
        <rect x="30" y="35" width="8" height="4" fill="#64748B" />
      </g>

      {/* Right Solar Array Wing */}
      <g transform="rotate(-20 70 20)">
        <rect x="58" y="10" width="30" height="18" rx="2" fill="url(#satSolarPanelGrad)" stroke="#0369A1" strokeWidth="1" />
        <line x1="68" y1="10" x2="68" y2="28" stroke="#BAE6FD" strokeWidth="0.8" />
        <line x1="78" y1="10" x2="78" y2="28" stroke="#BAE6FD" strokeWidth="0.8" />
        <line x1="58" y1="19" x2="88" y2="19" stroke="#BAE6FD" strokeWidth="0.8" />
        <rect x="50" y="17" width="8" height="4" fill="#64748B" />
      </g>

      {/* Central Satellite Body (Gold/Titanium Core) */}
      <rect x="36" y="28" width="22" height="26" rx="4" fill="url(#satBodyGrad)" stroke="#94A3B8" strokeWidth="1.5" />
      {/* Specular Glint */}
      <path d="M38 30 L54 30 L52 35 L38 35 Z" fill="#FFFFFF" fillOpacity="0.8" />

      {/* Telemetry Indicator LED */}
      <circle cx="47" cy="40" r="3" fill="#10B981" />
      <circle cx="47" cy="40" r="1.5" fill="#FFFFFF" />

      {/* High-Gain Parabolic Antenna Dish */}
      <ellipse cx="47" cy="56" rx="10" ry="4" fill="#94A3B8" stroke="#64748B" strokeWidth="1" />
      <path d="M47 56 L47 68" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="47" cy="69" r="2.5" fill="#0284C7" />
    </g>

    {/* Live Signal Telemetry Sparkles */}
    <circle cx="120" cy="22" r="2" fill="#38BDF8" />
    <circle cx="18" cy="78" r="2.5" fill="#10B981" />
    <circle cx="132" cy="58" r="1.5" fill="#0284C7" />
  </svg>
);

// 4. Privacy Auto-Purge Vector (3D Digital Vault + 48h Countdown Timer + Cryptographic Shredder)
export const PrivacyVaultVector = ({ className = "w-28 h-24" }) => (
  <svg viewBox="0 0 150 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="vaultBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366F1" />
        <stop offset="50%" stopColor="#4F46E5" />
        <stop offset="100%" stopColor="#3730A3" />
      </linearGradient>

      <linearGradient id="vaultDoorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor="#EEF2FF" />
        <stop offset="100%" stopColor="#C7D2FE" />
      </linearGradient>

      <filter id="vaultShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#3730A3" floodOpacity="0.25" />
      </filter>
    </defs>

    {/* Ground Glow */}
    <ellipse cx="75" cy="112" rx="45" ry="8" fill="#EEF2FF" />

    {/* Floating Data Shredding Particles (GPS coordinates vaporizing after 48h) */}
    <g opacity="0.8">
      <rect x="22" y="32" width="16" height="6" rx="1.5" fill="#C7D2FE" transform="rotate(-15 22 32)" />
      <rect x="18" y="48" width="12" height="5" rx="1" fill="#E0E7FF" transform="rotate(-25 18 48)" />
      <rect x="108" y="28" width="18" height="6" rx="1.5" fill="#C7D2FE" transform="rotate(15 108 28)" />
      <rect x="114" y="44" width="14" height="5" rx="1" fill="#E0E7FF" transform="rotate(20 114 44)" />
    </g>

    {/* 3D Security Vault Container */}
    <g transform="translate(38, 22)" filter="url(#vaultShadow)">
      {/* Shackle Padlock Top */}
      <path
        d="M24 24 V14 C24 6 34 2 44 2 C54 2 64 6 64 14 V24"
        stroke="#818CF8"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Metal Shackle Highlight */}
      <path
        d="M27 18 V14 C27 9 34 5 44 5 C54 5 61 9 61 14 V18"
        stroke="#E0E7FF"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Main Heavy Vault Body */}
      <rect x="10" y="22" width="68" height="64" rx="12" fill="url(#vaultBodyGrad)" stroke="#4338CA" strokeWidth="2" />

      {/* Round Vault Safe Door */}
      <circle cx="44" cy="54" r="23" fill="url(#vaultDoorGrad)" stroke="#818CF8" strokeWidth="2" />
      <circle cx="44" cy="54" r="19" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1.5" strokeDasharray="3 3" />

      {/* Digital Purge Dial Spokes */}
      <circle cx="44" cy="54" r="7" fill="#4F46E5" />
      <circle cx="44" cy="54" r="3" fill="#FFFFFF" />
      <line x1="44" y1="38" x2="44" y2="44" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="44" y1="64" x2="44" y2="70" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="28" y1="54" x2="34" y2="54" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="54" y1="54" x2="60" y2="54" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />

      {/* 48h Lifespan Hologram Badge */}
      <g transform="translate(48, 62)">
        <rect x="0" y="0" width="36" height="18" rx="6" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
        <text x="18" y="12.5" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="sans-serif">
          48h
        </text>
      </g>
    </g>

    {/* Digital Sparkle / Clock Ticks */}
    <circle cx="34" cy="98" r="2" fill="#10B981" />
    <circle cx="118" cy="88" r="2.5" fill="#6366F1" />
    <circle cx="28" cy="74" r="1.5" fill="#818CF8" />
  </svg>
);

// 5. Voice SOS & Duress Vector (3D Smart Mic + Sound Waves + Stealth Audio Shield)
export const VoiceDuressVector = ({ className = "w-28 h-24" }) => (
  <svg viewBox="0 0 150 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="micBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="50%" stopColor="#0284C7" />
        <stop offset="100%" stopColor="#0369A1" />
      </linearGradient>
      <linearGradient id="micHeadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="60%" stopColor="#E2E8F0" />
        <stop offset="100%" stopColor="#94A3B8" />
      </linearGradient>
      <filter id="micShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0284C7" floodOpacity="0.28" />
      </filter>
    </defs>

    {/* Sound Wave Pulses (Left & Right acoustic arcs) */}
    <g transform="translate(75, 52)">
      {/* Right Waves */}
      <path d="M22 -20 C34 -10 34 10 22 20" stroke="#0284C7" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.9" />
      <path d="M34 -30 C52 -15 52 15 34 30" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.7" />
      <path d="M46 -40 C70 -20 70 20 46 40" stroke="#7DD3FC" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" strokeDasharray="3 3" />

      {/* Left Waves */}
      <path d="M-22 -20 C-34 -10 -34 10 -22 20" stroke="#0284C7" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.9" />
      <path d="M-34 -30 C-52 -15 -52 15 -34 30" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.7" />
      <path d="M-46 -40 C-70 -20 -70 20 -46 40" stroke="#7DD3FC" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" strokeDasharray="3 3" />
    </g>

    {/* 3D Smart Voice Microphone */}
    <g transform="translate(60, 16)" filter="url(#micShadow)">
      {/* Mic Capsule Dome */}
      <rect x="4" y="8" width="22" height="38" rx="11" fill="url(#micHeadGrad)" stroke="#64748B" strokeWidth="1.5" />

      {/* Capsule Mesh Grid */}
      <path d="M4 22 H26 M4 30 H26" stroke="#94A3B8" strokeWidth="1" />
      <path d="M10 8 V40 M20 8 V40" stroke="#94A3B8" strokeWidth="1" />

      {/* Specular Highlight */}
      <path d="M7 14 C7 11 11 10 15 10" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

      {/* Mic Body Frame */}
      <path d="M0 24 C0 42 30 42 30 24" stroke="#0284C7" strokeWidth="3.5" strokeLinecap="round" fill="none" />

      {/* Stand Neck & Heavy Round Base */}
      <path d="M15 42 L15 58" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="15" cy="62" rx="16" ry="5" fill="url(#micBodyGrad)" stroke="#0369A1" strokeWidth="1.5" />
      <ellipse cx="15" cy="61" rx="10" ry="2.5" fill="#38BDF8" />

      {/* Active Listening Indicator LED */}
      <circle cx="15" cy="27" r="2.5" fill="#EF4444" />
      <circle cx="15" cy="27" r="1" fill="#FFFFFF" />
    </g>

    {/* Duress Shield Badge (Secret Emergency Lock) */}
    <g transform="translate(90, 68)">
      <circle cx="14" cy="14" r="14" fill="#E11D48" stroke="#FFFFFF" strokeWidth="2" />
      {/* Keyhole / Pin symbol */}
      <circle cx="14" cy="11" r="3" fill="#FFFFFF" />
      <polygon points="12,13 16,13 15,19 13,19" fill="#FFFFFF" />
    </g>
  </svg>
);

// 6. Guardian Protocol & Live Sync Vector (Family Guardian Shield + Sync Radios)
export const GuardianShieldVector = ({ className = "w-28 h-24" }) => (
  <svg viewBox="0 0 150 130" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="guardianShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="50%" stopColor="#059669" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>

      <linearGradient id="guardianPhoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#E2E8F0" />
      </linearGradient>

      <filter id="guardianShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#047857" floodOpacity="0.25" />
      </filter>
    </defs>

    {/* Ambient guardian pulse halo */}
    <circle cx="75" cy="65" r="46" fill="#ECFDF5" fillOpacity="0.7" />
    <circle cx="75" cy="65" r="54" stroke="#A7F3D0" strokeWidth="1.5" strokeDasharray="4 4" />

    {/* Central Guardian Shield */}
    <g transform="translate(45, 18)" filter="url(#guardianShadow)">
      <path
        d="M30 4 C46 4 58 10 58 26 C58 44 42 60 30 68 C18 60 2 44 2 26 C2 10 14 4 30 4 Z"
        fill="url(#guardianShieldGrad)"
      />

      {/* Specular Highlight */}
      <path
        d="M30 8 C42 8 52 13 52 26 C52 38 40 50 30 58 C28 46 26 22 30 8 Z"
        fill="#FFFFFF"
        fillOpacity="0.2"
      />

      {/* Two Guardian Commuter Avatars Inside Shield */}
      {/* Commuter 1 (Main) */}
      <circle cx="25" cy="28" r="7" fill="#FFFFFF" />
      <path d="M14 48 C14 40 19 37 25 37 C31 37 36 40 36 48 Z" fill="#FFFFFF" />

      {/* Commuter 2 (Guardian Connected) */}
      <circle cx="38" cy="30" r="5.5" fill="#D1FAE5" />
      <path d="M30 48 C30 42 34 39 39 39 C44 39 48 42 48 48 Z" fill="#D1FAE5" />

      {/* Live Checkmark of Protection */}
      <circle cx="30" cy="56" r="8" fill="#FFFFFF" stroke="#059669" strokeWidth="1.5" />
      <path d="M26 56 L29 59 L34 53" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>

    {/* Synchronized Guardian Phone Badges (Left & Right) */}
    <g transform="translate(18, 54)">
      <rect x="0" y="0" width="20" height="34" rx="4" fill="url(#guardianPhoneGrad)" stroke="#94A3B8" strokeWidth="1.2" />
      <rect x="2" y="4" width="16" height="22" rx="2" fill="#0F172A" />
      {/* Green Signal LED */}
      <circle cx="10" cy="15" r="2.5" fill="#10B981" />
      <circle cx="10" cy="30" r="1.5" fill="#94A3B8" />
    </g>

    <g transform="translate(112, 54)">
      <rect x="0" y="0" width="20" height="34" rx="4" fill="url(#guardianPhoneGrad)" stroke="#94A3B8" strokeWidth="1.2" />
      <rect x="2" y="4" width="16" height="22" rx="2" fill="#0F172A" />
      {/* Red Alert Sync LED */}
      <circle cx="10" cy="15" r="2.5" fill="#E11D48" />
      <circle cx="10" cy="30" r="1.5" fill="#94A3B8" />
    </g>

    {/* Connecting Radio Sync Wave */}
    <path d="M38 70 C44 64 50 64 54 68" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
    <path d="M96 68 C100 64 106 64 112 70" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
