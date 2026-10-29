import type { BarDatum, DashView, RankDatum } from '../data/dashboard'

function Bars({ items, unit }: { items: BarDatum[]; unit: string }) {
  const max = Math.max(...items.map((i) => i.value))
  return (
    <div className="bars">
      {items.map((item) => (
        <div className="bar" key={item.label}>
          <span className="bar-value">{item.value}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ height: `${(item.value / max) * 100}%` }} />
          </div>
          <span className="bar-label">{item.label}</span>
        </div>
      ))}
      <span className="chart-unit">{unit}</span>
    </div>
  )
}

function Trend({ points, unit }: { points: number[]; unit: string }) {
  const W = 100
  const H = 40
  const max = Math.max(...points)
  const min = Math.min(...points)
  const span = max - min || 1
  const xy = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W
    const y = H - ((v - min) / span) * (H - 4) - 2
    return [x, y] as const
  })
  const line = xy.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const area = `M0,${H} L${line.split(' ').join(' L')} L${W},${H} Z`

  return (
    <div className="trend">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="近 24 小时订单趋势">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c6926a" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#c6926a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#trendFill)" />
        <polyline
          points={line}
          fill="none"
          stroke="#ecc06b"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {xy.map(([x, y], i) =>
          i === xy.length - 1 ? (
            <circle key={i} cx={x} cy={y} r="1.2" fill="#f6dfae" vectorEffect="non-scaling-stroke" />
          ) : null,
        )}
      </svg>
      <div className="trend-axis">
        <span>00:00</span>
        <span>12:00</span>
        <span>24:00</span>
      </div>
      <span className="chart-unit">{unit}</span>
    </div>
  )
}

function Ranks({ items }: { items: RankDatum[] }) {
  return (
    <div className="ranks">
      {items.map((item, i) => (
        <div className="rank" key={item.label}>
          <span className="rank-no">{String(i + 1).padStart(2, '0')}</span>
          <span className="rank-label">{item.label}</span>
          <div className="rank-track">
            <div className="rank-fill" style={{ width: `${item.pct}%` }} />
          </div>
          <span className="rank-value">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export function Dashboard({
  view,
  active,
  compact,
}: {
  view: DashView
  active: boolean
  /** 左侧面板收起时，看板向左拉伸补位 */
  compact: boolean
}) {
  return (
    <section
      className="dash"
      data-active={active}
      data-compact={compact}
      aria-hidden={!active}
    >
      <header className="dash-head">
        <div>
          <h1 className="dash-title">{view.title}</h1>
          <p className="dash-sub">{view.sub}</p>
        </div>
        <span className="dash-stamp">{view.stamp}</span>
      </header>

      <div className="kpis">
        {view.kpis.map((kpi) => (
          <div className="card kpi" key={kpi.label}>
            <span className="kpi-label">{kpi.label}</span>
            <span className="kpi-value">
              {kpi.value}
              <em>{kpi.unit}</em>
            </span>
            <span className={`kpi-delta${kpi.delta >= 0 ? ' up' : ' down'}`}>
              {kpi.delta >= 0 ? '▲' : '▼'} {Math.abs(kpi.delta)}%
            </span>
          </div>
        ))}
      </div>

      <div className="charts">
        <div className="card chart">
          <div className="chart-head">
            <h2>{view.bars.title}</h2>
          </div>
          <Bars items={view.bars.items} unit={view.bars.unit} />
        </div>

        <div className="card chart">
          <div className="chart-head">
            <h2>{view.trend.title}</h2>
          </div>
          <Trend points={view.trend.points} unit={view.trend.unit} />
        </div>
      </div>

      <div className="card chart ranks-card">
        <div className="chart-head">
          <h2>{view.ranks.title}</h2>
        </div>
        <Ranks items={view.ranks.items} />
      </div>
    </section>
  )
}
