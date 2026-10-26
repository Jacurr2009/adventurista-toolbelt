export interface KTWeapon {
  id: string;
  name: string;
  melee: boolean;
  attacks: number; // A
  hit: number; // BS/WS e.g. 4 = 4+
  normalDmg: number;
  critDmg: number;
  rules: string; // e.g. "Lethal 5+, Piercing 1"
}

export interface KTOperative {
  id: string;
  name: string;
  faction: 'Tau' | 'Kroot' | 'Other';
  apl: number;
  move: number; // inches
  save: number; // 4 = 4+
  wounds: number;
  weapons: KTWeapon[];
  abilities: string;
}

export interface KTTeam {
  id: string;
  name: string;
  operatives: KTOperative[];
}

export interface KTOperativeState {
  woundsLeft: number;
  status: 'ready' | 'expended';
  order: 'engage' | 'conceal';
  injured: boolean;
  dead: boolean;
  notes: string;
}

export interface KTGameState {
  teamId: string | null;
  turningPoint: number;
  cp: number;
  vp: number;
  opponentVp: number;
  initiative: 'me' | 'opponent';
  ops: Record<string, KTOperativeState>;
  log: string[];
}

const uid = () => Math.random().toString(36).slice(2, 10);
const w = (name: string, melee: boolean, attacks: number, hit: number, nd: number, cd: number, rules = ''): KTWeapon =>
  ({ id: uid(), name, melee, attacks, hit, normalDmg: nd, critDmg: cd, rules });

// Starter values — approximate, edit to match your current datacards.
export function starterTeams(): KTTeam[] {
  return [
    {
      id: 'tau-pathfinders',
      name: "T'au Pathfinders",
      operatives: [
        { id: uid(), name: 'Shas\'ui Pathfinder', faction: 'Tau', apl: 2, move: 6, save: 5, wounds: 8,
          weapons: [w('Pulse carbine', false, 4, 4, 4, 5), w('Fists', true, 3, 5, 2, 3)], abilities: 'Leader. Markerlight support.' },
        { id: uid(), name: 'Pathfinder Gunner (Rail rifle)', faction: 'Tau', apl: 2, move: 6, save: 5, wounds: 7,
          weapons: [w('Rail rifle', false, 4, 4, 4, 4, 'Devastating 3, Lethal 5+, Piercing 1, Heavy'), w('Fists', true, 3, 5, 2, 3)], abilities: '' },
        { id: uid(), name: 'Pathfinder Gunner (Ion rifle)', faction: 'Tau', apl: 2, move: 6, save: 5, wounds: 7,
          weapons: [w('Ion rifle', false, 5, 4, 4, 5, 'Piercing Crits 1'), w('Fists', true, 3, 5, 2, 3)], abilities: '' },
        { id: uid(), name: 'Marksman', faction: 'Tau', apl: 2, move: 6, save: 5, wounds: 7,
          weapons: [w('Pulse carbine', false, 4, 4, 4, 5), w('Fists', true, 3, 5, 2, 3)], abilities: 'Markerlight: gains Saturate/Seek Light.' },
        { id: uid(), name: 'Pathfinder Trooper', faction: 'Tau', apl: 2, move: 6, save: 5, wounds: 7,
          weapons: [w('Pulse carbine', false, 4, 4, 4, 5), w('Fists', true, 3, 5, 2, 3)], abilities: '' },
      ],
    },
    {
      id: 'farstalker-kinband',
      name: 'Farstalker Kinband (Kroot)',
      operatives: [
        { id: uid(), name: 'Kill-broker', faction: 'Kroot', apl: 3, move: 7, save: 5, wounds: 10,
          weapons: [w('Kroot rifle', false, 4, 3, 3, 4, 'Balanced'), w('Ritual blade', true, 4, 3, 3, 5, 'Lethal 5+')], abilities: 'Leader. Grants extra CP abilities.' },
        { id: uid(), name: 'Kroot Hound', faction: 'Kroot', apl: 2, move: 8, save: 6, wounds: 7,
          weapons: [w('Ripping fangs', true, 4, 3, 3, 4, 'Rending')], abilities: 'Beast. Can\'t perform mission actions.' },
        { id: uid(), name: 'Kroot Stalker', faction: 'Kroot', apl: 2, move: 7, save: 5, wounds: 8,
          weapons: [w('Kroot rifle', false, 4, 4, 3, 4), w('Blades', true, 4, 3, 3, 4, 'Lethal 5+')], abilities: '' },
        { id: uid(), name: 'Kroot Long-sight', faction: 'Kroot', apl: 2, move: 7, save: 5, wounds: 8,
          weapons: [w('Kroot hunting rifle', false, 4, 3, 3, 3, 'Heavy, Lethal 5+, Piercing 1'), w('Fists', true, 3, 4, 2, 3)], abilities: '' },
        { id: uid(), name: 'Kroot Warrior', faction: 'Kroot', apl: 2, move: 7, save: 5, wounds: 8,
          weapons: [w('Kroot rifle', false, 4, 4, 3, 4), w('Rifle butt', true, 3, 4, 2, 3)], abilities: '' },
      ],
    },
  ];
}

const TEAMS_KEY = 'kt-teams';
const GAME_KEY = 'kt-game';

export function loadTeams(): KTTeam[] {
  try {
    const raw = localStorage.getItem(TEAMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Validate: must be a non-empty array of teams, each with an operatives array.
      if (
        Array.isArray(parsed) && parsed.length > 0 &&
        parsed.every(t => t && typeof t.id === 'string' && typeof t.name === 'string' && Array.isArray(t.operatives))
      ) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  const t = starterTeams();
  saveTeams(t);
  return t;
}
export const saveTeams = (t: KTTeam[]) => localStorage.setItem(TEAMS_KEY, JSON.stringify(t));

export function emptyGame(): KTGameState {
  return { teamId: null, turningPoint: 1, cp: 2, vp: 0, opponentVp: 0, initiative: 'me', ops: {}, log: [] };
}
export function loadGame(): KTGameState {
  try { const raw = localStorage.getItem(GAME_KEY); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return emptyGame();
}
export const saveGame = (g: KTGameState) => localStorage.setItem(GAME_KEY, JSON.stringify(g));

export const newOperative = (faction: KTOperative['faction']): KTOperative => ({
  id: uid(), name: 'New Operative', faction, apl: 2, move: 6, save: 5, wounds: 7,
  weapons: [w('Weapon', false, 4, 4, 3, 4)], abilities: '',
});
export const newWeapon = () => w('Weapon', false, 4, 4, 3, 4);
export const newId = uid;

export const d6 = () => Math.floor(Math.random() * 6) + 1;
