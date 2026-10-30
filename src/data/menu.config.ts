export type Side = 'left' | 'right' | 'center'

/** 面板里的一个节点，可以无限往下挂（实际限制见 MAX_DEPTH） */
export interface NavNode {
  key: string
  label: string
  children?: NavNode[]
}

export interface NavItem {
  key: string
  label: string
  /** 副标题，显示在按钮第二行 */
  sub: string
  side: Side
  /** 飞入波浪中的批次，1 最早。原版靠 m1st/m4th 这类 class 硬编码 */
  order: 1 | 2 | 3 | 4
  /** 垂直定位槽位（vh） */
  top: number
  rows: NavNode[]
}

/** 面板最多下钻 8 级 */
export const MAX_DEPTH = 8

/**
 * 一级菜单 = 数据中台的 9 个主题域。
 * side / order / top 直接对应原 Test.html 里
 * `out_left l_cL0 l_v35 m1st eio384` 这套 class 的语义。
 */
export const NAV: NavItem[] = [
  {
    key: 'overview',
    label: '立邦中国',
    sub: '全量总览',
    side: 'center',
    order: 1,
    top: 20,
    rows: [
      { key: 'all', label: '全国汇总' },
      { key: 'east', label: '华东大区' },
      { key: 'south', label: '华南大区' },
      { key: 'north', label: '华北大区' },
      { key: 'west', label: '西部大区' },
      { key: 'central', label: '华中大区' },
    ],
  },
  {
    key: 'channel',
    label: '按渠道划分',
    sub: '渠道结构',
    side: 'left',
    order: 1,
    top: 35,
    rows: [
      {
        key: 'dealer',
        label: '经销商直营',
        children: [
          { key: 'l1', label: '一级经销商' },
          { key: 'l2', label: '二级分销' },
          { key: 'store', label: '直营门店' },
        ],
      },
      { key: 'ka', label: 'KA 卖场' },
      { key: 'ec', label: '电商平台' },
      {
        key: 'project',
        label: '工程渠道',
        children: [
          { key: 'estate', label: '地产集采' },
          { key: 'municipal', label: '市政工程' },
          { key: 'deco-corp', label: '家装公司' },
        ],
      },
      { key: 'deco', label: '家装零售' },
      { key: 'dist', label: '分销网点' },
    ],
  },
  {
    key: 'alert',
    label: '预警动作设置',
    sub: '规则与推送',
    side: 'right',
    order: 4,
    top: 35,
    rows: [
      { key: 'stock', label: '库存预警' },
      { key: 'price', label: '价格预警' },
      { key: 'cash', label: '回款预警' },
      { key: 'cross', label: '窜货预警' },
      { key: 'task', label: '任务逾期' },
      { key: 'channel', label: '渠道流失' },
    ],
  },
  {
    key: 'brand',
    label: '按品牌划分',
    sub: '品牌矩阵',
    side: 'left',
    order: 2,
    top: 45,
    rows: [
      { key: 'nippon', label: '立邦漆' },
      { key: 'dulux', label: '多乐士' },
      { key: 'skshu', label: '三棵树' },
      { key: 'carpoly', label: '嘉宝莉' },
      { key: 'huarun', label: '华润漆' },
      { key: 'other', label: '其他品牌' },
    ],
  },
  {
    key: 'staff',
    label: '管理人员分配',
    sub: '组织与权限',
    side: 'right',
    order: 3,
    top: 45,
    rows: [
      { key: 'rm', label: '大区经理' },
      { key: 'cm', label: '城市经理' },
      { key: 'ch', label: '渠道主管' },
      { key: 'sg', label: '门店导购' },
      { key: 'da', label: '数据专员' },
      { key: 'vac', label: '空缺岗位' },
    ],
  },
  {
    key: 'scale',
    label: '按规模划分',
    sub: '客户体量',
    side: 'left',
    order: 3,
    top: 55,
    rows: [
      { key: 's1', label: '年销 > 1 亿' },
      { key: 's2', label: '900 万 – 1 亿' },
      { key: 's3', label: '800 – 900 万' },
      { key: 's4', label: '700 – 800 万' },
      { key: 's5', label: '600 – 700 万' },
      { key: 's6', label: '500 – 600 万' },
      { key: 's7', label: '400 – 500 万' },
      { key: 's8', label: '300 – 400 万' },
      { key: 's9', label: '200 – 300 万' },
      { key: 's10', label: '100 – 200 万' },
      { key: 's11', label: '< 100 万' },
    ],
  },
  {
    key: 'org',
    label: '组织架构概况',
    sub: '层级与人数',
    side: 'right',
    order: 2,
    top: 55,
    rows: [
      {
        key: 'hq',
        label: '总部',
        children: [
          { key: 'supply', label: '供应链中心' },
          { key: 'sales', label: '销售中心' },
          { key: 'mkt', label: '市场中心' },
        ],
      },
      { key: 'region', label: '大区' },
      { key: 'prov', label: '省级' },
      { key: 'city', label: '城市' },
      { key: 'store', label: '门店' },
      { key: 'agent', label: '代理' },
    ],
  },
  {
    key: 'region',
    label: '按区域划分',
    sub: '地理分布',
    side: 'left',
    order: 4,
    top: 65,
    rows: [
      {
        key: 'sh',
        label: '上海',
        children: [
          { key: 'pudong', label: '浦东新区' },
          { key: 'xuhui', label: '徐汇区' },
          { key: 'minhang', label: '闵行区' },
        ],
      },
      { key: 'gz', label: '广州' },
      { key: 'cd', label: '成都' },
      { key: 'bj', label: '北京' },
      { key: 'wh', label: '武汉' },
      { key: 'xa', label: '西安' },
    ],
  },
  {
    key: 'theme',
    label: '页面主题设置',
    sub: '外观与偏好',
    side: 'right',
    order: 1,
    top: 65,
    rows: [
      { key: 'warm', label: '暖褐金' },
      { key: 'cool', label: '冷灰蓝' },
      { key: 'contrast', label: '高对比' },
      { key: 'night', label: '夜间' },
      { key: 'print', label: '打印模式' },
      { key: 'reset', label: '恢复默认' },
    ],
  },
]

