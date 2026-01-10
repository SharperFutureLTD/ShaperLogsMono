'use client'

import { Linkedin, FileText, ArrowRight } from 'lucide-react'

interface QuickGenerateWidgetProps {
  onSelectType: (type: string) => void
}

export function QuickGenerateWidget({ onSelectType }: QuickGenerateWidgetProps) {
  const actions = [
    { id: 'linkedin_post', label: 'LinkedIn Post', icon: Linkedin },
    { id: 'weekly_summary', label: 'Weekly Summary', icon: FileText },
  ]

  return (
    <div>
      <div className="section-header">
        <span className="section-title-muted">QUICK GENERATE</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={() => onSelectType(action.id)}
              className="quick-action group"
            >
              <Icon className="h-3.5 w-3.5 quick-action-icon transition-colors" />
              <span className="flex-1 transition-colors group-hover:text-[#F1F5F3]">
                {action.label}
              </span>
              <ArrowRight className="h-3 w-3 quick-action-arrow" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
