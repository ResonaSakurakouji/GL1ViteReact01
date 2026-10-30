import { useEffect, useMemo, useReducer } from 'react'
import { Backdrop } from './components/Backdrop'
import { CmdHeader } from './components/CmdHeader'
import { CommandWheel } from './components/CommandWheel'
import { Dashboard } from './components/Dashboard'
import { SidePanel } from './components/SidePanel'
import { TopBar } from './components/TopBar'
import { buildView } from './data/dashboard'
import { MOTION } from './data/motion'
import { activeTabOf, makeInitialState, reducer, type Stage } from './state/machine'

function Hints({ stage }: { stage: Stage }) {
  return (
    <>
      <div className="hint hint-idle" data-on={stage === 'idle'}>
        <span className="hint-ring" />
        <p className="hint-title">数据中台看板</p>
        <p className="hint-sub">点击任意处展开指令盘</p>
      </div>
      <div className="hint hint-foot" data-on={stage === 'menu'}>
        选定一个主题进入看板 · Esc 收起
      </div>
    </>
  )
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState)

  const view = useMemo(
    () => buildView(state.pickedMenu, state.path, state.leaf),
    [state.pickedMenu, state.path, state.leaf],
  )

  /**
   * 编排节拍：每次换编排带一串 {at, patch}，在这里挂成定时器。
   * 只有「换了一套编排」才会替换并取消上一组——收起面板这类交互只动 lockMs，
   * 不会把还没到点的「看板登场」一起清掉。
   */
  useEffect(() => {
    if (state.beats.length === 0) return
    const timers = state.beats.map((beat) =>
      window.setTimeout(() => dispatch({ type: 'BEAT', patch: beat.patch }), beat.at),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [state.beats])

  // 输入闸门：到期自动放开。原版靠手动置 globalNoClick，中途 return 就永久卡死
  useEffect(() => {
    if (state.lockMs <= 0) return
    const timer = window.setTimeout(() => dispatch({ type: 'SETTLE' }), state.lockMs)
    return () => window.clearTimeout(timer)
  }, [state.seq, state.lockMs])

  /**
   * 换标签：列表先向左飞出去（durRow），再落快照、从右侧飞回来（又一个 durRow）。
   * 两条定时器挂在 swapping 上而不是塞进 beats —— beats 一旦换组就会取消
   * 还没到点的编排（面板入场、看板登场），换标签不该打断它们。
   */
  useEffect(() => {
    if (!state.swapping) return
    const commit = window.setTimeout(() => dispatch({ type: 'COMMIT_TAB' }), MOTION.durRow)
    const done = window.setTimeout(() => dispatch({ type: 'END_SWAP' }), MOTION.durRow * 2)
    return () => {
      window.clearTimeout(commit)
      window.clearTimeout(done)
    }
  }, [state.swapping])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'POP' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /**
   * 高亮标签是**推导**出来的：当前视角等于哪个快照就亮哪个。
   * 所以导航回一个已经存过的视角，它会自动重新亮起，不需要谁去回填一个 id。
   */
  const activeTabId = activeTabOf(state)

  return (
    <div
      className="stage"
      data-stage={state.stage}
      data-swap={state.swapping}
      onClick={() => {
        if (state.stage === 'idle') dispatch({ type: 'OPEN_MENU' })
      }}
    >
      <Backdrop stage={state.stage} />
      <Dashboard view={view} active={state.board} compact={state.collapsed} />
      <CommandWheel state={state} dispatch={dispatch} />
      <TopBar state={state} dispatch={dispatch} activeTabId={activeTabId} />
      <CmdHeader state={state} dispatch={dispatch} />
      <SidePanel state={state} dispatch={dispatch} />
      <Hints stage={state.stage} />
    </div>
  )
}
