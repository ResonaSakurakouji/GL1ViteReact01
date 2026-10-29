import type { CSSProperties, Dispatch, KeyboardEvent } from 'react'
import { levelNodes } from '../data/menu.config'
import type { UiAction, UiState } from '../state/machine'

interface Props {
  state: UiState
  dispatch: Dispatch<UiAction>
}

const activate = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault()
    fn()
  }
}

/**
 * 左侧多级导航面板。
 *
 * 结构：返回条 + 可滚动列表 + 收起把手。
 *   · 顶部返回条点击 = 回上一层（第一层时退回指令盘）
 *   · 叶子节点只切看板，不推进层级
 *   · 面板高度固定，条目多了在 .panel-body 内部滚动
 *
 * 层级动画只由 data-phase / data-dir 驱动 CSS，行本身不认识"正在干什么"：
 *   out + drill —— 当前层滑走，被点中的那项飞向顶部
 *   in  + drill —— 下一层从右侧滑入
 *   out + pop   —— 当前层滑走，回到上一层
 *   in  + pop   —— 上一层从左侧滑回
 */
export function SidePanel({ state, dispatch }: Props) {
  const items = state.pickedMenu ? levelNodes(state.pickedMenu, state.path) : []
  const open = state.chrome
  const levelKey = `${state.pickedMenu ?? ''}/${state.path.join('.')}`
  const backText = state.path.length > 0 ? '返回上一级' : '返回指令盘'

  const pop = () => {
    if (open) dispatch({ type: 'POP' })
  }

  return (
    <aside
      className="panel"
      data-open={open}
      data-collapsed={state.collapsed}
      data-phase={state.listPhase}
      data-dir={state.listDir}
      aria-hidden={!open}
      aria-label="维度导航"
    >
      <div
        className="panel-head"
        role="button"
        tabIndex={open ? 0 : -1}
        aria-label={backText}
        title={backText}
        onClick={pop}
        onKeyDown={activate(pop)}
      >
        <span className="panel-back-glyph">‹</span>
        <span className="panel-back-text">{backText}</span>
      </div>

      <div className="panel-body">
        <div className="panel-rows" key={levelKey}>
          {items.length === 0 ? (
            <div className="panel-empty">该层级没有下级维度</div>
          ) : (
            items.map((node, index) => {
              const drillable = Boolean(node.children?.length)
              return (
                <div
                  key={node.key}
                  className="panel-row"
                  role="button"
                  tabIndex={open ? 0 : -1}
                  aria-disabled={!open}
                  aria-current={state.leaf === node.key ? 'true' : undefined}
                  data-picked={state.drilling === node.key ? 'true' : undefined}
                  data-branch={drillable ? 'true' : undefined}
                  data-selected={state.leaf === node.key ? 'true' : undefined}
                  style={{ '--i': index, '--delay': `${index * 24}ms` } as CSSProperties}
                  onClick={() => {
                    if (open) dispatch({ type: 'PICK_ROW', key: node.key })
                  }}
                  onKeyDown={activate(() => {
                    if (open) dispatch({ type: 'PICK_ROW', key: node.key })
                  })}
                >
                  <span className="row-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="row-label">{node.label}</span>
                  {drillable ? <span className="row-chevron">›</span> : null}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div
        className="panel-tab"
        role="button"
        tabIndex={open ? 0 : -1}
        aria-expanded={open && !state.collapsed}
        aria-label={state.collapsed ? '展开面板' : '收起面板'}
        title={state.collapsed ? '展开面板' : '收起面板'}
        onClick={(e) => {
          e.stopPropagation()
          dispatch({ type: 'TOGGLE_COLLAPSE' })
        }}
        onKeyDown={(e) => {
          e.stopPropagation()
          activate(() => dispatch({ type: 'TOGGLE_COLLAPSE' }))(e)
        }}
      >
        <span className="panel-tab-glyph">{state.collapsed ? '▷' : '◁'}</span>
      </div>
    </aside>
  )
}
