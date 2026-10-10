import { describe, it, expect } from 'vitest';
import { splitFinished } from './portfolioBuckets';
import type { Investment } from '@/types/investment';

const inv = (id: string, status: Investment['status']) => ({ id, status }) as Investment;

describe('splitFinished', () => {
  it('separa las vencidas sin confirmar de las cerradas', () => {
    const { pending, closed } = splitFinished([inv('a', 'completed'), inv('b', 'pending'), inv('c', 'completed')]);
    expect(pending.map(i => i.id)).toEqual(['b']);
    expect(closed.map(i => i.id)).toEqual(['a', 'c']);
  });
});
