import { LucideIcon, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconBgColor: string
  iconColor: string
  tooltip?: string
  progress?: { value: number; color: string }
  progressSegments?: { value: number; color: string }[]
  belowLabel?: string
  belowLabelClassName?: string
  percentage?: number
  percentageColor?: string
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor,
  iconColor,
  tooltip,
  progress,
  progressSegments,
  belowLabel,
  belowLabelClassName,
  percentage,
  percentageColor,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
      <div className="mb-4">
        <div className={cn('inline-flex p-2.5 rounded-full', iconBgColor)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
      </div>
      <div className="text-center">
        <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
        <div className="flex items-center justify-center gap-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        {percentage !== undefined && (
          <p className={cn('text-xs mt-1', percentageColor || 'text-gray-500')}>
            {percentage}%
          </p>
        )}
        {belowLabel && <p className={cn('text-xs mt-1', belowLabelClassName)}>{belowLabel}</p>}
      </div>
      {progress && !progressSegments && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className={cn('h-1.5 rounded-full transition-all', progress.color)} style={{ width: `${Math.min(Math.max(progress.value, 0), 100)}%` }} />
          </div>
        </div>
      )}
      {progressSegments && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden flex">
            {progressSegments.map((seg, i) => (
              <div key={i} className={cn('h-1.5', seg.color)} style={{ width: `${Math.min(Math.max(seg.value, 0), 100)}%` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default StatsCard
