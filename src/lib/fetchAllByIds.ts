/**
 * Lee TODAS las filas de una consulta filtrada por una lista de ids.
 *
 * Supabase devuelve como mucho 1000 filas por consulta (max_rows de PostgREST) y
 * lo hace en silencio: si un usuario tiene más cobros o más cuotas previstas, el
 * resto no llega y el informe sale incompleto sin ningún error. Además, `.in()` con
 * cientos de ids hace una URL tan larga que la petición falla.
 *
 * Esta función parte los ids en grupos de `chunkSize` y pide cada grupo por páginas
 * de `pageSize` hasta que una página llega incompleta.
 *
 * `build` recibe los ids del grupo y devuelve la consulta YA ORDENADA por una
 * columna única (normalmente `.order('id')`, o `.order('date').order('id')`):
 * sin un orden fijo, las páginas pueden repetir o saltarse filas. El resultado
 * junta los grupos uno detrás de otro; si importa el orden global, ordénalo después.
 */
export interface RangeableQuery<T> {
  range(from: number, to: number): PromiseLike<{ data: T[] | null; error: unknown }>;
}

export const SUPABASE_MAX_ROWS = 1000;
const DEFAULT_CHUNK = 100;

export async function fetchAllByIds<T>(
  ids: readonly string[],
  build: (chunkIds: string[]) => RangeableQuery<T>,
  { chunkSize = DEFAULT_CHUNK, pageSize = SUPABASE_MAX_ROWS }: { chunkSize?: number; pageSize?: number } = {},
): Promise<T[]> {
  const unique = Array.from(new Set(ids));
  const rows: T[] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await build(chunk).range(from, from + pageSize - 1);
      if (error) throw error;
      const page = data ?? [];
      rows.push(...page);
      if (page.length < pageSize) break;
    }
  }
  return rows;
}
