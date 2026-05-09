import { cn } from '@/lib/utils'

function hashUsername(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h
}

// ── SVG characters ────────────────────────────────────────────────────────────

function Cat({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <polygon points="7,18 12,5 19,18" fill="#fb923c"/>
      <polygon points="21,18 28,5 33,18" fill="#fb923c"/>
      <polygon points="9,17 12,8 17,17" fill="#fed7aa"/>
      <polygon points="23,17 28,8 31,17" fill="#fed7aa"/>
      <circle cx="20" cy="24" r="13" fill="#fdba74"/>
      <ellipse cx="15" cy="22" rx="2" ry="2.5" fill="#1c1917"/>
      <ellipse cx="25" cy="22" rx="2" ry="2.5" fill="#1c1917"/>
      <circle cx="15.8" cy="21.2" r="0.7" fill="white"/>
      <circle cx="25.8" cy="21.2" r="0.7" fill="white"/>
      <polygon points="20,26 18.5,27.5 21.5,27.5" fill="#f43f5e"/>
      <path d="M17,29 Q20,32 23,29" stroke="#78350f" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <line x1="5" y1="25" x2="15" y2="26.5" stroke="#c2410c" strokeWidth="0.7" opacity="0.5"/>
      <line x1="5" y1="28" x2="15" y2="27.5" stroke="#c2410c" strokeWidth="0.7" opacity="0.5"/>
      <line x1="25" y1="26.5" x2="35" y2="25" stroke="#c2410c" strokeWidth="0.7" opacity="0.5"/>
      <line x1="25" y1="27.5" x2="35" y2="28" stroke="#c2410c" strokeWidth="0.7" opacity="0.5"/>
    </svg>
  )
}

