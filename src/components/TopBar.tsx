import { useMemo } from 'react'
import type { Dispatch, KeyboardEvent, MouseEvent } from 'react'
import { NAV_BY_KEY, levelNodes, resolvePath } from '../data/menu.config'
import type { UiAction, UiState } from '../state/machine'

interface Props {
  state: UiState
  dispatch: Dispatch<UiAction>
}

const onActivateKey = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault()
    fn()
  }
}

/**
 * 顶部色带（原 #t0Bar）= 标签栏（上半）+ 面包屑（下半）。
 *
 * 色带本体是独立的一层，用 scaleX 从右侧扫入，所以里面的文字不会被横向压扁。
 * 内容整体让开左上角标题的宽度（21vw + 间距），永远不会被 CmdHeader 盖住。
 *
 * 标签页数据放在 reducer 里，TopBar 只在显隐之间复用它 —— 所以退场再回来，
 * 标签栏原样恢复（keep-alive）。也正因为这里面有可聚焦元素，隐藏时必须用
 * inert 而不是 aria-hidden。
 */
export function TopBar({ state, dispatch }: Props) {
  const active = state.chrome
  const tabIndex = active ? 0 : -1

  const crumbs = useMemo(() => {
    const menu = state.pickedMenu ? NAV_BY_KEY.get(state.pickedMenu) : undefined
    if (!menu) return []
    const trail = [menu.label, ...resolvePath(menu.rows, state.path).map((n) => n.label)]
    if (state.leaf) {
      const leaf = levelNodes(state.pickedMenu, state.path).find((n) => n.key === state.leaf)
      if (leaf) trail.push(leaf.label)
    }
    return trail
  }, [state.pickedMenu, state.path, state.leaf])

  const canSave = Boolean(state.pickedMenu)
  const save = () => {
    if (canSave) dispatch({ type: 'SAVE_TAB' })
  }

  return (
    <div className="topbar" data-active={active} inert={!active}>
      <div className="topbar-band" />

      <div className="topbar-inner">
        <div className="tabbar" role="tablist" aria-label="已保存的标签页">
          {state.tabs.length === 0 ? (
            <span className="tabbar-empty">点左下「＋ 另存」把当前视图存成标签</span>
          ) : (
            state.tabs.map((tab) => {
              const isActive = tab.id === state.activeTabId
              const open = () => dispatch({ type: 'ACTIVATE_TAB', id: tab.id })
              const close = (e: MouseEvent) => {
                e.stopPropagation()
                dispatch({ type: 'CLOSE_TAB', id: tab.id })
              }
              return (
                <div
                  key={tab.id}
                  className="tab"
                  data-active={isActive}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={tabIndex}
                  title={tab.title}
                  onClick={open}
                  onKeyDown={onActivateKey(open)}
                >
                  <span className="tab-label">{tab.label}</span>
                  <span
                    className="tab-close"
                    role="button"
                    aria-label={`删除标签 ${tab.label}`}
                    title="删除该标签页（同时丢弃它保存的状态）"
                    onClick={close}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                      onActivateKey(() => dispatch({ type: 'CLOSE_TAB', id: tab.id }))(e)
                    }}
                  >
                    ×
                  </span>
                </div>
              )
            })
          )}
        </div>

        <div className="crumbbar">
          <span
            className="tab-save"
            role="button"
            tabIndex={tabIndex}
            aria-label="另存为标签页"
            aria-disabled={!canSave}
            title="把当前视图另存为标签页"
            onClick={save}
            onKeyDown={onActivateKey(save)}
          >
            ＋ 另存
          </span>

          <ol className="topbar-crumbs">
            {crumbs.map((label, i) => (
              <li
                key={`${label}-${i}`}
                className={i === crumbs.length - 1 ? 'is-current' : undefined}
              >
                {label}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
