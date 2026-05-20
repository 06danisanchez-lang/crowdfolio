import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { queryClient } from '@/lib/queryClient';

export function DebugPanel() {
  const { user, hasBootstrapped, isLoading: authLoading } = useAuth();
  const { subscription, isLoading: subLoading } = useSubscription();
  const [radixCount, setRadixCount] = useState({ portals: 0, dismissable: 0 });
  const [lsKeys, setLsKeys] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRadixCount({
        portals: document.querySelectorAll('[data-radix-portal]').length,
        dismissable: document.querySelectorAll('[data-radix-dismissable-layer]').length,
      });
      try {
        setLsKeys(Object.keys(localStorage));
      } catch {
        setLsKeys([]);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = () => {
    try { localStorage.clear(); } catch { /* intentional */ }
    try { sessionStorage.clear(); } catch { /* intentional */ }
    try { queryClient.clear(); } catch { /* intentional */ }
    window.location.assign('/');
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-h-[70vh] w-80 overflow-auto rounded-lg border bg-white p-4 text-xs shadow-xl dark:bg-gray-900">
      <h3 className="mb-2 font-bold text-sm">🔧 Debug Panel</h3>

      <div className="mb-2">
        <strong>Auth:</strong> bootstrapped={String(hasBootstrapped)}, loading={String(authLoading)}, user={user?.id?.slice(0, 8) ?? 'null'}
      </div>

      <div className="mb-2">
        <strong>Sub:</strong> plan={subscription.plan}, loading={String(subLoading)}
      </div>

      <div className="mb-2">
        <strong>Radix:</strong> portals={radixCount.portals}, dismissable={radixCount.dismissable}
      </div>

      <div className="mb-2">
        <strong>localStorage keys ({lsKeys.length}):</strong>
        <div className="mt-1 max-h-24 overflow-auto rounded bg-gray-100 p-1 dark:bg-gray-800">
          {lsKeys.map(k => <div key={k} className="truncate">{k}</div>)}
        </div>
      </div>

      <button
        onClick={handleReset}
        className="mt-2 w-full rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
      >
        Reset app state
      </button>
    </div>
  );
}
