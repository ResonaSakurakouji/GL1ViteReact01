// 交互测试：在 jsdom 里真点元素，按时间轴采样断言。
// 用法：npm test
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html lang="zh-CN"><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})

const { window } = dom
globalThis.window = window
globalThis.document = window.document
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true })
globalThis.HTMLElement = window.HTMLElement
globalThis.Element = window.Element
globalThis.Node = window.Node
globalThis.Event = window.Event
globalThis.MouseEvent = window.MouseEvent
globalThis.KeyboardEvent = window.KeyboardEvent
globalThis.requestAnimationFrame = window.requestAnimationFrame?.bind(window) ?? ((cb) => setTimeout(cb, 16))
globalThis.cancelAnimationFrame = window.cancelAnimationFrame?.bind(window) ?? clearTimeout
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { createServer } = await import('vite')
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })

const { createElement } = await import('react')
const { createRoot } = await import('react-dom/client')
const { act } = await import('react')
const { default: App } = await server.ssrLoadModule('/src/App.tsx')

const root = createRoot(document.getElementById('root'))
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const q = (sel) => document.querySelector(sel)
const qa = (sel) => [...document.querySelectorAll(sel)]

const settle = async (ms = 400) => {
  await act(async () => {
    await wait(ms)
  })
}
const click = async (el) => {
  await act(async () => {
    el.click()
    await wait(30)
  })
}

let clock = Date.now()
const resetClock = () => {
  clock = Date.now()
}
const at = async (ms) => {
  const delta = clock + ms - Date.now()
  if (delta > 0) await settle(delta)
}

