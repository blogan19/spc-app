'use client';

export interface ChangeEntry {
  id: string;
  timestamp: string; // ISO
  action: 'dashboard-saved' | 'template-exported' | 'template-loaded' | 'dashboard-loaded' | 'chart-added' | 'chart-edited' | 'tile-deleted' | 'tile-duplicated' | 'data-refreshed' | 'snapshot-taken' | 'dataset-added' | 'dataset-deleted' | 'layout-changed' | 'dashboard-shared';
  detail: string;
}

const ACTION_LABELS: Record<ChangeEntry['action'], string> = {
  'dashboard-saved': 'Dashboard saved',
  'template-exported': 'Template exported',
  'template-loaded': 'Template loaded',
  'dashboard-loaded': 'Dashboard loaded',
  'chart-added': 'Chart added',
  'chart-edited': 'Chart edited',
  'tile-deleted': 'Tile removed',
  'tile-duplicated': 'Tile duplicated',
  'data-refreshed': 'Data refreshed',
  'snapshot-taken': 'Snapshot taken',
  'dataset-added': 'Dataset uploaded',
  'dataset-deleted': 'Dataset deleted',
  'layout-changed': 'Layout changed',
  'dashboard-shared': 'Dashboard shared',
};

const ACTION_COLORS: Record<ChangeEntry['action'], string> = {
  'dashboard-saved': 'bg-emerald-100 text-emerald-700',
  'template-exported': 'bg-purple-100 text-purple-700',
  'template-loaded': 'bg-purple-100 text-purple-700',
  'dashboard-loaded': 'bg-blue-100 text-blue-700',
  'chart-added': 'bg-blue-100 text-blue-700',
  'chart-edited': 'bg-blue-100 text-blue-700',
  'tile-deleted': 'bg-red-100 text-red-700',
  'tile-duplicated': 'bg-gray-100 text-gray-700',
  'data-refreshed': 'bg-emerald-100 text-emerald-700',
  'snapshot-taken': 'bg-amber-100 text-amber-700',
  'dataset-added': 'bg-blue-100 text-blue-700',
  'dataset-deleted': 'bg-red-100 text-red-700',
  'layout-changed': 'bg-gray-100 text-gray-600',
  'dashboard-shared': 'bg-sky-100 text-sky-700',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
  entries: ChangeEntry[];
  onClose: () => void;
}

export default function ChangeHistoryPanel({ entries, onClose }: Props) {
  // Group by date
  const grouped: { date: string; items: ChangeEntry[] }[] = [];
  for (const entry of [...entries].reverse()) {
    const date = formatDate(entry.timestamp);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) {
      last.items.push(entry);
    } else {
      grouped.push({ date, items: [entry] });
    }
  }

  return (
    <div className="fixed top-[53px] right-0 bottom-0 w-80 bg-white border-l border-gray-200 z-30 overflow-y-auto shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white">
        <h3 className="text-sm font-semibold text-gray-900">Change history</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1"
          aria-label="Close change history"
        >
          ✕
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-sm text-gray-400">No changes recorded yet this session.</p>
        </div>
      ) : (
        <div className="flex-1 p-4 space-y-5">
          {grouped.map((group) => (
            <div key={group.date}>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                {group.date}
              </p>
              <div className="space-y-2">
                {group.items.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2.5">
                    <span className="text-xs text-gray-400 w-16 flex-shrink-0 pt-0.5 tabular-nums">
                      {formatTime(entry.timestamp)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded ${ACTION_COLORS[entry.action]}`}
                      >
                        {ACTION_LABELS[entry.action]}
                      </span>
                      {entry.detail && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                          {entry.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-300 pt-2 border-t border-gray-100">
            History resets when you close or reload the page.
          </p>
        </div>
      )}
    </div>
  );
}
