import { Tooltip } from './tooltip'

interface InfoTipProps {
  text: string
  side?: 'top' | 'bottom'
}

export function InfoTip({ text, side }: InfoTipProps) {
  return (
    <Tooltip content={text} side={side}>
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-600 cursor-help dark:bg-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">
        ?
      </span>
    </Tooltip>
  )
}
