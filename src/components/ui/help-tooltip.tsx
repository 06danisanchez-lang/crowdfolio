import { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
  iconClassName?: string;
  delayDuration?: number;
}

export function HelpTooltip({
  content,
  side = 'top',
  align = 'center',
  className,
  iconClassName,
  delayDuration = 200,
}: HelpTooltipProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center rounded-full p-0.5',
              'text-muted-foreground hover:text-foreground transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              className
            )}
            aria-label="Ayuda"
          >
            <HelpCircle className={cn('h-4 w-4', iconClassName)} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className="max-w-xs text-sm"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface HelpLabelProps {
  label: string;
  helpContent: ReactNode;
  className?: string;
  labelClassName?: string;
}

export function HelpLabel({
  label,
  helpContent,
  className,
  labelClassName,
}: HelpLabelProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={labelClassName}>{label}</span>
      <HelpTooltip content={helpContent} />
    </span>
  );
}
