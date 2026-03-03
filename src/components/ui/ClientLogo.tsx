"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ClientLogoProps {
  src: string | null | undefined;
  alt: string;
  size?: number;
  maxWidth?: number;
  maxHeight?: number;
  variant?: "default" | "sidebar";
  fallbackBgColor?: string;
  className?: string;
}

function getInitials(value: string) {
  const chunks = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (chunks.length === 0) return "?";
  if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase();
  return `${chunks[0][0]}${chunks[1][0]}`.toUpperCase();
}

export default function ClientLogo({
  src,
  alt,
  size = 80,
  maxWidth,
  maxHeight,
  variant = "default",
  fallbackBgColor,
  className,
}: ClientLogoProps) {
  const normalizedSrc = src?.trim() || null;
  const [isLoading, setIsLoading] = useState(Boolean(normalizedSrc));
  const [hasError, setHasError] = useState(false);
  const [isSquare, setIsSquare] = useState(true);

  const initials = useMemo(() => getInitials(alt), [alt]);
  const hasImage = Boolean(normalizedSrc) && !hasError;
  const radiusClass = isSquare ? "rounded-full" : "rounded-xl";
  const resolvedMaxWidth = maxWidth ?? size;
  const resolvedMaxHeight = maxHeight ?? size;
  const squareSize = Math.min(resolvedMaxWidth, resolvedMaxHeight);
  const containerWidth = isLoading ? squareSize : isSquare ? squareSize : resolvedMaxWidth;
  const containerHeight = isLoading ? squareSize : isSquare ? squareSize : resolvedMaxHeight;
  const isSidebar = variant === "sidebar";

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const width = image.naturalWidth || size;
    const height = image.naturalHeight || size;
    const ratio = height > 0 ? width / height : 1;
    setIsSquare(ratio >= 0.85 && ratio <= 1.15);
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  if (isSidebar && (!normalizedSrc || hasError)) {
    return (
      <div
        className={cn(
          "w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm",
          className
        )}
      >
        <div
          className="flex w-full items-center justify-center rounded-lg text-white"
          style={{
            backgroundColor: fallbackBgColor || "#64748b",
            minHeight: 64,
            maxHeight: 80,
          }}
        >
          <span className="select-none text-2xl font-semibold uppercase">
            {initials}
          </span>
        </div>
      </div>
    );
  }

  if (isSidebar) {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm",
          className
        )}
        style={{ maxHeight: 100 }}
      >
        <div className="flex w-full items-center justify-center">
          <Image
            src={normalizedSrc as string}
            alt={alt}
            width={320}
            height={80}
            unoptimized
            sizes="(max-width: 768px) 60vw, 240px"
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              "h-auto max-h-[80px] w-full object-contain transition-opacity duration-150",
              isLoading ? "opacity-0" : "opacity-100"
            )}
          />
        </div>

        {isLoading ? (
          <div className="absolute inset-3 flex items-center justify-center rounded-lg bg-gray-200 text-gray-600">
            <span className="select-none text-2xl font-semibold uppercase">
              {initials}
            </span>
          </div>
        ) : null}
      </div>
    );
  }

  if (!normalizedSrc || hasError) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white p-2 shadow-sm",
          className
        )}
        style={{ width: squareSize, height: squareSize }}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-600 text-white">
          <span
            className="select-none font-semibold uppercase"
            style={{ fontSize: Math.max(12, Math.round(squareSize * 0.34)) }}
          >
            {initials}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border border-slate-200 bg-white p-2 shadow-sm",
        isLoading ? "rounded-full" : radiusClass,
        className
      )}
      style={{ width: containerWidth, height: containerHeight }}
    >
      {hasImage ? (
        <Image
          src={normalizedSrc}
          alt={alt}
          width={containerWidth}
          height={containerHeight}
          unoptimized
          sizes={`${containerWidth}px`}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "h-full w-full object-contain transition-opacity duration-150",
            radiusClass,
            isLoading ? "opacity-0" : "opacity-100"
          )}
        />
      ) : null}

      {isLoading ? (
        <div className="absolute inset-2 flex items-center justify-center rounded-full bg-gray-200 text-gray-600">
          <span
            className="select-none font-semibold uppercase"
            style={{ fontSize: Math.max(12, Math.round(squareSize * 0.34)) }}
          >
            {initials}
          </span>
        </div>
      ) : null}
    </div>
  );
}
