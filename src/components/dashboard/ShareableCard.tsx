import { forwardRef } from 'react';
import { Wallet, TrendingUp, PiggyBank } from 'lucide-react';
import crowdfolioLogo from '@/assets/crowdfolio-logo.png';

interface ShareableCardProps {
  totalInvested: number;
  totalReturns: number;
  averageReturn: number;
}

const ShareableCard = forwardRef<HTMLDivElement, ShareableCardProps>(
  ({ totalInvested, totalReturns, averageReturn }, ref) => {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    };

    const returnPercentage = totalInvested > 0 
      ? ((totalReturns / totalInvested) * 100).toFixed(1) 
      : '0';

    return (
      <div
        ref={ref}
        className="w-[400px] rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, hsl(222, 47%, 11%) 0%, hsl(217, 33%, 17%) 50%, hsl(215, 25%, 27%) 100%)',
        }}
      >
        {/* Header con logo */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img 
              src={crowdfolioLogo} 
              alt="Crowdfolio" 
              className="h-10 w-10 rounded-lg"
            />
            <span className="text-xl font-bold text-white tracking-tight">
              CROWDFOLIO
            </span>
          </div>
        </div>

        {/* Métricas */}
        <div className="p-6 space-y-5">
          {/* Capital Invertido */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/20">
              <Wallet className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">Capital Invertido</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalInvested)}</p>
            </div>
          </div>

          {/* Retornos Recibidos */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <TrendingUp className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">Retornos Recibidos</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{formatCurrency(totalReturns)}</p>
                <span className="text-sm font-semibold text-emerald-400">
                  (+{returnPercentage}%)
                </span>
              </div>
            </div>
          </div>

          {/* Rentabilidad Media */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/20">
              <PiggyBank className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">Rentabilidad Media</p>
              <p className="text-2xl font-bold text-white">{averageReturn.toFixed(1)}% <span className="text-base font-normal text-gray-400">anual</span></p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/5 border-t border-white/10">
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg">🚀</span>
            <span className="text-sm font-medium text-gray-300">crowdfolio.es</span>
          </div>
        </div>
      </div>
    );
  }
);

ShareableCard.displayName = 'ShareableCard';

export { ShareableCard };
