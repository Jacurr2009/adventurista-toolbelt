import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Character, formatModifier, getModifier, xpForLevel } from '@/lib/types';
import { getCharacters, updateCharacter, deleteCharacter } from '@/lib/store';
import { StatBlock } from '@/components/StatBlock';
import { HpBar } from '@/components/HpBar';
import { EquipmentRow } from '@/components/EquipmentRow';
import { EquipmentDrawer } from '@/components/EquipmentDrawer';
import { ArrowLeft, Plus, Trash2, Edit2, Save } from 'lucide-react';

export default function CharacterView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [char, setChar] = useState<Character | null>(null);
  const [editing, setEditing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const found = getCharacters().find(c => c.id === id);
    if (!found) navigate('/');
    else setChar(found);
  }, [id]);

  if (!char) return null;

  const save = (updated: Character) => {
    setChar(updated);
    updateCharacter(updated);
  };

  const handleDelete = () => {
    deleteCharacter(char.id);
    navigate('/');
  };

  const xpNext = xpForLevel(char.level + 1);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="sr-only">BACK</span>
        </button>
        <div className="flex-1">
          <h1 className="font-display text-xl text-foreground">{char.name}</h1>
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest">
            LVL {char.level} {char.race} {char.class}
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            onClick={() => setEditing(!editing)}
            className="tactical-card py-2 px-3 flex items-center gap-2 text-[10px] uppercase tracking-widest"
            whileTap={{ scale: 0.98 }}
          >
            {editing ? <><Save className="w-3 h-3" /> DONE</> : <><Edit2 className="w-3 h-3" /> EDIT</>}
          </motion.button>
          <motion.button
            onClick={handleDelete}
            className="tactical-card py-2 px-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-destructive"
            whileTap={{ scale: 0.98 }}
          >
            <Trash2 className="w-3 h-3" /> DELETE
          </motion.button>
        </div>
      </div>

      {/* XP Bar */}
      <div className="h-[2px] w-full bg-muted mb-6 overflow-hidden rounded-sm">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: xpNext > 0 ? `${(char.xp / xpNext) * 100}%` : '100%' }}
          className="h-full bg-tactical-gold"
          transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
        />
      </div>

      {/* Core Stats Grid */}
      <div className="grid grid-cols-12 gap-1 mb-6">
        {/* Left: Abilities */}
        <div className="col-span-4">
          <p className="tactical-header mb-2">ABILITIES</p>
          <div className="grid grid-cols-3 gap-1">
            {char.abilities.map(ab => (
              <StatBlock
                key={ab.name}
                ability={ab}
                editable={editing}
                onScoreChange={score => {
                  const updated = {
                    ...char,
                    abilities: char.abilities.map(a => a.name === ab.name ? { ...a, score } : a)
                  };
                  // Recalc AC
                  const dexScore = updated.abilities.find(a => a.name === 'DEX')?.score ?? 10;
                  updated.ac = 10 + getModifier(dexScore);
                  save(updated);
                }}
              />
            ))}
          </div>
        </div>

        {/* Center: Combat */}
        <div className="col-span-4 space-y-1">
          <p className="tactical-header mb-2">COMBAT</p>
          <div className="tactical-card">
            <HpBar current={char.hp} max={char.maxHp} />
            {editing && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => save({ ...char, hp: Math.max(0, char.hp - 1) })}
                  className="flex-1 text-center text-[10px] uppercase tracking-widest text-destructive border border-border rounded-sm py-1 hover:bg-destructive/10"
                >
                  DAMAGE
                </button>
                <button
                  onClick={() => save({ ...char, hp: Math.min(char.maxHp, char.hp + 1) })}
                  className="flex-1 text-center text-[10px] uppercase tracking-widest text-tactical-blue border border-border rounded-sm py-1 hover:bg-tactical-blue/10"
                >
                  HEAL
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div className="tactical-card text-center">
              <span className="font-mono text-2xl tabular-nums text-foreground">{char.ac}</span>
              <p className="stat-label">AC</p>
            </div>
            <div className="tactical-card text-center">
              <span className="font-mono text-2xl tabular-nums text-foreground">{char.speed}</span>
              <p className="stat-label">SPEED</p>
            </div>
            <div className="tactical-card text-center">
              <span className="font-mono text-2xl tabular-nums text-foreground">{char.level}</span>
              <p className="stat-label">LEVEL</p>
            </div>
          </div>
        </div>

        {/* Right: Quick Info */}
        <div className="col-span-4">
          <p className="tactical-header mb-2">INFO</p>
          <div className="tactical-card space-y-2">
            <div className="flex justify-between">
              <span className="stat-label">RACE</span>
              <span className="font-mono text-sm text-foreground">{char.race}</span>
            </div>
            <div className="flex justify-between">
              <span className="stat-label">CLASS</span>
              <span className="font-mono text-sm text-foreground">{char.class}</span>
            </div>
            <div className="flex justify-between">
              <span className="stat-label">XP</span>
              <span className="font-mono text-sm tabular-nums text-foreground">{char.xp} / {xpNext}</span>
            </div>
            {editing && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => save({ ...char, level: Math.min(20, char.level + 1) })}
                  className="flex-1 text-center text-[10px] uppercase tracking-widest text-tactical-gold border border-border rounded-sm py-1 hover:bg-tactical-gold/10"
                >
                  LEVEL UP
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Equipment */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="tactical-header">EQUIPMENT</p>
          {editing && (
            <motion.button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-3 h-3" /> ADD ITEM
            </motion.button>
          )}
        </div>
        <div className="tactical-card p-0 overflow-hidden">
          {char.equipment.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground font-mono">No equipment.</p>
          ) : (
            char.equipment.map(item => (
              <EquipmentRow
                key={item.id}
                item={item}
                editable={editing}
                onToggleEquip={id => {
                  save({ ...char, equipment: char.equipment.map(i => i.id === id ? { ...i, equipped: !i.equipped } : i) });
                }}
                onRemove={id => {
                  save({ ...char, equipment: char.equipment.filter(i => i.id !== id) });
                }}
              />
            ))
          )}
        </div>
        <div className="flex justify-end mt-1">
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
            TOTAL WEIGHT: {char.equipment.reduce((s, i) => s + i.weight * i.quantity, 0)} lb
          </span>
        </div>
      </section>

      <EquipmentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAdd={item => {
          save({ ...char, equipment: [...char.equipment, item] });
        }}
        existingIds={char.equipment.map(e => e.id)}
      />
    </div>
  );
}
