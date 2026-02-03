
# Plan: Modal de Bienvenida para Héroes Fundadores

## Resumen

Crear un modal de bienvenida que aparezca **solo una vez** cuando un usuario Pro accede al Dashboard por primera vez. El modal agradecerá a los usuarios fundadores y proporcionará un canal directo de comunicación para feedback.

## Diseño del Modal

```text
+------------------------------------------+
|                    [X]                   |
|                                          |
|     🎉 ¡Bienvenido, Héroe Fundador!      |
|                                          |
|   Gracias por ayudarnos a construir      |
|   Crowdfolio. Tu apoyo temprano hace     |
|   posible este proyecto.                 |
|                                          |
|   Si encuentras cualquier error o        |
|   tienes una sugerencia, escríbeme       |
|   directamente a:                        |
|                                          |
|   📧 soporte@crowdfolio.es               |
|                                          |
|          [ ¡Entendido! ]                 |
+------------------------------------------+
```

## Implementacion Tecnica

### 1. Persistencia del Estado "Ya Visto"

Para asegurar que el modal solo aparezca una vez, usaré **`localStorage`** con una clave específica:
- Clave: `crowdfolio_founder_welcome_shown`
- Valor: `true` (una vez el usuario cierra el modal)

**Ventajas de localStorage:**
- Simple y rápido
- No requiere cambios en la base de datos
- Persiste entre sesiones del navegador
- Si el usuario borra localStorage, verá el modal otra vez (comportamiento aceptable)

### 2. Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/components/subscription/FounderWelcomeModal.tsx` | Crear | Nuevo componente del modal |
| `src/pages/Index.tsx` | Modificar | Integrar el modal en el Dashboard |

### 3. Componente FounderWelcomeModal

```typescript
// Pseudocódigo del componente
function FounderWelcomeModal() {
  const { isPro } = useSubscription();
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    // Solo mostrar si:
    // 1. El usuario es Pro
    // 2. No ha visto el modal antes (localStorage)
    const hasSeenWelcome = localStorage.getItem('crowdfolio_founder_welcome_shown');
    
    if (isPro && !hasSeenWelcome) {
      setOpen(true);
    }
  }, [isPro]);
  
  const handleClose = () => {
    localStorage.setItem('crowdfolio_founder_welcome_shown', 'true');
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* Contenido del modal */}
    </Dialog>
  );
}
```

### 4. Elementos Visuales

- **Icono**: Party Popper (🎉) o similar de Lucide (`PartyPopper`)
- **Título**: "¡Bienvenido, Héroe Fundador!"
- **Mensaje**: Texto de agradecimiento con el email destacado
- **Email**: Link `mailto:` clickeable para facilitar el contacto
- **Botón**: "¡Entendido!" para cerrar el modal

### 5. Integración en Index.tsx

Añadir el componente al final del JSX del Dashboard, junto al `UpgradeModal` existente:

```tsx
{/* Founder Welcome Modal - solo para usuarios Pro */}
<FounderWelcomeModal />

{/* Upgrade Modal */}
<UpgradeModal ... />
```

## Flujo de Usuario

1. Usuario se suscribe a Pro (vía Stripe checkout)
2. Usuario vuelve al Dashboard
3. `SubscriptionContext` detecta `isPro = true`
4. `FounderWelcomeModal` verifica localStorage
5. Si no hay marca de "visto" → Muestra el modal
6. Usuario cierra el modal → Se guarda en localStorage
7. En futuras visitas → El modal no aparece

## Consideraciones

- El modal usará los componentes `Dialog` ya existentes en el proyecto
- Mantendrá el estilo visual consistente con el resto de la aplicación
- El email será un enlace `mailto:` para fácil acceso
- Compatible con modo oscuro gracias a las clases de Tailwind existentes
