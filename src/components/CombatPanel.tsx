import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Footprints, Swords, Shield, XCircle, Check, ChevronDown,
  Zap, Heart, ArrowRight, Wind, ShieldOff, Activity, BookOpen, Sparkles,
} from 'lucide-react';
import { MapToken } from './MapCanvas';
import { useCharacterSync } from '@/lib/CharacterSyncContext';
import {
  getModifier, getEquippedAC, getEquippedWeapons,
  EquipmentItem, getProficiencyBonus, getDistanceFt, getDefaultSpellState,
} from '@/lib/types';
import {
  Spell, getSpellById, getSpellcastingAbility, getSlotKey, getSpellSlots,
  getCantripDiceCount, CharacterSpellState,
} from '@/lib/spells';

interface CombatPanelProps {
  token: MapToken;
  allTokens: MapToken[];
  gridSize: number;
  ftPerCell: number;
  onMoveToken: (tokenId: string, newX: number, newY: number) => void;
  onDamageToken: (tokenId: string, damage: number) => void;
  onHealToken?: (tokenId: string, amount: number) => void;
  onEndTurn: () => void;
  isCurrentTurn: boolean;
  movementUsed: number;
  onSetMovementUsed: (ft: number) => void;
  onSetCombatMoving: (moving: boolean) => void;
  combatMoving: boolean;
  onShowAoe?: (x: number, y: number, radius: number) => void;
  onClearAoe?: () => void;
}

type CombatAction = 'idle' | 'moving' | 'attacking' | 'dodging' | 'dashing' | 'disengaging' | 'using-item' | 'casting';

interface AttackResult {
  attackRoll: number;
  naturalRoll: number;
  targetAC: number;
  hit: boolean;
  damageRoll: number;
  damageBreakdown: string;
  targetName: string;
  natural20: boolean;
  natural1: boolean;
  weaponName: string;
  distance: number;
  disadvantage: boolean;
}