export const NAV_BY_KEY = new Map(NAV.map((n) => [n.key, n]))

/** 按 key 路径取出节点链（不含一级菜单）。路径不合法时截断到最后一个有效节点 */
export function resolvePath(nodes: NavNode[], keys: string[]): NavNode[] {
  const chain: NavNode[] = []
  let level: NavNode[] = nodes
  for (const key of keys) {
    const hit = level.find((n) => n.key === key)
    if (!hit) break
    chain.push(hit)
    level = hit.children ?? []
  }
  return chain
}

/** 当前层级的可选节点 */
export function levelNodes(menuKey: string | null, path: string[]): NavNode[] {
  const menu = menuKey ? NAV_BY_KEY.get(menuKey) : undefined
  if (!menu) return []
  const chain = resolvePath(menu.rows, path)
  if (chain.length < path.length) return []
  const last = chain[chain.length - 1]
  return last ? (last.children ?? []) : menu.rows
}

/**
 * 一层选项的内容指纹（key + label）。
 *
 * 用途有两个：
 *   ① 换标签时先 diff —— 列表内容一样就不播换页动画；
 *   ② 作为 .panel-rows 的 key —— React 只在这一层真的变了才重挂 DOM，
 *      于是"没变化就不重播入场动画"这件事交给 React 的协调器去做。
 */
export function listSignature(nodes: NavNode[]): string {
  return nodes.map((n) => `${n.key}:${n.label}`).join('|')
}

/** 按钮尺寸常量，和 CSS 里的 .cmd-btn 保持一致 */
export const BTN_W_VW = 21
export const LEFT_X_VW = 20
export const CENTER_LEFT_VW = 39.5

/** 按钮飞到左上角 (0,0) 所需的位移，全部可由常量推导，无需测量 DOM */
export function cornerOffset(item: NavItem): { x: string; y: string } {
  const x =
    item.side === 'left'
      ? `-${LEFT_X_VW}vw`
      : item.side === 'right'
        ? `-${100 - LEFT_X_VW - BTN_W_VW}vw`
        : `-${CENTER_LEFT_VW}vw`
  const y = `-${item.top}vh`
  return { x, y }
}

/** 收起源位置：左侧从画外左侧、右侧从画外右侧、中间从上方 */
export function closedOffset(item: NavItem): { x: string; y: string } {
  if (item.side === 'center') return { x: '0vw', y: '-100vh' }
  return { x: item.side === 'left' ? '-100vw' : '100vw', y: '0vh' }
}
