import { useEffect, useRef } from 'react'
import type { CSSProperties, Dispatch, KeyboardEvent } from 'react'
import { NAV_BY_KEY, levelNodes, resolvePath } from '../data/menu.config'
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
 * 结构：头部（左箭头 + 当前层级名）+ 可滚动列表 + 收起把手。
 *   · 左箭头：一键退层（跳过"取消叶子选中"这一步）
 *   · 右侧层级名：与之前整条头部的行为一致，先取消叶子选中，再退层
 *   · 叶子节点只切看板，不推进层级
 *   · 面板高度固定，条目多了在 .panel-body 内部滚动
 */
export function SidePanel({ state, dispatch }: Props) {
  const menu = state.pickedMenu ? NAV_BY_KEY.get(state.pickedMenu) : undefined
  const chain = menu ? resolvePath(menu.rows, state.path) : []
  const items = state.pickedMenu ? levelNodes(state.pickedMenu, state.path) : []

  const open = state.chrome
  const levelKey = `${state.pickedMenu ?? ''}/${state.path.join('.')}`

  // 当前层级的名称：第一层是主题本身，往下是所在节点
  const levelLabel = chain.length > 0 ? chain[chain.length - 1].label : (menu?.label ?? '')
  const backHint = state.path.length > 0 ? '返回上一级' : '返回指令盘'

  const forcePop = () => {
    if (open) dispatch({ type: 'POP', force: true })
  }
  const pop = () => {
    if (open) dispatch({ type: 'POP' })
  }

  const hostRef = useRef<HTMLElement>(null)

  /** 面板收起时把焦点移出去，避免"焦点留在 aria-hidden/inert 容器里"的告警 */
  useEffect(() => {
    if (open) return
    const host = hostRef.current
    const active = document.activeElement
    if (host && active instanceof HTMLElement && host.contains(active)) active.blur()
  }, [open])

  return (
    <aside
      className="panel"
      ref={hostRef}
      data-open={open}
      data-collapsed={state.collapsed}
      data-phase={state.listPhase}
      data-dir={state.listDir}
      inert={!open}
      aria-label="维度导航"
    >
      <div className="panel-head">
        <div
          className="panel-back"
          role="button"
          tabIndex={open ? 0 : -1}
          aria-label="返回上一级"
          title="返回上一级"
          onClick={forcePop}
          onKeyDown={activate(forcePop)}
        >
          <span className="panel-back-glyph">‹</span>
        </div>

        <div
          className="panel-name"
          role="button"
          tabIndex={open ? 0 : -1}
          aria-label={levelLabel}
          title={levelLabel}
          onClick={pop}
          onKeyDown={activate(pop)}
        >
          <span className="panel-name-text">{levelLabel}</span>
          <span className="panel-name-hint">{backHint}</span>
        </div>
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
