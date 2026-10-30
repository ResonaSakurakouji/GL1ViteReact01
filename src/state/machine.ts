import { MOTION, TIMELINE } from '../data/motion'
import { MAX_DEPTH, NAV_BY_KEY, levelNodes, resolvePath } from '../data/menu.config'

/**
 * 编排模型
 * ========
 * 四个"就位标志" + 一串定时节拍。标志只回答"这个元素现在该在目标位还是起始位"，
 * 节拍负责在正确的时间点翻标志。CSS 里没有阶段延迟，只剩每个元素自己的
 * 波浪错峰（--delay）。
 *
 *   wheel  —— 指令盘是否在位（9 个按钮是否展开）
 *   anchor —— 被选中的那枚是否钉在左上角
 *   chrome —— 左侧面板 / 顶部色带是否就位
 *   board  —— 主看板是否就位
 *
 * 进入 panel：0 起锚+其余退场 → 672 面板+色带 → 928 看板 → 1312 落定
 * 离开 panel（POP 到指令盘）：0 看板走 → 256 面板走 + 按钮回
 * 回主页（HOME）：面板 / 看板 / 色带同刻撤离，撤完才清内容
 *
 * 面板内部层级：
 *   listPhase = 'out' → 'in' → 'idle'，listDir = 'drill' | 'pop'
 */
export type Stage = 'idle' | 'menu' | 'panel' | 'row'

/**
 * 标签页快照 = keep-alive。
 * 只存"看哪一页"（主题 + 下钻路径 + 叶子），内容由 buildView 按快照重算，
 * 所以标签页不占额外内存，删掉即彻底丢弃。
 */
export interface TabSnapshot {
  id: string
  /** 标签上显示的短名（最深一级） */
  label: string
  /** 悬浮时显示的完整路径 */
  title: string
  pickedMenu: string
  path: string[]
  leaf: string | null
}

const tabSig = (t: Pick<TabSnapshot, 'pickedMenu' | 'path' | 'leaf'>) =>
  `${t.pickedMenu}/${t.path.join('.')}#${t.leaf ?? ''}`

/** 由当前视角推出标签的短名 / 全路径 */
function viewLabel(menuKey: string, path: string[], leaf: string | null) {
  const menu = NAV_BY_KEY.get(menuKey)
  if (!menu) return { label: menuKey, title: menuKey }
  const labels = [menu.label, ...resolvePath(menu.rows, path).map((n) => n.label)]
  if (leaf) {
    const node = levelNodes(menuKey, path).find((n) => n.key === leaf)
    if (node) labels.push(node.label)
  }
  return { label: labels[labels.length - 1] ?? menu.label, title: labels.join(' / ') }
}

export interface Beat {
  at: number
  patch: Partial<UiPatch>
}

export type UiPatch = Pick<
  UiState,
  | 'wheel'
  | 'anchor'
  | 'chrome'
  | 'board'
  | 'lockMs'
  | 'stage'
  | 'path'
  | 'leaf'
  | 'drilling'
  | 'listPhase'
  | 'listDir'
  | 'pickedMenu'
  | 'collapsed'
  | 'tabs'
  | 'activeTabId'
>

export interface UiState {
  stage: Stage
  wheel: boolean
  anchor: boolean
  chrome: boolean
  board: boolean
  pickedMenu: string | null
  /** 下钻路径（不含一级菜单），长度 0..MAX_DEPTH；只记有下级的节点 */
  path: string[]
  /** 当前层里被点中的叶子节点：只切看板，不推进层级 */
  leaf: string | null
  /** 正在飞向面板顶部的那一项，只服务于离场动画 */
  drilling: string | null
  listPhase: 'idle' | 'out' | 'in'
  listDir: 'drill' | 'pop'
  collapsed: boolean
  /** 顶部标签栏：独立于面板显隐，TopBar 退场也不会丢 */
  tabs: TabSnapshot[]
  activeTabId: string | null
  /** 自增，用于生成稳定的 tab id */
  tabSeq: number
  /** > 0 表示输入闸门关闭，期间吞掉点击 */
  lockMs: number
  beats: Beat[]
  seq: number
}

export type UiAction =
  | { type: 'OPEN_MENU' }
  | { type: 'PICK_MENU'; key: string }
  | { type: 'PICK_ROW'; key: string }
  /**
   * 返回上一层；面板第一层时退回指令盘。
   * force = true 时跳过"取消叶子选中"，直接退一层（面板左侧返回箭头用）。
   */
  | { type: 'POP'; force?: boolean }
  /** 回主页面 = 指令盘；面板 / 看板 / 色带同步撤离，撤完指令盘再飞回 */
  | { type: 'HOME' }
  | { type: 'TOGGLE_COLLAPSE' }
  /** 把当前视角存成一个标签页（已存在则直接激活） */
  | { type: 'SAVE_TAB' }
  /** 切到某个标签页，恢复它保存的视角 */
  | { type: 'ACTIVATE_TAB'; id: string }
  /** 删除标签页，连同它保存的状态一起丢掉 */
  | { type: 'CLOSE_TAB'; id: string }
  | { type: 'BEAT'; patch: Partial<UiPatch> }
  | { type: 'SETTLE' }

