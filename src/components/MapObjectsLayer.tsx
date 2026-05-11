import { useState, useRef, useCallback, useEffect } from 'react';
import { MapObject } from '@/lib/mapObjects';
import { Trash2, Lock, Unlock, RotateCw, Copy, Eye, EyeOff } from 'lucide-react';

interface Props {
  objects: MapObject[];
  setObjects: (updater: (prev: MapObject[]) => MapObject[]) => void;
  isDM: boolean;
  zoom: number;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  imgSize: { w: number; h: number };
  /** Render only objects matching this visibility flag. Default renders all. */
  filter?: 'alwaysVisible' | 'fogged';
  /** zIndex for the layer wrapper. */
  zIndex?: number;
}

type DragMode =
  | { kind: 'move'; id: string; offsetX: number; offsetY: number }
  | { kind: 'resize'; id: string; handle: 'br' | 'tl' | 'tr' | 'bl'; startX: number; startY: number; startW: number; startH: number; cx: number; cy: number }
  | { kind: 'rotate'; id: string; cx: number; cy: number; startAngle: number; startRotation: number }
  | null;

export function MapObjectsLayer({ objects, setObjects, isDM, zoom, selectedId, setSelectedId, imgSize }: Props) {
  const [drag, setDrag] = useState<DragMode>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  const getLocalPos = (clientX: number, clientY: number) => {
    const rect = layerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
  };

  const handlePointerDownObject = (e: React.PointerEvent, obj: MapObject) => {
    if (!isDM) return;
    e.stopPropagation();
    setSelectedId(obj.id);
    if (obj.locked) return;
    const { x, y } = getLocalPos(e.clientX, e.clientY);
    setDrag({ kind: 'move', id: obj.id, offsetX: x - obj.x, offsetY: y - obj.y });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleResizeStart = (e: React.PointerEvent, obj: MapObject, handle: 'br' | 'tl' | 'tr' | 'bl') => {
    e.stopPropagation();
    if (obj.locked) return;
    const { x, y } = getLocalPos(e.clientX, e.clientY);
    setDrag({
      kind: 'resize', id: obj.id, handle,
      startX: x, startY: y, startW: obj.width, startH: obj.height,
      cx: obj.x, cy: obj.y,
    });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleRotateStart = (e: React.PointerEvent, obj: MapObject) => {
    e.stopPropagation();
    if (obj.locked) return;
    const { x, y } = getLocalPos(e.clientX, e.clientY);
    const startAngle = Math.atan2(y - obj.y, x - obj.x) * 180 / Math.PI;
    setDrag({ kind: 'rotate', id: obj.id, cx: obj.x, cy: obj.y, startAngle, startRotation: obj.rotation });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag) return;
    const { x, y } = getLocalPos(e.clientX, e.clientY);
    if (drag.kind === 'move') {
      setObjects(prev => prev.map(o => o.id === drag.id ? { ...o, x: x - drag.offsetX, y: y - drag.offsetY } : o));
    } else if (drag.kind === 'resize') {
      const dx = x - drag.startX;
      const dy = y - drag.startY;
      // Symmetric resize from center, preserve aspect via shift? For simplicity, scale uniformly using max delta
      const sign = (drag.handle === 'br' || drag.handle === 'tr') ? 1 : -1;
      const signY = (drag.handle === 'br' || drag.handle === 'bl') ? 1 : -1;
      const newW = Math.max(20, drag.startW + sign * dx * 2);
      const newH = Math.max(20, drag.startH + signY * dy * 2);
      // Maintain aspect ratio by default (use larger ratio change)
      const aspect = drag.startW / drag.startH;
      const ratioW = newW / drag.startW;
      const ratioH = newH / drag.startH;
      const ratio = Math.max(ratioW, ratioH);
      const finalW = Math.max(20, drag.startW * ratio);
      const finalH = Math.max(20, finalW / aspect);
      setObjects(prev => prev.map(o => o.id === drag.id ? { ...o, width: finalW, height: finalH } : o));
    } else if (drag.kind === 'rotate') {
      const angle = Math.atan2(y - drag.cy, x - drag.cx) * 180 / Math.PI;
      const delta = angle - drag.startAngle;
      setObjects(prev => prev.map(o => o.id === drag.id ? { ...o, rotation: drag.startRotation + delta } : o));
    }
  }, [drag, setObjects, zoom]);

  const handlePointerUp = useCallback(() => setDrag(null), []);

  const removeObj = (id: string) => {
    setObjects(prev => prev.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const toggleLock = (id: string) => {
    setObjects(prev => prev.map(o => o.id === id ? { ...o, locked: !o.locked } : o));
  };

  const duplicateObj = (id: string) => {
    setObjects(prev => {
      const obj = prev.find(o => o.id === id);
      if (!obj) return prev;
      return [...prev, { ...obj, id: `obj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, x: obj.x + 30, y: obj.y + 30 }];
    });
  };

  return (
    <div
      ref={layerRef}
      className="absolute top-0 left-0"
      style={{ width: imgSize.w, height: imgSize.h, pointerEvents: 'none' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {objects.map(obj => {
        const selected = isDM && selectedId === obj.id;
        return (
          <div
            key={obj.id}
            className="absolute"
            style={{
              left: obj.x - obj.width / 2,
              top: obj.y - obj.height / 2,
              width: obj.width,
              height: obj.height,
              transform: `rotate(${obj.rotation}deg)`,
              transformOrigin: 'center center',
              pointerEvents: isDM ? 'auto' : 'none',
              touchAction: 'none',
              zIndex: 15,
            }}
            onPointerDown={(e) => handlePointerDownObject(e, obj)}
          >
            <img
              src={obj.image}
              alt="map object"
              draggable={false}
              className="w-full h-full select-none"
              style={{ objectFit: 'fill', cursor: isDM ? (obj.locked ? 'default' : 'move') : 'default' }}
            />
            {selected && (
              <>
                {/* Selection border */}
                <div className="absolute inset-0 pointer-events-none border-2 border-secondary" style={{ boxShadow: '0 0 0 1px hsl(var(--background))' }} />
                {/* Resize handles */}
                {(['tl', 'tr', 'bl', 'br'] as const).map(h => {
                  const pos: React.CSSProperties = {
                    width: 12 / zoom, height: 12 / zoom,
                    background: 'hsl(var(--secondary))',
                    border: '1px solid hsl(var(--background))',
                    position: 'absolute',
                    cursor: 'nwse-resize',
                    touchAction: 'none',
                  };
                  if (h === 'tl') { pos.left = -6 / zoom; pos.top = -6 / zoom; }
                  if (h === 'tr') { pos.right = -6 / zoom; pos.top = -6 / zoom; }
                  if (h === 'bl') { pos.left = -6 / zoom; pos.bottom = -6 / zoom; }
                  if (h === 'br') { pos.right = -6 / zoom; pos.bottom = -6 / zoom; }
                  return (
                    <div
                      key={h}
                      style={pos}
                      onPointerDown={(e) => handleResizeStart(e, obj, h)}
                    />
                  );
                })}
                {/* Rotate handle */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%', top: -28 / zoom,
                    width: 14 / zoom, height: 14 / zoom,
                    transform: 'translateX(-50%)',
                    borderRadius: '50%',
                    background: 'hsl(var(--accent))',
                    border: '1px solid hsl(var(--background))',
                    cursor: 'grab', touchAction: 'none',
                  }}
                  onPointerDown={(e) => handleRotateStart(e, obj)}
                />
              </>
            )}
          </div>
        );
      })}

      {/* Selected object toolbar (counter-rotated, screen-space) */}
      {isDM && selectedId && (() => {
        const obj = objects.find(o => o.id === selectedId);
        if (!obj) return null;
        return (
          <div
            className="absolute flex gap-1 bg-card border border-border rounded shadow-lg p-1"
            style={{
              left: obj.x,
              top: obj.y + obj.height / 2 + 8,
              transform: `translateX(-50%) scale(${1 / zoom})`,
              transformOrigin: 'top center',
              pointerEvents: 'auto',
              zIndex: 50,
            }}
          >
            <button onClick={() => toggleLock(obj.id)} className="tactical-card !p-1 px-1.5" title={obj.locked ? 'Unlock' : 'Lock'}>
              {obj.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>
            <button onClick={() => duplicateObj(obj.id)} className="tactical-card !p-1 px-1.5" title="Duplicate">
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={() => setObjects(prev => prev.map(o => o.id === obj.id ? { ...o, rotation: o.rotation + 15 } : o))}
              className="tactical-card !p-1 px-1.5" title="Rotate 15°"
            >
              <RotateCw className="w-3 h-3" />
            </button>
            <button onClick={() => removeObj(obj.id)} className="tactical-card !p-1 px-1.5 text-destructive" title="Delete">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      })()}
    </div>
  );
}
