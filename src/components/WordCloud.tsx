"use client";

import { useEffect, useRef, useCallback } from "react";

interface WordCloudProps {
  words: { text: string; count: number }[];
}

const COLORS = [
  "#6c63ff",
  "#ff6b9d",
  "#48dbfb",
  "#ff9ff3",
  "#54a0ff",
  "#5f27cd",
  "#01a3a4",
  "#f368e0",
  "#ff6348",
  "#7bed9f",
  "#70a1ff",
  "#ffa502",
  "#2ed573",
  "#ff4757",
  "#eccc68",
];

interface PlacedWord {
  x: number;
  y: number;
  width: number;
  height: number;
}

function checkOverlap(rect: PlacedWord, placed: PlacedWord[], padding: number): boolean {
  for (const p of placed) {
    if (
      rect.x < p.x + p.width + padding &&
      rect.x + rect.width + padding > p.x &&
      rect.y < p.y + p.height + padding &&
      rect.y + rect.height + padding > p.y
    ) {
      return true;
    }
  }
  return false;
}

export default function WordCloud({ words }: WordCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || words.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    let minCount = Infinity;
    let maxCount = -Infinity;
    for (const w of words) {
      if (w.count < minCount) minCount = w.count;
      if (w.count > maxCount) maxCount = w.count;
    }
    const range = maxCount - minCount || 1;

    const placed: PlacedWord[] = [];
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxRadius = Math.max(rect.width, rect.height);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const normalized = (word.count - minCount) / range;
      const fontSize = Math.round(18 + normalized * 52);

      ctx.font = `${normalized > 0.6 ? 700 : normalized > 0.3 ? 600 : 400} ${fontSize}px Inter, system-ui, sans-serif`;
      const metrics = ctx.measureText(word.text);
      const textWidth = metrics.width;
      const textHeight = fontSize * 1.2;

      let wordPlaced = false;

      // Spiral placement
      for (let r = 0; r < maxRadius; r += 3) {
        for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
          const x = centerX + r * Math.cos(angle) - textWidth / 2;
          const y = centerY + r * Math.sin(angle) - textHeight / 2;

          const candidate: PlacedWord = {
            x,
            y,
            width: textWidth,
            height: textHeight,
          };

          if (
            x >= 4 &&
            y >= 4 &&
            x + textWidth <= rect.width - 4 &&
            y + textHeight <= rect.height - 4 &&
            !checkOverlap(candidate, placed, 6)
          ) {
            const color = COLORS[i % COLORS.length];
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.85 + normalized * 0.15;
            ctx.fillText(word.text, x, y + textHeight * 0.8);
            ctx.globalAlpha = 1;

            placed.push(candidate);
            wordPlaced = true;
            break;
          }
        }
        if (wordPlaced) break;
      }
    }
  }, [words]);

  useEffect(() => {
    draw();
    const handleResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  if (words.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <p className="text-lg font-light">No words yet</p>
          <p className="text-sm mt-1 opacity-60">Add words to see the cloud form</p>
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ minHeight: 400 }}
    />
  );
}
