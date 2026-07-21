import React from "react";

interface LogoProps {
  size?: number | string;
  className?: string;
}

export default function Logo({ size = 42, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Mask to cut a gap in the D-loop where the F-stem passes in front of it */}
        <mask id="d-loop-mask">
          <rect x="0" y="0" width="200" height="200" fill="white" />
          {/* Thick black line along the F-stem will cut it out of the D-loop */}
          <path d="M 105 35 L 105 165" stroke="black" strokeWidth="12" strokeLinecap="round" />
        </mask>

        {/* Mask to cut a gap in the F-arms where the D-loop passes in front of them */}
        <mask id="f-arms-mask">
          <rect x="0" y="0" width="200" height="200" fill="white" />
          {/* Thick black path along the D-loop will cut it out of the F-arms */}
          <path
            d="M 65 50 C 135 50, 135 150, 65 150"
            fill="none"
            stroke="black"
            strokeWidth="12"
            strokeLinecap="round"
          />
        </mask>
      </defs>

      {/* MONOGRAM CONTAINER */}
      <g stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" className="text-white">
        {/* D-Stem (always visible, behind nothing) */}
        <path d="M 65 50 L 65 150" />

        {/* D-Loop (uses mask to go behind F-stem) */}
        <path
          d="M 65 50 C 135 50, 135 150, 65 150"
          fill="none"
          mask="url(#d-loop-mask)"
        />

        {/* F-Stem (always visible, in front of D-loop) */}
        <path d="M 105 50 L 105 150" />

        {/* F-Arms (uses mask to go behind D-loop) */}
        <g mask="url(#f-arms-mask)">
          <path d="M 105 50 L 150 50" />
          <path d="M 105 95 L 138 95" />
        </g>
      </g>
    </svg>
  );
}
