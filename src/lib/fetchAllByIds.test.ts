import { describe, expect, it } from 'vitest';
import { fetchAllByIds, type RangeableQuery } from './fetchAllByIds';

type Row = { id: string; investment_id: string };

/** Simula Supabase: filtra por ids y corta en max_rows como PostgREST. */
function fakeTable(rows: Row[], maxRows: number) {
  const calls: { ids: string[]; from: number; to: number }[] = [];
  const build = (ids: string[]): RangeableQuery<Row> => ({
    range: async (from, to) => {
      calls.push({ ids, from, to });
      const filtered = rows.filter(r => ids.includes(r.investment_id));
      const end = Math.min(to + 1, from + maxRows);
      return { data: filtered.slice(from, end), error: null };
    },
  });
  return { build, calls };
}

function makeRows(investments: number, perInvestment: number): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < investments; i++) {
    for (let j = 0; j < perInvestment; j++) rows.push({ id: `${i}-${j}`, investment_id: `inv-${i}` });
  }
  return rows;
}

describe('fetchAllByIds', () => {
  it('trae todas las filas aunque pasen del límite de 1000 por consulta', async () => {
    const rows = makeRows(30, 50); // 1500 filas
    const { build } = fakeTable(rows, 1000);
    const ids = Array.from({ length: 30 }, (_, i) => `inv-${i}`);
    const result = await fetchAllByIds(ids, build, { chunkSize: 100 });
    expect(result).toHaveLength(1500);
    expect(new Set(result.map(r => r.id)).size).toBe(1500);
  });

  it('parte los ids en grupos para no hacer URLs gigantes', async () => {
    const rows = makeRows(250, 2);
    const { build, calls } = fakeTable(rows, 1000);
    const ids = Array.from({ length: 250 }, (_, i) => `inv-${i}`);
    const result = await fetchAllByIds(ids, build);
    expect(result).toHaveLength(500);
    expect(Math.max(...calls.map(c => c.ids.length))).toBeLessThanOrEqual(100);
  });

  it('pagina dentro de un grupo y para en la página incompleta', async () => {
    const rows = makeRows(1, 25);
    const { build, calls } = fakeTable(rows, 10);
    const result = await fetchAllByIds(['inv-0'], build, { pageSize: 10 });
    expect(result).toHaveLength(25);
    expect(calls.map(c => c.from)).toEqual([0, 10, 20]);
  });

  it('no repite ids duplicados ni hace consultas sin ids', async () => {
    const { build, calls } = fakeTable(makeRows(2, 1), 1000);
    expect(await fetchAllByIds([], build)).toEqual([]);
    expect(calls).toHaveLength(0);
    expect(await fetchAllByIds(['inv-0', 'inv-0'], build)).toHaveLength(1);
  });

  it('propaga el error de Supabase', async () => {
    const build = (): RangeableQuery<Row> => ({ range: async () => ({ data: null, error: new Error('boom') }) });
    await expect(fetchAllByIds(['x'], build)).rejects.toThrow('boom');
  });
});
