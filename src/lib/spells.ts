import { DndClass } from './types';

export type SpellSchool = 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment' | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation';
export type SpellCastTime = 'action' | 'bonus action' | 'reaction' | 'ritual';
export type SpellTargetType = 'single' | 'self' | 'aoe-sphere' | 'aoe-cone' | 'aoe-line' | 'aoe-cube';
export type SpellSaveAbility = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA' | 'none';

export interface Spell {
  id: string;
  name: string;
  level: number; // 0 = cantrip
  school: SpellSchool;
  castTime: SpellCastTime;
  range: number; // feet, 0 = self, -1 = touch (5ft)
  duration: string;
  concentration: boolean;
  description: string;
  // Damage / healing
  damageDie?: number;
  damageDiceCount?: number;
  damageType?: string;
  healing?: boolean;
  // Targeting
  targetType: SpellTargetType;
  aoeRadius?: number; // feet, for sphere/cube
  aoeLength?: number; // feet, for cone/line
  aoeWidth?: number;  // feet, for line
  // Save
  saveAbility: SpellSaveAbility;
  halfDamageOnSave?: boolean;
  // Attack roll vs save
  isAttackRoll: boolean;
  // Classes that can learn it
  classes: DndClass[];
  // Scaling
  higherLevelDice?: number; // extra dice per level above base
  cantripScaling?: boolean; // scales with character level
}

export interface CharacterSpellSlots {
  level1: number;
  level2: number;
  level3: number;
  level4: number;
  level5: number;
  level6: number;
  level7: number;
  level8: number;
  level9: number;
}

export interface CharacterSpellState {
  knownSpellIds: string[];
  preparedSpellIds: string[];
  usedSlots: CharacterSpellSlots;
}

// Standard spell slot tables per class level (full casters)
const FULL_CASTER_SLOTS: CharacterSpellSlots[] = [
  { level1: 2, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 1
  { level1: 3, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 2
  { level1: 4, level2: 2, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 3
  { level1: 4, level2: 3, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 4
  { level1: 4, level2: 3, level3: 2, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 5
  { level1: 4, level2: 3, level3: 3, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 6
  { level1: 4, level2: 3, level3: 3, level4: 1, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 7
  { level1: 4, level2: 3, level3: 3, level4: 2, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 8
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 1, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 9
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 10
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 1, level7: 0, level8: 0, level9: 0 }, // lvl 11
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 1, level7: 0, level8: 0, level9: 0 }, // lvl 12
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 1, level7: 1, level8: 0, level9: 0 }, // lvl 13
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 1, level7: 1, level8: 0, level9: 0 }, // lvl 14
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 1, level7: 1, level8: 1, level9: 0 }, // lvl 15
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 1, level7: 1, level8: 1, level9: 0 }, // lvl 16
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 }, // lvl 17
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 3, level6: 1, level7: 1, level8: 1, level9: 1 }, // lvl 18
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 3, level6: 2, level7: 1, level8: 1, level9: 1 }, // lvl 19
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 3, level6: 2, level7: 2, level8: 1, level9: 1 }, // lvl 20
];

