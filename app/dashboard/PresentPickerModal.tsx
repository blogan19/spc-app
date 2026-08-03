'use client';

interface Props {
  onStoryMode: () => void;
  onSlideDeck: () => void;
  onClose: () => void;
}

export default function PresentPickerModal({ onStoryMode, onSlideDeck, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">How would you like to present?</h2>
          <button type="button" onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onStoryMode}
            className="flex flex-col items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-[#005EB8] hover:bg-blue-50/50 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#005EB8]/10 flex items-center justify-center text-[#005EB8] group-hover:bg-[#005EB8]/20 transition-colors">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M3 4h14v1H3zm0 3h14v1H3zm0 3h10v1H3zm0 3h7v1H3z"/>
                <circle cx="16" cy="13" r="3" fill="#005EB8" opacity="0.6"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Dashboard story</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                Focus on tiles with commentary. Walk the room through your live dashboard.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onSlideDeck}
            className="flex flex-col items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-[#005EB8] hover:bg-blue-50/50 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#005EB8]/10 flex items-center justify-center text-[#005EB8] group-hover:bg-[#005EB8]/20 transition-colors">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <rect x="2" y="3" width="16" height="11" rx="1.5"/>
                <rect x="7" y="16" width="6" height="1.5" rx="0.75"/>
                <rect x="9" y="14" width="2" height="2.5"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Slide deck</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                Build slides like PowerPoint. Drag charts and text onto a free canvas.
              </p>
            </div>
          </button>
        </div>
        <p className="px-6 pb-4 text-xs text-slate-400">
          Dashboard story requires at least one tile. Slide decks are independent of the dashboard layout.
        </p>
      </div>
    </div>
  );
}
