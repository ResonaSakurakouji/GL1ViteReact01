/**
 * 顶部色带（原 #t0Bar）+ 面包屑。
 *
 * 色带本体是独立的一层，用 scaleX 从右侧扫入，这样里面的面包屑不会被横向压扁。
 * 面包屑的起点让开左上角标题的宽度，所以永远不会被 CmdHeader 盖住
 * —— 相当于把色带左侧裁掉一截。
 */
export function TopBar({ active, crumbs }: { active: boolean; crumbs: string[] }) {
  return (
    <div className="topbar" data-active={active} aria-hidden={!active}>
      <div className="topbar-band" />
      <ol className="topbar-crumbs">
        {crumbs.map((label, i) => (
          <li key={`${label}-${i}`} className={i === crumbs.length - 1 ? 'is-current' : undefined}>
            {label}
          </li>
        ))}
      </ol>
    </div>
  )
}
