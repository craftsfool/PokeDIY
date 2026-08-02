import { Check } from 'lucide-react'

const steps = ['形象设定', '基础资料', '进化关系', '特性与招式', '图鉴预览']

export function StepRail({ active, onChange, completed }) {
  return (
    <aside className="step-rail" aria-label="创作步骤">
      <p className="rail-title">创作流程</p>
      {steps.map((step, index) => {
        const n = index + 1
        return (
          <button key={step} className={active === n ? 'step active' : 'step'} onClick={() => onChange(n)}>
            <span className="step-number">{completed.includes(n) ? <Check size={13} /> : String(n).padStart(2, '0')}</span>
            <span><strong>{step}</strong><small>{n === 1 ? '上传原创设定' : n === 5 ? '检查并发布' : '完善图鉴资料'}</small></span>
          </button>
        )
      })}
      <div className="rail-note">
        <span>创作提示</span>
        <p>引用资料会自动标注来源；自建内容将在词条中显示为原创设定。</p>
      </div>
    </aside>
  )
}
