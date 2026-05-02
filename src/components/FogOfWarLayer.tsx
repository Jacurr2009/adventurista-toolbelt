import { useEffect, useRef } from 'react';
import { Obstacle } from '@/lib/obstacles';
import { isVisible } from '@/lib/visibility';

interface FogOfWarLayerProps {
  gridSize: number;
  gridCols: number;
  gridRows: number;
  imgSize: { w: number; h: number };
  viewers: { x: number; y: number; visionRadius: number }[];
  obstacles: Obstacle[];
  isDM: boolean;
  showPlayerPreview: boolean;
  /** Sub-cells per grid cell for higher-resolution fog. Default 4 = 16 fog cells per grid cell. */
  resolution?: number;
}

export function FogOfWarLayer({
  gridSize, gridCols, gridRows, imgSize, viewers, obstacles, isDM, showPlayerPreview,
  resolution = 4,
}: FogOfWarLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const showFog = !isDM || showPlayerPreview;

  useEffect(() => {
    if (!showFog) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = imgSize.w;
    const h = imgSize.h;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill everything with fog
    const fogAlpha = showPlayerPreview ? 0.6 : 0.95;
    // Use background-derived dark fill; fall back to near-black
    ctx.fillStyle = `rgba(10, 10, 14, ${fogAlpha})`;
    ctx.fillRect(0, 0, w, h);

    if (viewers.length === 0) return;

    const subSize = gridSize / resolution;
    const subCols = Math.ceil(w / subSize);
    const subRows = Math.ceil(h / subSize);

    // Punch out visible sub-cells
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';

    for (let r = 0; r < subRows; r++) {
      for (let c = 0; c < subCols; c++) {
        const cx = c * subSize + subSize / 2;
        const cy = r * subSize + subSize / 2;
        if (isVisible(cx, cy, viewers, obstacles)) {
          // Slight overlap (+0.5) to avoid sub-pixel seams
          ctx.fillRect(c * subSize, r * subSize, subSize + 0.5, subSize + 0.5);
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }, [showFog, imgSize.w, imgSize.h, gridSize, resolution, viewers, obstacles, showPlayerPreview]);

  if (!showFog) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{
        width: imgSize.w,
        height: imgSize.h,
        pointerEvents: 'none',
        zIndex: 25,
      }}
    />
  );
}
