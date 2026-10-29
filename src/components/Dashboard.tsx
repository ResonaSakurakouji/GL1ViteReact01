import { useMemo } from 'react'
import { Chart } from '../charts/Chart'
import { barOption, rankOption, trendOption } from '../charts/options'
import type { DashView } from '../data/dashboard'

function Card({
  title,
  unit,
  label,
  option,
  className,
}: {
  title: string
  unit?: string
  label: string
  option: ReturnType<typeof barOption>
  className?: string
}) {
  return (
    <div className={`card chart${className ? ' ' + className : ''}`}>
      <div className="chart-head">
        <h2>{title}</h2>
        {unit ? <span className="chart-unit">{unit}</span> : null}
      </div>
      <Chart option={option} label={label} />
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
  // 数据不变就不重建 option，避免每次都 setOption 触发重绘
  const barOpt = useMemo(() => barOption(view.bars.items, view.bars.unit), [view.bars])
  const trendOpt = useMemo(() => trendOption(view.trend.points, view.trend.unit), [view.trend])
  const rankOpt = useMemo(() => rankOption(view.ranks.items, view.ranks.unit), [view.ranks])

  return (
    <section className="dash" data-active={active} data-compact={compact} aria-hidden={!active}>
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
        <Card title={view.bars.title} unit={view.bars.unit} label={view.bars.title} option={barOpt} />
        <Card
          title={view.trend.title}
          unit={view.trend.unit}
          label={view.trend.title}
          option={trendOpt}
        />
      </div>

      <Card
        title={view.ranks.title}
        label={view.ranks.title}
        option={rankOpt}
        className="ranks-card"
      />
    </section>
  )
}
