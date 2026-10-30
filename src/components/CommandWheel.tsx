import { useEffect, useRef } from 'react'
import type { CSSProperties, Dispatch } from 'react'
import {
  BTN_W_VW,
  CENTER_LEFT_VW,
  LEFT_X_VW,
  NAV,
  closedOffset,
  cornerOffset,
} from '../data/menu.config'
import { waveDelay } from '../state/choreo'
import type { UiAction, UiState } from '../state/machine'

interface Props {
  state: UiState
  dispatch: Dispatch<UiAction>
}

/**
 * 九个指令按钮。原版靠 OrderEles.init() 遍历 DOM + classList 反推批次，
 * 这里直接读配置里的 side / order / top。
 *
 * 位置只看 state.wheel：
 *   wheel=true  → 全部回位
 *   被选中那枚 → 飞到左上角（其余靠 wheel 落下来才退场，由 beats 控制时机）
 */
export function CommandWheel({ state, dispatch }: Props) {
  const open = state.wheel
  const hostRef = useRef<HTMLDivElement>(null)

  /**
   * 关闭时把焦点从盘内移走。
   * 容器上如果同时有"焦点"和"aria-hidden / inert"，浏览器会拒绝隐藏它并报警告；
   * inert 本身会让浏览器把焦点弹到 body，这里再加一层保险（旧引擎不一定实现）。
   */
  useEffect(() => {
    if (open) return
    const host = hostRef.current
    const active = document.activeElement
    if (host && active instanceof HTMLElement && host.contains(active)) active.blur()
  }, [open])

  return (
    // 用 inert 而不是 aria-hidden：它同时移出无障碍树、禁止聚焦和点击。
    // data-layer=false 时整层纯透明 —— 面板里换主题时，被锚在角落的那枚
    // 会飞回画外、新的那枚再飞进来，这段过程不该被看见。
    <div className="wheel" ref={hostRef} inert={!open} data-layer={state.wheelLayer}>
      {NAV.map((item) => {
        // anchor 一旦落下就钉在左上角，直到 beats 在 256ms 后把它放回来
        const picked = state.anchor && state.pickedMenu === item.key
        const closed = closedOffset(item)
        const corner = cornerOffset(item)

        const tx = picked ? corner.x : open ? '0vw' : closed.x
        const ty = picked ? corner.y : open ? '0vh' : closed.y

        const anchor: CSSProperties =
          item.side === 'left'
            ? { left: `${LEFT_X_VW}vw` }
            : item.side === 'right'
              ? { right: `${LEFT_X_VW}vw` }
              : { left: `${CENTER_LEFT_VW}vw` }

        return (
          <button
            key={item.key}
            type="button"
            className={`cmd-btn${picked ? ' is-picked' : ''}`}
            disabled={!open}
            style={
              {
                ...anchor,
                top: `${item.top}vh`,
                width: `${BTN_W_VW}vw`,
                transform: `translate(${tx}, ${ty})`,
                // 刚被选过的那枚始终领舞：飞出去、飞回来都 0 延迟
                '--delay': `${state.pickedMenu === item.key ? 0 : waveDelay(item.order)}ms`,
                zIndex: picked ? 40 : undefined,
              } as CSSProperties
            }
            onClick={() => dispatch({ type: 'PICK_MENU', key: item.key })}
          >
            <span className="cmd-label">{item.label}</span>
            <span className="cmd-sub">{item.sub}</span>
          </button>
        )
      })}
    </div>
  )
}
