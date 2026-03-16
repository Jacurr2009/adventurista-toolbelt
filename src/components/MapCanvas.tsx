import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Plus, Trash2, Move } from 'lucide-react';
import { getCharacters } from '@/lib/store';
import { Character } from '@/lib/types';

export interface MapToken {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  icon?: string; // base64 image
  type: 'character' | 'monster';
}

interface MapCanvasProps {
  mapImage: string; // base64 data URL
  mapId: string;
}

const MONSTER_PRESETS = [
  { label: 'Goblin', color: 'hsl(120, 60%, 35%)' },
  { label: 'Orc', color: 'hsl(30, 70%, 35%)' },
  { label: 'Dragon', color: 'hsl(0, 70%, 40%)' },
  { label: 'Skeleton', color: 'hsl(0, 0%, 60%)' },
  { label: 'Wolf', color: 'hsl(30, 30%, 40%)' },
  { label: 'Bandit', color: 'hsl(45, 50%, 35%)' },
];

export function MapCanvas({ mapImage, mapId }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tokens, setTokens] = useState<MapToken[]>(() => {
    const saved = localStorage.getItem(`map-tokens-${mapId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingToken, setDraggingToken] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showAddMenu, setShowAddMenu] = useState(false);
  const characters = useRef<Character[]>(getCharacters());

  // Persist tokens
  useEffect(() => {
    localStorage.setItem(`map-tokens-${mapId}`, JSON.stringify(tokens));
  }, [tokens, mapId]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.2, Math.min(5, z + delta)));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (draggingToken) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pan, draggingToken]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning && !draggingToken) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [isPanning, panStart, draggingToken]);

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleTokenPointerDown = (e: React.PointerEvent, tokenId: string) => {
    e.stopPropagation();
    const token = tokens.find(t => t.id === tokenId);
    if (!token) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    setDragOffset({ x: mouseX - token.x, y: mouseY - token.y });
    setDraggingToken(tokenId);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleTokenPointerMove = (e: React.PointerEvent) => {
    if (!draggingToken) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    setTokens(prev => prev.map(t =>
      t.id === draggingToken
        ? { ...t, x: mouseX - dragOffset.x, y: mouseY - dragOffset.y }
        : t
    ));
  };

  const handleTokenPointerUp = () => {
    setDraggingToken(null);
  };

  const addCharacterToken = (char: Character) => {
    const token: MapToken = {
      id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label: char.name,
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      color: 'hsl(217, 91%, 60%)',
      icon: char.icon,
      type: 'character',
    };
    setTokens(prev => [...prev, token]);
    setShowAddMenu(false);
  };

  const addMonsterToken = (preset: typeof MONSTER_PRESETS[0]) => {
    const token: MapToken = {
      id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label: preset.label,
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      color: preset.color,
      type: 'monster',
    };
    setTokens(prev => [...prev, token]);
    setShowAddMenu(false);
  };

  const removeToken = (id: string) => {
    setTokens(prev => prev.filter(t => t.id !== id));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-card border-b border-border flex-wrap">
        <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="tactical-card py-1 px-2" title="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="tactical-card py-1 px-2" title="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={resetView} className="tactical-card py-1 px-2" title="Reset view">
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="font-mono text-[10px] text-muted-foreground px-2">{Math.round(zoom * 100)}%</span>
        <div className="flex-1" />
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="tactical-card py-1 px-3 flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold"
          >
            <Plus className="w-3 h-3" /> TOKEN
          </button>
          {showAddMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-sm shadow-xl z-50 max-h-64 overflow-y-auto">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground px-3 py-2 border-b border-border">CHARACTERS</p>
              {characters.current.length === 0 ? (
                <p className="text-[10px] text-muted-foreground px-3 py-2">No characters</p>
              ) : (
                characters.current.map(c => (
                  <button
                    key={c.id}
                    onClick={() => addCharacterToken(c)}
                    className="w-full text-left px-3 py-2 text-xs font-mono text-foreground hover:bg-muted/50 flex items-center gap-2"
                  >
                    {c.icon ? (
                      <img src={c.icon} className="w-5 h-5 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-tactical-blue flex items-center justify-center text-[8px] text-background font-bold">
                        {c.name[0]}
                      </div>
                    )}
                    {c.name}
                  </button>
                ))
              )}
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground px-3 py-2 border-y border-border">MONSTERS</p>
              {MONSTER_PRESETS.map(m => (
                <button
                  key={m.label}
                  onClick={() => addMonsterToken(m)}
                  className="w-full text-left px-3 py-2 text-xs font-mono text-foreground hover:bg-muted/50 flex items-center gap-2"
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-background font-bold" style={{ backgroundColor: m.color }}>
                    {m.label[0]}
                  </div>
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative bg-muted/30"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => { handlePointerMove(e); handleTokenPointerMove(e); }}
        onPointerUp={() => { handlePointerUp(); handleTokenPointerUp(); }}
        style={{ touchAction: 'none' }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'relative',
            width: 'fit-content',
          }}
        >
          <img src={mapImage} alt="Campaign map" className="select-none pointer-events-none max-w-none" draggable={false} />

          {/* Tokens */}
          {tokens.map(token => (
            <div
              key={token.id}
              className="absolute group"
              style={{
                left: token.x - 18,
                top: token.y - 18,
                cursor: 'move',
              }}
              onPointerDown={(e) => handleTokenPointerDown(e, token.id)}
            >
              {token.icon ? (
                <img
                  src={token.icon}
                  className="w-9 h-9 rounded-full object-cover border-2 select-none pointer-events-none"
                  style={{ borderColor: token.color }}
                  alt={token.label}
                  draggable={false}
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-background border-2 border-background/30 select-none"
                  style={{ backgroundColor: token.color }}
                >
                  {token.label.slice(0, 2).toUpperCase()}
                </div>
              )}
              <p className="text-[8px] font-mono text-foreground text-center mt-0.5 whitespace-nowrap pointer-events-none select-none">
                {token.label}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); removeToken(token.id); }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2 h-2" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Token list */}
      {tokens.length > 0 && (
        <div className="bg-card border-t border-border p-2 flex gap-2 flex-wrap">
          {tokens.map(t => (
            <div key={t.id} className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
              {t.label}
              <button onClick={() => removeToken(t.id)} className="hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Need X import
import { X } from 'lucide-react';