const HALF_CASTER_SLOTS: CharacterSpellSlots[] = [
  { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 1
  { level1: 2, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 2
  { level1: 3, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 3
  { level1: 3, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 4
  { level1: 4, level2: 2, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 5
  { level1: 4, level2: 2, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 6
  { level1: 4, level2: 3, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 7
  { level1: 4, level2: 3, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 8
  { level1: 4, level2: 3, level3: 2, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 9
  { level1: 4, level2: 3, level3: 2, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 10
  { level1: 4, level2: 3, level3: 3, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 11
  { level1: 4, level2: 3, level3: 3, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 12
  { level1: 4, level2: 3, level3: 3, level4: 1, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 13
  { level1: 4, level2: 3, level3: 3, level4: 1, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 14
  { level1: 4, level2: 3, level3: 3, level4: 2, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 15
  { level1: 4, level2: 3, level3: 3, level4: 2, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 16
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 1, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 17
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 1, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 18
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 19
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 0, level7: 0, level8: 0, level9: 0 }, // lvl 20
];

// Warlock pact magic (short rest recovery, fewer slots but always at max level)
const WARLOCK_SLOTS: { slots: number; slotLevel: number }[] = [
  { slots: 1, slotLevel: 1 }, { slots: 2, slotLevel: 1 }, { slots: 2, slotLevel: 2 },
  { slots: 2, slotLevel: 2 }, { slots: 2, slotLevel: 3 }, { slots: 2, slotLevel: 3 },
  { slots: 2, slotLevel: 4 }, { slots: 2, slotLevel: 4 }, { slots: 2, slotLevel: 5 },
  { slots: 2, slotLevel: 5 }, { slots: 3, slotLevel: 5 }, { slots: 3, slotLevel: 5 },
  { slots: 3, slotLevel: 5 }, { slots: 3, slotLevel: 5 }, { slots: 3, slotLevel: 5 },
  { slots: 3, slotLevel: 5 }, { slots: 4, slotLevel: 5 }, { slots: 4, slotLevel: 5 },
  { slots: 4, slotLevel: 5 }, { slots: 4, slotLevel: 5 },
];

export const FULL_CASTERS: DndClass[] = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'];
export const HALF_CASTERS: DndClass[] = ['Paladin', 'Ranger'];
export const THIRD_CASTERS: DndClass[] = []; // Arcane Trickster / Eldritch Knight handled separately
export const PACT_CASTERS: DndClass[] = ['Warlock'];
export const NON_CASTERS: DndClass[] = ['Barbarian', 'Fighter', 'Monk', 'Rogue'];

export function getSpellSlots(dndClass: DndClass, level: number): CharacterSpellSlots {
  const empty: CharacterSpellSlots = { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 };
  if (NON_CASTERS.includes(dndClass)) return empty;
  const idx = Math.min(level, 20) - 1;
  if (FULL_CASTERS.includes(dndClass)) return { ...FULL_CASTER_SLOTS[idx] };
  if (HALF_CASTERS.includes(dndClass)) return { ...HALF_CASTER_SLOTS[idx] };
  if (PACT_CASTERS.includes(dndClass)) {
    const w = WARLOCK_SLOTS[idx];
    const slots = { ...empty };
    const key = `level${w.slotLevel}` as keyof CharacterSpellSlots;
    slots[key] = w.slots;
    return slots;
  }
  return empty;
}

export function getSpellcastingAbility(dndClass: DndClass): 'INT' | 'WIS' | 'CHA' {
  switch (dndClass) {
    case 'Wizard': return 'INT';
    case 'Cleric': case 'Druid': case 'Ranger': case 'Monk': return 'WIS';
    default: return 'CHA'; // Bard, Sorcerer, Warlock, Paladin
  }
}

export function emptyUsedSlots(): CharacterSpellSlots {
  return { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 };
}

export function getSlotKey(level: number): keyof CharacterSpellSlots {
  return `level${level}` as keyof CharacterSpellSlots;
}

export function getCantripDiceCount(charLevel: number): number {
  if (charLevel >= 17) return 4;
  if (charLevel >= 11) return 3;
  if (charLevel >= 5) return 2;
  return 1;
}

// ─── Core D&D 5e Spell Library ───

export const SPELL_LIBRARY: Spell[] = [
  // ── Cantrips (level 0) ──
  {
    id: 'fire-bolt', name: 'Fire Bolt', level: 0, school: 'Evocation',
    castTime: 'action', range: 120, duration: 'Instant', concentration: false,
    description: 'Hurl a mote of fire at a creature or object within range.',
    damageDie: 10, damageDiceCount: 1, damageType: 'fire',
    targetType: 'single', saveAbility: 'none', isAttackRoll: true,
    classes: ['Sorcerer', 'Wizard'], cantripScaling: true,
  },
  {
    id: 'eldritch-blast', name: 'Eldritch Blast', level: 0, school: 'Evocation',
    castTime: 'action', range: 120, duration: 'Instant', concentration: false,
    description: 'A beam of crackling energy streaks toward a creature within range.',
    damageDie: 10, damageDiceCount: 1, damageType: 'force',
    targetType: 'single', saveAbility: 'none', isAttackRoll: true,
    classes: ['Warlock'], cantripScaling: true,
  },
  {
    id: 'sacred-flame', name: 'Sacred Flame', level: 0, school: 'Evocation',
    castTime: 'action', range: 60, duration: 'Instant', concentration: false,
    description: 'Flame-like radiance descends on a creature you can see within range.',
    damageDie: 8, damageDiceCount: 1, damageType: 'radiant',
    targetType: 'single', saveAbility: 'DEX', isAttackRoll: false,
    classes: ['Cleric'], cantripScaling: true,
  },
  {
    id: 'ray-of-frost', name: 'Ray of Frost', level: 0, school: 'Evocation',
    castTime: 'action', range: 60, duration: 'Instant', concentration: false,
    description: 'A frigid beam of blue-white light streaks toward a creature.',
    damageDie: 8, damageDiceCount: 1, damageType: 'cold',
    targetType: 'single', saveAbility: 'none', isAttackRoll: true,
    classes: ['Sorcerer', 'Wizard'], cantripScaling: true,
  },
  {
    id: 'toll-the-dead', name: 'Toll the Dead', level: 0, school: 'Necromancy',
    castTime: 'action', range: 60, duration: 'Instant', concentration: false,
    description: 'You point at one creature you can see within range, and the sound of a dolorous bell fills the air.',
    damageDie: 8, damageDiceCount: 1, damageType: 'necrotic',
    targetType: 'single', saveAbility: 'WIS', isAttackRoll: false,
    classes: ['Cleric', 'Wizard'], cantripScaling: true,
  },
  {
    id: 'mage-hand', name: 'Mage Hand', level: 0, school: 'Conjuration',
    castTime: 'action', range: 30, duration: '1 minute', concentration: false,
    description: 'A spectral, floating hand appears at a point you choose within range.',
    targetType: 'self', saveAbility: 'none', isAttackRoll: false,
    classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'],
  },
  {
    id: 'prestidigitation', name: 'Prestidigitation', level: 0, school: 'Transmutation',
    castTime: 'action', range: 10, duration: '1 hour', concentration: false,
    description: 'A minor magical trick for novice spellcasters.',
    targetType: 'self', saveAbility: 'none', isAttackRoll: false,
    classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'],
  },
  {
    id: 'guidance', name: 'Guidance', level: 0, school: 'Divination',
    castTime: 'action', range: -1, duration: '1 minute', concentration: true,
    description: 'Touch a willing creature. It can add 1d4 to one ability check.',
    targetType: 'single', saveAbility: 'none', isAttackRoll: false,
    classes: ['Cleric', 'Druid'],
  },
  {
    id: 'druidcraft', name: 'Druidcraft', level: 0, school: 'Transmutation',
    castTime: 'action', range: 30, duration: 'Instant', concentration: false,
    description: 'Whispering to the spirits of nature, you create one of several minor effects.',
    targetType: 'self', saveAbility: 'none', isAttackRoll: false,
    classes: ['Druid'],
  },
  {
    id: 'vicious-mockery', name: 'Vicious Mockery', level: 0, school: 'Enchantment',
    castTime: 'action', range: 60, duration: 'Instant', concentration: false,
    description: 'You unleash a string of insults laced with subtle enchantments.',
    damageDie: 4, damageDiceCount: 1, damageType: 'psychic',
    targetType: 'single', saveAbility: 'WIS', isAttackRoll: false,
    classes: ['Bard'], cantripScaling: true,
  },

  // ── Level 1 ──
  {
    id: 'magic-missile', name: 'Magic Missile', level: 1, school: 'Evocation',
    castTime: 'action', range: 120, duration: 'Instant', concentration: false,
    description: 'Three glowing darts of magical force strike targets automatically.',
    damageDie: 4, damageDiceCount: 3, damageType: 'force',
    targetType: 'single', saveAbility: 'none', isAttackRoll: false,
    classes: ['Sorcerer', 'Wizard'], higherLevelDice: 1,
  },
  {
    id: 'shield', name: 'Shield', level: 1, school: 'Abjuration',
    castTime: 'reaction', range: 0, duration: '1 round', concentration: false,
    description: '+5 AC until start of your next turn, including against the triggering attack.',
    targetType: 'self', saveAbility: 'none', isAttackRoll: false,
    classes: ['Sorcerer', 'Wizard'],
  },
  {
    id: 'healing-word', name: 'Healing Word', level: 1, school: 'Evocation',
    castTime: 'bonus action', range: 60, duration: 'Instant', concentration: false,
    description: 'A creature of your choice that you can see within range regains hit points.',
    damageDie: 4, damageDiceCount: 1, damageType: 'healing', healing: true,
    targetType: 'single', saveAbility: 'none', isAttackRoll: false,
    classes: ['Bard', 'Cleric', 'Druid'], higherLevelDice: 1,
  },
  {
    id: 'cure-wounds', name: 'Cure Wounds', level: 1, school: 'Evocation',
    castTime: 'action', range: -1, duration: 'Instant', concentration: false,
    description: 'A creature you touch regains hit points equal to 1d8 + your spellcasting modifier.',
    damageDie: 8, damageDiceCount: 1, damageType: 'healing', healing: true,
    targetType: 'single', saveAbility: 'none', isAttackRoll: false,
    classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger'], higherLevelDice: 1,
  },
  {
    id: 'guiding-bolt', name: 'Guiding Bolt', level: 1, school: 'Evocation',
    castTime: 'action', range: 120, duration: 'Instant', concentration: false,
    description: 'A flash of light streaks toward a creature. Next attack against it has advantage.',
    damageDie: 6, damageDiceCount: 4, damageType: 'radiant',
    targetType: 'single', saveAbility: 'none', isAttackRoll: true,
    classes: ['Cleric'], higherLevelDice: 1,
  },
  {
    id: 'thunderwave', name: 'Thunderwave', level: 1, school: 'Evocation',
    castTime: 'action', range: 0, duration: 'Instant', concentration: false,
    description: 'A wave of thunderous force sweeps out from you in a 15-foot cube.',
    damageDie: 8, damageDiceCount: 2, damageType: 'thunder',
    targetType: 'aoe-cube', aoeRadius: 15, saveAbility: 'CON', isAttackRoll: false,
    halfDamageOnSave: true,
    classes: ['Bard', 'Druid', 'Sorcerer', 'Wizard'], higherLevelDice: 1,
  },
  {
    id: 'burning-hands', name: 'Burning Hands', level: 1, school: 'Evocation',
    castTime: 'action', range: 0, duration: 'Instant', concentration: false,
    description: 'A thin sheet of flames shoots forth from your fingertips in a 15-foot cone.',
    damageDie: 6, damageDiceCount: 3, damageType: 'fire',
    targetType: 'aoe-cone', aoeLength: 15, saveAbility: 'DEX', isAttackRoll: false,
    halfDamageOnSave: true,
    classes: ['Sorcerer', 'Wizard'], higherLevelDice: 1,
  },
  {
    id: 'hex', name: 'Hex', level: 1, school: 'Enchantment',
    castTime: 'bonus action', range: 90, duration: '1 hour', concentration: true,
    description: 'You curse a target. Deal extra 1d6 necrotic damage on each hit.',
    damageDie: 6, damageDiceCount: 1, damageType: 'necrotic',
    targetType: 'single', saveAbility: 'none', isAttackRoll: false,
    classes: ['Warlock'],
  },
  {
    id: 'hunters-mark', name: "Hunter's Mark", level: 1, school: 'Divination',
    castTime: 'bonus action', range: 90, duration: '1 hour', concentration: true,
    description: 'You choose a creature. Deal extra 1d6 damage on each weapon hit.',
    damageDie: 6, damageDiceCount: 1, damageType: 'force',
    targetType: 'single', saveAbility: 'none', isAttackRoll: false,
    classes: ['Ranger'],
  },

  // ── Level 2 ──
  {
    id: 'scorching-ray', name: 'Scorching Ray', level: 2, school: 'Evocation',
    castTime: 'action', range: 120, duration: 'Instant', concentration: false,
    description: 'You create three rays of fire and hurl them at targets within range.',
    damageDie: 6, damageDiceCount: 2, damageType: 'fire',
    targetType: 'single', saveAbility: 'none', isAttackRoll: true,
    classes: ['Sorcerer', 'Wizard'], higherLevelDice: 1,
  },
  {
    id: 'misty-step', name: 'Misty Step', level: 2, school: 'Conjuration',
    castTime: 'bonus action', range: 0, duration: 'Instant', concentration: false,
    description: 'Teleport up to 30 feet to an unoccupied space you can see.',
    targetType: 'self', saveAbility: 'none', isAttackRoll: false,
    classes: ['Sorcerer', 'Warlock', 'Wizard'],
  },
  {
    id: 'spiritual-weapon', name: 'Spiritual Weapon', level: 2, school: 'Evocation',
    castTime: 'bonus action', range: 60, duration: '1 minute', concentration: false,
    description: 'You create a floating spectral weapon that makes melee spell attacks.',
    damageDie: 8, damageDiceCount: 1, damageType: 'force',
    targetType: 'single', saveAbility: 'none', isAttackRoll: true,
    classes: ['Cleric'],
  },
  {
    id: 'hold-person', name: 'Hold Person', level: 2, school: 'Enchantment',
    castTime: 'action', range: 60, duration: '1 minute', concentration: true,
    description: 'Choose a humanoid within range. It must succeed on a WIS save or be paralyzed.',
    targetType: 'single', saveAbility: 'WIS', isAttackRoll: false,
    classes: ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'],
  },

  // ── Level 3 ──
  {
    id: 'fireball', name: 'Fireball', level: 3, school: 'Evocation',
    castTime: 'action', range: 150, duration: 'Instant', concentration: false,
    description: 'A bright streak flashes and blossoms into an explosion of flame in a 20-foot sphere.',
    damageDie: 6, damageDiceCount: 8, damageType: 'fire',
    targetType: 'aoe-sphere', aoeRadius: 20, saveAbility: 'DEX', isAttackRoll: false,
    halfDamageOnSave: true,
    classes: ['Sorcerer', 'Wizard'], higherLevelDice: 1,
  },
  {
    id: 'lightning-bolt', name: 'Lightning Bolt', level: 3, school: 'Evocation',
    castTime: 'action', range: 0, duration: 'Instant', concentration: false,
    description: 'A stroke of lightning forming a 100-foot line, 5 feet wide.',
    damageDie: 6, damageDiceCount: 8, damageType: 'lightning',
    targetType: 'aoe-line', aoeLength: 100, aoeWidth: 5, saveAbility: 'DEX', isAttackRoll: false,
    halfDamageOnSave: true,
    classes: ['Sorcerer', 'Wizard'], higherLevelDice: 1,
  },
  {
    id: 'counterspell', name: 'Counterspell', level: 3, school: 'Abjuration',
    castTime: 'reaction', range: 60, duration: 'Instant', concentration: false,
    description: 'Attempt to interrupt a creature casting a spell.',
    targetType: 'single', saveAbility: 'none', isAttackRoll: false,
    classes: ['Sorcerer', 'Warlock', 'Wizard'],
  },
  {
    id: 'spirit-guardians', name: 'Spirit Guardians', level: 3, school: 'Conjuration',
    castTime: 'action', range: 0, duration: '10 minutes', concentration: true,
    description: 'Spirits protect you in a 15-foot radius. Enemies take 3d8 radiant damage.',
    damageDie: 8, damageDiceCount: 3, damageType: 'radiant',
    targetType: 'aoe-sphere', aoeRadius: 15, saveAbility: 'WIS', isAttackRoll: false,
    halfDamageOnSave: true,
    classes: ['Cleric'], higherLevelDice: 1,
  },
  {
    id: 'mass-healing-word', name: 'Mass Healing Word', level: 3, school: 'Evocation',
    castTime: 'bonus action', range: 60, duration: 'Instant', concentration: false,
    description: 'Up to six creatures of your choice regain hit points.',
    damageDie: 4, damageDiceCount: 1, damageType: 'healing', healing: true,
    targetType: 'single', saveAbility: 'none', isAttackRoll: false,
    classes: ['Bard', 'Cleric'], higherLevelDice: 1,
  },

  // ── Level 4 ──
  {
    id: 'ice-storm', name: 'Ice Storm', level: 4, school: 'Evocation',
    castTime: 'action', range: 300, duration: 'Instant', concentration: false,
    description: 'A hail of rock-hard ice pounds an area in a 20-foot sphere.',
    damageDie: 8, damageDiceCount: 2, damageType: 'bludgeoning',
    targetType: 'aoe-sphere', aoeRadius: 20, saveAbility: 'DEX', isAttackRoll: false,
    halfDamageOnSave: true,
    classes: ['Druid', 'Sorcerer', 'Wizard'], higherLevelDice: 1,
  },
  {
    id: 'banishment', name: 'Banishment', level: 4, school: 'Abjuration',
    castTime: 'action', range: 60, duration: '1 minute', concentration: true,
    description: 'Attempt to banish a creature to another plane. CHA save.',
    targetType: 'single', saveAbility: 'CHA', isAttackRoll: false,
    classes: ['Cleric', 'Paladin', 'Sorcerer', 'Warlock', 'Wizard'],
  },

  // ── Level 5 ──
  {
    id: 'cone-of-cold', name: 'Cone of Cold', level: 5, school: 'Evocation',
    castTime: 'action', range: 0, duration: 'Instant', concentration: false,
    description: 'A blast of cold air erupts in a 60-foot cone.',
    damageDie: 8, damageDiceCount: 8, damageType: 'cold',
    targetType: 'aoe-cone', aoeLength: 60, saveAbility: 'CON', isAttackRoll: false,
    halfDamageOnSave: true,
    classes: ['Sorcerer', 'Wizard'], higherLevelDice: 1,
  },
  {
    id: 'mass-cure-wounds', name: 'Mass Cure Wounds', level: 5, school: 'Evocation',
    castTime: 'action', range: 60, duration: 'Instant', concentration: false,
    description: 'Up to six creatures in a 30-foot-radius sphere regain 3d8 + mod HP.',
    damageDie: 8, damageDiceCount: 3, damageType: 'healing', healing: true,
    targetType: 'aoe-sphere', aoeRadius: 30, saveAbility: 'none', isAttackRoll: false,
    classes: ['Bard', 'Cleric', 'Druid'], higherLevelDice: 1,
  },
];

export function getSpellById(id: string): Spell | undefined {
  return SPELL_LIBRARY.find(s => s.id === id);
}

export function getSpellsForClass(dndClass: DndClass): Spell[] {
  return SPELL_LIBRARY.filter(s => s.classes.includes(dndClass));
}

export function getSpellsByLevel(spells: Spell[], level: number): Spell[] {
  return spells.filter(s => s.level === level);
}
