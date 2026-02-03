import { Shield, Lock, RefreshCcw, Zap } from 'lucide-react';

const badges = [
  {
    icon: Shield,
    label: 'Datos seguros',
  },
  {
    icon: Lock,
    label: 'Cifrado SSL',
  },
  {
    icon: RefreshCcw,
    label: 'Backups diarios',
  },
  {
    icon: Zap,
    label: 'Alta disponibilidad',
  },
];

export default function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
      {badges.map((badge) => (
        <div
          key={badge.label}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <badge.icon className="h-4 w-4" />
          <span className="text-sm font-medium">{badge.label}</span>
        </div>
      ))}
    </div>
  );
}
