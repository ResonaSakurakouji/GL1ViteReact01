import type { Dispatch } from 'react'
import { NAV_BY_KEY } from '../data/menu.config'
import { headerDelay } from '../state/choreo'
import type { UiAction, UiState } from '../state/machine'

interface Props {
  state: UiState
  dispatch: Dispatch<UiAction>
}

/**
 * 原 #btn_LT_b：固定左上角的灰色占位条。
 * 被选中的指令按钮飞到这里交叉淡入，成为看板标题。
 *
 * 点击 = 回主页面：面板 / 看板 / 色带同刻撤离。
 * 想只退一层，用面板顶部的返回条或 Esc。
 */
export function CmdHeader({ state, dispatch }: Props) {
  const menu = state.pickedMenu ? NAV_BY_KEY.get(state.pickedMenu) : undefined
  const on = Boolean(menu) && state.anchor

  return (
    <button
      type="button"
      className="cmd-header"
      data-on={on}
      disabled={!on}
      style={{ transitionDelay: on ? `${headerDelay}ms` : '0ms' }}
      onClick={(e) => {
        e.stopPropagation()
        dispatch({ type: 'HOME' })
      }}
    >
      <span className="cmd-header-label">{menu?.label ?? ''}</span>
      <span className="cmd-header-hint">回到主页面</span>
    </button>
  )
}
