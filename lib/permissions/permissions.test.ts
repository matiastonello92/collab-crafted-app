import { can, normalizePermission } from '../permissions';

describe('normalizePermission', () => {
  test('maps legacy names', () => {
    expect(normalizePermission('manage_users')).toBe('users:manage');
    expect(normalizePermission('Flags.View')).toBe('flags:view');
  });
});

describe('can', () => {
  test('exact and wildcard permissions', () => {
    expect(can(['orders:view'], 'orders:view')).toBe(true);
    expect(can(['orders:*'], 'orders:view')).toBe(true);
    expect(can(['*'], 'orders:view')).toBe(true);
  });

  test('normalizes inputs', () => {
    expect(can(['users:manage'], 'manage_users')).toBe(true);
  });
});
