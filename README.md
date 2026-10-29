# GL1ViteReact01 — 数据中台看板

GrowLanser 指令盘动效的 React 重写版，作为数据中台看板的外壳。

原 `Test.html` + `move.js` 是纯命令式实现（全局单例 `OrderEles`、`sleep()` 复刻 CSS 时长、`getBoundingClientRect` 测量回写）。这里改成**状态机 + 配置驱动**：位移全部由状态推导，时间只有一处来源。

## 运行

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # tsc -b && vite build
npm run preview
npm test         # jsdom 交互测试：按时间轴采样断言
npm run smoke    # SSR 渲染 + reducer 冒烟
```

## 编排时间轴

所有先后顺序都在 `src/state/machine.ts` 的 beats 里，CSS 里没有任何阶段延迟，
只有每个元素自己的波浪错峰（`--delay`）。

进入面板（点一级菜单）：

| 时刻 | 发生什么 |
|---|---|
| 0 | 被点中的按钮飞向左上角（384ms）**同时**其余 8 个按钮按批次退场 |
| 384 | 左边那枚落地，左上角灰色标题交叉淡入（128ms） |
| 672 | 退场波浪结束 → 顶部色带展开 + 左侧面板滑入 |
| 928 | 面板落位 → **输入闸门放开**，行项可点；看板从右侧滑入 |
| 1312 | 全部落定 |

退出（面板 → 指令盘，点面板返回条）：

| 时刻 | 发生什么 |
|---|---|
| 0 | 看板先向右滑出（256ms） |
| 256 | 面板滑出、色带收起、标题淡出、按钮飞回原位 |
| 928 | 全部落定 |

回主页面（点左上角 CmdHeader）：

| 时刻 | 发生什么 |
|---|---|
| 0 | 面板 / 看板 / 色带**同时**撤离，都用 256ms |
| 256 | 撤离完成，才清空面板内容（避免滑出过程中变空壳） |
| 320 | 闸门放开 |

面板收起时看板会向左拉抻补位（`left` 从 `21vw + 2.5vw` 变为 `3vw + 2.5vw`），
展开时复原，时长同为 256ms。

改节奏只需要动 `TIMELINE` / `T` 两个常量表。

## 交互

| 操作 | 结果 |
|---|---|
| 初始页点击任意处 | 9 个主题按钮按 4 批 × 96ms 错峰辐射飞入 |
| 点击某个主题 | 该按钮先自己飞到左上角变标题，其余元素 672ms 后才动 |
| 点击有下级的项 | 当前层滑走、该项飞向顶部，下一层从右侧滑入（最多 8 级） |
| 点击叶子项 | **只切换看板，不推进层级**，行上留一条金色选中标 |
| 面板顶部返回条 / Esc | 回上一层；先取消叶子选中，再逐层退，第一层时退回指令盘 |
| 左上角标题（CmdHeader） | 回主页面：面板 / 看板 / 色带**同刻撤离** |
| 面板右侧 ◁ / ▷ | 面板收起为 3vw 侧边条 / 展开，看板随之拉抻 / 复原 |

## 面板结构

```
.panel                        高度固定 63vh，条目多少都不变
├─ .panel-head                返回条（整条都是热区，点击回上一层）
├─ .panel-body                滚动容器（flex:1 + overflow-y:auto）
│   └─ .panel-rows            key = 当前路径，换层时整块重挂，触发入场动画
│       └─ .panel-row         div[role=button] × N
└─ .panel-tab                 收起把手（绝对定位，不随列表滚动）

