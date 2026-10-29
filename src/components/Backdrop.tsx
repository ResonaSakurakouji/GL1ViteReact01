import type { Stage } from '../state/machine'

/** 原 #battleMenuS：一层纯黑遮罩。这里按状态给三档浓度，让看板内容不被压死 */
const OPACITY: Record<Stage, number> = {
  idle: 0,
  menu: 0.62,
  panel: 0.34,
  row: 0.34,
}

export function Backdrop({ stage }: { stage: Stage }) {
  return <div className="backdrop" style={{ opacity: OPACITY[stage] }} aria-hidden />
}
