/**
 * 全站唯一的时间来源。
 *
 * 原 move.js 把 384ms 同时写在 CSS(.eio384) 和 JS(sleepS * 1024) 里，
 * 改一处忘一处就会漂移。这里只保留一份数字，CSS 变量在启动时由它生成。
 */
export const MOTION = {
  durFast: 128,
  durRow: 192,
  durPanel: 256,
  durMain: 384,
  stagger: 96,
} as const

export type MotionKey = keyof typeof MOTION

/**
 * 进入 / 退出面板的编排时间轴（ms，均从动作触发的那一刻算起）。
 *
 * 规则：
 *   1. 被点中的指令按钮飞向左上角，**与此同时**其余 8 枚开始退场（并行）；
 *   2. 两件事都结束（退场波浪最长，672ms）之后，面板与色带才动；
 *   3. 看板最后登场：面板落位（928ms）才从右侧滑入；
 *   4. 退场镜像：看板最先滑走，其余元素等它。
 *
 * 进入 panel：
 *   0        ── 被点按钮飞向左上角（durMain）
 *   0        ── 其余 8 枚同步退场，4 批 × stagger，最后一批 672ms 收尾
 *   384      ── 左边那枚落地，交叉淡入左上角标题（durFast）
 *   672      ── 退场结束，色带展开 + 面板滑入（durPanel）
 *   928      ── 面板落位，看板从右侧滑入（durMain）
 *   1312     ── 全部收尾
 *
 * 退出（panel → menu）：
 *   0        ── 看板先滑出右侧（durPanel）
 *   256      ── 面板滑出 / 色带收起 / 标题淡出 + 按钮飞回
 *   928      ── 全部收尾
 */
export const TIMELINE = {
  /** 被点按钮自身飞行 */
  fly: MOTION.durMain,
  /** 按钮 → 灰色标题的交叉淡入 */
  ghost: MOTION.durFast,
  /** 其余 8 枚退场结束的时刻：之后才轮到面板、色带 */
  lead: MOTION.stagger * 3 + MOTION.durMain,
  /** 看板入场起始：面板与色带落位之后 */
  dashIn: MOTION.stagger * 3 + MOTION.durMain + MOTION.durPanel,
  /** 看板自身入场时长 */
  dashDur: MOTION.durMain,
  /** 看板退场时长（也是其他元素等待它的时间） */
  dashOut: MOTION.durPanel,
} as const

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())

/** 把毫秒值注入 :root，供 CSS 的 transition-duration 使用 */
export function installMotionVars(root: HTMLElement = document.documentElement) {
  for (const [key, ms] of Object.entries(MOTION)) {
    root.style.setProperty(`--${kebab(key)}`, `${ms}ms`)
  }
}

/** framer-motion 用秒（保留给后续可能引入的动画库） */
export const sec = (ms: number) => ms / 1000

/** 与原版 ease-in-out / ease-out 对齐 */
export const EASE_IO = [0.42, 0, 0.58, 1] as const
export const EASE_OUT = [0, 0, 0.58, 1] as const
