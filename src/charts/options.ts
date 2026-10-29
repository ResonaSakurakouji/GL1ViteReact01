import type { BarDatum, RankDatum } from '../data/dashboard'
import { P, TOOLTIP_BASE, type ChartOption } from './echarts'

/** 单值提示框：名称 + 单位 */
function valueTooltip(unit: string) {
  return (params: unknown): string => {
    const first = (Array.isArray(params) ? params[0] : params) as
      | { name?: string; axisValue?: string; value?: unknown; marker?: string }
      | undefined
    if (!first) return ''
    const name = first.axisValue ?? first.name ?? ''
    return `${first.marker ?? ''}${name}<br/><b style="color:${P.gold};font-size:13px">${String(
      first.value,
    )}</b> <span style="color:${P.dim}">${unit}</span>`
  }
}

const valueAxis = {
  type: 'value' as const,
  axisLine: { show: false },
  axisTick: { show: false },
  splitLine: { lineStyle: { color: P.line } },
  axisLabel: { color: P.dim, fontSize: 10 },
}

/** 月度销量分布 */
export function barOption(items: BarDatum[], unit: string): ChartOption {
  return {
    animationDuration: 480,
    animationEasing: 'cubicOut',
    grid: { left: 40, right: 12, top: 22, bottom: 26 },
    tooltip: { ...TOOLTIP_BASE, trigger: 'axis', formatter: valueTooltip(unit) },
    xAxis: {
      type: 'category',
      data: items.map((d) => d.label),
      axisLine: { lineStyle: { color: P.axis } },
      axisTick: { show: false },
      axisLabel: { color: P.dim, fontSize: 10, interval: 1 },
    },
    yAxis: valueAxis,
    series: [
      {
        type: 'bar',
        name: '销量',
        data: items.map((d) => d.value),
        barWidth: '46%',
        itemStyle: {
          borderRadius: [3, 3, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: P.gold },
              { offset: 1, color: P.goldSoft },
            ],
          },
        },
        emphasis: { itemStyle: { color: P.gold } },
      },
    ],
  }
}

/** 近 24 小时订单趋势 */
export function trendOption(points: number[], unit: string): ChartOption {
  const labels = points.map((_, i) => `${String(i).padStart(2, '0')}:00`)

  return {
    animationDuration: 600,
    animationEasing: 'cubicOut',
    grid: { left: 40, right: 14, top: 22, bottom: 26 },
    tooltip: { ...TOOLTIP_BASE, trigger: 'axis', formatter: valueTooltip(unit) },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: P.axis } },
      axisTick: { show: false },
      axisLabel: { color: P.dim, fontSize: 10, interval: 5 },
    },
    yAxis: valueAxis,
    series: [
      {
        type: 'line',
        name: '订单',
        data: points,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: P.gold },
        itemStyle: { color: P.gold },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(236, 192, 107, 0.34)' },
              { offset: 1, color: 'rgba(236, 192, 107, 0)' },
            ],
          },
        },
      },
    ],
  }
}

/** 区县贡献 Top N（横向条） */
export function rankOption(items: RankDatum[], unit: string): ChartOption {
  return {
    animationDuration: 480,
    animationEasing: 'cubicOut',
    grid: { left: 78, right: 58, top: 6, bottom: 6 },
    tooltip: { ...TOOLTIP_BASE, trigger: 'item', formatter: valueTooltip(unit) },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      // inverse 让第一项排在最上面，和数据里已有的降序一致
      inverse: true,
      data: items.map((d) => d.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: P.text, fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: items.map((d) => d.value),
        barWidth: '54%',
        itemStyle: {
          borderRadius: [0, 3, 3, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: P.goldSoft },
              { offset: 1, color: P.gold },
            ],
          },
        },
        label: {
          show: true,
          position: 'right',
          color: P.hi,
          fontSize: 11,
          formatter: `{c} ${unit}`,
        },
      },
    ],
  }
}
