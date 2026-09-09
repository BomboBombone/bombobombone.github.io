export type ProjectPointer = { key: string; value: string; info: string; href: string };

// Add future public projects here; .pdata and its pointer view grow from this table.
export const projectPointers: ProjectPointer[] = [
  {
    key: 'p_security_notes',
    value: 'github.com/BomboBombone/bombobombone.github.io',
    info: 'This website',
    href: 'https://github.com/BomboBombone/bombobombone.github.io',
  },
];

export const projectPointerBytes = projectPointers.reduce((total, project) => total + project.value.length + 1, 0);
