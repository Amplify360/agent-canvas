/**
 * CardHero - Symbolic editorial header for strategy cards
 *
 * Each card gets a unique geometric motif + section-colored background + category icon.
 * Visual formula: 20% icon | 50% geometric motif | 30% whitespace
 */

'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';

type PressureType = 'external' | 'internal';

interface CardHeroProps {
  pressureId: string;
  pressureType: PressureType;
  iconName: string;
}

/* ── Motif Components ─────────────────────────────────── */

/** Market Consolidation — converging blocks (acquisition pressure) */
function CompressionMotif({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 100" fill="none">
      <rect x="90" y="8" width="52" height="68" rx="6" stroke="currentColor" strokeWidth="1.5" opacity="0.25" transform="rotate(-8 116 42)" />
      <rect x="118" y="12" width="48" height="62" rx="6" stroke="currentColor" strokeWidth="1.5" opacity="0.3" transform="rotate(-3 142 43)" />
      <rect x="142" y="16" width="44" height="54" rx="5" fill="currentColor" opacity="0.12" />
      <rect x="142" y="16" width="44" height="54" rx="5" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <rect x="168" y="20" width="40" height="48" rx="5" stroke="currentColor" strokeWidth="1.5" opacity="0.28" transform="rotate(5 188 44)" />
      <rect x="192" y="26" width="36" height="40" rx="4" stroke="currentColor" strokeWidth="1.2" opacity="0.2" transform="rotate(8 210 46)" />
      {/* Compression arrows */}
      <path d="M72 46 L96 46" stroke="currentColor" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
      <path d="M92 42 L98 46 L92 50" stroke="currentColor" strokeWidth="1.2" opacity="0.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M248 46 L224 46" stroke="currentColor" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
      <path d="M228 42 L222 46 L228 50" stroke="currentColor" strokeWidth="1.2" opacity="0.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** AI-Driven Disruption — radiating network burst */
function DisruptionMotif({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 100" fill="none">
      {/* Central burst */}
      <circle cx="170" cy="48" r="7" fill="currentColor" opacity="0.2" />
      <circle cx="170" cy="48" r="3.5" fill="currentColor" opacity="0.35" />
      {/* Radiating arms */}
      <line x1="170" y1="48" x2="222" y2="14" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <line x1="170" y1="48" x2="238" y2="42" stroke="currentColor" strokeWidth="1.5" opacity="0.22" />
      <line x1="170" y1="48" x2="226" y2="82" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <line x1="170" y1="48" x2="125" y2="12" stroke="currentColor" strokeWidth="1.5" opacity="0.22" />
      <line x1="170" y1="48" x2="110" y2="55" stroke="currentColor" strokeWidth="1.2" opacity="0.18" />
      <line x1="170" y1="48" x2="130" y2="88" stroke="currentColor" strokeWidth="1.5" opacity="0.22" />
      <line x1="170" y1="48" x2="98" y2="30" stroke="currentColor" strokeWidth="1.2" opacity="0.15" />
      {/* Endpoint nodes */}
      <circle cx="222" cy="14" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="238" cy="42" r="4.5" stroke="currentColor" strokeWidth="1.2" opacity="0.28" />
      <circle cx="226" cy="82" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="125" cy="12" r="4" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
      <circle cx="110" cy="55" r="4.5" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
      <circle cx="130" cy="88" r="4" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
      <circle cx="98" cy="30" r="3.5" stroke="currentColor" strokeWidth="1" opacity="0.18" />
      {/* Secondary branches */}
      <line x1="222" y1="14" x2="248" y2="6" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <circle cx="248" cy="6" r="2.5" fill="currentColor" opacity="0.18" />
      <line x1="226" y1="82" x2="248" y2="92" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <circle cx="248" cy="92" r="2.5" fill="currentColor" opacity="0.18" />
    </svg>
  );
}

/** Regulatory Expansion — concentric arcs with grid marks */
function ExpansionMotif({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 100" fill="none">
      {/* Concentric arcs */}
      <path d="M 165 50 A 28 28 0 0 1 193 22" stroke="currentColor" strokeWidth="1.8" opacity="0.3" strokeLinecap="round" />
      <path d="M 155 50 A 44 44 0 0 1 199 6" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeLinecap="round" />
      <path d="M 145 50 A 60 60 0 0 1 205 -10" stroke="currentColor" strokeWidth="1.2" opacity="0.18" strokeLinecap="round" />
      <path d="M 165 50 A 28 28 0 0 0 193 78" stroke="currentColor" strokeWidth="1.8" opacity="0.3" strokeLinecap="round" />
      <path d="M 155 50 A 44 44 0 0 0 199 94" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeLinecap="round" />
      <path d="M 145 50 A 60 60 0 0 0 205 110" stroke="currentColor" strokeWidth="1.2" opacity="0.18" strokeLinecap="round" />
      {/* Grid tick marks */}
      <line x1="170" y1="4" x2="170" y2="96" stroke="currentColor" strokeWidth="0.8" opacity="0.1" />
      <line x1="200" y1="4" x2="200" y2="96" stroke="currentColor" strokeWidth="0.8" opacity="0.1" />
      <line x1="110" y1="32" x2="250" y2="32" stroke="currentColor" strokeWidth="0.8" opacity="0.1" />
      <line x1="110" y1="68" x2="250" y2="68" stroke="currentColor" strokeWidth="0.8" opacity="0.1" />
      {/* Shield accent at center */}
      <rect x="176" y="34" width="30" height="32" rx="4" stroke="currentColor" strokeWidth="1.8" opacity="0.3" />
      <path d="M 184 46 L 189 51 L 200 40" stroke="currentColor" strokeWidth="1.8" opacity="0.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Manual Revenue Operations — chain of nodes with friction break */
function ChainBreakMotif({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 100" fill="none">
      {/* Chain nodes */}
      <circle cx="80" cy="50" r="11" stroke="currentColor" strokeWidth="1.8" opacity="0.28" />
      <circle cx="80" cy="50" r="4.5" fill="currentColor" opacity="0.18" />
      <circle cx="120" cy="50" r="11" stroke="currentColor" strokeWidth="1.8" opacity="0.3" />
      <circle cx="120" cy="50" r="4.5" fill="currentColor" opacity="0.2" />
      {/* Connecting line */}
      <line x1="91" y1="50" x2="109" y2="50" stroke="currentColor" strokeWidth="1.8" opacity="0.28" />
      {/* Break / friction gap */}
      <line x1="131" y1="50" x2="149" y2="50" stroke="currentColor" strokeWidth="1.5" opacity="0.2" strokeDasharray="3 3" />
      <path d="M 143 42 L 148 50 L 143 58" stroke="currentColor" strokeWidth="1.8" opacity="0.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 157 42 L 152 50 L 157 58" stroke="currentColor" strokeWidth="1.8" opacity="0.3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Continued chain */}
      <circle cx="180" cy="50" r="11" stroke="currentColor" strokeWidth="1.8" opacity="0.3" />
      <circle cx="180" cy="50" r="4.5" fill="currentColor" opacity="0.2" />
      <line x1="191" y1="50" x2="209" y2="50" stroke="currentColor" strokeWidth="1.8" opacity="0.28" />
      <circle cx="220" cy="50" r="11" stroke="currentColor" strokeWidth="1.8" opacity="0.25" />
      <circle cx="220" cy="50" r="4.5" fill="currentColor" opacity="0.15" />
      {/* Friction sparks near break */}
      <line x1="140" y1="34" x2="144" y2="38" stroke="currentColor" strokeWidth="1.2" opacity="0.25" strokeLinecap="round" />
      <line x1="147" y1="31" x2="151" y2="36" stroke="currentColor" strokeWidth="1.2" opacity="0.22" strokeLinecap="round" />
      <line x1="154" y1="33" x2="158" y2="38" stroke="currentColor" strokeWidth="1.2" opacity="0.18" strokeLinecap="round" />
    </svg>
  );
}

/** Slow Customer Onboarding — winding path with milestone markers */
function WindingPathMotif({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 100" fill="none">
      {/* Serpentine path */}
      <path
        d="M 70 50 C 92 50, 100 18, 122 18 C 144 18, 150 82, 172 82 C 194 82, 200 30, 222 30 C 238 30, 248 45, 255 45"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.22"
        strokeLinecap="round"
        fill="none"
      />
      {/* Start node */}
      <circle cx="70" cy="50" r="6" fill="currentColor" opacity="0.3" />
      <circle cx="70" cy="50" r="3" fill="currentColor" opacity="0.4" />
      {/* Milestone dots */}
      <circle cx="122" cy="18" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.28" />
      <circle cx="172" cy="82" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.28" />
      <circle cx="222" cy="30" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.28" />
      {/* End node (muted — destination is far) */}
      <circle cx="255" cy="45" r="6" fill="currentColor" opacity="0.18" />
      <circle cx="255" cy="45" r="3" fill="currentColor" opacity="0.28" />
      {/* Timeline ticks */}
      <line x1="122" y1="24" x2="122" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.18" />
      <line x1="172" y1="76" x2="172" y2="92" stroke="currentColor" strokeWidth="1" opacity="0.18" />
      <line x1="222" y1="24" x2="222" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.18" />
    </svg>
  );
}

/** Fragmented Customer Data — scattered clusters with broken connections */
function ScatterMotif({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 100" fill="none">
      {/* Cluster 1 — upper-left */}
      <circle cx="100" cy="22" r="6" fill="currentColor" opacity="0.2" />
      <circle cx="118" cy="16" r="4.5" fill="currentColor" opacity="0.18" />
      <circle cx="108" cy="36" r="5" fill="currentColor" opacity="0.15" />
      {/* Cluster 2 — center-right */}
      <circle cx="190" cy="45" r="7" fill="currentColor" opacity="0.2" />
      <circle cx="210" cy="38" r="5" fill="currentColor" opacity="0.18" />
      <circle cx="202" cy="58" r="4.5" fill="currentColor" opacity="0.15" />
      <circle cx="220" cy="52" r="3.5" fill="currentColor" opacity="0.12" />
      {/* Cluster 3 — lower-left */}
      <circle cx="132" cy="72" r="5.5" fill="currentColor" opacity="0.18" />
      <circle cx="150" cy="80" r="4.5" fill="currentColor" opacity="0.15" />
      <circle cx="124" cy="84" r="4" fill="currentColor" opacity="0.12" />
      {/* Broken connection lines (dashed) */}
      <line x1="114" y1="30" x2="185" y2="42" stroke="currentColor" strokeWidth="1.2" opacity="0.15" strokeDasharray="4 4" />
      <line x1="110" y1="38" x2="136" y2="68" stroke="currentColor" strokeWidth="1.2" opacity="0.15" strokeDasharray="4 4" />
      <line x1="155" y1="76" x2="186" y2="55" stroke="currentColor" strokeWidth="1.2" opacity="0.15" strokeDasharray="4 4" />
      {/* Orphaned data points */}
      <circle cx="160" cy="14" r="2.5" fill="currentColor" opacity="0.1" />
      <circle cx="240" cy="24" r="3" fill="currentColor" opacity="0.1" />
      <circle cx="85" cy="58" r="2.5" fill="currentColor" opacity="0.08" />
      <circle cx="235" cy="78" r="2.5" fill="currentColor" opacity="0.08" />
    </svg>
  );
}

/* ── Motif Registry ───────────────────────────────────── */

const MOTIF_REGISTRY: Record<string, React.FC<{ className?: string }>> = {
  'p-1': CompressionMotif,
  'p-2': DisruptionMotif,
  'p-3': ExpansionMotif,
  'p-4': ChainBreakMotif,
  'p-5': WindingPathMotif,
  'p-6': ScatterMotif,
};

const FALLBACK_MOTIFS: Record<PressureType, React.FC<{ className?: string }>> = {
  external: CompressionMotif,
  internal: ChainBreakMotif,
};

/* ── Hero Component ───────────────────────────────────── */

export function CardHero({ pressureId, pressureType, iconName }: CardHeroProps) {
  const MotifComponent = MOTIF_REGISTRY[pressureId] ?? FALLBACK_MOTIFS[pressureType];

  return (
    <div className={`strategy-card__hero strategy-card__hero--${pressureType}`}>
      <div className="strategy-card__hero-icon">
        <Icon name={iconName} size={34} />
      </div>
      <MotifComponent className="strategy-card__hero-motif" />
    </div>
  );
}
