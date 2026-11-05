export function Paw({ className = 'i i-fill' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="6" cy="10" rx="2.2" ry="2.8" />
      <ellipse cx="10" cy="5.8" rx="2.2" ry="2.9" />
      <ellipse cx="14.2" cy="5.8" rx="2.2" ry="2.9" />
      <ellipse cx="18.2" cy="10" rx="2.2" ry="2.8" />
      <path d="M12.1 11.2c-2.6 0-5.4 3.6-5.4 6 0 1.6 1.3 2.3 2.6 2.3 1.2 0 1.8-.6 2.8-.6s1.6.6 2.8.6c1.3 0 2.6-.7 2.6-2.3 0-2.4-2.8-6-5.4-6z" />
    </svg>
  );
}

export function DogArt({ size = 300 }: { size?: number }) {
  return (
    <svg viewBox="0 0 300 300" width={size} height={size} aria-hidden="true">
      <ellipse cx="150" cy="300" rx="50" ry="56" fill="#D9A06E" />
      <rect x="111" y="246" width="78" height="12" rx="6" fill="#2E7D5B" />
      <circle cx="150" cy="267" r="8" fill="#F4C542" />
      <path d="M92 120c-28 6-36 58-22 84 10 4 20-6 24-20z" fill="#8E5A3C" />
      <path d="M208 120c28 6 36 58 22 84-10 4-20-6-24-20z" fill="#8E5A3C" />
      <ellipse cx="150" cy="170" rx="70" ry="66" fill="#D9A06E" />
      <ellipse cx="150" cy="206" rx="40" ry="30" fill="#F6DCC2" />
      <circle cx="124" cy="168" r="8" fill="#1E2A24" />
      <circle cx="176" cy="168" r="8" fill="#1E2A24" />
      <ellipse cx="150" cy="196" rx="12" ry="9" fill="#1E2A24" />
      <path d="M150 205v10M137 218q13 10 26 0" stroke="#1E2A24" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function CatArt() {
  return (
    <svg viewBox="0 0 280 280" width="280" height="280" aria-hidden="true">
      <ellipse cx="140" cy="290" rx="54" ry="64" fill="#EA924B" />
      <path d="M74 98l14 56 40-30z" fill="#EA924B" />
      <path d="M206 98l-14 56-40-30z" fill="#EA924B" />
      <path d="M84 112l8 30 18-14z" fill="#F7C9A5" />
      <path d="M196 112l-8 30-18-14z" fill="#F7C9A5" />
      <ellipse cx="140" cy="172" rx="68" ry="62" fill="#EA924B" />
      <path d="M140 118v20M120 124q-6 10 0 20M160 124q6 10 0 20" stroke="#C8682A" strokeWidth="5" fill="none" strokeLinecap="round" />
      <ellipse cx="114" cy="170" rx="10" ry="12" fill="#1F7A55" />
      <ellipse cx="166" cy="170" rx="10" ry="12" fill="#1F7A55" />
      <ellipse cx="114" cy="170" rx="3" ry="9" fill="#1E2A24" />
      <ellipse cx="166" cy="170" rx="3" ry="9" fill="#1E2A24" />
      <path d="M134 190h12l-6 6z" fill="#D9707A" />
      <path d="M140 196v6M130 206q10 8 20 0" stroke="#1E2A24" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M92 192h30M94 202h28M188 192h-30M186 202h-28" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
