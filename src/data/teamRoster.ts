export interface TeamMember {
  name: string;
  role: string;
}

export const TEAM_ROSTER: TeamMember[] = [
  { name: 'Adam Still', role: 'dev' },
  { name: 'Aiden Caes', role: 'QM' },
  { name: 'Anna Waskowsky', role: 'TLTL' },
  { name: 'Anne Field', role: 'QM' },
  { name: 'Brandon Campos Botello', role: 'dev' },
  { name: 'Chase Grey', role: 'dev TL' },
  { name: 'Damon Drury', role: 'QM' },
  { name: 'Dan Demp', role: 'dev' },
  { name: 'Daoxing Zhang', role: 'dev' },
  { name: 'David Coll', role: 'dev' },
  { name: 'David Krajnik', role: 'dev' },
  { name: 'Derek Skwarczynski', role: 'QM' },
  { name: 'Derek Strehlow', role: 'dev TL' },
  { name: 'Gauresh Walia', role: 'dev' },
  { name: 'Jacob Franz', role: 'dev' },
  { name: 'Jonathan Ray', role: 'dev' },
  { name: 'Josh Lapicola', role: 'dev' },
  { name: 'Julia Rowan', role: 'QM' },
  { name: 'Ke Li', role: 'dev' },
  { name: 'Lauren Dyer', role: 'QM' },
  { name: 'Mariel Zech', role: 'QM' },
  { name: 'Mark Zakhar', role: 'TLTL' },
  { name: 'Michael Messer', role: 'dev' },
  { name: 'Nicholas Rose', role: 'dev TL' },
  { name: 'Parker Volkman', role: 'QM' },
  { name: 'Peter Paulson', role: 'dev' },
  { name: 'Peter Wei Lin', role: 'dev' },
  { name: 'Selina Li', role: 'UXD' },
  { name: 'Sheng Liu', role: 'dev TL' },
  { name: 'Tim Paukovits', role: 'dev' },
];

export function getRoleForName(name: string): string | null {
  return TEAM_ROSTER.find(m => m.name === name)?.role ?? null;
}
