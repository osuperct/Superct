export function TrofeuColorido({ className = "size-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" role="img" aria-label="Troféu de desempenho">
      <defs>
        <linearGradient id="taca-ouro" x1="8" y1="5" x2="38" y2="39" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--evaluation-star)" />
          <stop offset="1" stopColor="var(--evaluation-orange)" />
        </linearGradient>
      </defs>
      <path d="M15 7h18v8c0 8-3.6 13-9 13s-9-5-9-13V7Z" fill="url(#taca-ouro)" />
      <path d="M15 11H9v4c0 5 3.6 8 8.2 8M33 11h6v4c0 5-3.6 8-8.2 8" fill="none" stroke="var(--evaluation-star)" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 28v7M17 41h14M19 35h10l2 6H17l2-6Z" fill="var(--evaluation-blue)" stroke="var(--evaluation-blue)" strokeWidth="2" strokeLinejoin="round" />
      <path d="m24 11 1.5 3 3.5.5-2.5 2.4.6 3.4-3.1-1.6-3.1 1.6.6-3.4-2.5-2.4 3.5-.5L24 11Z" fill="var(--background)" />
    </svg>
  );
}

export function MedalhaColorida({ className = "size-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" role="img" aria-label="Medalha de conquista">
      <path d="m14 4 8 17h8L38 4h-8l-6 13-6-13h-4Z" fill="var(--evaluation-pink)" />
      <path d="m22 4 5 14 5-14h-10Z" fill="var(--evaluation-blue)" />
      <circle cx="26" cy="29" r="13" fill="var(--evaluation-orange)" stroke="var(--evaluation-star)" strokeWidth="3" />
      <circle cx="26" cy="29" r="8" fill="var(--evaluation-star)" />
      <path d="m26 23 1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6L26 23Z" fill="var(--background)" />
    </svg>
  );
}