.topbar
├─ .topbar-band               色带本体，scaleX 从右扫入（独立一层，不压扁文字）
└─ .topbar-crumbs             面包屑，起点 = 21vw + 间距，永远在 CmdHeader 右边
```

- 层级用 `state.path: string[]` 表示，`levelNodes(menuKey, path)` 解析当前层的项，
  所以**加多少级、每级多少项都不用改组件**，上限是 `MAX_DEPTH = 8`。
- `state.leaf` 单独存"当前选中的叶子"：它只影响看板内容，不进 `path`，
  所以不会触发翻页动画，面包屑末尾多一段、按返回先把它撤掉。
- 列表项是 `div[role=button][tabindex]`，不是 `<button>`；Enter / Space 可激活。
- 层级切换动画只由 `data-phase`（`out`/`in`）和 `data-dir`（`drill`/`pop`）驱动 CSS：
  - `out + drill` —— 当前层滑走，被点中的那项飞向顶部
  - `in + drill` —— 下一层从右侧滑入
  - `out + pop` / `in + pop` —— 反向
- 悬浮是 `background-color` 过渡（128ms），不再用之前那种渐变擦除。
- 有下级的项右侧带 `›`，一眼能看出还能往下钻。
- 面包屑放在 TopBar 而不是面板里，是为了不占面板的固定高度，也不会被滚动列表挤走。

## 目录

```
src/
  main.tsx                 启动，注入时间令牌
  App.tsx                  状态机装载 + 节拍调度 + 层级组装
  state/machine.ts         四态 reducer + 就位标志 + beats 编排 + 下钻路径
  state/choreo.ts          同一波浪内的错峰换算
  data/motion.ts           时长唯一来源（--dur-* 由它生成）+ TIMELINE
  data/menu.config.ts      9 个主题 + 递归 NavNode（MAX_DEPTH=8）+ 位移推导
  data/dashboard.ts        看板模拟数据（确定性伪随机）
  components/
    CommandWheel.tsx       九宫指令按钮
    CmdHeader.tsx          左上角标题（原 #btn_LT_b）
    SidePanel.tsx          多级导航面板（面包屑 + 滚动列表 + 收起把手）
    TopBar.tsx             顶部色带（原 #t0Bar）
    Backdrop.tsx           遮罩（原 #battleMenuS）
    Dashboard.tsx          KPI / 柱状 / 折线 / 排行
  styles/app.css           全部样式
scripts/
  uitest.mjs               jsdom 交互测试（npm test）
  smoke.mjs                SSR 渲染 + reducer 冒烟
```

## 为什么不用 CSS transition-delay 排时序

第一版把"谁在什么时候开始动"写成了 `transition-delay`，踩了两个坑：

1. 延迟是**附着在元素上**的，一旦重渲染把延迟算成 0（比如 `prev` 收平之后），
   原本还在等待的动画就会提前启动；
2. 收起面板这类交互会继承入场时那段延迟，点下去半天没反应。

现在改成 **就位标志 + 定时节拍**：`wheel` / `anchor` / `chrome` / `board` 四个布尔
只表示"现在该在目标位还是起始位"，由 `beats` 在正确时刻翻。CSS 里只剩下每个
元素自己的 `--delay`（波浪错峰），那是局部的、不会被误改。

## 与原实现的对应关系

| 原 move.js | 现在 |
|---|---|
| `OrderEles.init()` 遍历 DOM + classList 反推批次 | `NAV` 配置里的 `side` / `order` / `top` |
| `move_in(100)` / `move_out()` 测量再回写 transform | `cornerOffset()` / `closedOffset()` 由常量推导 |
| `await sleep(ms)` 串起先后顺序 | `beats` 定时器翻就位标志 |
| `globalNoClick` 手动互斥（且写错成 `noClick`） | reducer 在 `lockMs > 0` 时丢弃输入，到期自动放开 |
| `Change.shadowAppear` 重复定义两个 | `Backdrop` 单组件，按 stage 取浓度 |
| `.l_v00`…`.l_v990` 200 行定位类 | `style={{ top: '35vh' }}` |
| `btnB2gray` 复制 innerHTML 到幽灵条 | `CmdHeader` 与按钮共用同一落点，`opacity` 交接 |

## 关于动画库

位移量全是**已知常量**（`left:20vw` + `-20vw` = 左上角 0,0），不需要测量 DOM，所以这里用 CSS `transition` + 内联 `transform` 就够了，没有引动画库。

如果后续布局变成流式/网格，落点不再可算，再引 `motion` 的 `layoutId` 做共享元素过渡——状态机结构不用动，只换表现层。

## 换背景

`src/styles/app.css` 顶部：

```css
--bg-image: url('/bg/miku087.jpg');  /* 备选 /bg/Nipponpaint.jpg */
```
