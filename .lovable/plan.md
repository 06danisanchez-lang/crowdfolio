

# Reflejar estado Pro/Free en toda la UI

## Resumen

2 archivos modificados, 0 archivos nuevos. El boton Pro aparece en todas las paginas del panel porque todas pasan por `AppLayout` (verificado en `Index.tsx` linea 256).

## Archivo 1: `src/components/subscription/UpgradeModal.tsx`

**Cambio:** Leer `isPro` del contexto y condicionar el contenido del modal.

- Importar `useSubscription` (ya importado el contexto, solo falta leer `isPro`)
- Si `isPro`:
  - Titulo: "Tu Plan Pro" en vez de "Desbloquea Crowdfolio Pro"
  - Descripcion: "Estos son tus beneficios activos."
  - Ocultar: toggle Mensual/Anual, bloque de precio, boton CTA, texto "Cancela cuando quieras"
- Si no es Pro: sin cambios (comportamiento actual)
- La lista `PRO_FEATURES` siempre visible (es la unica fuente de verdad)

```diff
 export function UpgradeModal({ open, onOpenChange, feature = 'default' }: UpgradeModalProps) {
-  const { openCheckout } = useSubscription();
+  const { openCheckout, isPro } = useSubscription();
   const [isLoading, setIsLoading] = useState<'monthly' | 'yearly' | null>(null);
   ...

         <div className="flex items-center gap-2">
           <Crown className="h-6 w-6 text-primary" />
-          <DialogTitle>Desbloquea Crowdfolio Pro</DialogTitle>
+          <DialogTitle>{isPro ? 'Tu Plan Pro' : 'Desbloquea Crowdfolio Pro'}</DialogTitle>
         </div>
         <DialogDescription className="pt-2">
-          {featureMessage}
+          {isPro ? 'Estos son tus beneficios activos.' : featureMessage}
         </DialogDescription>

       <div className="space-y-4 py-4">
-        {/* Plan Toggle */}
-        <div className="flex rounded-lg border p-1">
-          ...
-        </div>
-        {/* Price Display */}
-        <div className="rounded-lg border bg-muted/50 p-4 text-center">
-          ...
-        </div>
+        {!isPro && (
+          <>
+            {/* Plan Toggle */}
+            <div className="flex rounded-lg border p-1">...</div>
+            {/* Price Display */}
+            <div className="rounded-lg border bg-muted/50 p-4 text-center">...</div>
+          </>
+        )}

         {/* Features List -- siempre visible */}
         <ul className="space-y-2">
           {PRO_FEATURES.map(...)}
         </ul>

-        {/* CTA Button */}
-        <Button ...>Empezar con Pro</Button>
-        <p ...>Cancela cuando quieras...</p>
+        {!isPro && (
+          <>
+            <Button ...>Empezar con Pro</Button>
+            <p ...>Cancela cuando quieras. Sin compromisos.</p>
+          </>
+        )}
       </div>
```

## Archivo 2: `src/components/layout/AppLayout.tsx`

**Cambio:** Anadir boton Pro global en mobile header y sidebar desktop + instanciar UpgradeModal.

- Importar `Crown` de lucide, `useSubscription`, `UpgradeModal`, y `useState` (ya importado)
- Anadir estado local `upgradeOpen`
- **Mobile header** (linea 74, dentro del div `gap-1`): anadir boton antes de NotificationBell
- **Sidebar** (linea 113, antes del div de NotificationBell): anadir boton como nav item
- **Ambos** muestran: `isPro ? "Ya eres Pro" : "Hazte Pro"` (texto completo, incluido mobile)
- Instanciar `<UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />` al final del JSX

```diff
 import { useState } from 'react';
+import { Crown } from 'lucide-react';  // (anadir a imports existentes de lucide)
+import { useSubscription } from '@/contexts/SubscriptionContext';
+import { UpgradeModal } from '@/components/subscription/UpgradeModal';

 export function AppLayout(...) {
   const [sidebarOpen, setSidebarOpen] = useState(false);
+  const [upgradeOpen, setUpgradeOpen] = useState(false);
+  const { isPro } = useSubscription();
   ...

   {/* Mobile Header - dentro del div gap-1 */}
   <div className="flex items-center gap-1">
+    <Button
+      variant={isPro ? "outline" : "default"}
+      size="sm"
+      onClick={() => setUpgradeOpen(true)}
+    >
+      <Crown className="h-4 w-4" />
+      {isPro ? 'Ya eres Pro' : 'Hazte Pro'}
+    </Button>
     <NotificationBell ... />
     <AlertsPanel ... />
   </div>

   {/* Sidebar - antes del div de NotificationBell (linea 113) */}
+  <button
+    onClick={() => { setUpgradeOpen(true); setSidebarOpen(false); }}
+    className={cn(
+      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
+      isPro
+        ? "text-primary hover:bg-accent"
+        : "bg-primary/10 text-primary hover:bg-primary/20"
+    )}
+  >
+    <Crown className="h-4 w-4" />
+    {isPro ? 'Ya eres Pro' : 'Hazte Pro'}
+  </button>
   <div className="flex items-center gap-2 pt-2">
     ...

   {/* Al final, antes del cierre de </div> raiz */}
+  <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
   </div>
```

## Cobertura global verificada

`Index.tsx` (linea 256-278) envuelve **todas** las vistas (dashboard, investments, opportunities, platforms, tax, profile, settings, admin) dentro de `<AppLayout>`. No hay ninguna vista del panel que use otro layout. El boton sera visible en todas.

## Flujo post-checkout

Sin cambios necesarios. `SubscriptionContext` ya tiene retry agresivo (1s, 3s, 7s, 15s) al detectar `?subscription=success`. Cuando `isPro` cambia a `true`, React re-renderiza automaticamente el boton a "Ya eres Pro" y el modal oculta el CTA.

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `src/components/subscription/UpgradeModal.tsx` | Leer `isPro`, condicionar titulo/descripcion/CTA |
| `src/components/layout/AppLayout.tsx` | Boton Pro en mobile header + sidebar + UpgradeModal |

Total: **2 archivos, 0 nuevos, 0 rutas renombradas**.
