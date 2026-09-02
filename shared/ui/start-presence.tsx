import { cn } from '../utils';

/** Original calm line presence for Start — not derived from third-party art. */
export function StartPresence({ className }: { className?: string }) {
  return (
    <svg
      className={cn('start-presence-svg', className)}
      viewBox="0 0 180 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="90" cy="204" rx="48" ry="6" fill="currentColor" opacity="0.07" />

      {/* A calm portrait: long hair frames a clear face, neck and shoulders. */}
      <path
        d="M90 26C59 26 40 52 43 84c2 24 11 42 7 68-2 14-7 25-13 34 13 9 31 9 43 1 8-10 11-25 9-42l-4-34c4 15 15 27 30 32 17 6 35 2 47-11-8-17-9-35-6-52 5-31-17-54-46-54Z"
        fill="currentColor"
        opacity="0.07"
      />
      <path
        d="M90 26C59 26 40 52 43 84c2 24 11 42 7 68-2 14-7 25-13 34"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M90 26c29 0 51 23 46 54-3 17-2 35 6 52"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* One clean face contour, with only the details needed at small sizes. */}
      <path
        d="M89 47c22-4 42 11 46 32 4 23-9 46-30 52-21 6-43-8-48-29-6-24 7-50 32-55Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M76 85c6-4 13-4 19 0M109 85c6-4 13-4 19 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M79 97c4 3 9 3 13 0M112 97c4 3 9 3 13 0M102 91v18l-4 4M91 123c7 5 16 5 23 0"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
      />

      {/* A long sweep of hair and a simple blouse neckline complete the figure. */}
      <path
        d="M69 55c-11 18-10 40-1 56 5 10 5 23 1 36"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M116 139c1 15 0 27-4 38M87 142c-1 13-1 25 3 35M82 171c10 10 24 13 38 7"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 198c15-25 38-39 63-40 29-1 54 12 72 34"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M57 195c10-13 23-20 38-21 14 12 30 17 46 14"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.72"
      />

      <circle cx="92" cy="121" r="2.3" fill="var(--plum)" />
    </svg>
  );
}
