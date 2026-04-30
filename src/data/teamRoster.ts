export interface TeamMember {
  name: string;
  role: string;
}

export const TEAM_ROSTER: TeamMember[] = [
  { name: 'Adam Still', role: 'dev' },
  { name: 'Aiden Caes', role: 'QM' },
  { name: 'Anita Weng', role: 'TS' },
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
  { name: 'Jeremy Selkirk', role: 'TS' },
  { name: 'Jonathan Ray', role: 'dev' },
  { name: 'Josh Lapicola', role: 'dev' },
  { name: 'Julia Rowan', role: 'QM' },
  { name: 'Katie Ferris', role: 'TS' },
  { name: 'Ke Li', role: 'dev' },
  { name: 'Lauren Dyer', role: 'TCap' },
  { name: 'Mariel Zech', role: 'QM' },
  { name: 'Mark Zakhar', role: 'TLTL' },
  { name: 'Michael Messer', role: 'dev' },
  { name: 'Mitch Miller', role: 'TS' },
  { name: 'Nicholas Rose', role: 'dev TL' },
  { name: 'Nick Edmiston', role: 'TS' },
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

/**
 * Short display names, disambiguated by minimum last-name prefix when first names conflict.
 * E.g. "Peter Paulson" → "Peter P", "Peter Wei Lin" → "Peter L",
 *      "Derek Skwarczynski" → "Derek Sk", "Derek Strehlow" → "Derek St".
 */
export const SHORT_NAMES: Record<string, string> = (() => {
  const byFirst: Record<string, TeamMember[]> = {};
  TEAM_ROSTER.forEach(m => {
    const first = m.name.split(' ')[0];
    (byFirst[first] ??= []).push(m);
  });

  const result: Record<string, string> = {};
  Object.values(byFirst).forEach(members => {
    if (members.length === 1) {
      result[members[0].name] = members[0].name.split(' ')[0];
    } else {
      const pairs = members.map(m => {
        const parts = m.name.split(' ');
        return { member: m, last: parts[parts.length - 1] };
      });
      let len = 1;
      const maxLen = Math.max(...pairs.map(p => p.last.length));
      while (len <= maxLen) {
        const prefixes = pairs.map(p => p.last.slice(0, len));
        if (new Set(prefixes).size === prefixes.length) break;
        len++;
      }
      pairs.forEach(({ member, last }) => {
        result[member.name] = `${member.name.split(' ')[0]} ${last.slice(0, len)}`;
      });
    }
  });
  return result;
})();

/** Returns a disambiguated short name (e.g. "Peter P") for use in compact displays. */
export function getShortName(fullName: string): string {
  return SHORT_NAMES[fullName] ?? fullName.split(' ')[0];
}