function Dog({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <ellipse cx="9" cy="23" rx="6.5" ry="9" fill="#a16207" transform="rotate(-10 9 23)"/>
      <ellipse cx="31" cy="23" rx="6.5" ry="9" fill="#a16207" transform="rotate(10 31 23)"/>
      <circle cx="20" cy="21" r="13" fill="#ca8a04"/>
      <ellipse cx="20" cy="27" rx="6" ry="4" fill="#fef3c7"/>
      <ellipse cx="20" cy="24" rx="2.5" ry="1.8" fill="#1c1917"/>
      <circle cx="14.5" cy="18" r="2.5" fill="#1c1917"/>
      <circle cx="25.5" cy="18" r="2.5" fill="#1c1917"/>
      <circle cx="15.3" cy="17.2" r="0.8" fill="white"/>
      <circle cx="26.3" cy="17.2" r="0.8" fill="white"/>
      <path d="M17,28.5 Q20,31.5 23,28.5" stroke="#78350f" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function Robot({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <line x1="20" y1="4" x2="20" y2="10" stroke="#6366f1" strokeWidth="2"/>
      <circle cx="20" cy="3.5" r="2.5" fill="#818cf8"/>
      <rect x="7" y="10" width="26" height="22" rx="4" fill="#6366f1"/>
      <rect x="11" y="16" width="7" height="5" rx="1" fill="#a5f3fc"/>
      <rect x="22" y="16" width="7" height="5" rx="1" fill="#a5f3fc"/>
      <rect x="12" y="17" width="2.5" height="2.5" rx="0.5" fill="white" opacity="0.8"/>
      <rect x="23" y="17" width="2.5" height="2.5" rx="0.5" fill="white" opacity="0.8"/>
      <rect x="12" y="25" width="16" height="3" rx="1.5" fill="#4f46e5"/>
      <circle cx="15" cy="26.5" r="1" fill="#a5f3fc"/>
      <circle cx="20" cy="26.5" r="1" fill="#a5f3fc"/>
      <circle cx="25" cy="26.5" r="1" fill="#a5f3fc"/>
      <rect x="4" y="17" width="3" height="5" rx="1" fill="#4f46e5"/>
      <rect x="33" y="17" width="3" height="5" rx="1" fill="#4f46e5"/>
    </svg>
  )
}

function Alien({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <line x1="14" y1="7" x2="11" y2="2" stroke="#4ade80" strokeWidth="1.5"/>
      <circle cx="10.5" cy="1.5" r="1.8" fill="#86efac"/>
      <line x1="26" y1="7" x2="29" y2="2" stroke="#4ade80" strokeWidth="1.5"/>
      <circle cx="29.5" cy="1.5" r="1.8" fill="#86efac"/>
      <ellipse cx="20" cy="23" rx="14" ry="15" fill="#4ade80"/>
      <ellipse cx="13.5" cy="20" rx="4.5" ry="5.5" fill="#1c1917"/>
      <ellipse cx="26.5" cy="20" rx="4.5" ry="5.5" fill="#1c1917"/>
      <ellipse cx="14.5" cy="18.5" rx="1.5" ry="2" fill="white"/>
      <ellipse cx="27.5" cy="18.5" rx="1.5" ry="2" fill="white"/>
      <path d="M14,31 Q20,35 26,31" stroke="#166534" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function Owl({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <polygon points="12,11 9,3 17,9" fill="#92400e"/>
      <polygon points="28,11 31,3 23,9" fill="#92400e"/>
      <circle cx="20" cy="23" r="14" fill="#b45309"/>
      <circle cx="14" cy="20" r="6" fill="#fef3c7"/>
      <circle cx="26" cy="20" r="6" fill="#fef3c7"/>
      <circle cx="14" cy="20" r="3.5" fill="#1c1917"/>
      <circle cx="26" cy="20" r="3.5" fill="#1c1917"/>
      <circle cx="15" cy="18.8" r="1.2" fill="white"/>
      <circle cx="27" cy="18.8" r="1.2" fill="white"/>
      <polygon points="20,23 17.5,27 22.5,27" fill="#d97706"/>
      <ellipse cx="8" cy="29" rx="5" ry="4" fill="#92400e"/>
      <ellipse cx="32" cy="29" rx="5" ry="4" fill="#92400e"/>
    </svg>
  )
}

function Fox({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <polygon points="9,19 5,4 19,16" fill="#ea580c"/>
      <polygon points="31,19 35,4 21,16" fill="#ea580c"/>
      <polygon points="10,18 7,7 17,16" fill="#fff7ed"/>
      <polygon points="30,18 33,7 23,16" fill="#fff7ed"/>
      <circle cx="20" cy="24" r="13" fill="#f97316"/>
      <ellipse cx="20" cy="29" rx="8" ry="5.5" fill="#fff7ed"/>
      <circle cx="14.5" cy="21" r="2.5" fill="#1c1917"/>
      <circle cx="25.5" cy="21" r="2.5" fill="#1c1917"/>
      <circle cx="15.3" cy="20.2" r="0.8" fill="white"/>
      <circle cx="26.3" cy="20.2" r="0.8" fill="white"/>
      <ellipse cx="20" cy="26" rx="2" ry="1.5" fill="#1c1917"/>
      <path d="M17.5,28.5 Q20,31 22.5,28.5" stroke="#7c2d12" strokeWidth="1" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function Bear({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <circle cx="10" cy="12" r="6" fill="#78350f"/>
      <circle cx="30" cy="12" r="6" fill="#78350f"/>
      <circle cx="10" cy="12" r="3.5" fill="#a16207"/>
      <circle cx="30" cy="12" r="3.5" fill="#a16207"/>
      <circle cx="20" cy="24" r="14" fill="#a16207"/>
      <ellipse cx="20" cy="29" rx="7" ry="5" fill="#ca8a04"/>
      <ellipse cx="20" cy="25.5" rx="3" ry="2" fill="#1c1917"/>
      <circle cx="14" cy="20" r="2.5" fill="#1c1917"/>
      <circle cx="26" cy="20" r="2.5" fill="#1c1917"/>
      <circle cx="14.8" cy="19.2" r="0.8" fill="white"/>
      <circle cx="26.8" cy="19.2" r="0.8" fill="white"/>
      <path d="M16.5,31 Q20,34 23.5,31" stroke="#78350f" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function Frog({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <circle cx="13" cy="12" r="6" fill="#16a34a"/>
      <circle cx="27" cy="12" r="6" fill="#16a34a"/>
      <ellipse cx="20" cy="25" rx="14" ry="12" fill="#22c55e"/>
      <circle cx="13" cy="12" r="3.8" fill="#1c1917"/>
      <circle cx="27" cy="12" r="3.8" fill="#1c1917"/>
      <circle cx="14" cy="10.8" r="1.3" fill="white"/>
      <circle cx="28" cy="10.8" r="1.3" fill="white"/>
      <circle cx="17.5" cy="21" r="1.2" fill="#15803d"/>
      <circle cx="22.5" cy="21" r="1.2" fill="#15803d"/>
      <path d="M11,26.5 Q20,34 29,26.5" stroke="#15803d" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <ellipse cx="20" cy="30" rx="7" ry="3.5" fill="#86efac" opacity="0.45"/>
    </svg>
  )
}

function Penguin({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <ellipse cx="20" cy="32" rx="11" ry="7" fill="#1c1917"/>
      <ellipse cx="20" cy="33" rx="7" ry="5" fill="#f5f5f4"/>
      <ellipse cx="20" cy="17" rx="12" ry="14" fill="#1c1917"/>
      <ellipse cx="20" cy="19" rx="8" ry="9" fill="#f5f5f4"/>
      <circle cx="15.5" cy="14" r="3.2" fill="white"/>
      <circle cx="24.5" cy="14" r="3.2" fill="white"/>
      <circle cx="16" cy="14.5" r="2" fill="#1c1917"/>
      <circle cx="25" cy="14.5" r="2" fill="#1c1917"/>
      <circle cx="16.5" cy="13.8" r="0.7" fill="white"/>
      <circle cx="25.5" cy="13.8" r="0.7" fill="white"/>
      <polygon points="20,20 17.5,23.5 22.5,23.5" fill="#f59e0b"/>
    </svg>
  )
}

function Bunny({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <ellipse cx="13" cy="9" rx="4" ry="9" fill="#f9a8d4"/>
      <ellipse cx="27" cy="9" rx="4" ry="9" fill="#f9a8d4"/>
      <ellipse cx="13" cy="9" rx="2" ry="6.5" fill="#fce7f3"/>
      <ellipse cx="27" cy="9" rx="2" ry="6.5" fill="#fce7f3"/>
      <circle cx="20" cy="26" r="13" fill="#fce7f3"/>
      <circle cx="15" cy="23" r="2.5" fill="#1c1917"/>
      <circle cx="25" cy="23" r="2.5" fill="#1c1917"/>
      <circle cx="15.8" cy="22.2" r="0.8" fill="white"/>
      <circle cx="25.8" cy="22.2" r="0.8" fill="white"/>
      <ellipse cx="20" cy="27.5" rx="2" ry="1.5" fill="#f9a8d4"/>
      <path d="M17.5,29.5 Q20,32.5 22.5,29.5" stroke="#db2777" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <ellipse cx="12" cy="27.5" rx="3" ry="2" fill="#f9a8d4" opacity="0.45"/>
      <ellipse cx="28" cy="27.5" rx="3" ry="2" fill="#f9a8d4" opacity="0.45"/>
    </svg>
  )
}

// ── Avatar component ──────────────────────────────────────────────────────────

const CHARACTERS = [Cat, Dog, Robot, Alien, Owl, Fox, Bear, Frog, Penguin, Bunny]

const BG = [
  'bg-amber-100 dark:bg-amber-900/40',
  'bg-yellow-100 dark:bg-yellow-900/40',
  'bg-indigo-100 dark:bg-indigo-900/40',
  'bg-green-100 dark:bg-green-900/40',
  'bg-orange-100 dark:bg-orange-900/40',
  'bg-orange-100 dark:bg-orange-900/40',
  'bg-yellow-100 dark:bg-yellow-900/40',
  'bg-green-100 dark:bg-green-900/40',
  'bg-slate-100 dark:bg-slate-800/60',
  'bg-pink-100 dark:bg-pink-900/40',
]

const SIZE_PX = { sm: 24, md: 32, lg: 40 }
const SIZE_CLS = { sm: 'h-6 w-6', md: 'h-8 w-8', lg: 'h-10 w-10' }

interface UserAvatarProps {
  username: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function UserAvatar({ username, size = 'md', className }: UserAvatarProps) {
  const idx = hashUsername(username) % CHARACTERS.length
  const Character = CHARACTERS[idx]
  const px = SIZE_PX[size]

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden',
        SIZE_CLS[size],
        BG[idx],
        className,
      )}
    >
      <Character s={px} />
    </span>
  )
}
