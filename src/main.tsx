import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './components/App.tsx'
import RenderView from './components/RenderView.tsx'

// ?render=1 이면 폼 없이 단일 차트만 그리는 캡처 전용 모드(dobis playwright 명반 캡처용)
const isRender = new URLSearchParams(window.location.search).has('render')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isRender ? <RenderView /> : <App />}
  </StrictMode>,
)
