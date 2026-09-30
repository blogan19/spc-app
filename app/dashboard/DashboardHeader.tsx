'use client';

import { useRef } from 'react';
import type { DashboardHeader as DashboardHeaderType } from '@/lib/dashboard/types';

interface Props {
  header: DashboardHeaderType;
  onUpdate?: (patch: Partial<DashboardHeaderType>) => void;
}

export default function DashboardHeader({ header, onUpdate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editable = !!onUpdate;

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpdate?.({ logoDataUrl: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div
      className="flex items-center gap-4 px-5 py-3 flex-shrink-0"
      style={{ backgroundColor: header.bgColor, color: header.textColor }}
    >
      {/* Title + subtitle */}
      <div className="flex-1 min-w-0">
        {editable ? (
          <input
            value={header.title}
            onChange={(e) => onUpdate?.({ title: e.target.value })}
            placeholder="Dashboard title"
            className="text-base font-bold bg-transparent border-none focus:outline-none focus:ring-0 w-full placeholder:opacity-60 leading-tight"
            style={{ color: header.textColor }}
          />
        ) : (
          <p className="text-base font-bold truncate leading-tight">{header.title}</p>
        )}
        {editable ? (
          <input
            value={header.subtitle ?? ''}
            onChange={(e) => onUpdate?.({ subtitle: e.target.value })}
            placeholder="Add a subtitle (optional)"
            className="text-xs bg-transparent border-none focus:outline-none focus:ring-0 w-full placeholder:opacity-60 mt-0.5"
            style={{ color: header.subtitleColor ?? header.textColor }}
          />
        ) : (
          header.subtitle && (
            <p className="text-xs truncate mt-0.5" style={{ color: header.subtitleColor ?? header.textColor }}>{header.subtitle}</p>
          )
        )}
      </div>

      {/* Colour pickers — edit mode only */}
      {editable && (
        <div className="flex items-center gap-3 flex-shrink-0">
          <label className="flex items-center gap-1.5 cursor-pointer opacity-80 hover:opacity-100 transition-opacity" title="Background colour">
            <span className="text-[11px] font-medium" style={{ color: header.textColor }}>BG</span>
            <input
              type="color"
              value={header.bgColor}
              onChange={(e) => onUpdate?.({ bgColor: e.target.value })}
              className="w-5 h-5 cursor-pointer rounded border-0 p-0"
            />
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer opacity-80 hover:opacity-100 transition-opacity" title="Title text colour">
            <span className="text-[11px] font-medium" style={{ color: header.textColor }}>Title</span>
            <input
              type="color"
              value={header.textColor}
              onChange={(e) => onUpdate?.({ textColor: e.target.value })}
              className="w-5 h-5 cursor-pointer rounded border-0 p-0"
            />
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer opacity-80 hover:opacity-100 transition-opacity" title="Subtitle text colour">
            <span className="text-[11px] font-medium" style={{ color: header.subtitleColor ?? header.textColor }}>Sub</span>
            <input
              type="color"
              value={header.subtitleColor ?? header.textColor}
              onChange={(e) => onUpdate?.({ subtitleColor: e.target.value })}
              className="w-5 h-5 cursor-pointer rounded border-0 p-0"
            />
          </label>
        </div>
      )}

      {/* Logo */}
      <div className="flex-shrink-0">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoChange}
        />
        {header.logoDataUrl ? (
          <img
            src={header.logoDataUrl}
            alt="Organisation logo"
            className={`h-9 w-auto object-contain max-w-[120px]${editable ? ' cursor-pointer' : ''}`}
            onClick={editable ? () => fileRef.current?.click() : undefined}
            title={editable ? 'Click to change logo' : undefined}
          />
        ) : editable ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs px-3 py-1.5 rounded-lg border border-current opacity-50 hover:opacity-80 transition-opacity whitespace-nowrap"
            style={{ color: header.textColor }}
          >
            + Add logo
          </button>
        ) : null}
      </div>
    </div>
  );
}
