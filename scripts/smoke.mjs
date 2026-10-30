// SSR 烟测：四个状态各渲染一次，并跑一遍 reducer（含节拍）。
// 用法：npm run smoke
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const g = globalThis
g.window = { location: { search: '' }, addEventListener() {}, removeEventListener() {} }
g.document = { documentElement: { style: { setProperty() {} } } }

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

const { default: App } = await server.ssrLoadModule('/src/App.tsx')
const { INITIAL, activeTabOf, reducer, makeInitialState } =
  await server.ssrLoadModule('/src/state/machine.ts')
const { MAX_DEPTH } = await server.ssrLoadModule('/src/data/menu.config.ts')

const cases = [
  ['idle', ''],
  ['menu', '?stage=menu'],
  ['panel', '?stage=panel&menu=channel'],
  ['row', '?stage=row&menu=channel&path=dealer'],
]

for (const [name, search] of cases) {
  g.window.location.search = search
  const html = renderToStaticMarkup(createElement(App))
  const buttons = (html.match(/class="cmd-btn/g) ?? []).length
  const rows = (html.match(/class="panel-row"/g) ?? []).length
  const crumbs = [...html.matchAll(/<li[^>]*>([^<]*)<\/li>/g)].map((m) => m[1]).join('/')
  console.log(`[${name.padEnd(5)}] 指令=${buttons}  列表项=${rows}  面包屑="${crumbs}"`)
  if (!html.includes('data-stage')) throw new Error('缺少 data-stage')
}

/** 应用 action，并把它带出来的节拍立刻跑完（等价于动画播完） */
let st = makeInitialState('')
const run = (action) => {
  st = reducer(st, action)
  for (const beat of st.beats) st = reducer(st, { type: 'BEAT', patch: beat.patch })
  st = reducer(st, { type: 'SETTLE' })
  return st
}
const show = (tag) =>
  console.log(tag.padEnd(12), '->', st.stage.padEnd(5), 'path', JSON.stringify(st.path), 'leaf', st.leaf)

console.log('\n--- reducer ---')
show('初始')

st = reducer(st, { type: 'OPEN_MENU' })
console.log('OPEN_MENU   ->', st.stage, 'lock', st.lockMs)

const locked = reducer(st, { type: 'PICK_MENU', key: 'channel' })
console.log('锁定期点击   ->', locked === st ? '已丢弃 ✓' : '未被拦截 ✗')

run({ type: 'SETTLE' })
run({ type: 'PICK_MENU', key: 'channel' })
show('PICK_MENU')

run({ type: 'PICK_ROW', key: 'dealer' })
show('分支下钻')

run({ type: 'PICK_ROW', key: 'l1' })
show('叶子选中')
console.log('  叶子是否推进层级 ->', st.path.length === 1 && st.leaf === 'l1' ? '否 ✓' : '越界 ✗')

run({ type: 'POP' })
show('POP 取消叶子')

run({ type: 'POP' })
show('POP 退一层')

run({ type: 'POP' })
show('POP 回指令盘')

run({ type: 'HOME' })
show('HOME 回主页')

st = makeInitialState('?stage=panel&menu=channel')
for (const key of ['dealer', 'l1']) run({ type: 'PICK_ROW', key })
const before = st.path.length
run({ type: 'PICK_ROW', key: 'l1' })
console.log('叶子再点     ->', st.path.length === before ? '不推进 ✓' : '越界 ✗', 'leaf=' + st.leaf)

const deepLink = makeInitialState('?stage=row&menu=region&path=sh,pudong&leaf=pudong')
console.log('深链         ->', deepLink.stage, 'path', JSON.stringify(deepLink.path), 'leaf', deepLink.leaf)
console.log('MAX_DEPTH    ->', MAX_DEPTH)

// 标签页：另存 / 去重 / 删除 / 高亮推导 / 内容 diff
const step = (s, a) => {
  let n = reducer(s, a)
  for (const b of n.beats) n = reducer(n, { type: 'BEAT', patch: b.patch })
  return reducer(n, { type: 'SETTLE' })
}

let ts = makeInitialState('?stage=panel&menu=channel')
ts = reducer(ts, { type: 'SAVE_TAB' })
const once = ts.tabs.length
ts = reducer(ts, { type: 'SAVE_TAB' })
console.log('SAVE_TAB ×2  ->', ts.tabs.length === once ? '去重 ✓' : '重复 ✗', 'label=' + ts.tabs[0]?.label)
console.log('高亮自动对上 ->', activeTabOf(ts) === ts.tabs[0]?.id ? '✓' : '✗')

// 只换了叶子：列表内容一样 → 直接落，不播换页动画
let tv = makeInitialState('?stage=row&menu=channel&path=dealer')
tv = reducer(tv, { type: 'SAVE_TAB' })
tv = reducer(tv, { type: 'PICK_ROW', key: 'l1' })
const sameList = reducer(tv, { type: 'ACTIVATE_TAB', id: tv.tabs[0].id })
console.log(
  'same list    ->',
  !sameList.swapping && sameList.leaf === null ? '跳过动画 ✓' : '仍播动画 ✗',
  'leaf=' + sameList.leaf,
)

// 列表内容不同 → 进入 out 相位
const other = { ...makeInitialState('?stage=panel&menu=region'), tabs: ts.tabs }
const diffList = reducer(other, { type: 'ACTIVATE_TAB', id: ts.tabs[0].id })
console.log('diff list    ->', diffList.swapping && diffList.listDir === 'swap' ? 'out 相位 ✓' : '✗')

ts = reducer(ts, { type: 'CLOSE_TAB', id: ts.tabs[0].id })
console.log('CLOSE_TAB    ->', '剩余', ts.tabs.length, '高亮=' + activeTabOf(ts))

/**
 * app.css 的 :root 里为 IDE 解析保留了一份时长兜底值，
 * 真实来源是 motion.ts。这里校验两边没跑偏，避免"改了 TS 忘了 CSS"。
 */
const { MOTION } = await server.ssrLoadModule('/src/data/motion.ts')
const css = readFileSync('src/styles/app.css', 'utf8')
const kebab = (s) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())

console.log('\n--- 时序令牌一致性 ---')
let drift = 0
for (const [key, ms] of Object.entries(MOTION)) {
  const name = `--${kebab(key)}`
  const hit = css.match(new RegExp(`${name}:\\s*(\\d+)ms`))
  const ok = Boolean(hit) && Number(hit[1]) === ms
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(12)} motion=${ms}ms  css=${hit ? hit[1] + 'ms' : '(缺失)'}`)
  if (!ok) drift++
}
if (drift > 0) process.exitCode = 1

console.log(drift > 0 ? `\n有 ${drift} 个令牌与 motion.ts 不一致` : '\nOK')
await server.close()
