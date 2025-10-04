import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import { WidgetSize } from '@/lib/dashboard/types';
import { cn } from '@/lib/utils';

interface WidgetContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: WidgetSize;
  actions?: React.ReactNode;
  className?: string;
}

const sizeClasses: Record<WidgetSize, string> = {
  small: 'col-span-1',
  medium: 'col-span-1 md:col-span-2',
  large: 'col-span-1 md:col-span-2 lg:col-span-3',
};

export function WidgetContainer({
  title,
  description,
  children,
  size = 'medium',
  actions,
  className,
}: WidgetContainerProps) {
  const { t } = useTranslation();

  return (
    <Card className={cn(sizeClasses[size], className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{t(title)}</CardTitle>
            {description && (
              <CardDescription className="text-sm">
                {t(description)}
              </CardDescription>
            )}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
