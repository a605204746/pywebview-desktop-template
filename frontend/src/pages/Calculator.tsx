import { useState, useEffect, useCallback } from 'react'
import { Typography } from 'antd'
import { C } from '../theme'

const { Text } = Typography

type BtnStyle = 'func' | 'num' | 'op' | 'eq' | 'zero'

interface BtnDef { label: string; op: string; style: BtnStyle }

const BUTTONS: BtnDef[][] = [
  [
    { label: 'AC',  op: 'clear',  style: 'func' },
    { label: '+/-', op: 'negate', style: 'func' },
    { label: '%',   op: '%',      style: 'func' },
    { label: '÷',   op: '/',      style: 'op'   },
  ],
  [
    { label: '7', op: '7', style: 'num' },
    { label: '8', op: '8', style: 'num' },
    { label: '9', op: '9', style: 'num' },
    { label: '×', op: '*', style: 'op'  },
  ],
  [
    { label: '4', op: '4', style: 'num' },
    { label: '5', op: '5', style: 'num' },
    { label: '6', op: '6', style: 'num' },
    { label: '−', op: '-', style: 'op'  },
  ],
  [
    { label: '1', op: '1', style: 'num' },
    { label: '2', op: '2', style: 'num' },
    { label: '3', op: '3', style: 'num' },
    { label: '+', op: '+', style: 'op'  },
  ],
  [
    { label: '0', op: '0', style: 'zero' },
    { label: '.', op: '.', style: 'num'  },
    { label: '=', op: '=', style: 'eq'   },
  ],
]

const BTN_STYLES: Record<BtnStyle, { bg: string; border: string; color: string; hover: string }> = {
  num:  { bg: 'rgba(var(--bg-card), 0.9)',  border: 'rgba(var(--wt), 0.18)', color: C.text,    hover: 'rgba(var(--wt), 0.12)' },
  func: { bg: 'rgba(var(--wt), 0.12)',      border: 'rgba(var(--wt), 0.25)', color: C.text,    hover: 'rgba(var(--wt), 0.22)'  },
  op:   { bg: 'rgba(var(--wt), 0.1)',       border: 'rgba(var(--wt), 0.35)', color: C.primary, hover: 'rgba(var(--wt), 0.22)'  },
  eq:   { bg: 'linear-gradient(135deg, rgb(var(--wt)), rgba(var(--wt), 0.75))', border: 'transparent', color: '#fff', hover: '' },
  zero: { bg: 'rgba(var(--bg-card), 0.9)',  border: 'rgba(var(--wt), 0.18)', color: C.text,    hover: 'rgba(var(--wt), 0.12)' },
}

function evaluate(expr: string): string {
  try {
    // eslint-disable-next-line no-new-func
    const r = Function('"use strict"; return (' + expr + ')')() as number
    if (!isFinite(r)) return 'ERR'
    return parseFloat(r.toPrecision(12)).toString()
  } catch { return 'ERR' }
}

