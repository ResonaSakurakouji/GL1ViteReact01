import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import type { ComposeOption } from 'echarts/core'
import type { BarSeriesOption, LineSeriesOption } from 'echarts/charts'
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components'

/**
 * 按需注册，只引入用到的图表与组件。
 * 全量 `import * as echarts from 'echarts'` 会带进地图、树图、导出工具等，
 * 体积接近 1MB；按需引入只留柱状 / 折线 + 直角坐标系。
 */
echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer])

export { echarts }

export type ChartOption = ComposeOption<
  BarSeriesOption | LineSeriesOption | GridComponentOption | TooltipComponentOption
>

/** 和 app.css 的配色保持一致 */
export const P = {
  gold: '#ecc06b',
  goldMid: '#c6926a',
  goldSoft: 'rgba(198, 146, 106, 0.28)',
  line: 'rgba(236, 192, 107, 0.09)',
  axis: 'rgba(236, 192, 107, 0.26)',
  text: '#a79f92',
  dim: '#7a7267',
  hi: '#f0e9dc',
  tooltipBg: 'rgba(14, 12, 10, 0.94)',
} as const

export const BASE_TEXT = {
  fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif",
  color: P.text,
}

export const TOOLTIP_BASE = {
  backgroundColor: P.tooltipBg,
  borderColor: 'rgba(236, 192, 107, 0.28)',
  borderWidth: 1,
  padding: [6, 10],
  textStyle: { color: P.hi, fontSize: 11 },
  extraCssText: 'border-radius:6px;backdrop-filter:blur(6px);',
  axisPointer: {
    lineStyle: { color: 'rgba(236, 192, 107, 0.35)', width: 1 },
    shadowStyle: { color: 'rgba(236, 192, 107, 0.08)' },
    crossStyle: { color: 'rgba(236, 192, 107, 0.35)' },
  },
}
