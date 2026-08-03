'use client';

import { useEffect, useState } from 'react';
import type { WalkthroughDef, StepPlacement } from '@/lib/dashboard/walkthroughs';

interface Props {
  walkthrough: WalkthroughDef;
  onComplete: () => void;
  onSkip: () => void;
}

const CARD_W = 320;
const CARD_H_EST = 200;
const GAP = 14;
const MARGIN = 16;
const PAD = 6; // padding around spotlight target

function getTargetRect(target?: string): DOMRect | null {
  if (!target) return null;
  const el = document.querySelector(`[data-tour="${target}"]`);
  return el ? el.getBoundingClientRect() : null;
}

function computeCardStyle(
  rect: DOMRect | null,
  placement: StepPlacement,
): React.CSSProperties {
  if (!rect || placement === 'center') {
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  let top = 0;
  let left = 0;

  switch (placement) {
    case 'bottom':
      top = rect.bottom + PAD + GAP;
      left = Math.max(MARGIN, Math.min(vw - CARD_W - MARGIN, rect.left + rect.width / 2 - CARD_W / 2));
      if (top + CARD_H_EST > vh - MARGIN) top = rect.top - PAD - CARD_H_EST - GAP;
      break;
    case 'top':
      top = rect.top - PAD - CARD_H_EST - GAP;
      left = Math.max(MARGIN, Math.min(vw - CARD_W - MARGIN, rect.left + rect.width / 2 - CARD_W / 2));
      if (top < MARGIN) top = rect.bottom + PAD + GAP;
      break;
    case 'right':
      left = rect.right + PAD + GAP;
      top = Math.max(MARGIN, Math.min(vh - CARD_H_EST - MARGIN, rect.top + rect.height / 2 - CARD_H_EST / 2));
      if (left + CARD_W > vw - MARGIN) left = rect.left - PAD - CARD_W - GAP;
      break;
    case 'left':
      left = rect.left - PAD - CARD_W - GAP;
      top = Math.max(MARGIN, Math.min(vh - CARD_H_EST - MARGIN, rect.top + rect.height / 2 - CARD_H_EST / 2));
      if (left < MARGIN) left = rect.right + PAD + GAP;
      break;
  }

  return { position: 'fixed', top, left };
}

export default function WalkthroughOverlay({ walkthrough, onComplete, onSkip }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = walkthrough.steps[stepIdx];
  const isLast = stepIdx === walkthrough.steps.length - 1;
  const placement: StepPlacement = step.placement ?? (step.target ? 'bottom' : 'center');
  const isSpotlight = !!targetRect && placement !== 'center';

  useEffect(() => {
    setTargetRect(getTargetRect(step.target));
  }, [stepIdx, step.target]);

  const next = () => {
    if (isLast) onComplete();
    else setStepIdx((i) => i + 1);
  };

  const skip = () => onSkip();

  const cardStyle = computeCardStyle(targetRect, placement);

  return (
    <div className="fixed inset-0 z-[200]" aria-modal="true" role="dialog" aria-label={walkthrough.name}>

      {/* Backdrop — full-screen dim when no spotlight, or click-to-skip */}
      {!isSpotlight && (
        <div className="fixed inset-0 bg-black/50" onClick={skip} />
      )}

      {/* Spotlight — a positioned div whose box-shadow dims everything outside it */}
      {isSpotlight && targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - PAD,
            left: targetRect.left - PAD,
            width: targetRect.width + PAD * 2,
            height: targetRect.height + PAD * 2,
            borderRadius: 10,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            border: '2px solid rgba(255,255,255,0.35)',
            pointerEvents: 'none',
            zIndex: 200,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        style={{ ...cardStyle, width: CARD_W, zIndex: 201 }}
        className="bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-[#005EB8] transition-all duration-300"
            style={{ width: `${((stepIdx + 1) / walkthrough.steps.length) * 100}%` }}
          />
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-2.5">
            <h3 className="text-sm font-semibold text-slate-800 leading-snug flex-1">{step.title}</h3>
            <button
              type="button"
              onClick={skip}
              className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0 mt-0.5"
              aria-label="Skip tour"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">{step.body}</p>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4">
            {/* Dot indicators */}
            <div className="flex items-center gap-1">
              {walkthrough.steps.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-200 ${
                    i === stepIdx
                      ? 'w-4 h-1.5 bg-[#005EB8]'
                      : i < stepIdx
                        ? 'w-1.5 h-1.5 bg-[#005EB8]/40'
                        : 'w-1.5 h-1.5 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={skip}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1.5"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={next}
                className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-[#005EB8] text-white hover:bg-[#004da0] transition-colors"
              >
                {isLast ? 'Done ✓' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
