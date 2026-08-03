'use client';

import { GridLayout, useContainerWidth } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { DashboardState, DashboardTile, Dataset, DashboardTheme, RagRule, AnnotationDef } from '@/lib/dashboard/types';
import TileRenderer from './TileRenderer';

const ADD_PLACEHOLDER = '__add_tile__';

interface TileGridProps {
  state: DashboardState;
  datasets: Dataset[];
  theme: DashboardTheme;
  ragRules: RagRule[];
  annotations: AnnotationDef[];
  onLayoutChange: (tiles: DashboardTile[]) => void;
  onTileClick: (tileId: string) => void;
  onDeleteTile: (tileId: string) => void;
  onDuplicateTile: (tileId: string) => void;
  onDetailsTile: (tileId: string) => void;
  onAddTile: () => void;
  dashboardTitle: string;
  readOnly?: boolean;
}

export default function TileGrid({
  state,
  datasets,
  theme,
  ragRules,
  annotations,
  onLayoutChange,
  onTileClick,
  onDeleteTile,
  onDuplicateTile,
  onDetailsTile,
  onAddTile,
  dashboardTitle,
  readOnly = false,
}: TileGridProps) {
  const { tiles } = state.dashboard;
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1200 });

  const radiusClass =
    theme.borderRadius === 'none'
      ? ''
      : theme.borderRadius === 'medium'
        ? 'rounded-2xl'
        : 'rounded-xl';

  // Empty state — big centred placeholder instead of a separate page
  if (tiles.length === 0) {
    return (
      <div ref={containerRef} className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 130px)' }}>
        {!readOnly && (
          <button
            type="button"
            data-tour="add-tile-placeholder"
            onClick={onAddTile}
            className="flex flex-col items-center justify-center gap-3
                       border-2 border-dashed border-slate-200 rounded-2xl
                       text-slate-400 hover:border-[#005EB8] hover:text-[#005EB8]
                       hover:bg-blue-50/40 transition-all group select-none
                       w-72 h-48"
          >
            <span className="text-4xl font-light leading-none group-hover:scale-110 transition-transform">＋</span>
            <div className="text-center">
              <p className="text-sm font-medium">Add your first tile</p>
              <p className="text-xs mt-0.5 opacity-70">Choose from 20+ chart types</p>
            </div>
          </button>
        )}
      </div>
    );
  }

  // Compute smart placement for the add-tile placeholder:
  // sit it to the right of the last band of tiles if there's room, otherwise below.
  const maxY = tiles.reduce((m, t) => Math.max(m, t.y + t.h), 0);
  const lastBandTiles = tiles.filter((t) => t.y + t.h === maxY);
  const rightmost = lastBandTiles.reduce((m, t) => Math.max(m, t.x + t.w), 0);
  const topOfLastBand = lastBandTiles.reduce((m, t) => Math.min(m, t.y), maxY);
  const bandH = Math.max(2, maxY - topOfLastBand);
  const hasRightSpace = rightmost + 3 <= 12;

  const addItem = hasRightSpace
    ? { i: ADD_PLACEHOLDER, x: rightmost, y: topOfLastBand, w: Math.min(3, 12 - rightmost), h: bandH, isDraggable: false, isResizable: false }
    : { i: ADD_PLACEHOLDER, x: 0, y: maxY, w: 3, h: 2, isDraggable: false, isResizable: false };

  const layout: Layout = [
    ...tiles.map((t) => ({
      i: t.id,
      x: t.x,
      y: t.y,
      w: t.w,
      h: t.h,
      minW: 2,
      minH: 2,
    })),
    addItem,
  ];

  const handleLayoutChange = (newLayout: Layout) => {
    const updated = tiles.map((tile) => {
      const item = newLayout.find((l) => l.i === tile.id);
      return item ? { ...tile, x: item.x, y: item.y, w: item.w, h: item.h } : tile;
    });
    onLayoutChange(updated);
  };

  return (
    <div ref={containerRef}>
      {mounted && (
        <GridLayout
          width={width}
          layout={layout}
          gridConfig={{ cols: 12, rowHeight: 80, margin: [12, 12] }}
          dragConfig={{ handle: '.drag-handle' }}
          onLayoutChange={handleLayoutChange}
        >
          {(() => {
            const sectionTiles = tiles.filter((t) => {
              const chart = state.charts.find((c) => c.id === t.chartId);
              return chart?.type === 'section';
            });
            const regularTiles = tiles.filter((t) => {
              const chart = state.charts.find((c) => c.id === t.chartId);
              return chart?.type !== 'section';
            });
            return [...sectionTiles, ...regularTiles].map((tile) => {
              const chart = state.charts.find((c) => c.id === tile.chartId);
              if (!chart) return <div key={tile.id} />;

              if (chart.type === 'section') {
                return (
                  <div
                    key={tile.id}
                    className={`overflow-hidden ${radiusClass}`}
                    style={{ zIndex: 0 }}
                  >
                    <TileRenderer
                      tile={tile}
                      chart={chart}
                      datasets={datasets}
                      theme={theme}
                      ragRules={ragRules}
                      annotations={annotations}
                      dashboardTitle={dashboardTitle}
                      onEdit={() => onTileClick(tile.id)}
                      onDelete={() => onDeleteTile(tile.id)}
                      onDuplicate={() => onDuplicateTile(tile.id)}
                      onDetails={() => onDetailsTile(tile.id)}
                    />
                  </div>
                );
              }

              return (
                <div
                  key={tile.id}
                  className={`overflow-hidden ${radiusClass} ${theme.tileBorder ? 'ring-1 ring-slate-200/80' : ''} bg-white shadow-sm`}
                >
                  <TileRenderer
                    tile={tile}
                    chart={chart}
                    datasets={datasets}
                    theme={theme}
                    ragRules={ragRules}
                    annotations={annotations}
                    dashboardTitle={dashboardTitle}
                    onEdit={() => onTileClick(tile.id)}
                    onDelete={() => onDeleteTile(tile.id)}
                    onDuplicate={() => onDuplicateTile(tile.id)}
                    onDetails={() => onDetailsTile(tile.id)}
                  />
                </div>
              );
            });
          })()}

          {/* Click-to-add placeholder */}
          <div key={ADD_PLACEHOLDER} className={`flex items-center justify-center p-1 ${readOnly ? 'hidden' : ''}`}>
            <button
              type="button"
              data-tour="add-tile-placeholder"
              onClick={onAddTile}
              className="w-full h-full flex flex-col items-center justify-center gap-2
                         border-2 border-dashed border-slate-200 rounded-xl
                         text-slate-400 hover:border-[#005EB8] hover:text-[#005EB8]
                         hover:bg-blue-50/60 transition-all group select-none"
            >
              <span className="text-xl font-light leading-none group-hover:scale-110 transition-transform">＋</span>
              <span className="text-xs font-medium tracking-wide">Add tile</span>
            </button>
          </div>
        </GridLayout>
      )}
    </div>
  );
}
