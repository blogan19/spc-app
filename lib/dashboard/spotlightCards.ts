export interface SpotlightCardDef {
  id: string;
  title: string;
  body: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const SPOTLIGHT_CARDS: Record<string, SpotlightCardDef> = {

  'overflow-menu': {
    id: 'spotlight:overflow-menu',
    title: 'Theme, sharing, and more',
    body: 'This menu holds theme & palette, reusable RAG rules, metric library, annotations, share links, embed code, snapshots, and change history.',
    placement: 'bottom',
  },

  'tile-click': {
    id: 'spotlight:tile-click',
    title: 'Click any tile to edit it',
    body: 'Clicking a tile opens its editor. Drag the tile to reposition it on the canvas, or drag its edges to resize. Right-click (or use the tile menu) for duplicate, details, and delete.',
    placement: 'center',
  },

  'add-tile': {
    id: 'spotlight:add-tile',
    title: '20+ chart types available',
    body: 'Choose a chart type directly, or use "Help me choose" for a guided recommendation based on what you\'re trying to show. You can change the chart type at any time.',
    placement: 'center',
  },

  'tile-details': {
    id: 'spotlight:tile-details',
    title: 'Add context to any tile',
    body: 'The Details panel lets you attach a description, a target value with direction (higher/lower is better), a target date, and a list of actions in progress — shown to viewers of the dashboard.',
    placement: 'center',
  },

};
