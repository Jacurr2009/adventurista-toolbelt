export type AbilityName = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export interface AbilityScore {
  name: AbilityName;
  score: number;
}

export type DndClass = 
  | 'Barbarian' | 'Bard' | 'Cleric' | 'Druid' 
  | 'Fighter' | 'Monk' | 'Paladin' | 'Ranger' 
  | 'Rogue' | 'Sorcerer' | 'Warlock' | 'Wizard';

export type DndRace = 
  | 'Human' | 'Elf' | 'Dwarf' | 'Halfling' 
  | 'Gnome' | 'Half-Elf' | 'Half-Orc' | 'Tiefling' | 'Dragonborn';

export interface EquipmentItem {
  id: string;
  name: string;
  weight: number;
  quantity: number;
  equipped: boolean;
  category: 'weapon' | 'armor' | 'gear' | 'consumable';
}

export interface Character {
  id: string;
  name: string;
  race: DndRace;
  class: DndClass;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  ac: number;
  speed: number;
  abilities: AbilityScore[];
  equipment: EquipmentItem[];
  createdAt: string;
}

export interface CampaignResource {
  id: string;
  title: string;
  description: string;
  tags: string[];
  type: 'map' | 'lore' | 'rules' | 'handout';
  content: string;
  createdAt: string;
}

export const DND_CLASSES: DndClass[] = [
  'Barbarian','Bard','Cleric','Druid','Fighter','Monk',
  'Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard'
];

export const DND_RACES: DndRace[] = [
  'Human','Elf','Dwarf','Halfling','Gnome','Half-Elf','Half-Orc','Tiefling','Dragonborn'
];

export const ABILITY_NAMES: AbilityName[] = ['STR','DEX','CON','INT','WIS','CHA'];

export function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(score: number): string {
  const mod = getModifier(score);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function xpForLevel(level: number): number {
  const table = [0,0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];
  return table[Math.min(level, 20)] ?? 355000;
}

export const CLASS_HIT_DIE: Record<DndClass, number> = {
  Barbarian: 12, Bard: 8, Cleric: 8, Druid: 8,
  Fighter: 10, Monk: 8, Paladin: 10, Ranger: 10,
  Rogue: 8, Sorcerer: 6, Warlock: 8, Wizard: 6,
};

export const EQUIPMENT_CATALOG: Omit<EquipmentItem, 'id' | 'equipped'>[] = [
  { name: 'Longsword', weight: 3, quantity: 1, category: 'weapon' },
  { name: 'Shortbow', weight: 2, quantity: 1, category: 'weapon' },
  { name: 'Dagger', weight: 1, quantity: 1, category: 'weapon' },
  { name: 'Greataxe', weight: 7, quantity: 1, category: 'weapon' },
  { name: 'Handaxe', weight: 2, quantity: 1, category: 'weapon' },
  { name: 'Javelin', weight: 2, quantity: 1, category: 'weapon' },
  { name: 'Mace', weight: 4, quantity: 1, category: 'weapon' },
  { name: 'Quarterstaff', weight: 4, quantity: 1, category: 'weapon' },
  { name: 'Chain Mail', weight: 55, quantity: 1, category: 'armor' },
  { name: 'Leather Armor', weight: 10, quantity: 1, category: 'armor' },
  { name: 'Scale Mail', weight: 45, quantity: 1, category: 'armor' },
  { name: 'Shield', weight: 6, quantity: 1, category: 'armor' },
  { name: 'Studded Leather', weight: 13, quantity: 1, category: 'armor' },
  { name: 'Backpack', weight: 5, quantity: 1, category: 'gear' },
  { name: 'Rope (50 ft)', weight: 10, quantity: 1, category: 'gear' },
  { name: 'Torch', weight: 1, quantity: 5, category: 'gear' },
  { name: 'Tinderbox', weight: 1, quantity: 1, category: 'gear' },
  { name: 'Rations (1 day)', weight: 2, quantity: 5, category: 'consumable' },
  { name: 'Healing Potion', weight: 0.5, quantity: 1, category: 'consumable' },
  { name: 'Antitoxin', weight: 0, quantity: 1, category: 'consumable' },
];