export default function Calculator() {
  const [display, setDisplay]       = useState('0')
  const [expr, setExpr]             = useState('')
  const [history, setHistory]       = useState<string[]>([])
  const [justEvaled, setJustEvaled] = useState(false)

  const press = useCallback((op: string) => {
    if (op === 'clear') { setDisplay('0'); setExpr(''); setJustEvaled(false); return }
    if (op === 'negate') {
      if (display !== '0' && display !== 'ERR') setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display)
      return
    }
    if (op === '=') {
      if (!expr && display === '0') return
      const full = (expr || '') + display
      const result = evaluate(full)
      setHistory((h) => [`${full} = ${result}`, ...h].slice(0, 10))
      setDisplay(result); setExpr(''); setJustEvaled(true)
      return
    }
    const isOp = ['+','-','*','/'].includes(op)
    if (isOp) {
      if (display === 'ERR') { setDisplay('0'); setExpr(''); return }
      setExpr((expr || '') + display + op); setDisplay('0'); setJustEvaled(false)
      return
    }
    if (op === '%') {
      const v = parseFloat(display)
      setDisplay(isNaN(v) ? '0' : (v/100).toString())
      return
    }
    if (justEvaled) { setDisplay(op === '.' ? '0.' : op); setExpr(''); setJustEvaled(false); return }
    if (op === '.' && display.includes('.')) return
    setDisplay(display === '0' && op !== '.' ? op : display + op)
  }, [display, expr, justEvaled])

  useEffect(() => {
    const KEY_MAP: Record<string, string> = {
      '0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9',
      '.':'.', '+':'+','-':'-','*':'*','/':'/',
      Enter:'=','=':'=', Escape:'clear', '%':'%',
    }
    function onKey(e: KeyboardEvent) {
      const op = KEY_MAP[e.key]
      if (!op) {
        if (e.key === 'Backspace') { e.preventDefault(); setDisplay((d) => d.length > 1 && d !== 'ERR' ? d.slice(0,-1) : '0') }
        return
      }
      e.preventDefault(); press(op)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press])

  const displayFontSize = display.length > 12 ? 20 : display.length > 8 ? 26 : 34

  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', justifyContent: 'center' }}>

      {/* 计算器主体 */}
      <div style={{
        width: 300,
        background: 'rgba(var(--bg-card), 0.92)',
        borderRadius: 24,
        border: '1.5px solid rgba(var(--wt), 0.2)',
        boxShadow: '0 12px 40px var(--shadow)',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
      }}>
        {/* 显示区 */}
        <div style={{
          padding: '24px 20px 16px',
          background: 'linear-gradient(135deg, rgba(var(--wt), 0.08) 0%, rgba(var(--wt), 0.04) 100%)',
          borderBottom: '1px solid rgba(var(--wt), 0.12)',
          textAlign: 'right',
        }}>
          <div style={{ fontSize: 11, color: C.sub, minHeight: 18, fontFamily: 'Consolas,monospace', marginBottom: 6 }}>
            {expr || ' '}
          </div>
          <div style={{
            fontSize: displayFontSize,
            fontWeight: 800,
            color: display === 'ERR' ? C.red : C.text,
            fontFamily: '"Consolas","Monaco",monospace',
            fontVariantNumeric: 'tabular-nums',
            wordBreak: 'break-all',
            lineHeight: 1.1,
            transition: 'font-size 0.1s',
          }}>
            {display}
          </div>
        </div>

        {/* 按键区 */}
        <div style={{ padding: '12px 14px 16px' }}>
          {BUTTONS.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {row.map(({ label, op, style }) => {
                const s = BTN_STYLES[style]
                const isZero = style === 'zero'
                const isEq   = style === 'eq'
                return (
                  <button
                    key={op}
                    onClick={() => press(op)}
                    style={{
                      flex: isZero ? 2 : 1,
                      height: 56,
                      background: s.bg,
                      border: `1.5px solid ${s.border}`,
                      borderRadius: 14,
                      color: s.color,
                      fontSize: 17,
                      fontWeight: isEq ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.1s',
                      boxShadow: isEq ? '0 4px 12px rgba(var(--wt), 0.35)' : '0 2px 4px rgba(var(--wt), 0.08)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isEq) e.currentTarget.style.background = s.hover
                      e.currentTarget.style.transform = 'scale(0.96)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isEq) e.currentTarget.style.background = s.bg
                      e.currentTarget.style.transform = ''
                    }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.93)' }}
                    onMouseUp={(e)   => { e.currentTarget.style.transform = 'scale(0.96)' }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 历史记录 */}
      <div style={{
        width: 200,
        background: 'rgba(var(--bg-card), 0.88)',
        borderRadius: 16,
        border: '1.5px solid rgba(var(--wt), 0.18)',
        boxShadow: '0 4px 20px var(--shadow)',
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(var(--wt), 0.12)', fontWeight: 600, fontSize: 13, color: C.text }}>
          📜 历史记录
        </div>
        <div style={{ padding: '8px 14px', maxHeight: 380, overflow: 'auto' }}>
          {history.length === 0 ? (
            <div style={{ color: C.sub, fontSize: 12, padding: '20px 0', textAlign: 'center' }}>暂无记录 🌰</div>
          ) : history.map((h, i) => (
            <div
              key={i}
              style={{ padding: '6px 0', borderBottom: '1px solid rgba(var(--wt), 0.07)', fontSize: 12, color: i === 0 ? C.text : C.sub, textAlign: 'right', fontFamily: 'Consolas,monospace', cursor: 'pointer' }}
              onClick={() => {
                const result = h.split(' = ')[1]
                if (result) { setDisplay(result); setExpr(''); setJustEvaled(true) }
              }}
            >
              {h}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
