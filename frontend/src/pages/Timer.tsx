import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Progress, Space, Typography, Segmented, Tooltip, App } from 'antd'
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import { C } from '../theme'

const { Text } = Typography

type ModeKey = 'work' | 'short' | 'long'

interface Mode {
  label:   string
  seconds: number
  color:   string
  track:   string
}

const MODES: Record<ModeKey, Mode> = {
  work:  { label: '🌰 专注时间', seconds: 25 * 60, color: 'rgb(var(--wt))',   track: 'rgba(var(--wt), 0.15)' },
  short: { label: '🍃 短暂休息', seconds:  5 * 60, color: C.green,            track: 'rgba(82,196,26,0.12)'  },
  long:  { label: '☕ 长时休息', seconds: 15 * 60, color: C.blue,             track: 'rgba(64,150,255,0.12)' },
}

const TIPS_WORK  = ['加油！专注就是超能力 ✨', '认真的你超级棒棒哒 💪', '离目标又近了一步 🎯', '保持专注，核桃为你加油 🌰']
const TIPS_BREAK = ['好好休息，才能更好出发 🌸', '眨眨眼，动动身体 🦋', '喝杯水，放松一下 💧', '深呼吸，放空一切 🌈']

export default function Timer() {
  const { notification } = App.useApp()
  const [modeKey, setModeKey]   = useState<ModeKey>('work')
  const [seconds, setSeconds]   = useState(MODES.work.seconds)
  const [running, setRunning]   = useState(false)
  const [sessions, setSessions] = useState(0)
  const [tip, setTip]           = useState(TIPS_WORK[0])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const mode = MODES[modeKey]
  const percent  = Math.round((seconds / mode.seconds) * 100)
  const mins     = Math.floor(seconds / 60)
  const secs     = seconds % 60
  const timeStr  = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    setRunning(false)
  }, [])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          stop()
          if (modeKey === 'work') {
            setSessions((n) => n + 1)
            void notification.success({ message: '专注完成 🌰', description: '棒棒哒！休息一下再出发～', placement: 'topRight', duration: 5 })
            setTip(TIPS_BREAK[Math.floor(Math.random() * TIPS_BREAK.length)])
          } else {
            void notification.info({ message: '休息结束 ✨', description: '精神满满，继续加油！', placement: 'topRight', duration: 5 })
            setTip(TIPS_WORK[Math.floor(Math.random() * TIPS_WORK.length)])
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, stop, modeKey, notification])

  function handleModeChange(key: ModeKey) {
    stop(); setModeKey(key); setSeconds(MODES[key].seconds)
    setTip(key === 'work' ? TIPS_WORK[Math.floor(Math.random() * TIPS_WORK.length)] : TIPS_BREAK[Math.floor(Math.random() * TIPS_BREAK.length)])
  }

  function handleToggle() {
    if (seconds === 0) { setSeconds(mode.seconds); setRunning(true) }
    else setRunning((r) => !r)
  }

  return (
    <Space orientation="vertical" size={20} style={{ width: '100%', alignItems: 'center' }}>

      <Segmented
        value={modeKey}
        onChange={(v) => handleModeChange(v as ModeKey)}
        options={[
          { label: '🌰 专注', value: 'work'  },
          { label: '🍃 短休', value: 'short' },
          { label: '☕ 长休', value: 'long'  },
        ]}
        style={{ borderRadius: 20 }}
      />

      <div style={{
        width: 360,
        borderRadius: 24,
        border: `2px solid ${mode.color}40`,
        boxShadow: `0 8px 40px ${mode.color}20`,
        background: 'rgba(var(--bg-card), 0.88)',
        backdropFilter: 'blur(8px)',
        padding: '32px 28px',
        textAlign: 'center',
      }}>
        <Space orientation="vertical" size={20} style={{ width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'inline-block', padding: '4px 16px', background: `${mode.color}18`, border: `1px solid ${mode.color}50`, borderRadius: 20, fontSize: 13, fontWeight: 600, color: mode.color }}>
            {mode.label}
          </div>

          <Progress
            type="circle"
            percent={percent}
            size={200}
            strokeColor={mode.color}
            trailColor={mode.track}
            strokeWidth={7}
            format={() => (
              <div style={{ lineHeight: 1 }}>
                <div style={{ fontSize: 38, fontWeight: 800, color: mode.color, fontVariantNumeric: 'tabular-nums', letterSpacing: 2 }}>
                  {timeStr}
                </div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 6 }}>
                  {running ? '专注中…' : seconds === mode.seconds ? '准备开始' : '已暂停'}
                </div>
              </div>
            )}
          />

          <Space size={12}>
            <Tooltip title="重置">
              <Button shape="circle" icon={<ReloadOutlined />} size="large" onClick={() => { stop(); setSeconds(mode.seconds) }} />
            </Tooltip>
            <Button
              type="primary"
              shape="round"
              size="large"
              icon={running ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handleToggle}
              style={{ background: `linear-gradient(90deg,${mode.color},${mode.color}cc)`, border: 'none', padding: '0 28px', height: 44, fontSize: 15, fontWeight: 600 }}
            >
              {running ? '暂停' : seconds === 0 ? '再来一次' : seconds === mode.seconds ? '开始' : '继续'}
            </Button>
          </Space>

          <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>{tip}</Text>
        </Space>
      </div>

      <div style={{
        width: 360, borderRadius: 16,
        border: '1.5px solid rgba(var(--wt), 0.2)',
        background: 'rgba(var(--bg-card), 0.85)',
        backdropFilter: 'blur(8px)',
        padding: '16px 22px', textAlign: 'center',
      }}>
        <Space orientation="vertical" size={6} style={{ width: '100%', alignItems: 'center' }}>
          <Text strong style={{ color: C.text }}>🌰 今日专注</Text>
          <div style={{ fontSize: 26, letterSpacing: 3, minHeight: 34 }}>
            {sessions === 0
              ? <Text type="secondary" style={{ fontSize: 13 }}>完成第一个番茄，加油 🌱</Text>
              : '🌰'.repeat(Math.min(sessions, 12)) + (sessions > 12 ? ` +${sessions - 12}` : '')
            }
          </div>
          {sessions > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              已完成 {sessions} 个，累计专注 {sessions * 25} 分钟 🏆
            </Text>
          )}
        </Space>
      </div>
    </Space>
  )
}
