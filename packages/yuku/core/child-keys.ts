export const childKeys: Record<string, string[]> = Object.create(null);

export function addChildKeys(type: string, keys: string[]): void {
  const existing = childKeys[type];
  if (existing === undefined) childKeys[type] = keys;
  else for (const key of keys) if (!existing.includes(key)) existing.push(key);
}