export const INITIAL: UiState = {
  stage: 'idle',
  wheel: false,
  anchor: false,
  chrome: false,
  board: false,
  pickedMenu: null,
  path: [],
  leaf: null,
  drilling: null,
  listPhase: 'idle',
  listDir: 'drill',
  collapsed: false,
  tabs: [],
  activeTabId: null,
  tabSeq: 0,
  lockMs: 0,
  beats: [],
  seq: 0,
}

export const T = {
  openMenu: MOTION.stagger * 3 + MOTION.durMain,
  pickMenuLock: TIMELINE.dashIn,
  backMenu: TIMELINE.dashOut + MOTION.stagger * 3 + MOTION.durMain,
  /** 面板内一层：滑走 + 滑入 */
  rowOut: MOTION.durRow,
  rowIn: MOTION.durRow,
  rowDrill: MOTION.durRow * 2,
  /** 同步撤离：三者同刻走完 */
  home: MOTION.durPanel + 64,
  /** 同步撤离 + 指令盘重新飞回（HOME 的完整时长） */
  homeToMenu: MOTION.durPanel + MOTION.stagger * 3 + MOTION.durMain,
} as const

const isOpen = (s: Stage) => s === 'panel' || s === 'row'

const go = (s: UiState, patch: Partial<UiState>, lockMs: number, beats?: Beat[]): UiState => ({
  ...s,
  ...patch,
  lockMs,
  beats: beats ?? s.beats,
  seq: s.seq + 1,
})

