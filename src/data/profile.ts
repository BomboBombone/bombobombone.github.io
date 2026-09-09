export type ProfileSymbol = { key: string; type: string; value: string; info: string; href?: string };

export const profileSymbols: ProfileSymbol[] = [
  { key: 's_name', type: 'ASCII', value: 'Marco Paciaroni', info: 'Name' },
  { key: 's_handle', type: 'ASCII', value: 'BomboBombone', info: 'Handle' },
  { key: 's_focus', type: 'ASCII', value: 'Cybersecurity researcher specializing in Windows and iOS', info: 'Focus' },
  { key: 's_source', type: 'ASCII', value: 'github.com/BomboBombone', info: 'GitHub', href: 'https://github.com/BomboBombone' },
] as const;

export const profileTextBytes = profileSymbols.reduce((total, symbol) => total + symbol.value.length + 1, 0);
