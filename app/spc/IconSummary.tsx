'use client'
// Variation + assurance icon pair as shown to a board. Colour palette
// matches MDC: Strengthening Your Decisions, p.26–28 (orange / blue / grey).

import type { AssuranceIcon, VariationIcon } from '@/lib/spc';

interface Props {
  variation: VariationIcon;
  assurance: AssuranceIcon | null;
}

const variationDescriptors: Record<
  VariationIcon,
  { label: string; description: string; bg: string; text: string; symbol: string }
> = {
  improvement: {
    label: 'Improvement',
    description: 'Special-cause variation in the desired direction',
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    symbol: '↑',
  },
  concerning: {
    label: 'Concerning',
    description: 'Special-cause variation needing investigation',
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    symbol: '!',
  },
  'common-cause': {
    label: 'Common cause',
    description: 'No special-cause variation — natural process noise',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    symbol: '~',
  },
};

const assuranceDescriptors: Record<
  AssuranceIcon,
  { label: string; description: string; bg: string; text: string; symbol: string }
> = {
  pass: {
    label: 'Consistently meeting',
    description: 'Target sits beyond the limits in the favourable direction',
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    symbol: '✓',
  },
  fail: {
    label: 'Consistently missing',
    description: 'Target sits beyond the limits in the unfavourable direction',
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    symbol: '✗',
  },
  'hit-miss': {
    label: 'Hit-or-miss',
    description: 'Target is inside the limits — random chance will pass or fail it',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    symbol: '?',
  },
};

export default function IconSummary({ variation, assurance }: Props) {
  const v = variationDescriptors[variation];
  return (
    <div className="flex items-center space-x-3 text-sm">
      <Badge
        symbol={v.symbol}
        bg={v.bg}
        text={v.text}
        label="Variation"
        value={v.label}
        title={v.description}
      />
      {assurance ? (
        (() => {
          const a = assuranceDescriptors[assurance];
          return (
            <Badge
              symbol={a.symbol}
              bg={a.bg}
              text={a.text}
              label="Assurance"
              value={a.label}
              title={a.description}
            />
          );
        })()
      ) : (
        <Badge
          symbol="–"
          bg="bg-gray-50"
          text="text-gray-400"
          label="Assurance"
          value="No target"
          title="Set a target on the measure to enable assurance reporting"
        />
      )}
    </div>
  );
}

function Badge({
  symbol,
  bg,
  text,
  label,
  value,
  title,
}: {
  symbol: string;
  bg: string;
  text: string;
  label: string;
  value: string;
  title: string;
}) {
  return (
    <div
      className={`flex items-center space-x-2 px-2 py-1 rounded ${bg} ${text}`}
      title={title}
    >
      <span className="font-bold text-base leading-none w-5 h-5 flex items-center justify-center rounded-full border border-current">
        {symbol}
      </span>
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}
