import { MOTION, TIMELINE } from '../data/motion'

/**
 * 只负责"同一个波浪里，每个元素错开多少"。
 *
 * 段落之间的先后顺序不在这里——那由 machine.ts 的 beats 决定，
 * 因为顺序必须能被定时器推进，不能依赖 CSS 的 transition-delay
 * （延迟会随重渲染被重算，动画会被提前或拖后）。
 */

/** 指令按钮批次错峰。方向存配置，这里只把 order 换算成毫秒 */
export function waveDelay(order: number): number {
  return (order - 1) * MOTION.stagger
}

/** 面板内子行错峰：整排 192ms 里均分 */
export function rowDelay(index: number, count: number): number {
  return index * (MOTION.durRow / Math.max(count, 1))
}

/** 左上角标题：按钮落到左上角的那一刻开始交叉淡入 */
export const headerDelay = TIMELINE.fly
