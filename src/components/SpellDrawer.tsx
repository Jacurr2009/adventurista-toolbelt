import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, BookOpen, Sparkles } from 'lucide-react';
import { Spell, SPELL_LIBRARY, getSpellsForClass, getSpellsByLevel } from '@/lib/spells';
import { DndClass } from '@/lib/types';

interface SpellDrawerProps {
  open: boolean;
  onClose: () => void;
  onAdd: (spellId: string) => void;
  existingIds: string[];
  dndClass: DndClass;
  maxSpellLevel?: number;
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

export function SpellDrawer({ open, onClose, onAdd, existingIds, dndClass, maxSpellLevel = 9 }: SpellDrawerProps) {
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<number | null>(null);
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customLevel, setCustomLevel] = useState(0);
  const [customRange, setCustomRange] = useState(60);
  const [customDamageDie, setCustomDamageDie] = useState(8);
  const [customDiceCount, setCustomDiceCount] = useState(1);
  const [customDamageType, setCustomDamageType] = useState('fire');
  const [customIsAttack, setCustomIsAttack] = useState(true);
  const [customSave, setCustomSave] = useState<string>('none');
  const [customTargetType, setCustomTargetType] = useState<string>('single');
  const [customAoeRadius, setCustomAoeRadius] = useState(20);
  const [customHealing, setCustomHealing] = useState(false);
  const [customDescription, setCustomDescription] = useState('');

