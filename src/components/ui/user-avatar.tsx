import { cn } from '@/lib/utils'

const PALETTE = [
  { bg: 'bg-violet-500', text: 'text-white' },
  { bg: 'bg-indigo-500', text: 'text-white' },
  { bg: 'bg-blue-500',   text: 'text-white' },
  { bg: 'bg-emerald-500',text: 'text-white' },
  { bg: 'bg-amber-500',  text: 'text-white' },
  { bg: 'bg-rose-500',   text: 'text-white' },
  { bg: 'bg-cyan-500',   text: 'text-white' },
  { bg: 'bg-fuchsia-500',text: 'text-white' },
  { bg: 'bg-teal-500',   text: 'text-white' },
  { bg: 'bg-orange-500', text: 'text-white' },
]

function hashUsername(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0
  }
  return h
}

function getInitials(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

interface UserAvatarProps {
  username: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
}

export function UserAvatar({ username, size = 'md', className }: UserAvatarProps) {
  const color = PALETTE[hashUsername(username) % PALETTE.length]
  const initials = getInitials(username)

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold',
        SIZE[size],
        color.bg,
        color.text,
        className,
      )}
    >
      {initials}
    </span>
  )
}
