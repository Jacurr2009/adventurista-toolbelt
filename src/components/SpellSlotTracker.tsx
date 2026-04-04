import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trash2, Star, Zap } from 'lucide-react';
import { Spell, getSpellById, getSpellSlots, getSlotKey, CharacterSpellSlots, CharacterSpellState } from '@/lib/spells';
import { DndClass } from '@/lib/types';

interface SpellSlotTrackerProps {
  dndClass: DndClass;
  level: number;
  spellState: CharacterSpellState;
  onUpdateSpellState: (state: CharacterSpellState) => void;
  editable?: boolean;
  compact?: boolean;
}

const SCHOOL_COLORS: Record<string, string> = {
  Abjuration: 'text-blue-400',
  Conjuration: 'text-yellow-400',
  Divination: 'text-cyan-400',
  Enchantment: 'text-pink-400',
  Evocation: 'text-orange-400',
  Illusion: 'text-purple-400',
  Necromancy: 'text-green-400',
  Transmutation: 'text-emerald-400',
};

export function SpellSlotTracker({ dndClass, level, spellState, onUpdateSpellState, editable = false, compact = false }: SpellSlotTrackerProps) {
  const maxSlots = useMemo(() => getSpellSlots(dndClass, level), [dndClass, level]);

  const knownSpells = useMemo(() => {
    return spellState.knownSpellIds.map(id => getSpellById(id)).filter(Boolean) as Spell[];
  }, [spellState.knownSpellIds]);

  const cantrips = knownSpells.filter(s => s.level === 0);
  const leveled = knownSpells.filter(s => s.level > 0);
  const groupedByLevel = new Map<number, Spell[]>();
  leveled.forEach(s => {
    const arr = groupedByLevel.get(s.level) || [];
    arr.push(s);
    groupedByLevel.set(s.level, arr);
  });

  const togglePrepared = (spellId: string) => {
    const prepared = spellState.preparedSpellIds.includes(spellId)
      ? spellState.preparedSpellIds.filter(id => id !== spellId)
      : [...spellState.preparedSpellIds, spellId];
    onUpdateSpellState({ ...spellState, preparedSpellIds: prepared });
  };

  const removeSpell = (spellId: string) => {
    onUpdateSpellState({
      ...spellState,
      knownSpellIds: spellState.knownSpellIds.filter(id => id !== spellId),
      preparedSpellIds: spellState.preparedSpellIds.filter(id => id !== spellId),
    });
  };

  const useSlot = (slotLevel: number) => {
    const key = getSlotKey(slotLevel);
    if (spellState.usedSlots[key] >= maxSlots[key]) return;
    onUpdateSpellState({
      ...spellState,
      usedSlots: { ...spellState.usedSlots, [key]: spellState.usedSlots[key] + 1 },
    });
  };

  const restoreSlot = (slotLevel: number) => {
    const key = getSlotKey(slotLevel);
    if (spellState.usedSlots[key] <= 0) return;
    onUpdateSpellState({
      ...spellState,
      usedSlots: { ...spellState.usedSlots, [key]: spellState.usedSlots[key] - 1 },
    });
  };

  const longRest = () => {
    onUpdateSpellState({
      ...spellState,
      usedSlots: { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0, level6: 0, level7: 0, level8: 0, level9: 0 },
    });
  };

  // Slot levels that have capacity
  const activeSlotLevels = Array.from({ length: 9 }, (_, i) => i + 1)
    .filter(l => maxSlots[getSlotKey(l)] > 0);

  return (
    <div className="space-y-2">
      {/* Spell Slots */}
      {activeSlotLevels.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">SPELL SLOTS</span>
            {editable && (
              <button onClick={longRest}
                className="text-[8px] uppercase tracking-widest text-secondary hover:text-secondary/80">
                LONG REST
              </button>
            )}
          </div>
          <div className={`grid ${compact ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-5'} gap-1`}>
            {activeSlotLevels.map(slotLvl => {
              const key = getSlotKey(slotLvl);
              const max = maxSlots[key];
              const used = spellState.usedSlots[key];
              const remaining = max - used;
              return (
                <div key={slotLvl} className="tactical-card !p-1.5 text-center">
                  <span className="text-[8px] uppercase tracking-widest text-muted-foreground block">LVL {slotLvl}</span>
                  <div className="flex items-center justify-center gap-0.5 mt-0.5">
                    {Array.from({ length: max }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => i < remaining ? useSlot(slotLvl) : restoreSlot(slotLvl)}
                        className={`w-2.5 h-2.5 rounded-full border transition-colors ${
                          i < remaining
                            ? 'bg-accent border-accent'
                            : 'bg-transparent border-muted-foreground/40'
                        }`}
                        disabled={!editable}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-mono text-foreground">{remaining}/{max}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cantrips */}
      {cantrips.length > 0 && (
        <div>
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold block mb-1">CANTRIPS</span>
          <div className="space-y-0.5">
            {cantrips.map(spell => (
              <SpellRow
                key={spell.id}
                spell={spell}
                isPrepared={true}
                editable={editable}
                onTogglePrepare={() => {}}
                onRemove={() => removeSpell(spell.id)}
                compact={compact}
              />
            ))}
          </div>
        </div>
      )}

      {/* Leveled spells grouped */}
      {Array.from(groupedByLevel.entries()).sort(([a], [b]) => a - b).map(([lvl, spells]) => (
        <div key={lvl}>
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold block mb-1">
            LEVEL {lvl} SPELLS
          </span>
          <div className="space-y-0.5">
            {spells.map(spell => (
              <SpellRow
                key={spell.id}
                spell={spell}
                isPrepared={spellState.preparedSpellIds.includes(spell.id)}
                editable={editable}
                onTogglePrepare={() => togglePrepared(spell.id)}
                onRemove={() => removeSpell(spell.id)}
                compact={compact}
              />
            ))}
          </div>
        </div>
      ))}

      {knownSpells.length === 0 && (
        <p className="text-sm text-muted-foreground font-mono text-center py-2">No spells known.</p>
      )}
    </div>
  );
}

function SpellRow({ spell, isPrepared, editable, onTogglePrepare, onRemove, compact }: {
  spell: Spell; isPrepared: boolean; editable: boolean;
  onTogglePrepare: () => void; onRemove: () => void; compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 ${compact ? 'px-1.5 py-1' : 'px-2 py-1.5'} rounded-sm hover:bg-muted/20 transition-colors group`}>
      {spell.level > 0 && (
        <button onClick={onTogglePrepare} disabled={!editable}
          className={`shrink-0 ${isPrepared ? 'text-accent' : 'text-muted-foreground/40'}`}
          title={isPrepared ? 'Prepared' : 'Not prepared'}>
          <Star className="w-3 h-3" fill={isPrepared ? 'currentColor' : 'none'} />
        </button>
      )}
      <Sparkles className={`w-3 h-3 shrink-0 ${SCHOOL_COLORS[spell.school] || 'text-muted-foreground'}`} />
      <span className={`font-mono ${compact ? 'text-[10px]' : 'text-xs'} text-foreground flex-1 truncate`}>
        {spell.name}
      </span>
      <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground shrink-0">
        {spell.castTime === 'bonus action' && <Zap className="w-2.5 h-2.5 text-yellow-400" />}
        {spell.concentration && <span className="text-yellow-400">C</span>}
        {spell.damageDie && (
          <span className={spell.healing ? 'text-secondary' : 'text-accent'}>
            {spell.damageDiceCount || 1}d{spell.damageDie}
          </span>
        )}
        <span>{spell.range === 0 ? 'Self' : spell.range === -1 ? 'Touch' : `${spell.range}ft`}</span>
      </div>
      {editable && (
        <button onClick={onRemove}
          className="text-muted-foreground/0 group-hover:text-destructive transition-colors shrink-0">
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
