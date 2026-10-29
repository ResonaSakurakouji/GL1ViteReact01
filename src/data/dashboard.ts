import { NAV_BY_KEY, levelNodes, resolvePath } from './menu.config'

export interface Kpi {
  label: string
  value: string
  unit: string
  delta: number
}

export interface BarDatum {
  label: string
  value: number
}

export interface RankDatum {
  label: string
  value: string
  pct: number
}

export interface DashView {
  title: string
  sub: string
  stamp: string
  kpis: Kpi[]
  bars: { title: string; unit: string; items: BarDatum[] }
  trend: { title: string; unit: string; points: number[] }
  ranks: { title: string; items: RankDatum[] }
}

/** 确定性伪随机：同一个 key 永远得到同一组数字，避免每次渲染数据跳动 */
const fnv = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const lcg = (seed: number) => {
  let s = seed || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export function buildView(menuKey: string | null, path: string[] = [], leaf: string | null = null): DashView {
  const menu = menuKey ? NAV_BY_KEY.get(menuKey) : undefined
  const chain = menu ? resolvePath(menu.rows, path) : []
  // 叶子节点只切看板，不进 path，所以这里单独取一次
  const leafNode = leaf ? levelNodes(menuKey, path).find((n) => n.key === leaf) : undefined
  const focus = leafNode ?? chain[chain.length - 1]

  const seedKey = `${menuKey ?? 'idle'}/${chain.map((n) => n.key).join('.')}#${leaf ?? ''}`
  const rand = lcg(fnv(seedKey))

  const title = focus ? `${menu?.label} · ${focus.label}` : (menu?.label ?? '全国汇总')
  const trail = [...chain.map((n) => n.label), ...(leafNode ? [leafNode.label] : [])]
  const sub = trail.length ? `维度下钻 / ${trail.join(' / ')}` : (menu?.sub ?? '全量总览')

  const base = 60 + Math.floor(rand() * 240)

  const kpis: Kpi[] = [
    {
      label: '在网终端',
      value: (base * 137).toLocaleString('zh-CN'),
      unit: '家',
      delta: +(rand() * 18 - 5).toFixed(1),
    },
    {
      label: '本月销量',
      value: (base * 21.4).toFixed(1),
      unit: '万件',
      delta: +(rand() * 22 - 8).toFixed(1),
    },
    {
      label: '库存周转',
      value: (1.6 + rand() * 2.4).toFixed(2),
      unit: '次/月',
      delta: +(rand() * 12 - 6).toFixed(1),
    },
    {
      label: '待办预警',
      value: String(3 + Math.floor(rand() * 42)),
      unit: '单',
      delta: +(rand() * 30 - 20).toFixed(1),
    },
  ]

  const bars: BarDatum[] = MONTHS.map((label) => ({
    label,
    value: Math.round(base * (0.55 + rand() * 0.85)),
  }))

  const points: number[] = Array.from({ length: 24 }, (_, i) => {
    const drift = Math.sin(i / 3.2) * 12
    return Math.max(8, Math.round(base * 0.6 + drift + rand() * 26))
  })

  const pool = menu?.rows ?? NAV_BY_KEY.get('overview')!.rows
  const ranks: RankDatum[] = pool
    .map((r) => ({ label: r.label, v: 0.35 + rand() }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 5)
    .map((r, i) => ({
      label: r.label,
      value: `${(base * r.v * (5 - i * 0.35)).toFixed(1)} 万`,
      pct: Math.round((r.v / 1.35) * 100),
    }))

  return {
    title,
    sub,
    stamp: '数据截至 14:00 · 模拟数据',
    kpis,
    bars: { title: '月度销量分布', unit: '万件', items: bars },
    trend: { title: '近 24 小时订单趋势', unit: '单', points },
    ranks: { title: '区县贡献 Top 5', items: ranks },
  }
}
