'use client';

import { useEffect, useState } from 'react';
import type { SpotlightCardDef } from '@/lib/dashboard/spotlightCards';

interface Props {
  card: SpotlightCardDef;
  anchorEl: HTMLElement | null;
  onDismiss: () => void;
}

const CARD_W = 268;
const CARD_H_EST = 140;
const GAP = 10;
const MARGIN = 12;

function computeStyle(el: HTMLElement | null, placement: SpotlightCardDef['placement']): React.CSSProperties {
  if (!el || placement === 'center') {
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }

  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = 0;
  let left = 0;

  switch (placement) {
    case 'bottom':
      top = rect.bottom + GAP;
      left = Math.max(MARGIN, Math.min(vw - CARD_W - MARGIN, rect.left + rect.width / 2 - CARD_W / 2));
      if (top + CARD_H_EST > vh - MARGIN) top = rect.top - CARD_H_EST - GAP;
      break;
    case 'top':
      top = rect.top - CARD_H_EST - GAP;
      left = Math.max(MARGIN, Math.min(vw - CARD_W - MARGIN, rect.left + rect.width / 2 - CARD_W / 2));
      if (top < MARGIN) top = rect.bottom + GAP;
      break;
    case 'right':
      left = rect.right + GAP;
      top = Math.max(MARGIN, Math.min(vh - CARD_H_EST - MARGIN, rect.top + rect.height / 2 - CARD_H_EST / 2));
      if (left + CARD_W > vw - MARGIN) left = rect.left - CARD_W - GAP;
      break;
    case 'left':
      left = rect.left - CARD_W - GAP;
      top = Math.max(MARGIN, Math.min(vh - CARD_H_EST - MARGIN, rect.top + rect.height / 2 - CARD_H_EST / 2));
      if (left < MARGIN) left = rect.right + GAP;
      break;
  }

  return { position: 'fixed', top, left };
}

export default function SpotlightCard({ card, anchorEl, onDismiss }: Props) {
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    setCardStyle(computeStyle(anchorEl, card.placement));
  }, [anchorEl, card.placement]);

  return (
    <div className="fixed inset-0 z-[190]" onClick={onDismiss} aria-modal="true" role="dialog" aria-label={card.title}>
      <div
        style={{ ...cardStyle, width: CARD_W, zIndex: 191 }}
        className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Blue accent stripe */}
        <div className="h-1 bg-indigo-600" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start gap-2.5 mb-2">
            <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a1 1 0 110 2 1 1 0 010-2zm0 3.5c.55 0 1 .45 1 1V11a1 1 0 01-2 0V8.5c0-.55.45-1 1-1z"/>
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-slate-800 leading-snug flex-1">{card.title}</h4>
            <button
              type="button"
              onClick={onDismiss}
              className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0"
              aria-label="Dismiss tip"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed ml-7 mb-3.5">{card.body}</p>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