export function reducer(state: UiState, action: UiAction): UiState {
  if (action.type === 'BEAT') return { ...state, ...action.patch }
  if (action.type === 'SETTLE') return state.lockMs === 0 ? state : { ...state, lockMs: 0 }

  /**
   * 收起 / 展开幂等可逆，任何时刻都放行——否则面板刚滑到一半时把手会"点不动"。
   * 刻意不动 seq / lockMs：不能把正在跑的编排计时器一起重置。
   */
  if (action.type === 'TOGGLE_COLLAPSE') {
    if (!isOpen(state.stage)) return state
    return { ...state, collapsed: !state.collapsed }
  }

  /**
   * 标签栏操作也绕过闸门：TopBar 在面板落位之前就已经可见，
   * 这几个动作幂等、可逆，不该让控件"看得见点不动"。
   * 同样刻意不动 seq / lockMs，避免重置正在跑的编排定时器。
   */
  if (action.type === 'SAVE_TAB') {
    if (!isOpen(state.stage) || !state.pickedMenu) return state
    const cur = { pickedMenu: state.pickedMenu, path: state.path, leaf: state.leaf }
    const dup = state.tabs.find((t) => tabSig(t) === tabSig(cur))
    if (dup) return { ...state, activeTabId: dup.id }
    const { label, title } = viewLabel(cur.pickedMenu, cur.path, cur.leaf)
    const tab: TabSnapshot = {
      id: `tab-${state.tabSeq}`,
      label,
      title,
      pickedMenu: cur.pickedMenu,
      path: [...cur.path],
      leaf: cur.leaf,
    }
    return { ...state, tabs: [...state.tabs, tab], activeTabId: tab.id, tabSeq: state.tabSeq + 1 }
  }

  if (action.type === 'ACTIVATE_TAB') {
    const tab = state.tabs.find((t) => t.id === action.id)
    if (!tab || !isOpen(state.stage)) return state
    return {
      ...state,
      stage: tab.path.length > 0 ? 'row' : 'panel',
      pickedMenu: tab.pickedMenu,
      path: [...tab.path],
      leaf: tab.leaf,
      drilling: null,
      listPhase: 'idle',
      collapsed: false,
      activeTabId: tab.id,
    }
  }

  if (action.type === 'CLOSE_TAB') {
    const tabs = state.tabs.filter((t) => t.id !== action.id)
    if (tabs.length === state.tabs.length) return state
    return {
      ...state,
      tabs,
      activeTabId: state.activeTabId === action.id ? null : state.activeTabId,
    }
  }

  if (state.lockMs > 0) return state

  switch (action.type) {
    case 'OPEN_MENU':
      if (state.stage !== 'idle') return state
      return go(state, { stage: 'menu', wheel: true }, T.openMenu)

    case 'PICK_MENU':
      if (state.stage !== 'menu') return state
      return go(
        state,
        {
          stage: 'panel',
          pickedMenu: action.key,
          path: [],
          leaf: null,
          drilling: null,
          listPhase: 'idle',
          collapsed: false,
          anchor: true,
          wheel: false,
          activeTabId: null,
        },
        T.pickMenuLock,
        [
          { at: TIMELINE.lead, patch: { chrome: true } },
          { at: T.pickMenuLock, patch: { board: true } },
        ],
      )

    case 'PICK_ROW': {
      if (!isOpen(state.stage) || state.collapsed) return state
      const items = levelNodes(state.pickedMenu, state.path)
      const node = items.find((n) => n.key === action.key)
      if (!node) return state

      // 叶子节点：只切看板，不推进层级（也就不触发翻页动画）
      if (!node.children?.length) {
        return { ...state, leaf: action.key, activeTabId: null }
      }

      if (state.path.length >= MAX_DEPTH) return state
      return go(
        state,
        {
          stage: 'row',
          leaf: null,
          drilling: action.key,
          listPhase: 'out',
          listDir: 'drill',
          activeTabId: null,
        },
        T.rowDrill,
        [
          {
            at: T.rowOut,
            patch: { path: [...state.path, action.key], drilling: null, listPhase: 'in' },
          },
          { at: T.rowDrill, patch: { listPhase: 'idle' } },
        ],
      )
    }

    case 'POP': {
      // 叶子只是"选中"，不算一层：先取消选中，面包屑才会一层一层往回缩。
      // 左侧返回箭头走 force，跳过这一步直接退层。
      if (!action.force && state.leaf) return { ...state, leaf: null, activeTabId: null }
      if (state.stage === 'row') {
        const next = state.path.slice(0, -1)
        return go(
          state,
          { leaf: null, listPhase: 'out', listDir: 'pop', drilling: null, activeTabId: null },
          T.rowDrill,
          [
            {
              at: T.rowOut,
              patch: { path: next, stage: next.length === 0 ? 'panel' : 'row', listPhase: 'in' },
            },
            { at: T.rowDrill, patch: { listPhase: 'idle' } },
          ],
        )
      }
      if (state.stage === 'panel') {
        // 退回指令盘：看板先走，面板与按钮等它
        return go(
          state,
          { stage: 'menu', board: false, leaf: null, listPhase: 'idle', activeTabId: null },
          T.backMenu,
          [{ at: TIMELINE.dashOut, patch: { chrome: false, wheel: true, anchor: false } }],
        )
      }
      if (state.stage === 'menu') {
        return go(
          state,
          {
            stage: 'idle',
            wheel: false,
            anchor: false,
            pickedMenu: null,
            path: [],
            leaf: null,
            drilling: null,
            collapsed: false,
            activeTabId: null,
          },
          T.openMenu,
        )
      }
      return state
    }

    /**
     * 回主页面 = 指令盘。
     * 面板 / 看板 / 色带同刻撤离（都用 dur-panel）。
     *
     * 关键：anchor 不能在 t=0 就放开。否则被选中的那枚会先按"收起位"
     * 飞到屏幕外，等 wheel 打开再飞回来——也就是"先飞出去再飞回来"。
     * 放在 256ms 这一拍和 wheel 同时翻，它才会从左上角一步飞回自己的槽位。
     */
    case 'HOME': {
      if (state.stage === 'idle') return state
      return go(
        state,
        {
          stage: 'menu',
          board: false,
          chrome: false,
          wheel: false,
          leaf: null,
          drilling: null,
          listPhase: 'idle',
          activeTabId: null,
        },
        T.homeToMenu,
        [
          // 面板撤走之后，指令盘才回来；此时放开锚点，按钮直接飞回最终位置
          { at: MOTION.durPanel, patch: { wheel: true, anchor: false } },
          // 等左上角标题淡出（128ms）后再清内容，避免它变成一条空的灰条
          {
            at: MOTION.durPanel + MOTION.durFast,
            patch: { pickedMenu: null, path: [], collapsed: false },
          },
        ],
      )
    }

    default:
      return state
  }
}

export const isPanelOpen = (s: UiState) => isOpen(s.stage)

/**
 * 支持深链：?stage=row&menu=channel&path=dealer&leaf=l1
 */
export function makeInitialState(search = window.location.search): UiState {
  const params = new URLSearchParams(search)
  const stage = params.get('stage') as Stage | null
  const menuKey = params.get('menu')
  const rawPath = params.get('path') ?? ''
  const wanted = rawPath.split(',').map((s) => s.trim()).filter(Boolean)
  const leafKey = params.get('leaf')

  if (stage === 'menu') return { ...INITIAL, stage: 'menu', wheel: true }

  if ((stage === 'panel' || stage === 'row') && menuKey) {
    const item = NAV_BY_KEY.get(menuKey)
    if (!item) return INITIAL

    const path: string[] = []
    let level = levelNodes(menuKey, [])
    for (const key of wanted.slice(0, MAX_DEPTH)) {
      const hit = level.find((n) => n.key === key)
      if (!hit) break
      path.push(key)
      level = hit.children ?? []
    }
    const leaf = leafKey && level.some((n) => n.key === leafKey) ? leafKey : null

    return {
      ...INITIAL,
      stage: path.length > 0 ? 'row' : 'panel',
      wheel: false,
      anchor: true,
      chrome: true,
      board: true,
      pickedMenu: menuKey,
      path,
      leaf,
    }
  }

  return INITIAL
}
