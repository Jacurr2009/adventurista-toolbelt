import { useMemo, useState } from 'react';
import { Dices } from 'lucide-react';
import { KTTeam, d6 } from '@/lib/killteam';

type Reroll = 'none' | 'ones' | 'balanced' | 'ceaseless' | 'relentless';

interface Result {
  attackDice: number[];
  crits: number; normals: number;
  saveDice: number[]; saveCrits: number; saveNormals: number;
  remCrits: number; remNormals: number; damage: number;
  notes: string[];
}

export function KTDice({ teams }: { teams: KTTeam[] }) {
  const weapons = useMemo(() => teams.flatMap(t => t.operatives.flatMap(o => o.weapons.map(w => ({ key: w.id, label: `${o.name} — ${w.name}`, w })))), [teams]);
  const [attacks, setAttacks] = useState(4);
  const [hit, setHit] = useState(4);
  const [nd, setNd] = useState(3);
  const [cd, setCd] = useState(4);
  const [lethal, setLethal] = useState(6);
  const [piercing, setPiercing] = useState(0);
  const [devastating, setDevastating] = useState(0);
  const [reroll, setReroll] = useState<Reroll>('none');
  const [rending, setRending] = useState(false);
  const [injured, setInjured] = useState(false);
  const [melee, setMelee] = useState(false);
  const [defDice, setDefDice] = useState(3);
  const [save, setSave] = useState(4);
  const [cover, setCover] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  const loadWeapon = (key: string) => {
    const f = weapons.find(x => x.key === key); if (!f) return;
    const w = f.w; const r = w.rules.toLowerCase();
    setAttacks(w.attacks); setHit(w.hit); setNd(w.normalDmg); setCd(w.critDmg); setMelee(w.melee);
    setLethal(Number(r.match(/lethal (\d)/)?.[1] ?? 6));
    setPiercing(Number(r.match(/piercing (\d)/)?.[1] ?? 0));
    setDevastating(Number(r.match(/devastating (\d)/)?.[1] ?? 0));
    setRending(r.includes('rending'));
    setReroll(r.includes('relentless') ? 'relentless' : r.includes('ceaseless') ? 'ceaseless' : r.includes('balanced') ? 'balanced' : 'none');
  };

  const roll = () => {
    const notes: string[] = [];
    const hitTarget = Math.min(6, hit + (injured ? 1 : 0));
    let dice = Array.from({ length: attacks }, d6);
    const fails = (v: number) => v < hitTarget;
    if (reroll === 'relentless') dice = dice.map(v => fails(v) ? d6() : v);
    else if (reroll === 'ceaseless') { const worst = dice.filter(fails); const cnt: Record<number, number> = {}; worst.forEach(v => cnt[v] = (cnt[v] || 0) + 1); const most = Number(Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0]); dice = dice.map(v => v === most ? d6() : v); }
    else if (reroll === 'balanced') { const i = dice.findIndex(fails); if (i >= 0) dice[i] = d6(); }
    else if (reroll === 'ones') dice = dice.map(v => v === 1 ? d6() : v);
    if (reroll !== 'none') notes.push(`Rerolled (${reroll})`);

    let crits = dice.filter(v => v >= lethal && v !== 1).length;
    let normals = dice.filter(v => v >= hitTarget && v < lethal && v !== 1).length;
    if (rending && crits > 0 && normals > 0) { normals--; crits++; notes.push('Rending: normal → crit'); }

    let damage = 0;
    if (devastating && crits) { damage += devastating * crits; notes.push(`Devastating: ${devastating * crits} immediate`); }

    let saveDice: number[] = []; let sc = 0; let sn = 0;
    let remC = crits, remN = normals;
    if (!melee) {
      const n = Math.max(0, defDice - piercing - (cover ? 1 : 0));
      saveDice = Array.from({ length: n }, d6);
      sc = saveDice.filter(v => v === 6).length;
      sn = saveDice.filter(v => v >= save && v < 6).length + (cover ? 1 : 0);
      if (cover) notes.push('Cover: 1 normal save retained');
      if (piercing) notes.push(`Piercing ${piercing}`);
      // allocate: crit save blocks crit first, 2 normals block a crit, normal blocks normal
      while (sc > 0 && remC > 0) { sc--; remC--; }
      while (sc > 0 && remN > 0) { sc--; remN--; }
      while (sn >= 2 && remC > 0 && cd >= nd * 1.5) { sn -= 2; remC--; }
      while (sn > 0 && remN > 0) { sn--; remN--; }
      while (sn >= 2 && remC > 0) { sn -= 2; remC--; }
    } else notes.push('Melee: resolve strikes/parries manually with retained dice');
    damage += remC * cd + remN * nd;
    setRes({ attackDice: dice, crits, normals, saveDice, saveCrits: saveDice.filter(v => v === 6).length, saveNormals: saveDice.filter(v => v >= save && v < 6).length, remCrits: remC, remNormals: remN, damage, notes });
  };

  const Num = ({ l, v, s }: { l: string; v: number; s: (n: number) => void }) => (
    <label className="flex flex-col text-[9px] uppercase tracking-widest text-muted-foreground">{l}
      <input type="number" value={v} onChange={e => s(Number(e.target.value) || 0)} className="w-16 bg-background border border-border rounded-sm px-1 py-1 font-mono text-xs text-foreground" />
    </label>
  );
  const Tog = ({ l, v, s }: { l: string; v: boolean; s: (b: boolean) => void }) => (
    <button onClick={() => s(!v)} className={`px-2 py-1 text-[9px] uppercase tracking-widest font-bold rounded-sm border ${v ? 'border-secondary text-secondary' : 'border-border text-muted-foreground'}`}>{l}</button>
  );
  const Die = ({ v, kind }: { v: number; kind: 'crit' | 'hit' | 'miss' }) => (
    <span className={`w-8 h-8 flex items-center justify-center rounded-sm font-mono font-bold border ${kind === 'crit' ? 'border-accent text-accent' : kind === 'hit' ? 'border-secondary text-secondary' : 'border-border text-muted-foreground'}`}>{v}</span>
  );
  const hitTarget = Math.min(6, hit + (injured ? 1 : 0));

  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="tactical-card space-y-3">
        <p className="tactical-header">Attacker</p>
        <select onChange={e => loadWeapon(e.target.value)} defaultValue="" className="w-full bg-background border border-border rounded-sm px-2 py-2 text-xs">
          <option value="" disabled>Load weapon from roster...</option>
          {weapons.map(w => <option key={w.key} value={w.key}>{w.label}</option>)}
        </select>
        <div className="flex flex-wrap gap-2">
          <Num l="Attacks" v={attacks} s={setAttacks} /><Num l="Hit+" v={hit} s={setHit} />
          <Num l="Dmg" v={nd} s={setNd} /><Num l="Crit dmg" v={cd} s={setCd} />
          <Num l="Crit on" v={lethal} s={setLethal} /><Num l="Piercing" v={piercing} s={setPiercing} />
          <Num l="Devastating" v={devastating} s={setDevastating} />
        </div>
        <div className="flex flex-wrap gap-1">
          {(['none', 'ones', 'balanced', 'ceaseless', 'relentless'] as Reroll[]).map(r => <Tog key={r} l={r === 'none' ? 'No reroll' : r === 'ones' ? 'Reroll 1s' : r} v={reroll === r} s={() => setReroll(r)} />)}
        </div>
        <div className="flex flex-wrap gap-1">
          <Tog l="Rending" v={rending} s={setRending} /><Tog l="Injured" v={injured} s={setInjured} /><Tog l="Melee" v={melee} s={setMelee} />
        </div>
        {!melee && (<>
          <p className="tactical-header pt-2">Defender</p>
          <div className="flex flex-wrap gap-2 items-end">
            <Num l="Def dice" v={defDice} s={setDefDice} /><Num l="Save+" v={save} s={setSave} />
            <Tog l="In cover" v={cover} s={setCover} />
          </div>
        </>)}
        <button onClick={roll} className="w-full py-3 bg-secondary text-secondary-foreground rounded-sm text-[11px] uppercase tracking-widest font-bold flex items-center justify-center gap-2">
          <Dices className="w-4 h-4" /> Roll attack
        </button>
      </div>

      <div className="tactical-card space-y-3">
        <p className="tactical-header">Result</p>
        {!res ? <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Roll to see results</p> : (<>
          <div>
            <p className="text-[9px] uppercase text-muted-foreground mb-1">Attack dice — {res.crits} crit · {res.normals} normal</p>
            <div className="flex flex-wrap gap-1">{res.attackDice.map((v, i) => <Die key={i} v={v} kind={v >= lethal && v !== 1 ? 'crit' : v >= hitTarget && v !== 1 ? 'hit' : 'miss'} />)}</div>
          </div>
          {!melee && (
            <div>
              <p className="text-[9px] uppercase text-muted-foreground mb-1">Defence dice — {res.saveCrits} crit · {res.saveNormals} normal</p>
              <div className="flex flex-wrap gap-1">{res.saveDice.map((v, i) => <Die key={i} v={v} kind={v === 6 ? 'crit' : v >= save ? 'hit' : 'miss'} />)}</div>
            </div>
          )}
          <div className="border-t border-border pt-2">
            <p className="text-[9px] uppercase text-muted-foreground">Unblocked: {res.remCrits} crit · {res.remNormals} normal</p>
            <p className="font-mono text-3xl font-bold text-foreground">{res.damage} <span className="text-xs text-muted-foreground">damage</span></p>
          </div>
          {res.notes.length > 0 && <ul className="text-[10px] text-muted-foreground font-mono space-y-0.5">{res.notes.map((n, i) => <li key={i}>· {n}</li>)}</ul>}
        </>)}
      </div>
    </div>
  );
}
