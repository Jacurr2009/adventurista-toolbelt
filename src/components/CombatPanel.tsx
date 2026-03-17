import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Footprints, Swords, Shield, XCircle, Check } from 'lucide-react';
import { MapToken } from './MapCanvas';
import { getCharacters } from '@/lib/store';
import { getModifier, CLASS_HIT_DIE } from '@/lib/types';

interface CombatPanelProps {
  token: MapToken;
  allTokens: MapToken[];
  gridSize: number;
  onMoveToken: (tokenId: string, newX: number, newY: number) => void;
  onDamageToken: (tokenId: string, damage: number) => void;
  onEndTurn: () => void;
  isCurrentTurn: boolean;
}

interface AttackResult {
  attackRoll: number;
  targetAC: number;
  hit: boolean;
  damageRoll: number;
  targetName: string;
  natural20: boolean;
  natural1: boolean;
}

export function CombatPanel({
  token,
  allTokens,
  gridSize,
  onMoveToken,
  onDamageToken,
  onEndTurn,
  isCurrentTurn,
}: CombatPanelProps) {
  const [mode, setMode] = useState<'idle' | 'moving' | 'attacking'>('idle');
  const [movementUsed, setMovementUsed] = useState(0);
  const [hasAttacked, setHasAttacked] = useState(false);
  const [lastAttack, setLastAttack] = useState<AttackResult | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const characters = getCharacters();
  const charData = characters.find(c => c.name === token.label);
  const maxMovement = charData?.speed || 30;
  const movementCells = Math.floor(maxMovement / 5); // 5ft per cell
  const remainingCells = movementCells - Math.floor(movementUsed / 5);

  // Get enemies (opposite type)
  const enemies = allTokens.filter(t => t.id !== token.id && t.type !== token.type);

  const performAttack = (targetId: string) => {
    const target = allTokens.find(t => t.id === targetId);
    if (!target) return;

    const targetChar = characters.find(c => c.name === target.label);
    const targetAC = targetChar?.ac || (10 + Math.floor(Math.random() * 6)); // monsters get random AC

    // Roll d20 + STR or DEX mod
    const attackDie = Math.floor(Math.random() * 20) + 1;
    let attackMod = 0;
    if (charData) {
      const str = charData.abilities.find(a => a.name === 'STR');
      if (str) attackMod = getModifier(str.score);
    } else {
      attackMod = Math.floor(Math.random() * 4) + 1; // monster attack mod
    }

    const attackTotal = attackDie + attackMod;
    const natural20 = attackDie === 20;
    const natural1 = attackDie === 1;
    const hit = natural20 || (!natural1 && attackTotal >= targetAC);

    // Damage roll
    let damageRoll = 0;
    if (hit) {
      const hitDie = charData ? CLASS_HIT_DIE[charData.class] || 8 : 8;
      const damageDieSides = Math.min(hitDie, 12);
      damageRoll = Math.floor(Math.random() * damageDieSides) + 1;
      if (natural20) damageRoll *= 2; // crit doubles damage

      onDamageToken(targetId, damageRoll);
    }

    setLastAttack({
      attackRoll: attackTotal,
      targetAC,
      hit,
      damageRoll,
      targetName: target.label,
      natural20,
      natural1,
    });
    setHasAttacked(true);
    setSelectedTarget(null);
    setMode('idle');
  };

  if (!isCurrentTurn) {
    return (
      <div className="bg-card border border-border rounded-sm p-3 text-center">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Waiting for turn...
        </p>
        <p className="font-mono text-sm text-foreground mt-1">{token.label}</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="p-2 border-b border-border flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest font-bold text-secondary flex-1">
          {token.label}'s Turn
        </span>
      </div>

      {/* Movement info */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Movement</span>
          <span className="font-mono text-xs text-foreground">
            {Math.max(0, maxMovement - movementUsed)}ft / {maxMovement}ft
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
          <div
            className="bg-secondary rounded-full h-1.5 transition-all"
            style={{ width: `${Math.max(0, (1 - movementUsed / maxMovement)) * 100}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="p-2 flex flex-col gap-1">
        <button
          onClick={() => setMode(mode === 'moving' ? 'idle' : 'moving')}
          disabled={remainingCells <= 0}
          className={`tactical-card !p-2 flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold transition-colors ${
            mode === 'moving' ? 'border-secondary text-secondary' : ''
          } disabled:opacity-30`}
        >
          <Footprints className="w-3 h-3" />
          {mode === 'moving' ? 'Click map to move' : `Move (${Math.max(0, remainingCells * 5)}ft left)`}
        </button>

        <button
          onClick={() => {
            if (mode === 'attacking') {
              setMode('idle');
              setSelectedTarget(null);
            } else {
              setMode('attacking');
            }
          }}
          disabled={hasAttacked}
          className={`tactical-card !p-2 flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold transition-colors ${
            mode === 'attacking' ? 'border-accent text-accent' : ''
          } disabled:opacity-30`}
        >
          <Swords className="w-3 h-3" />
          {hasAttacked ? 'Already attacked' : mode === 'attacking' ? 'Select target below' : 'Attack'}
        </button>

        {/* Target selection */}
        <AnimatePresence>
          {mode === 'attacking' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1 pl-4"
            >
              {enemies.length === 0 ? (
                <p className="text-[9px] text-muted-foreground py-1">No targets in range</p>
              ) : (
                enemies.map(enemy => (
                  <button
                    key={enemy.id}
                    onClick={() => performAttack(enemy.id)}
                    className="w-full tactical-card !p-2 flex items-center gap-2 text-[10px] font-mono text-foreground hover:border-accent"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-background"
                      style={{ backgroundColor: enemy.color }}
                    >
                      {enemy.label[0]}
                    </div>
                    {enemy.label}
                    {enemy.hp !== undefined && (
                      <span className="ml-auto text-[9px] text-muted-foreground">{enemy.hp}HP</span>
                    )}
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attack result */}
        <AnimatePresence>
          {lastAttack && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`tactical-card !p-2 text-[10px] font-mono ${
                lastAttack.hit ? 'border-secondary' : 'border-destructive'
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                {lastAttack.hit ? (
                  <Check className="w-3 h-3 text-secondary" />
                ) : (
                  <XCircle className="w-3 h-3 text-destructive" />
                )}
                <span className={lastAttack.hit ? 'text-secondary' : 'text-destructive'}>
                  {lastAttack.natural20 ? 'CRITICAL HIT!' : lastAttack.natural1 ? 'CRITICAL MISS!' : lastAttack.hit ? 'HIT!' : 'MISS!'}
                </span>
              </div>
              <p className="text-muted-foreground">
                Roll: {lastAttack.attackRoll} vs AC {lastAttack.targetAC} ({lastAttack.targetName})
              </p>
              {lastAttack.hit && (
                <p className="text-foreground font-bold">
                  {lastAttack.damageRoll} damage{lastAttack.natural20 ? ' (crit!)' : ''}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => {
            setMode('idle');
            setMovementUsed(0);
            setHasAttacked(false);
            setLastAttack(null);
            onEndTurn();
          }}
          className="tactical-card !p-2 flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold border-muted-foreground/30 hover:border-foreground"
        >
          <Shield className="w-3 h-3" />
          End Turn
        </button>
      </div>
    </div>
  );
}

export function getCombatMode(): 'idle' | 'moving' | 'attacking' {
  return 'idle';
}
