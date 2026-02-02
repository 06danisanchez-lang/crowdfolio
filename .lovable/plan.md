

## Plan: Configurar OAuth Broker URL

### Cambio a Realizar

**Archivo:** `src/integrations/lovable/index.ts`

Añadir la configuración `oauthBrokerUrl` para que el flujo OAuth use el broker de Lovable Cloud en lugar de intentar acceder a una ruta local en tu dominio personalizado.

### Código Modificado

```typescript
import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "../supabase/client";

const lovableAuth = createLovableAuth({
  oauthBrokerUrl: "https://oauth.lovable.app/initiate",
});

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple", opts?: { redirect_uri?: string }) => {
      const result = await lovableAuth.signInWithOAuth(provider, {
        ...opts,
      });

      if (result.redirected) {
        return result;
      }

      if (result.error) {
        return result;
      }

      try {
        await supabase.auth.setSession(result.tokens);
      } catch (e) {
        return { error: e instanceof Error ? e : new Error(String(e)) };
      }
      return result;
    },
  },
};
```

### Resultado Esperado

Tras este cambio y publicación:
- El login con Google en `crowdfolio.es` usará `oauth.lovable.app/initiate` en lugar de `crowdfolio.es/~oauth/initiate`
- El error 404 desaparecerá
- El flujo OAuth funcionará correctamente en tu dominio personalizado

