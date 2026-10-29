import { useEffect, useRef, useState } from 'react'
import { BASE_TEXT, echarts, type ChartOption } from './echarts'

type Instance = ReturnType<typeof echarts.init>

/** 没有 Canvas 的环境（jsdom / 服务端）直接降级，不要让它抛错把整棵树带崩 */
let canvasOk: boolean | null = null
function hasCanvas(): boolean {
  if (canvasOk !== null) return canvasOk
  try {
    const probe = document.createElement('canvas')
    canvasOk = typeof probe.getContext === 'function' && Boolean(probe.getContext('2d'))
  } catch {
    canvasOk = false
  }
  return canvasOk
}

interface Props {
  option: ChartOption
  /** 无障碍描述，也用作降级文案 */
  label: string
}

/**
 * ECharts 的最小封装。
 *
 * 两条 effect 分工明确：
 *   · 挂载：init 一次 + 挂 ResizeObserver，卸载时 dispose
 *   · 数据：只 setOption(option, true)，不重建实例（重建会丢动画、也会漏 canvas）
 *
 * 画布用绝对定位铺满父容器，避免"canvas 尺寸 → 反馈给布局 → 再触发 resize"的循环。
 */
export function Chart({ option, label }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Instance | null>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (!hasCanvas()) {
      setFallback(true)
      return
    }

    let instance: Instance
    try {
      instance = echarts.init(host, undefined, { renderer: 'canvas' })
    } catch {
      setFallback(true)
      return
    }
    chartRef.current = instance

    const ro =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => instance.resize())
    ro?.observe(host)

    const onWindowResize = () => instance.resize()
    window.addEventListener('resize', onWindowResize)

    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', onWindowResize)
      instance.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption({ textStyle: BASE_TEXT, ...option }, true)
  }, [option])

  return (
    <div className="chart-body">
      <div ref={hostRef} className="chart-canvas" role="img" aria-label={label} />
      {fallback ? <div className="chart-fallback">{label} · 当前环境不支持 Canvas</div> : null}
    </div>
  )
}
