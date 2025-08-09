import { validateInitData } from './validateInitData';

describe('validateInitData', () => {
  it('throws when hash is invalid', () => {
    const raw = 'query_id=1&auth_date=1&hash=deadbeef';
    expect(() => validateInitData(raw, 'testtoken')).toThrow('Invalid data hash');
  });
});