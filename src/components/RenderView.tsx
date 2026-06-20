import { useEffect, useMemo } from 'react'
import SajuView from './saju/SajuView.tsx'
import ZiweiView from './ziwei/ZiweiView.tsx'
import NatalView from './natal/NatalView.tsx'
import type { BirthInput } from '@orrery/core/types'

// URL 쿼리 → BirthInput. 폼 없이 단일 차트만 렌더하는 캡처 전용 모드.
// 예) /orrery/?render=1&tab=saju&year=1993&month=3&day=12&hour=9&minute=45&gender=M
//     &timezone=Asia/Seoul&latitude=37.5&longitude=127.0&unknownTime=0
function parseBirthInput(p: URLSearchParams): BirthInput | null {
  const num = (k: string): number | undefined => {
    const v = p.get(k)
    return v == null || v === '' ? undefined : Number(v)
  }
  const year = num('year'), month = num('month'), day = num('day')
  if (year == null || month == null || day == null) return null

  const input: BirthInput = {
    year, month, day,
    hour: num('hour') ?? 0,
    minute: num('minute') ?? 0,
    gender: p.get('gender') === 'F' ? 'F' : 'M',
  }
  if (p.get('unknownTime') === '1' || p.get('unknownTime') === 'true') input.unknownTime = true
  const tz = p.get('timezone'); if (tz) input.timezone = tz
  const lat = num('latitude'); if (lat != null) input.latitude = lat
  const lon = num('longitude'); if (lon != null) input.longitude = lon
  return input
}

export default function RenderView() {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab') ?? 'saju'
  // mount 1회만 파싱 (쿼리는 고정)
  const input = useMemo(() => parseBirthInput(params), [])

  // 캡처는 기본 다크(CRT 콘솔 배경에 맞춤). theme=light 면 라이트.
  const light = params.get('theme') === 'light'
  useEffect(() => {
    document.documentElement.classList.toggle('dark', !light)
  }, [light])

  // 차트 콘텐츠(table/svg)가 그려지면 html[data-orrery-ready] 를 세워
  // playwright 가 캡처 타이밍을 결정적으로 잡게 한다. natal 은 async 라 폴링.
  useEffect(() => {
    if (!input) {
      document.documentElement.setAttribute('data-orrery-ready', 'error')
      return
    }
    let raf = 0
    const check = () => {
      const el = document.getElementById('orrery-render')
      if (el && el.querySelector('table, svg')) {
        document.documentElement.setAttribute('data-orrery-ready', '1')
      } else {
        raf = requestAnimationFrame(check)
      }
    }
    check()
    return () => cancelAnimationFrame(raf)
  }, [input])

  if (!input) {
    return <div id="orrery-render" data-orrery-error>missing birth params (year/month/day required)</div>
  }

  return (
    <div id="orrery-render" className="max-w-2xl mx-auto px-4 py-6 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {tab === 'ziwei' && <ZiweiView input={input} />}
      {tab === 'natal' && <NatalView input={input} />}
      {tab !== 'ziwei' && tab !== 'natal' && <SajuView input={input} />}
    </div>
  )
}
