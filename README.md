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

回到指令盘（点左上角 CmdHeader）：

| 时刻 | 发生什么 |
|---|---|
| 0 | 面板 / 看板 / 色带**同时**撤离，都用 256ms；被选中的按钮继续锚在左上角不动 |
| 256 | 撤离完成 → 放开锚点、指令盘打开。被选中那枚**直接从左上角飞回自己的槽位**，其余 8 枚错峰飞入 |
| 384 | 左上角标题淡出完毕，清空面板内容与面包屑 |
| 928 | 全部落定，停在指令盘界面 |

> 锚点必须等到 256ms 才放开。如果在 t=0 就放开，那枚按钮会先按"收起位"飞到屏幕外，
> 等指令盘打开再飞回来——也就是"先飞出去再飞回来"。

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
| 点击面板顶部左箭头 | **一键退层**（跳过"取消叶子选中"） |
| 点击面板顶部层级名 / Esc | 先取消叶子选中，再退层；第一层时退回指令盘 |
| 左上角标题（CmdHeader） | 回到指令盘界面：面板 / 看板 / 色带同刻撤离，撤完指令盘飞回 |
| 面板右侧 ◁ / ▷ | 面板收起为 3vw 侧边条 / 展开，看板随之拉抻 / 复原 |
| 顶部「＋ 另存」 | 把当前视角（主题 + 层级 + 叶子）存成一个标签页 |
| 点击标签页 | 恢复它保存的视角（keep-alive） |
| 标签右侧 × | 删除该标签页，连同它保存的状态一起丢弃 |

## 标签栏

TopBar 上半是标签栏，下半是面包屑：

```
┌────────────────────── 顶部色带 ──────────────────────┐
│ [按渠道划分 ×] [经销商直营 ×]                          │  ← 标签栏
│ ＋另存  › 按渠道划分 › 经销商直营 › 一级经销商          │  ← 面包屑
└──────────────────────────────────────────────────────┘
```

- 快照只存"看哪一页"：`{ pickedMenu, path[], leaf }`。内容由 `buildView()` 按快照重算，
  所以标签页不占额外内存，删掉就是彻底丢弃。
- 同一个视角重复另存会自动去重，直接激活已有标签。
- **退场不销毁**：`tabs` 存在 reducer 里，TopBar 只负责渲染。面板收起 / 回指令盘再进来，
  标签栏原样恢复（`npm test` 的第 10 组就是盯这个）。
- 任何导航（选主题、下钻、返回）都会清掉 `activeTabId`——高亮表示"当前视角就是这个标签存的"，
  一旦你把它改了就自然脱开；快照本身仍在。

## 面板结构

```
.panel                        高度固定 63vh，条目多少都不变
├─ .panel-head                拆成左右两半
│   ├─ .panel-back            左：醒目返回箭头，一键退层
│   └─ .panel-name            右：当前层级名 + 行为提示，先取消叶子选中再退层
├─ .panel-body                滚动容器（flex:1 + overflow-y:auto）
│   └─ .panel-rows            key = 当前路径，换层时整块重挂，触发入场动画
│       └─ .panel-row         div[role=button] × N
└─ .panel-tab                 收起把手（绝对定位，不随列表滚动）

.topbar                       高度 7vh，与 CmdHeader 等高对齐
├─ .topbar-band               色带本体，scaleX 从右扫入（独立一层，不压扁文字）
└─ .topbar-inner              起点 = 21vw + 间距，永远在 CmdHeader 右边
    ├─ .tabbar                上半：标签页（横向可滚，隐藏滚动条）
    │   ├─ .tab               标签（含 .tab-label / .tab-close）
    │   └─ .tabbar-empty      空态提示
    └─ .crumbbar              下半：.tab-save + .topbar-crumbs
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

## 可访问性

隐藏的容器一律用 `inert` 而不是 `aria-hidden`：

```tsx
<div className="wheel" inert={!open}>   {/* 不是 aria-hidden={!open} */}
```

原因：`aria-hidden` 只是"从无障碍树里移除"，**不阻止聚焦**。当用户点了某个按钮、焦点还留在里面，
容器却被标成 `aria-hidden` 时，浏览器会拒绝隐藏并抛警告：

> Blocked aria-hidden on an element because its descendant retained focus.

`inert` 同时做三件事：移出无障碍树、禁止聚焦、禁止点击，正是这里要的。
另外两个容器（`.wheel` / `.panel`）在收起时还会主动把焦点 blur 掉，作为旧引擎的兜底。

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
    SidePanel.tsx          多级导航面板（返回条 + 滚动列表 + 收起把手）
    TopBar.tsx             顶部色带：上半标签栏 + 下半面包屑与「另存」
    Backdrop.tsx           遮罩（原 #battleMenuS）
    Dashboard.tsx          KPI + 三块 ECharts 图表
  charts/
    echarts.ts             按需注册（柱/折线 + 直角坐标系 + Canvas 渲染器）
    Chart.tsx              ECharts 生命周期封装（init / setOption / resize / dispose）
    options.ts             三张图的 option 构造函数
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

## 图表

三块图都用 ECharts 6，按需注册（`echarts/core` + `BarChart`/`LineChart` + `Grid`/`Tooltip` + `CanvasRenderer`），
不引全量包——老目录里的 `echarts.common.js` 是 2.2MB，按需引入后 ECharts 部分 516KB（gzip 175KB）。

- **生命周期**：`Chart.tsx` 里两条 effect 分工——挂载时 `init` + 挂 `ResizeObserver`，
  卸载 `dispose`；数据变化只 `setOption(option, true)`，不重建实例（重建会丢动画、漏 canvas）。
- **画布尺寸**：`.chart-canvas` 绝对定位铺满 `.chart-body`，尺寸只由父级决定，
  避免"canvas 尺寸 → 反馈布局 → 再触发 resize"的循环。
- **降级**：没有 Canvas 的环境（服务端、jsdom）不 init，直接渲染一行提示，
  不会把整棵树带崩——这也是 `npm test` 能跑通的原因。
- **分包**：`vite.config.ts` 里把 `echarts`/`zrender` 单独成块，业务代码改动不会让它重新下载。

| 卡片 | 图表 |
|---|---|
| 月度销量分布 | 柱状，渐变 + 圆角，12 个月 |
| 近 24 小时订单趋势 | 平滑折线 + 面积渐变 |
| 区县贡献 Top 5 | 横向条，右端带数值标签 |

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

改 `src/styles/app.css` 里的 `--bg-image` 变量，图片放在 `public/bg/`：

| 值 | 说明 |
|---|---|
| `/bg/miku087.jpg` | 默认 |
| `/bg/Nipponpaint.jpg` | 备选 |

`public/` 下的文件由 Vite 原样搬到 `dist/`，换图不需要动构建配置。