let failures = 0
const check = (name, cond, extra = '') => {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${extra ? '  ' + extra : ''}`)
  if (!cond) failures++
}

const panelOpen = () => q('.panel')?.dataset.open === 'true'
const boardOn = () => q('.dash')?.dataset.active === 'true'
const wheelOut = () => q('.wheel')?.hasAttribute('inert') === true
const headerOn = () => q('.cmd-header')?.dataset.on === 'true'
const labels = () => qa('.panel-row .row-label').map((n) => n.textContent)
const crumbs = () => qa('.topbar-crumbs li').map((n) => n.textContent)
const levelName = () => q('.panel-name-text')?.textContent ?? ''
const dashTitle = () => q('.dash-title')?.textContent ?? ''

await act(async () => {
  root.render(createElement(App))
  await wait(60)
})

console.log('\n=== 1. idle → menu → panel ===')
check('初始为 idle', q('.stage')?.dataset.stage === 'idle')
await click(q('.stage'))
check('进入 menu', q('.stage')?.dataset.stage === 'menu')
await settle(800)
const btn = qa('.cmd-btn').find((b) => b.textContent?.includes('按渠道'))
await click(btn)
await settle(1100)
check('进入 panel', q('.stage')?.dataset.stage === 'panel')
check('一层 6 项', labels().length === 6, `got ${labels().length}`)

console.log('\n=== 1b. 图表用 ECharts 挂载 ===')
check('三块图表容器', qa('.chart-body').length === 3, `got ${qa('.chart-body').length}`)
check('存在 Canvas 宿主节点', qa('.chart-canvas').length === 3, `got ${qa('.chart-canvas').length}`)
check('宿主带无障碍标签', Boolean(q('.chart-canvas')?.getAttribute('aria-label')))
check(
  '无 Canvas 的测试环境显示降级文案',
  qa('.chart-fallback').length === 3,
  `got ${qa('.chart-fallback').length}`,
)
check('排行也换成图表卡', q('.ranks-card .chart-body') !== null)
check('旧的自绘柱状已移除', q('.bars') === null && q('.trend') === null)

console.log('\n=== 1c. 隐藏容器用 inert，不用 aria-hidden ===')
check('指令盘关闭时带 inert', wheelOut() === true)
check('指令盘不再有 aria-hidden', q('.wheel')?.hasAttribute('aria-hidden') === false)
check('面板打开时没有 inert', q('.panel')?.hasAttribute('inert') === false)

console.log('\n=== 2. 头部拆成两半：左箭头 + 层级名 ===')
check('左箭头存在', q('.panel-back') !== null)
check('左箭头是 div[role=button]', q('.panel-back')?.getAttribute('role') === 'button')
check('层级名存在', q('.panel-name') !== null)
check('第一层显示主题名', levelName() === '按渠道划分', `got "${levelName()}"`)
check('第一层提示回指令盘', q('.panel-name-hint')?.textContent === '返回指令盘')

console.log('\n=== 3. 分支节点：推进层级，层级名跟随 ===')
await click(qa('.panel-row')[0])
await settle(500)
check('换到第二层', labels().join(',') === '一级经销商,二级分销,直营门店', `got ${labels().join(',')}`)
check('层级名变成当前节点', levelName() === '经销商直营', `got "${levelName()}"`)
check('提示改成返回上一级', q('.panel-name-hint')?.textContent === '返回上一级')

console.log('\n=== 4. 叶子：只切看板 ===')
const before = labels().join(',')
await click(qa('.panel-row')[0])
await settle(260)
check('列表没翻页', labels().join(',') === before)
check('层级名不变（叶子不是一层）', levelName() === '经销商直营', `got "${levelName()}"`)
check('面包屑追加叶子', crumbs().join('|') === '按渠道划分|经销商直营|一级经销商', `got "${crumbs().join('|')}"`)
check('看板已切换', dashTitle().includes('一级经销商'), `got "${dashTitle()}"`)

console.log('\n=== 5. 右侧层级名：先取消叶子选中 ===')
await click(q('.panel-name'))
await settle(140)
check('叶子选中被取消', crumbs().join('|') === '按渠道划分|经销商直营', `got "${crumbs().join('|')}"`)
check('层级未变（仍 3 项）', labels().length === 3)

console.log('\n=== 6. 左侧箭头：跳过取消选中，一键退层 ===')
await click(qa('.panel-row')[0]) // 先重新选中叶子
await settle(200)
check('叶子重新选中', crumbs().length === 3)
await click(q('.panel-back'))
await settle(500)
check('一键退到第一层', crumbs().join('|') === '按渠道划分', `got "${crumbs().join('|')}"`)
check('列表恢复 6 项', labels().length === 6, `got ${labels().length}`)
check('层级名回到主题', levelName() === '按渠道划分')

console.log('\n=== 7. 第一层再退 → 指令盘（看板先走）===')
resetClock()
await click(q('.panel-back'))
await at(100)
check('t≈100  看板已退场', boardOn() === false)
check('t≈100  面板还在（等看板）', panelOpen() === true)
await at(320)
check('t≈320  面板退场', panelOpen() === false)
await settle(700)
check('回到 menu', q('.stage')?.dataset.stage === 'menu', `got ${q('.stage')?.dataset.stage}`)
check('指令盘已在内', wheelOut() === false)

console.log('\n=== 8. CmdHeader → 回主页面（三者同撤，撤完指令盘飞回）===')
const btn2 = qa('.cmd-btn').find((b) => b.textContent?.includes('按区域'))
await click(btn2)
await settle(1100)
check('再次进入 panel', q('.stage')?.dataset.stage === 'panel')

resetClock()
await click(q('.cmd-header'))
await at(90)
check('t≈90  看板已在撤', boardOn() === false)
check('t≈90  面板已在撤（不等看板）', panelOpen() === false)
check('t≈90  指令盘尚未回来', wheelOut() === true)
check('t≈90  被选中按钮仍锚在左上角', q('.cmd-btn.is-picked') !== null)
check('t≈90  标题仍在（等面板撤完再交接）', headerOn() === true)
await at(320)
check('t≈320  指令盘开始回位', wheelOut() === false)
check('t≈320  按钮已离开锚点（直接飞回槽位）', q('.cmd-btn.is-picked') === null)
check('t≈320  标题已交给按钮', headerOn() === false)
await at(900)
check('t≈900  停在 menu 而不是空屏', q('.stage')?.dataset.stage === 'menu', `got ${q('.stage')?.dataset.stage}`)
check('面板内容已清空', qa('.panel-row').length === 0, `got ${qa('.panel-row').length}`)
check('面包屑已清空', qa('.topbar-crumbs li').length === 0)
check('9 个按钮都在位', qa('.cmd-btn').length === 9)
check('面板关闭后为 inert', q('.panel')?.hasAttribute('inert') === true)
check('面板不再有 aria-hidden', q('.panel')?.hasAttribute('aria-hidden') === false)

console.log('\n=== 9. 深链直达深层 + 叶子 ===')
await act(async () => {
  root.unmount()
})
const deep = new JSDOM('<!doctype html><html lang="zh-CN"><body><div id="root"></div></body></html>', {
  url: 'http://localhost/?stage=row&menu=channel&path=dealer&leaf=l1',
  pretendToBeVisual: true,
})
globalThis.window = deep.window
globalThis.document = deep.window.document
Object.defineProperty(globalThis, 'navigator', { value: deep.window.navigator, configurable: true })
const q2 = (sel) => deep.window.document.querySelector(sel)
const qa2 = (sel) => [...deep.window.document.querySelectorAll(sel)]
const root2 = createRoot(deep.window.document.getElementById('root'))
await act(async () => {
  root2.render(createElement(App))
  await wait(120)
})
check(
  '面包屑 = 主题 / 层 / 叶子',
  qa2('.topbar-crumbs li').map((n) => n.textContent).join('|') === '按渠道划分|经销商直营|一级经销商',
  `got "${qa2('.topbar-crumbs li').map((n) => n.textContent).join('|')}"`,
)
check('层级名 = 所在层', q2('.panel-name-text')?.textContent === '经销商直营', `got "${q2('.panel-name-text')?.textContent}"`)
check('叶子高亮', q2('.panel-row[data-selected="true"]') !== null)
await act(async () => {
  root2.unmount()
})

console.log(failures === 0 ? '\n全部通过' : `\n${failures} 项失败`)
await server.close()
process.exit(failures === 0 ? 0 : 1)
