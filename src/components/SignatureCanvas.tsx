"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Undo2 } from "lucide-react";

interface SignatureCanvasProps {
  onSignatureChange: (signatureDataUrl: string | null) => void;
  width?: number;
  height?: number;
  className?: string;
}

type Point = { x: number; y: number };
type Stroke = Point[];

export default function SignatureCanvas({
  onSignatureChange,
  width = 400,
  height = 150,
  className = "",
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStroke = useRef<Stroke>([]);
  const isDrawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ w: width, h: height });

  // Resize canvas to container width on mobile
  useEffect(() => {
    function updateSize() {
      const container = containerRef.current;
      if (!container) return;
      const isMobile = window.innerWidth < 640;
      const w = isMobile ? container.clientWidth : width;
      const h = isMobile ? 120 : height;
      setCanvasSize({ w, h });
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [width, height]);

  // Redraw all strokes when canvas size changes or strokes change
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    canvas.style.width = `${canvasSize.w}px`;
    canvas.style.height = `${canvasSize.h}px`;
    ctx.scale(dpr, dpr);

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

    // Draw strokes
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, canvasSize]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const getPoint = useCallback(
    (e: React.MouseEvent | React.TouchEvent): Point => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const clientX =
        "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY =
        "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    []
  );

  const startDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      isDrawing.current = true;
      currentStroke.current = [getPoint(e)];

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      const p = currentStroke.current[0];
      ctx.moveTo(p.x, p.y);
    },
    [getPoint]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing.current) return;
      const point = getPoint(e);
      currentStroke.current.push(point);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    },
    [getPoint]
  );

  const endDraw = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (currentStroke.current.length > 1) {
      const newStrokes = [...strokes, currentStroke.current];
      setStrokes(newStrokes);
      setIsEmpty(false);

      const canvas = canvasRef.current;
      if (canvas) {
        onSignatureChange(canvas.toDataURL("image/png"));
      }
    }
    currentStroke.current = [];
  }, [strokes, onSignatureChange]);

  const handleClear = useCallback(() => {
    setStrokes([]);
    setIsEmpty(true);
    onSignatureChange(null);
  }, [onSignatureChange]);

  const handleUndo = useCallback(() => {
    if (strokes.length === 0) return;
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    if (newStrokes.length === 0) {
      setIsEmpty(true);
      onSignatureChange(null);
    } else {
      // Redraw will happen via effect, but we need the data URL after redraw
      requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          onSignatureChange(canvas.toDataURL("image/png"));
        }
      });
    }
  }, [strokes, onSignatureChange]);

  return (
    <div ref={containerRef} className={className}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair rounded-lg border-2 border-dashed border-gray-300 bg-white"
          style={{ touchAction: "none" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-gray-400">Firma qui</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={isEmpty}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
        >
          <Eraser className="h-3.5 w-3.5" />
          Cancella
        </button>
        <button
          type="button"
          onClick={handleUndo}
          disabled={strokes.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Annulla ultimo tratto
        </button>
      </div>
    </div>
  );
}
