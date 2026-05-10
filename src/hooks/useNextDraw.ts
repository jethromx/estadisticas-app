import { useState, useEffect } from 'react'

// Melate/Revancha/Revanchita: Wed=3, Fri=5, Sun=0 at 21:15 Mexico City time
const DRAW_DAYS = [0, 3, 5]
const DRAW_HOUR = 21
const DRAW_MIN  = 15
const TZ        = 'America/Mexico_City'

const DAY_ES: Record<number, string> = {
  0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miércoles',
  4: 'jueves',  5: 'viernes', 6: 'sábado',
}

export interface NextDraw {
  days:    number
  hours:   number
  mins:    number
  secs:    number
  dayName: string   // e.g. "miércoles"
  isToday: boolean
  isSoon:  boolean  // less than 2 hours away
}

function compute(): NextDraw {
  // Express "now" as Mexico City local time using browser Intl
  const mxStr = new Date().toLocaleString('en-US', { timeZone: TZ })
  const mxNow = new Date(mxStr)

  for (let offset = 0; offset <= 7; offset++) {
    const checkDay = (mxNow.getDay() + offset) % 7
    if (!DRAW_DAYS.includes(checkDay)) continue

    const draw = new Date(mxNow)
    draw.setDate(mxNow.getDate() + offset)
    draw.setHours(DRAW_HOUR, DRAW_MIN, 0, 0)

    if (draw <= mxNow) continue

    const totalSecs = Math.floor((draw.getTime() - mxNow.getTime()) / 1000)
    const days  = Math.floor(totalSecs / 86400)
    const hours = Math.floor((totalSecs % 86400) / 3600)
    const mins  = Math.floor((totalSecs % 3600) / 60)
    const secs  = totalSecs % 60

    return { days, hours, mins, secs, dayName: DAY_ES[checkDay], isToday: offset === 0, isSoon: totalSecs < 7200 }
  }

  return { days: 0, hours: 0, mins: 0, secs: 0, dayName: '', isToday: false, isSoon: false }
}

export function useNextDraw(): NextDraw {
  const [next, setNext] = useState<NextDraw>(compute)

  useEffect(() => {
    const id = setInterval(() => setNext(compute()), 1000)
    return () => clearInterval(id)
  }, [])

  return next
}
