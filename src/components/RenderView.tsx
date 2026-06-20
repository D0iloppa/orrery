import { useEffect, useMemo, useState } from 'react'
import SajuView from './saju/SajuView.tsx'
import ZiweiView from './ziwei/ZiweiView.tsx'
import NatalView from './natal/NatalView.tsx'
import { calculateSaju } from '@orrery/core/saju'
import { createChart } from '@orrery/core/ziwei'
import { calculateNatal } from '@orrery/core/natal'
import { sajuToText, ziweiToText, natalToText } from '../utils/text-export.ts'
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

// orrery 의 "Copy for AI Reading" 와 동일한 텍스트를 해당 탭에 맞게 생성(브라우저 i18n 사용).
async function buildAiText(tab: string, input: BirthInput): Promise<string> {
  if (tab === 'ziwei') {
    return ziweiToText(createChart(
      input.year, input.month, input.day, input.hour, input.minute,
      input.gender === 'M', input.timezone, input.longitude,
    ))
  }
  if (tab === 'natal') {
    return natalToText(await calculateNatal(input))
  }
  return sajuToText(calculateSaju(input))
}

export default function RenderView() {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab') ?? 'saju'
  // mount 1회만 파싱 (쿼리는 고정)
  const input = useMemo(() => parseBirthInput(params), [])
  const [aiText, setAiText] = useState<string | null>(null)

  // 캡처는 기본 다크(CRT 콘솔 배경에 맞춤). theme=light 면 라이트.
  const light = params.get('theme') === 'light'
  useEffect(() => {
    document.documentElement.classList.toggle('dark', !light)
  }, [light])

  // AI Reading 텍스트 계산 → 숨은 #orrery-ai-text 노드로 노출(dobis 가 dump-dom 으로 추출)
  useEffect(() => {
    if (!input) return
    let cancelled = false
    buildAiText(tab, input)
      .then(txt => { if (!cancelled) setAiText(txt) })
      .catch(() => { if (!cancelled) setAiText('') })
    return () => { cancelled = true }
  }, [input, tab])

  // 차트(table/svg) + AI 텍스트가 모두 준비되면 html[data-orrery-ready] 세팅 → 캡처/추출 타이밍 결정적.
  useEffect(() => {
    if (!input) {
      document.documentElement.setAttribute('data-orrery-ready', 'error')
      return
    }
    let raf = 0
    const check = () => {
      const el = document.getElementById('orrery-render')
      if (el && el.querySelector('table, svg') && document.getElementById('orrery-ai-text')) {
        document.documentElement.setAttribute('data-orrery-ready', '1')
      } else {
        raf = requestAnimationFrame(check)
      }
    }
    check()
    return () => cancelAnimationFrame(raf)
  }, [input, aiText])

  if (!input) {
    return <div id="orrery-render" data-orrery-error>missing birth params (year/month/day required)</div>
  }

  return (
    <div id="orrery-render" className="max-w-2xl mx-auto px-4 py-6 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* 캡처 전용: 인터랙티브 컨트롤(Copy 버튼·운세/하우스 셀렉터)을 숨겨 깨끗한 차트만 남긴다 */}
      <style>{`#orrery-render button, #orrery-render select { display: none !important; }`}</style>
      {tab === 'ziwei' && <ZiweiView input={input} />}
      {tab === 'natal' && <NatalView input={input} />}
      {tab !== 'ziwei' && tab !== 'natal' && <SajuView input={input} />}
      {aiText != null && <div id="orrery-ai-text" hidden>{aiText}</div>}
    </div>
  )
}
