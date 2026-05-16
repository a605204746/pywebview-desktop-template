import { useState, useCallback } from 'react'
import { Input, Button, Space, App, Typography } from 'antd'
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons'
import { C, CARD_STYLE } from '../theme'

const { Text } = Typography

interface Rgb { r: number; g: number; b: number }
interface Hsl { h: number; s: number; l: number }

function hexToRgb(hex: string): Rgb {
  return { r: parseInt(hex.slice(1,3),16), g: parseInt(hex.slice(3,5),16), b: parseInt(hex.slice(5,7),16) }
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r,g,b), min = Math.min(r,g,b)
  let h = 0, s = 0
  const l = (max+min)/2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d/(2-max-min) : d/(max+min)
    switch(max) {
      case r: h = ((g-b)/d+(g<b?6:0))/6; break
      case g: h = ((b-r)/d+2)/6; break
      default: h = ((r-g)/d+4)/6
    }
  }
  return { h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100) }
}

function isValidHex(h: string): boolean { return /^#[0-9a-fA-F]{6}$/.test(h) }

const PALETTE = [
  '#4E8B6F','#78B996','#C7EDCC','#2D6248','#7BAF93',
  '#FF85C0','#52C41A','#FFA940','#4096FF','#FF4D4F',
  '#722ED1','#13C2C2','#FA8C16','#EB2F96','#52E5B3',
]

interface ValueRowProps { label: string; value: string; onCopy: (v: string) => void }

function ValueRow({ label, value, onCopy }: ValueRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(var(--wt), 0.05)', borderRadius: 10, border: '1px solid rgba(var(--wt), 0.12)' }}>
      <div>
        <div style={{ fontSize: 10, color: C.sub, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: 'Consolas,monospace' }}>{value}</div>
      </div>
      <Button size="small" shape="circle" icon={<CopyOutlined />} onClick={() => onCopy(value)} style={{ borderColor: 'rgba(var(--wt), 0.3)', color: C.primary }} />
    </div>
  )
}

export default function ColorTool() {
  const { message } = App.useApp()
  const [hex, setHex]       = useState('#4E8B6F')
  const [inputVal, setInputVal] = useState('#4E8B6F')

  const copy = (v: string) => { void navigator.clipboard.writeText(v).then(() => { void message.success('已复制 🌰') }) }

  const applyHex = useCallback((h: string) => {
    if (isValidHex(h)) { setHex(h); setInputVal(h) }
  }, [])

  const rgb = isValidHex(hex) ? hexToRgb(hex) : { r:0, g:0, b:0 }
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)

  return (
    <Space orientation="vertical" size={18} style={{ width: '100%' }}>

      {/* 主拾色区 */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{
          width: 160, height: 160,
          borderRadius: 20,
          background: hex,
          boxShadow: `0 8px 30px ${hex}60`,
          border: '3px solid rgba(var(--bg-card), 0.7)',
          flexShrink: 0,
          transition: 'all 0.2s',
        }} />

        <Space orientation="vertical" size={10} style={{ flex: 1 }}>
          <Space>
            <input
              type="color"
              value={hex}
              onChange={(e) => applyHex(e.target.value)}
              style={{ width: 40, height: 34, border: '1.5px solid rgba(var(--wt), 0.3)', borderRadius: 8, background: 'transparent', cursor: 'pointer', padding: 2 }}
            />
            <Input
              value={inputVal}
              onChange={(e) => { setInputVal(e.target.value); if (isValidHex(e.target.value)) setHex(e.target.value) }}
              onBlur={() => { if (!isValidHex(inputVal)) setInputVal(hex) }}
              maxLength={7}
              style={{ width: 120, fontFamily: 'Consolas,monospace', fontWeight: 700, borderColor: 'rgba(var(--wt), 0.3)' }}
            />
            <Button
              shape="round"
              icon={<ReloadOutlined />}
              onClick={() => { const h='#'+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0'); setHex(h); setInputVal(h) }}
              style={{ borderColor: 'rgba(var(--wt), 0.5)', color: C.primary }}
            >
              随机
            </Button>
          </Space>

          <ValueRow label="HEX" value={hex.toUpperCase()} onCopy={copy} />
          <ValueRow label="RGB" value={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`} onCopy={copy} />
          <ValueRow label="HSL" value={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} onCopy={copy} />
        </Space>
      </div>

      {/* 通道条 */}
      <div style={{ ...CARD_STYLE, padding: '16px 20px' }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 12, fontWeight: 600 }}>🎨 颜色通道</div>
        <Space orientation="vertical" size={10} style={{ width: '100%' }}>
          {([
            { label: 'R 红', value: rgb.r, color: '#ff4d4f' },
            { label: 'G 绿', value: rgb.g, color: '#52c41a' },
            { label: 'B 蓝', value: rgb.b, color: '#4096ff' },
          ] as const).map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Text type="secondary" style={{ fontSize: 11, minWidth: 32 }}>{label}</Text>
              <div style={{ flex: 1, height: 8, background: 'rgba(var(--wt), 0.08)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(value/255)*100}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.2s' }} />
              </div>
              <Text style={{ fontSize: 12, minWidth: 28, textAlign: 'right', color: C.text, fontFamily: 'Consolas,monospace' }}>{value}</Text>
            </div>
          ))}
        </Space>
      </div>

      {/* 预设调色板 */}
      <div style={{ ...CARD_STYLE, padding: '16px 20px' }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 12, fontWeight: 600 }}>🌰 预设调色板</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PALETTE.map((c) => (
            <div
              key={c}
              onClick={() => applyHex(c)}
              title={c}
              style={{
                width: 34, height: 34,
                borderRadius: 10,
                background: c,
                cursor: 'pointer',
                border: hex.toLowerCase() === c.toLowerCase() ? '3px solid rgba(var(--bg-card), 1)' : '3px solid transparent',
                boxShadow: hex.toLowerCase() === c.toLowerCase() ? `0 0 0 2px ${c}, 0 4px 12px ${c}80` : '0 2px 6px rgba(0,0,0,0.15)',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>
    </Space>
  )
}
