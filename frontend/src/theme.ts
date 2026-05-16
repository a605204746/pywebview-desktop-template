import type { CSSProperties } from 'react'

/**
 * CSS 自定义属性引用。
 * 实际颜色值在 global.css 中根据 [data-theme] 切换。
 */
export const C = {
  // 随主题变化的颜色
  text:    'rgb(var(--wt-text))',
  sub:     'rgb(var(--wt-sub))',
  primary: 'rgb(var(--wt))',

  // 固定颜色（不随主题变化）
  green: '#52c41a',
  amber: '#ffa940',
  blue:  '#4096ff',
  pink:  '#ff85c0',
  red:   '#ff4d4f',
} as const

/** 通用卡片样式（自动适配深浅色）。 */
export const CARD_STYLE: CSSProperties = {
  borderRadius:   16,
  border:         '1.5px solid rgba(var(--wt), 0.18)',
  boxShadow:      '0 4px 20px var(--shadow)',
  background:     'rgba(var(--bg-card), 0.88)',
  backdropFilter: 'blur(8px)',
}

export const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