export function CombatPanel({
  token,
  allTokens,
  gridSize,
  ftPerCell,
  onMoveToken,
  onDamageToken,
  onHealToken,
  onEndTurn,
  isCurrentTurn,
  movementUsed,
  onSetMovementUsed,
  onSetCombatMoving,
  combatMoving,
  onShowAoe,
  onClearAoe,
}: CombatPanelProps) {
  const [action, setAction] = useState<CombatAction>('idle');
  const [hasUsedAction, setHasUsedAction] = useState(false);
  const [hasUsedBonusAction, setHasUsedBonusAction] = useState(false);
  const [lastAttack, setLastAttack] = useState<AttackResult | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<EquipmentItem | null>(null);
  const [showWeaponSelect, setShowWeaponSelect] = useState(false);
  const [isDodging, setIsDodging] = useState(false);
  const [lastHeal, setLastHeal] = useState<{ amount: number; item: string } | null>(null);
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [showSpellSelect, setShowSpellSelect] = useState(false);
  const [lastSpellResult, setLastSpellResult] = useState<{
    spellName: string; hit?: boolean; naturalRoll?: number; total?: number;
    targetAC?: number; damage: number; damageType: string; targets: string[];
    saveType?: string; healing?: boolean; natural20?: boolean;
  } | null>(null);

  const { allCharacters } = useCharacterSync();
  const charData = allCharacters.find(c => c.name === token.label);
  const maxMovement = charData?.speed || 30;
  const profBonus = charData ? getProficiencyBonus(charData.level) : 2;
  const remainingFt = Math.max(0, maxMovement - movementUsed);

  // Dash doubles movement
  const [hasDashed, setHasDashed] = useState(false);
  const effectiveMaxMovement = hasDashed ? maxMovement * 2 : maxMovement;
  const effectiveRemaining = Math.max(0, effectiveMaxMovement - movementUsed);

  // Get equipped weapons for this character
  const equippedWeapons = charData ? getEquippedWeapons(charData) : [];

  // Unarmed strike fallback
  const unarmedStrike: EquipmentItem = {
    id: 'unarmed', name: 'Unarmed Strike', weight: 0, quantity: 1,
    equipped: true, category: 'weapon', damageDie: 1, attackBonus: 0,
    damageBonus: 0, range: 5,
  };

  const availableWeapons = equippedWeapons.length > 0 ? equippedWeapons : [unarmedStrike];

  // Spell data
  const spellState = charData?.spells || getDefaultSpellState();
  const spellcastingAbility = charData ? getSpellcastingAbility(charData.class) : 'INT';
  const spellcastingMod = charData
    ? getModifier(charData.abilities.find(a => a.name === spellcastingAbility)?.score ?? 10)
    : 0;
  const spellSaveDC = 8 + profBonus + spellcastingMod;
  const spellAttackBonus = profBonus + spellcastingMod;
  const maxSlots = charData ? getSpellSlots(charData.class, charData.level) : null;

  const preparedSpells = useMemo(() => {
    return spellState.preparedSpellIds
      .map(id => getSpellById(id))
      .filter(Boolean) as Spell[];
  }, [spellState.preparedSpellIds]);

  const cantrips = preparedSpells.filter(s => s.level === 0);
  const leveledSpells = preparedSpells.filter(s => s.level > 0);

  const canCastSpell = (spell: Spell): boolean => {
    if (spell.level === 0) return true;
    if (!maxSlots) return false;
    // Check if any slot of this level or higher is available
    for (let l = spell.level; l <= 9; l++) {
      const key = getSlotKey(l);
      if (maxSlots[key] - spellState.usedSlots[key] > 0) return true;
    }
    return false;
  };

  const getLowestAvailableSlot = (minLevel: number): number | null => {
    if (!maxSlots) return null;
    for (let l = minLevel; l <= 9; l++) {
      const key = getSlotKey(l);
      if (maxSlots[key] - spellState.usedSlots[key] > 0) return l;
    }
    return null;
  };

  // Consumables that can be used (healing potions etc.)
  const usableItems = charData?.equipment.filter(
    e => e.category === 'consumable' && e.properties?.includes('healing') && e.quantity > 0
  ) || [];

  // Get enemies (opposite type) with distance
  const enemies = useMemo(() => {
    return allTokens
      .filter(t => t.id !== token.id && t.type !== token.type && (t.hp ?? 1) > 0)
      .map(t => ({
        ...t,
        distance: getDistanceFt(token.x, token.y, t.x, t.y, gridSize, ftPerCell),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [allTokens, token, gridSize, ftPerCell]);

  // Friendly tokens for healing
  const allies = useMemo(() => {
    return allTokens
      .filter(t => t.id !== token.id && t.type === token.type)
      .map(t => ({
        ...t,
        distance: getDistanceFt(token.x, token.y, t.x, t.y, gridSize, ftPerCell),
      }));
  }, [allTokens, token, gridSize, ftPerCell]);

  const getWeaponRange = (weapon: EquipmentItem) => {
    const isRanged = weapon.properties?.includes('ranged');
    const isThrown = weapon.properties?.includes('thrown');
    const hasReach = weapon.properties?.includes('reach');
    const normalRange = weapon.range ?? (isRanged ? 80 : hasReach ? 10 : 5);
    const longRange = weapon.longRange ?? (isThrown ? normalRange * 2 : isRanged ? normalRange * 4 : normalRange);
    return { normalRange, longRange, isRanged, isThrown };
  };

  const canTargetWith = (weapon: EquipmentItem, distanceFt: number) => {
    const { longRange } = getWeaponRange(weapon);
    return distanceFt <= longRange;
  };

  const isAtDisadvantage = (weapon: EquipmentItem, distanceFt: number) => {
    const { normalRange, isRanged } = getWeaponRange(weapon);
    // Ranged attacks at long range have disadvantage
    if ((isRanged || weapon.properties?.includes('thrown')) && distanceFt > normalRange) return true;
    // Ranged attacks within 5ft have disadvantage
    if (isRanged && distanceFt <= 5) return true;
    return false;
  };

  const performAttack = (targetId: string) => {
    const weapon = selectedWeapon || availableWeapons[0];
    if (!weapon) return;

    const target = allTokens.find(t => t.id === targetId);
    if (!target) return;

    const distanceFt = getDistanceFt(token.x, token.y, target.x, target.y, gridSize, ftPerCell);
    const targetChar = allCharacters.find(c => c.name === target.label);
    const targetAC = targetChar ? getEquippedAC(targetChar) : (target.type === 'monster' ? 12 : 10);
    const disadvantage = isAtDisadvantage(weapon, distanceFt);

    // Attack roll: d20 + ability mod + proficiency + weapon bonus
    let attackDie1 = Math.floor(Math.random() * 20) + 1;
    let attackDie2 = Math.floor(Math.random() * 20) + 1;
    // Disadvantage: take lower; Advantage vs dodging target: neither (cancel out)
    const attackDie = disadvantage ? Math.min(attackDie1, attackDie2) : attackDie1;

    let attackMod = 0;
    if (charData) {
      const isFinesse = weapon.properties?.includes('finesse');
      const isRanged = weapon.properties?.includes('ranged');
      const str = charData.abilities.find(a => a.name === 'STR');
      const dex = charData.abilities.find(a => a.name === 'DEX');
      if (isRanged) {
        attackMod = dex ? getModifier(dex.score) : 0;
      } else if (isFinesse) {
        const strMod = str ? getModifier(str.score) : 0;
        const dexMod = dex ? getModifier(dex.score) : 0;
        attackMod = Math.max(strMod, dexMod);
      } else {
        attackMod = str ? getModifier(str.score) : 0;
      }
    }

    const weaponAttackBonus = weapon.attackBonus || 0;
    const attackTotal = attackDie + attackMod + profBonus + weaponAttackBonus;
    const natural20 = attackDie === 20;
    const natural1 = attackDie === 1;
    const hit = natural20 || (!natural1 && attackTotal >= targetAC);

    let damageRoll = 0;
    let damageBreakdown = '';
    if (hit) {
      const damageDieSides = weapon.damageDie || 4;
      const diceCount = weapon.damageDiceCount || 1;
      const rolls: number[] = [];
      for (let i = 0; i < diceCount; i++) {
        rolls.push(Math.floor(Math.random() * damageDieSides) + 1);
      }
      const diceTotal = rolls.reduce((a, b) => a + b, 0);
      const bonusDmg = (weapon.damageBonus || 0) + attackMod;
      damageRoll = diceTotal + bonusDmg;
      if (natural20) {
        // Crit: double the dice
        const critExtra = rolls.map(() => Math.floor(Math.random() * damageDieSides) + 1);
        damageRoll += critExtra.reduce((a, b) => a + b, 0);
        damageBreakdown = `${diceCount}d${damageDieSides}[${rolls.join('+')}] + crit[${critExtra.join('+')}] + ${bonusDmg}`;
      } else {
        damageBreakdown = `${diceCount}d${damageDieSides}[${rolls.join('+')}] + ${bonusDmg}`;
      }
      damageRoll = Math.max(1, damageRoll);
      onDamageToken(targetId, damageRoll);
    }

    setLastAttack({
      attackRoll: attackTotal,
      naturalRoll: attackDie,
      targetAC,
      hit,
      damageRoll,
      damageBreakdown,
      targetName: target.label,
      natural20,
      natural1,
      weaponName: weapon.name,
      distance: distanceFt,
      disadvantage,
    });
    setHasUsedAction(true);
    setSelectedWeapon(null);
    setShowWeaponSelect(false);
    setAction('idle');
  };

  const handleDodge = () => {
    setIsDodging(true);
    setHasUsedAction(true);
    setAction('idle');
  };

  const handleDash = () => {
    setHasDashed(true);
    setHasUsedAction(true);
    setAction('idle');
  };

  const handleDisengage = () => {
    setHasUsedAction(true);
    setAction('idle');
  };

  const handleUseItem = (item: EquipmentItem) => {
    if (item.properties?.includes('healing') && item.damageDie) {
      const diceCount = item.damageDiceCount || 1;
      let total = 0;
      for (let i = 0; i < diceCount; i++) {
        total += Math.floor(Math.random() * item.damageDie) + 1;
      }
      total += item.damageBonus || 0;
      total = Math.max(1, total);
      // Heal self
      onHealToken?.(token.id, total);
      setLastHeal({ amount: total, item: item.name });
    }
    setHasUsedAction(true);
    setAction('idle');
  };

  const performSpellCast = (spell: Spell, targetId?: string) => {
    const isBonusAction = spell.castTime === 'bonus action';
    const diceCount = spell.cantripScaling && charData
      ? getCantripDiceCount(charData.level)
      : (spell.damageDiceCount || 1);
    const spellRange = spell.range === -1 ? 5 : spell.range;

    // Consume spell slot
    if (spell.level > 0 && charData) {
      const slotLevel = getLowestAvailableSlot(spell.level);
      if (!slotLevel) return;
      const key = getSlotKey(slotLevel);
      if (charData.spells) {
        charData.spells = {
          ...charData.spells,
          usedSlots: { ...charData.spells.usedSlots, [key]: charData.spells.usedSlots[key] + 1 },
        };
      }
    }

    // AoE spells
    if (spell.targetType.startsWith('aoe')) {
      const aoeTargets = allTokens.filter(t => {
        if (t.id === token.id && !spell.healing) return false;
        if (spell.healing && t.type !== token.type) return false;
        if (!spell.healing && t.type === token.type) return false;
        const dist = getDistanceFt(token.x, token.y, t.x, t.y, gridSize, ftPerCell);
        const radius = spell.aoeRadius || spell.aoeLength || 20;
        return dist <= radius + spellRange;
      });

      let totalDamage = 0;
      const targetNames: string[] = [];

      aoeTargets.forEach(target => {
        let dmg = 0;
        if (spell.damageDie) {
          for (let i = 0; i < diceCount; i++) {
            dmg += Math.floor(Math.random() * spell.damageDie) + 1;
          }
          dmg += spellcastingMod;

          // Save
          if (spell.saveAbility !== 'none') {
            const targetChar = allCharacters.find(c => c.name === target.label);
            const saveMod = targetChar
              ? getModifier(targetChar.abilities.find(a => a.name === spell.saveAbility)?.score ?? 10)
              : 0;
            const saveRoll = Math.floor(Math.random() * 20) + 1 + saveMod;
            if (saveRoll >= spellSaveDC) {
              dmg = spell.halfDamageOnSave ? Math.floor(dmg / 2) : 0;
            }
          }
        }

        dmg = Math.max(0, dmg);
        if (spell.healing) {
          onHealToken?.(target.id, dmg);
        } else {
          onDamageToken(target.id, dmg);
        }
        totalDamage += dmg;
        targetNames.push(target.label);
      });

      setLastSpellResult({
        spellName: spell.name, damage: totalDamage, damageType: spell.damageType || '',
        targets: targetNames, saveType: spell.saveAbility !== 'none' ? spell.saveAbility : undefined,
        healing: spell.healing,
      });
    }
    // Single target
    else if (targetId) {
      const target = allTokens.find(t => t.id === targetId);
      if (!target) return;

      let damage = 0;
      let hit = true;
      let naturalRoll: number | undefined;
      let attackTotal: number | undefined;
      let targetAC: number | undefined;
      let natural20 = false;

      if (spell.isAttackRoll) {
        naturalRoll = Math.floor(Math.random() * 20) + 1;
        attackTotal = naturalRoll + spellAttackBonus;
        const targetChar = allCharacters.find(c => c.name === target.label);
        targetAC = targetChar ? getEquippedAC(targetChar) : (target.type === 'monster' ? 12 : 10);
        natural20 = naturalRoll === 20;
        hit = natural20 || (naturalRoll !== 1 && attackTotal >= targetAC);
      } else if (spell.saveAbility !== 'none') {
        const targetChar = allCharacters.find(c => c.name === target.label);
        const saveMod = targetChar
          ? getModifier(targetChar.abilities.find(a => a.name === spell.saveAbility)?.score ?? 10)
          : 0;
        const saveRoll = Math.floor(Math.random() * 20) + 1 + saveMod;
        hit = saveRoll < spellSaveDC;
        if (!hit && spell.halfDamageOnSave) {
          // half damage still applies below
        }
      }

      if (spell.damageDie && (hit || spell.halfDamageOnSave)) {
        const effectiveDice = natural20 ? diceCount * 2 : diceCount;
        for (let i = 0; i < effectiveDice; i++) {
          damage += Math.floor(Math.random() * spell.damageDie) + 1;
        }
        damage += spellcastingMod;
        if (!hit && spell.halfDamageOnSave) damage = Math.floor(damage / 2);
        damage = Math.max(1, damage);

        if (spell.healing) {
          onHealToken?.(target.id, damage);
        } else {
          onDamageToken(target.id, damage);
        }
      }

      setLastSpellResult({
        spellName: spell.name, hit, naturalRoll, total: attackTotal,
        targetAC, damage, damageType: spell.damageType || '',
        targets: [target.label], saveType: spell.saveAbility !== 'none' ? spell.saveAbility : undefined,
        healing: spell.healing, natural20,
      });
    }
    // Self-targeting spells (buffs)
    else {
      setLastSpellResult({
        spellName: spell.name, damage: 0, damageType: '',
        targets: ['Self'], healing: false,
      });
    }

    if (isBonusAction) {
      setHasUsedBonusAction(true);
    } else {
      setHasUsedAction(true);
    }
    setSelectedSpell(null);
    setShowSpellSelect(false);
    setAction('idle');
    onClearAoe?.();
  };

  const handleEndTurn = () => {
    setAction('idle');
    onSetMovementUsed(0);
    setHasUsedAction(false);
    setHasUsedBonusAction(false);
    setLastAttack(null);
    setLastHeal(null);
    setLastSpellResult(null);
    setSelectedWeapon(null);
    setSelectedSpell(null);
    setIsDodging(false);
    setHasDashed(false);
    onSetCombatMoving(false);
    onClearAoe?.();
    onEndTurn();
  };

  if (!isCurrentTurn) {
    return (
      <div className="bg-card border border-border rounded-sm p-3 text-center">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Waiting for turn...
        </p>
        <p className="font-mono text-sm text-foreground mt-1">{token.label}</p>
        {isDodging && (
          <p className="text-[9px] text-accent uppercase mt-1">DODGING</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-sm overflow-hidden">
      {/* Header */}
      <div className="p-2 border-b border-border flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest font-bold text-secondary flex-1">
          {token.label}'s Turn
        </span>
        {charData && (
          <span className="text-[8px] uppercase tracking-wider text-muted-foreground">
            LVL {charData.level} • PROF +{profBonus}
          </span>
        )}
      </div>

      {/* Movement bar */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
            Movement {hasDashed && <span className="text-accent">(DASHED)</span>}
          </span>
          <span className="font-mono text-xs text-foreground">
            {effectiveRemaining}ft / {effectiveMaxMovement}ft
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
          <div
            className="bg-secondary rounded-full h-1.5 transition-all"
            style={{ width: `${Math.max(0, (effectiveRemaining / effectiveMaxMovement)) * 100}%` }}
          />
        </div>
      </div>

      {/* Action economy indicator */}
      <div className="px-3 py-1.5 border-b border-border flex items-center gap-3 text-[8px] uppercase tracking-widest">
        <span className={hasUsedAction ? 'text-muted-foreground line-through' : 'text-foreground'}>
          ● Action
        </span>
        <span className={hasUsedBonusAction ? 'text-muted-foreground line-through' : 'text-foreground'}>
          ● Bonus
        </span>
        <span className="text-foreground">● Reaction</span>
      </div>

      {/* Actions */}
      <div className="p-2 flex flex-col gap-1">
        {/* Move */}
        <button
          onClick={() => {
            const newAction = action === 'moving' ? 'idle' : 'moving';
            setAction(newAction);
            onSetCombatMoving(newAction === 'moving');
          }}
          disabled={effectiveRemaining <= 0}
          className={`tactical-card !p-2 flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold transition-colors ${
            combatMoving ? 'border-secondary text-secondary' : ''
          } disabled:opacity-30`}
        >
          <Footprints className="w-3 h-3" />
          {combatMoving ? 'Click map to move' : `Move (${effectiveRemaining}ft left)`}
        </button>

        {/* Attack */}
        <button
          onClick={() => {
            if (action === 'attacking') {
              setAction('idle');
              setShowWeaponSelect(false);
            } else {
              setAction('attacking');
              setShowWeaponSelect(true);
            }
          }}
          disabled={hasUsedAction}
          className={`tactical-card !p-2 flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold transition-colors ${
            action === 'attacking' ? 'border-accent text-accent' : ''
          } disabled:opacity-30`}
        >
          <Swords className="w-3 h-3" />
          {hasUsedAction ? 'Action used' : action === 'attacking' ? 'Select weapon & target' : 'Attack'}
        </button>

        {/* Weapon selection */}
        <AnimatePresence>
          {action === 'attacking' && showWeaponSelect && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1 pl-2"
            >
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground py-1">Choose Weapon</p>
              {availableWeapons.map(w => {
                const { normalRange, longRange, isRanged } = getWeaponRange(w);
                return (
                  <button
                    key={w.id}
                    onClick={() => { setSelectedWeapon(w); setShowWeaponSelect(false); }}
                    className={`w-full tactical-card !p-2 flex items-center gap-2 text-[10px] font-mono text-foreground hover:border-accent ${
                      selectedWeapon?.id === w.id ? 'border-accent text-accent' : ''
                    }`}
                  >
                    <Swords className="w-3 h-3 text-muted-foreground" />
                    <div className="flex-1 text-left">
                      <span>{w.name}</span>
                      <div className="text-[8px] text-muted-foreground flex gap-2">
                        <span>{w.damageDiceCount || 1}d{w.damageDie || 1}</span>
                        <span>{isRanged ? `${normalRange}/${longRange}ft` : `${normalRange}ft`}</span>
                        {w.properties?.filter(p => !['ranged'].includes(p)).map(p => (
                          <span key={p} className="text-muted-foreground/60">{p}</span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Target selection */}
        <AnimatePresence>
          {action === 'attacking' && !showWeaponSelect && (selectedWeapon || availableWeapons.length === 1) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1 pl-2"
            >
              <div className="flex items-center justify-between py-1">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                  With: <span className="text-foreground">{(selectedWeapon || availableWeapons[0])?.name}</span>
                </p>
                <button
                  onClick={() => setShowWeaponSelect(true)}
                  className="text-[8px] text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              {enemies.length === 0 ? (
                <p className="text-[9px] text-muted-foreground py-1">No targets in range</p>
              ) : (
                enemies.map(enemy => {
                  const activeWeapon = selectedWeapon || availableWeapons[0];
                  const inRange = canTargetWith(activeWeapon, enemy.distance);
                  const atDisadvantage = isAtDisadvantage(activeWeapon, enemy.distance);
                  return (
                    <button
                      key={enemy.id}
                      onClick={() => inRange && performAttack(enemy.id)}
                      disabled={!inRange}
                      className={`w-full tactical-card !p-2 flex items-center gap-2 text-[10px] font-mono text-foreground hover:border-accent disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-background shrink-0"
                        style={{ backgroundColor: enemy.color }}
                      >
                        {enemy.label[0]}
                      </div>
                      <span className="flex-1 text-left">{enemy.label}</span>
                      <div className="flex items-center gap-1.5 text-[8px]">
                        {atDisadvantage && <span className="text-destructive">DISADV</span>}
                        <span className="text-muted-foreground">{enemy.distance}ft</span>
                        {enemy.hp !== undefined && (
                          <span className="text-muted-foreground">{enemy.hp}HP</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cast Spell */}
        {preparedSpells.length > 0 && (
          <button
            onClick={() => {
              if (action === 'casting') {
                setAction('idle');
                setShowSpellSelect(false);
                setSelectedSpell(null);
              } else {
                setAction('casting');
                setShowSpellSelect(true);
              }
            }}
            disabled={hasUsedAction && hasUsedBonusAction}
            className={`tactical-card !p-2 flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold transition-colors ${
              action === 'casting' ? 'border-purple-400 text-purple-400' : ''
            } disabled:opacity-30`}
          >
            <BookOpen className="w-3 h-3" />
            {action === 'casting' ? 'Select spell & target' : 'Cast Spell'}
          </button>
        )}

        {/* Spell selection */}
        <AnimatePresence>
          {action === 'casting' && showSpellSelect && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1 pl-2 max-h-48 overflow-y-auto"
            >
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground py-1">Choose Spell</p>
              {cantrips.length > 0 && (
                <p className="text-[8px] uppercase tracking-widest text-muted-foreground/60 px-1">Cantrips</p>
              )}
              {cantrips.map(spell => (
                <SpellCastButton key={spell.id} spell={spell} canCast={!hasUsedAction}
                  onClick={() => {
                    setSelectedSpell(spell);
                    setShowSpellSelect(false);
                    if (spell.targetType === 'self') performSpellCast(spell);
                    else if (spell.targetType.startsWith('aoe')) performSpellCast(spell);
                  }}
                />
              ))}
              {leveledSpells.length > 0 && (
                <p className="text-[8px] uppercase tracking-widest text-muted-foreground/60 px-1 mt-1">Leveled</p>
              )}
              {leveledSpells.map(spell => {
                const castable = canCastSpell(spell);
                const isBonusSpell = spell.castTime === 'bonus action';
                const blocked = isBonusSpell ? hasUsedBonusAction : hasUsedAction;
                return (
                  <SpellCastButton key={spell.id} spell={spell} canCast={castable && !blocked}
                    onClick={() => {
                      if (!castable || blocked) return;
                      setSelectedSpell(spell);
                      setShowSpellSelect(false);
                      if (spell.targetType === 'self') performSpellCast(spell);
                      else if (spell.targetType.startsWith('aoe')) performSpellCast(spell);
                    }}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spell target selection (single-target spells) */}
        <AnimatePresence>
          {action === 'casting' && !showSpellSelect && selectedSpell && selectedSpell.targetType === 'single' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1 pl-2"
            >
              <div className="flex items-center justify-between py-1">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                  Casting: <span className="text-purple-400">{selectedSpell.name}</span>
                </p>
                <button onClick={() => setShowSpellSelect(true)}
                  className="text-[8px] text-muted-foreground hover:text-foreground">
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              {(selectedSpell.healing ? [...allies, { ...token, distance: 0 }] : enemies).map(target => {
                const spellRange = selectedSpell.range === -1 ? 5 : selectedSpell.range;
                const dist = 'distance' in target ? (target as any).distance : 0;
                const inRange = dist <= spellRange;
                return (
                  <button
                    key={target.id}
                    onClick={() => inRange && performSpellCast(selectedSpell, target.id)}
                    disabled={!inRange}
                    className="w-full tactical-card !p-2 flex items-center gap-2 text-[10px] font-mono text-foreground hover:border-purple-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-background shrink-0"
                      style={{ backgroundColor: target.color }}
                    >
                      {target.label[0]}
                    </div>
                    <span className="flex-1 text-left">{target.label}</span>
                    <div className="flex items-center gap-1.5 text-[8px]">
                      <span className="text-muted-foreground">{dist}ft</span>
                      {target.hp !== undefined && (
                        <span className="text-muted-foreground">{target.hp}HP</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {!hasUsedAction && action === 'idle' && (
          <div className="flex gap-1">
            <button
              onClick={handleDodge}
              className="tactical-card !p-2 flex-1 flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider font-bold hover:border-accent"
              title="Dodge: attacks against you have disadvantage until next turn"
            >
              <ShieldOff className="w-3 h-3" />
              Dodge
            </button>
            <button
              onClick={handleDash}
              className="tactical-card !p-2 flex-1 flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider font-bold hover:border-secondary"
              title="Dash: double your movement this turn"
            >
              <Wind className="w-3 h-3" />
              Dash
            </button>
            <button
              onClick={handleDisengage}
              className="tactical-card !p-2 flex-1 flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider font-bold hover:border-foreground"
              title="Disengage: movement doesn't provoke opportunity attacks"
            >
              <ArrowRight className="w-3 h-3" />
              Disengage
            </button>
          </div>
        )}

        {/* Use Item (healing potions) */}
        {usableItems.length > 0 && !hasUsedAction && action === 'idle' && (
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground px-1">Use Item</p>
            {usableItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleUseItem(item)}
                className="w-full tactical-card !p-2 flex items-center gap-2 text-[10px] font-mono text-foreground hover:border-secondary"
              >
                <Heart className="w-3 h-3 text-secondary" />
                <span className="flex-1 text-left">{item.name}</span>
                <span className="text-[8px] text-muted-foreground">
                  {item.damageDiceCount || 1}d{item.damageDie}+{item.damageBonus || 0} HP
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Status indicators */}
        {isDodging && (
          <div className="tactical-card !p-2 border-accent text-[10px] font-mono text-accent flex items-center gap-2">
            <ShieldOff className="w-3 h-3" />
            DODGING — Attacks have disadvantage
          </div>
        )}

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
                {lastAttack.disadvantage && (
                  <span className="text-[8px] text-destructive ml-1">(DISADVANTAGE)</span>
                )}
              </div>
              <p className="text-muted-foreground">
                {lastAttack.weaponName}: d20({lastAttack.naturalRoll}) → {lastAttack.attackRoll} vs AC {lastAttack.targetAC}
              </p>
              <p className="text-muted-foreground text-[9px]">
                Target: {lastAttack.targetName} at {lastAttack.distance}ft
              </p>
              {lastAttack.hit && (
                <p className="text-foreground font-bold mt-1">
                  {lastAttack.damageRoll} damage
                  <span className="text-[8px] text-muted-foreground ml-1">
                    ({lastAttack.damageBreakdown})
                  </span>
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Heal result */}
        <AnimatePresence>
          {lastHeal && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="tactical-card !p-2 text-[10px] font-mono border-secondary"
            >
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-secondary" />
                <span className="text-secondary">
                  Healed {lastHeal.amount} HP
                </span>
                <span className="text-muted-foreground ml-1">({lastHeal.item})</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* End Turn */}
        <button
          onClick={handleEndTurn}
          className="tactical-card !p-2 flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold border-muted-foreground/30 hover:border-foreground"
        >
          <Shield className="w-3 h-3" />
          End Turn
        </button>
      </div>
    </div>
  );
}