  const available = useMemo(() => {
    const base = showAllClasses ? SPELL_LIBRARY : getSpellsForClass(dndClass);
    let filtered = base.filter(s => !existingIds.includes(s.id) && s.level <= maxSpellLevel);
    if (filterLevel !== null) filtered = getSpellsByLevel(filtered, filterLevel);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.school.toLowerCase().includes(q));
    }
    return filtered.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [dndClass, existingIds, search, filterLevel, showAllClasses, maxSpellLevel]);

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const id = `custom-${Date.now()}`;
    // We store custom spells by adding them to the library at runtime is complex,
    // so we just add the id and store the spell data on the character
    onAdd(id);
    // Reset
    setCustomName('');
    setCustomMode(false);
  };

  const levelTabs = Array.from({ length: maxSpellLevel + 1 }, (_, i) => i);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 z-50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          onClick={e => e.stopPropagation()}
          className="bg-card border border-border rounded-t-lg sm:rounded-lg w-full sm:max-w-lg max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-3 border-b border-border flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" />
            <span className="text-[11px] uppercase tracking-widest font-bold text-foreground flex-1">
              {customMode ? 'CREATE CUSTOM SPELL' : 'SPELL LIBRARY'}
            </span>
            <button
              onClick={() => setCustomMode(!customMode)}
              className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground mr-2"
            >
              {customMode ? 'BROWSE' : '+ CUSTOM'}
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {customMode ? (
            <div className="p-3 space-y-3 overflow-y-auto">
              <div>
                <label className="stat-label block mb-1">NAME</label>
                <input value={customName} onChange={e => setCustomName(e.target.value)}
                  className="w-full bg-transparent border border-border rounded-sm px-2 py-1.5 font-mono text-sm text-foreground outline-none"
                  placeholder="Spell name..." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="stat-label block mb-1">LEVEL (0=Cantrip)</label>
                  <input type="number" min={0} max={9} value={customLevel}
                    onChange={e => setCustomLevel(Number(e.target.value))}
                    className="w-full bg-transparent border border-border rounded-sm px-2 py-1.5 font-mono text-sm text-foreground outline-none" />
                </div>
                <div>
                  <label className="stat-label block mb-1">RANGE (ft)</label>
                  <input type="number" min={0} value={customRange}
                    onChange={e => setCustomRange(Number(e.target.value))}
                    className="w-full bg-transparent border border-border rounded-sm px-2 py-1.5 font-mono text-sm text-foreground outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="stat-label block mb-1">DICE COUNT</label>
                  <input type="number" min={0} max={20} value={customDiceCount}
                    onChange={e => setCustomDiceCount(Number(e.target.value))}
                    className="w-full bg-transparent border border-border rounded-sm px-2 py-1.5 font-mono text-sm text-foreground outline-none" />
                </div>
                <div>
                  <label className="stat-label block mb-1">DAMAGE DIE</label>
                  <select value={customDamageDie} onChange={e => setCustomDamageDie(Number(e.target.value))}
                    className="w-full bg-transparent border border-border rounded-sm px-2 py-1.5 font-mono text-sm text-foreground outline-none">
                    {[4, 6, 8, 10, 12].map(d => <option key={d} value={d} className="bg-card">d{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="stat-label block mb-1">TYPE</label>
                  <input value={customDamageType} onChange={e => setCustomDamageType(e.target.value)}
                    className="w-full bg-transparent border border-border rounded-sm px-2 py-1.5 font-mono text-sm text-foreground outline-none"
                    placeholder="fire" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="stat-label block mb-1">TARGET</label>
                  <select value={customTargetType} onChange={e => setCustomTargetType(e.target.value)}
                    className="w-full bg-transparent border border-border rounded-sm px-2 py-1.5 font-mono text-sm text-foreground outline-none">
                    {['single', 'self', 'aoe-sphere', 'aoe-cone', 'aoe-line', 'aoe-cube'].map(t =>
                      <option key={t} value={t} className="bg-card">{t}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="stat-label block mb-1">SAVE</label>
                  <select value={customSave} onChange={e => setCustomSave(e.target.value)}
                    className="w-full bg-transparent border border-border rounded-sm px-2 py-1.5 font-mono text-sm text-foreground outline-none">
                    {['none', 'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(s =>
                      <option key={s} value={s} className="bg-card">{s}</option>
                    )}
                  </select>
                </div>
              </div>
              {customTargetType.startsWith('aoe') && (
                <div>
                  <label className="stat-label block mb-1">AoE RADIUS/LENGTH (ft)</label>
                  <input type="number" min={5} value={customAoeRadius}
                    onChange={e => setCustomAoeRadius(Number(e.target.value))}
                    className="w-full bg-transparent border border-border rounded-sm px-2 py-1.5 font-mono text-sm text-foreground outline-none" />
                </div>
              )}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-foreground">
                  <input type="checkbox" checked={customIsAttack} onChange={e => setCustomIsAttack(e.target.checked)} />
                  Attack Roll
                </label>
                <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-foreground">
                  <input type="checkbox" checked={customHealing} onChange={e => setCustomHealing(e.target.checked)} />
                  Healing
                </label>
              </div>
              <div>
                <label className="stat-label block mb-1">DESCRIPTION</label>
                <textarea value={customDescription} onChange={e => setCustomDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-transparent border border-border rounded-sm px-2 py-1.5 font-mono text-sm text-foreground outline-none resize-none" />
              </div>
              <button onClick={handleAddCustom} disabled={!customName.trim()}
                className="w-full tactical-card text-center font-display text-sm tracking-widest uppercase hover:bg-foreground hover:text-background transition-colors disabled:opacity-30 py-2">
                ADD CUSTOM SPELL
              </button>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="p-2 border-b border-border flex items-center gap-2">
                <Search className="w-3 h-3 text-muted-foreground" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search spells..."
                  className="flex-1 bg-transparent text-sm font-mono text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Level filter tabs */}
              <div className="px-2 py-1.5 border-b border-border flex gap-1 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setFilterLevel(null)}
                  className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-bold shrink-0 ${
                    filterLevel === null ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >ALL</button>
                {levelTabs.map(l => (
                  <button
                    key={l}
                    onClick={() => setFilterLevel(l)}
                    className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-bold shrink-0 ${
                      filterLevel === l ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >{l === 0 ? 'C' : l}</button>
                ))}
                <div className="flex-1" />
                <button
                  onClick={() => setShowAllClasses(!showAllClasses)}
                  className={`text-[8px] uppercase tracking-widest px-2 py-0.5 shrink-0 ${
                    showAllClasses ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >{showAllClasses ? 'ALL CLASSES' : dndClass}</button>
              </div>

              {/* Spell list */}
              <div className="flex-1 overflow-y-auto divide-y divide-border">
                {available.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground font-mono text-center">No spells found.</p>
                ) : (
                  available.map(spell => (
                    <button
                      key={spell.id}
                      onClick={() => onAdd(spell.id)}
                      className="w-full p-2.5 flex items-start gap-2 text-left hover:bg-muted/30 transition-colors"
                    >
                      <Sparkles className={`w-3 h-3 mt-0.5 shrink-0 ${SCHOOL_COLORS[spell.school] || 'text-muted-foreground'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-foreground">{spell.name}</span>
                          <span className="text-[8px] uppercase tracking-widest text-muted-foreground">
                            {spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`}
                          </span>
                        </div>
                        <div className="flex gap-2 text-[8px] text-muted-foreground mt-0.5">
                          <span>{spell.school}</span>
                          <span>{spell.castTime}</span>
                          <span>{spell.range === 0 ? 'Self' : spell.range === -1 ? 'Touch' : `${spell.range}ft`}</span>
                          {spell.damageDie && (
                            <span className={spell.healing ? 'text-secondary' : 'text-accent'}>
                              {spell.damageDiceCount || 1}d{spell.damageDie} {spell.damageType}
                            </span>
                          )}
                          {spell.concentration && <span className="text-yellow-400">CONC</span>}
                        </div>
                        <p className="text-[9px] text-muted-foreground/70 mt-0.5 line-clamp-1">{spell.description}</p>
                      </div>
                      <Plus className="w-3 h-3 text-muted-foreground shrink-0 mt-1" />
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
