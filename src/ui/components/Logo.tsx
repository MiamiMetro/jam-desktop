// Logo.tsx - Reusable app logo, color controlled by currentColor.
import { useId } from "react";

interface LogoProps {
  className?: string;
}

export function Logo({ className = "w-5 h-5" }: LogoProps) {
  const maskId = useId();

  return (
    <svg
      viewBox="30 50 450 450"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
      role="img"
      aria-label="Jam"
      className={`text-primary ${className}`}
    >
      <defs>
        <mask id={maskId}>
          <rect width="512" height="512" fill="white" />
          <rect x="216" y="160" width="80" height="220" rx="40" fill="black" />
          <rect x="116" y="210" width="80" height="120" rx="40" fill="black" />
          <rect x="316" y="210" width="80" height="120" rx="40" fill="black" />
        </mask>
      </defs>

      <g mask={`url(#${maskId})`}>
        <path
          d="M 256 60
             C 400 60, 460 160, 460 260
             C 460 400, 276 490, 256 490
             C 236 490, 52 400, 52 260
             C 52 160, 112 60, 256 60 Z"
          fill="currentColor"
          transform="rotate(12 256 256)"
        />
      </g>
    </svg>
  );
}
