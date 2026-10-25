import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, RotateCcw, ChevronRight, Skull, Heart, Minus, ScanLine, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  KTTeam, KTGameState, KTOperative, KTOperativeState, KTWeapon,
  loadTeams, saveTeams, loadGame, saveGame, emptyGame, newOperative, newWeapon, starterTeams, newId,
} from '@/lib/killteam';
import { KTDice } from '@/components/KTDice';

type Tab = 'game' | 'roster' | 'dice';

const opState = (op: KTOperative): KTOperativeState => ({
  woundsLeft: op.wounds, status: 'ready', order: 'conceal', injured: false, dead: false, notes: '',
});

export default function KillTeam() {
  const [tab, setTab] = useState<Tab>('game');
  const [teams, setTeams] = useState<KTTeam[]>(loadTeams);
  const [game, setGame] = useState<KTGameState>(loadGame);

  useEffect(() => saveTeams(teams), [teams]);
  useEffect(() => saveGame(game), [game]);

  const team = teams.find(t => t.id === game.teamId) ?? null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'game', label: 'Game Tracker' },
    { id: 'roster', label: 'Rosters' },
    { id: 'dice', label: 'Attack Dice' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="font-display text-lg tracking-widest text-foreground">KILL TEAM</h1>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">T'au Pathfinders // Farstalker Kinband</p>
      </div>
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-[10px] uppercase tracking-widest font-bold border-b-2 -mb-px ${tab === t.id ? 'border-secondary text-foreground' : 'border-transparent text-muted-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'game' && <GameTracker teams={teams} team={team} game={game} setGame={setGame} />}
      {tab === 'roster' && <Rosters teams={teams} setTeams={setTeams} />}
      {tab === 'dice' && <KTDice teams={teams} />}
    </div>
  );
}

/* ---------------- Game tracker ---------------- */
function Counter({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="tactical-card !p-3">
      <p className="tactical-header">{label}</p>
      <div className="flex items-center justify-between mt-1">
        <button className="p-1 border border-border rounded-sm" onClick={() => onChange(Math.max(min, value - 1))}><Minus className="w-3 h-3" /></button>
        <span className="font-mono text-2xl font-bold text-foreground">{value}</span>
        <button className="p-1 border border-border rounded-sm" onClick={() => onChange(value + 1)}><Plus className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

function GameTracker({ teams, team, game, setGame }: { teams: KTTeam[]; team: KTTeam | null; game: KTGameState; setGame: (g: KTGameState) => void }) {
  const log = (msg: string, g: KTGameState): KTGameState => ({ ...g, log: [`TP${g.turningPoint}: ${msg}`, ...g.log].slice(0, 50) });

  const startGame = (teamId: string) => {
    const t = teams.find(x => x.id === teamId)!;
    const ops: Record<string, KTOperativeState> = {};
    t.operatives.forEach(o => { ops[o.id] = opState(o); });
    setGame({ ...emptyGame(), teamId, ops, log: [`Game started with ${t.name}`] });
  };

  if (!team) {
    return (
      <div className="tactical-card space-y-3">
        <p className="tactical-header">Select a kill team to start</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {teams.map(t => (
            <button key={t.id} onClick={() => startGame(t.id)} className="tactical-card text-left flex items-center justify-between">
              <span className="font-mono text-sm">{t.name}</span>
              <span className="text-[10px] text-muted-foreground">{t.operatives.length} ops</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const upd = (id: string, patch: Partial<KTOperativeState>, msg?: string) => {
    let g = { ...game, ops: { ...game.ops, [id]: { ...game.ops[id], ...patch } } };
    if (msg) g = log(msg, g);
    setGame(g);
  };

  const nextTP = () => {
    const ops = { ...game.ops };
    Object.keys(ops).forEach(k => { ops[k] = { ...ops[k], status: 'ready' }; });
    setGame(log('Turning point ended', { ...game, ops, turningPoint: game.turningPoint + 1, cp: game.cp + 1 }));
  };

  const readyCount = team.operatives.filter(o => game.ops[o.id] && !game.ops[o.id].dead && game.ops[o.id].status === 'ready').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Counter label="Turning Point" value={game.turningPoint} min={1} onChange={v => setGame({ ...game, turningPoint: v })} />
        <Counter label="Command Points" value={game.cp} onChange={v => setGame({ ...game, cp: v })} />
        <Counter label="My VP" value={game.vp} onChange={v => setGame({ ...game, vp: v })} />
        <Counter label="Opponent VP" value={game.opponentVp} onChange={v => setGame({ ...game, opponentVp: v })} />
        <div className="tactical-card !p-3 col-span-2 md:col-span-1">
          <p className="tactical-header">Initiative</p>
          <button onClick={() => setGame({ ...game, initiative: game.initiative === 'me' ? 'opponent' : 'me' })}
            className="mt-2 w-full text-[10px] uppercase tracking-widest font-bold border border-border rounded-sm py-2">
            {game.initiative === 'me' ? 'Mine' : 'Opponent'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex-1">{team.name} — {readyCount} ready</span>
        <button onClick={nextTP} className="tactical-card !py-2 !px-3 text-[10px] uppercase tracking-widest font-bold flex items-center gap-1">
          <ChevronRight className="w-3 h-3" /> Next turning point
        </button>
        <button onClick={() => { if (confirm('End this game?')) setGame(emptyGame()); }} className="tactical-card !py-2 !px-3 text-[10px] uppercase tracking-widest font-bold flex items-center gap-1">
          <RotateCcw className="w-3 h-3" /> New game
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-2">
        {team.operatives.map(op => {
          const s = game.ops[op.id] ?? opState(op);
          const injured = s.woundsLeft > 0 && s.woundsLeft < op.wounds / 2;
          return (
            <div key={op.id} className={`tactical-card !p-3 space-y-2 ${s.dead ? 'opacity-40' : ''} ${s.status === 'expended' && !s.dead ? 'opacity-70' : ''}`}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold flex-1 truncate">{op.name}</span>
                <span className="text-[9px] font-mono text-muted-foreground">APL {op.apl} · M{op.move}" · SV{op.save}+</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1 border border-border rounded-sm" onClick={() => {
                  const wl = Math.max(0, s.woundsLeft - 1);
                  upd(op.id, { woundsLeft: wl, dead: wl === 0 }, wl === 0 ? `${op.name} incapacitated` : undefined);
                }}><Minus className="w-3 h-3" /></button>
                <div className="flex-1 h-2 bg-muted rounded-sm overflow-hidden">
                  <div className={`h-full ${injured ? 'bg-accent' : 'bg-secondary'}`} style={{ width: `${(s.woundsLeft / op.wounds) * 100}%` }} />
                </div>
                <span className="font-mono text-xs w-12 text-right">{s.woundsLeft}/{op.wounds}</span>
                <button className="p-1 border border-border rounded-sm" onClick={() => upd(op.id, { woundsLeft: Math.min(op.wounds, s.woundsLeft + 1), dead: false })}><Heart className="w-3 h-3" /></button>
              </div>
              {injured && <p className="text-[9px] uppercase tracking-widest text-accent">Injured: -2" move, worsen hit by 1</p>}
              <div className="flex flex-wrap gap-1">
                <button disabled={s.dead} onClick={() => upd(op.id, { status: s.status === 'ready' ? 'expended' : 'ready' }, s.status === 'ready' ? `${op.name} activated` : undefined)}
                  className={`px-2 py-1 text-[9px] uppercase tracking-widest font-bold rounded-sm border ${s.status === 'ready' ? 'border-secondary text-secondary' : 'border-border text-muted-foreground'}`}>
                  {s.status === 'ready' ? 'Ready — activate' : 'Expended'}
                </button>
                <button disabled={s.dead} onClick={() => upd(op.id, { order: s.order === 'engage' ? 'conceal' : 'engage' })}
                  className={`px-2 py-1 text-[9px] uppercase tracking-widest font-bold rounded-sm border ${s.order === 'engage' ? 'border-accent text-accent' : 'border-border text-foreground'}`}>
                  {s.order === 'engage' ? 'Engage' : 'Conceal'}
                </button>
                {s.dead && <span className="flex items-center gap-1 text-[9px] uppercase text-destructive"><Skull className="w-3 h-3" /> Incapacitated</span>}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground space-y-0.5">
                {op.weapons.map(wp => (
                  <div key={wp.id}>{wp.melee ? '⚔' : '⌖'} {wp.name} · A{wp.attacks} {wp.hit}+ · {wp.normalDmg}/{wp.critDmg}{wp.rules && ` · ${wp.rules}`}</div>
                ))}
                {op.abilities && <div className="text-foreground/70">{op.abilities}</div>}
              </div>
              <input value={s.notes} onChange={e => upd(op.id, { notes: e.target.value })} placeholder="Notes / tokens..."
                className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[11px]" />
            </div>
          );
        })}
      </div>

      <div className="tactical-card !p-3">
        <p className="tactical-header mb-2">Game log</p>
        <div className="max-h-40 overflow-y-auto text-[10px] font-mono text-muted-foreground space-y-0.5">
          {game.log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Rosters ---------------- */
function NumIn({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col text-[9px] uppercase tracking-widest text-muted-foreground">
      {label}
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value) || 0)}
        className="w-14 bg-background border border-border rounded-sm px-1 py-1 font-mono text-xs text-foreground" />
    </label>
  );
}

/* ---------------- Datacard AI scan ---------------- */
interface ExtractedOperative {
  name: string; faction: 'Tau' | 'Kroot' | 'Other';
  apl: number; move: number; save: number; wounds: number;
  weapons: { name: string; melee: boolean; attacks: number; hit: number; normalDmg: number; critDmg: number; rules: string }[];
  abilities: string;
}

async function fileToDataUrl(file: File, maxDim = 1400): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

function DatacardScan({ onAdd }: { onAdd: (op: KTOperative) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const { data, error } = await supabase.functions.invoke('kt-datacard', { body: { image: dataUrl } });
      if (error) throw new Error(data?.error ?? error.message);
      if (data?.error) throw new Error(data.error);
      const ex = data.operative as ExtractedOperative;
      const op: KTOperative = {
        id: newId(), name: ex.name || 'Scanned Operative',
        faction: ex.faction ?? 'Other',
        apl: ex.apl ?? 2, move: ex.move ?? 6, save: ex.save ?? 5, wounds: ex.wounds ?? 7,
        weapons: (ex.weapons ?? []).map(w => ({ ...w, id: newId() })),
        abilities: ex.abilities ?? '',
      };
      onAdd(op);
      toast.success(`Scanned "${op.name}" — check the stats below and fix anything off.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Scan failed — try a clearer photo.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      <button disabled={busy} onClick={() => inputRef.current?.click()}
        className="tactical-card !py-2 !px-3 text-[10px] uppercase tracking-widest font-bold flex items-center gap-1 disabled:opacity-50">
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanLine className="w-3 h-3" />}
        {busy ? 'Scanning…' : 'Scan datacard'}
      </button>
    </>
  );
}

function Rosters({ teams, setTeams }: { teams: KTTeam[]; setTeams: (t: KTTeam[]) => void }) {
  const [sel, setSel] = useState(teams[0]?.id);
  const team = useMemo(() => teams.find(t => t.id === sel), [teams, sel]);

  const updTeam = (patch: Partial<KTTeam>) => setTeams(teams.map(t => t.id === sel ? { ...t, ...patch } : t));
  const updOp = (id: string, patch: Partial<KTOperative>) => team && updTeam({ operatives: team.operatives.map(o => o.id === id ? { ...o, ...patch } : o) });
  const updWp = (op: KTOperative, wid: string, patch: Partial<KTWeapon>) => updOp(op.id, { weapons: op.weapons.map(w => w.id === wid ? { ...w, ...patch } : w) });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <select value={sel} onChange={e => setSel(e.target.value)} className="bg-card border border-border rounded-sm px-2 py-2 text-xs font-mono">
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button onClick={() => { const id = `team-${Date.now()}`; setTeams([...teams, { id, name: 'New Kill Team', operatives: [] }]); setSel(id); }}
          className="tactical-card !py-2 !px-3 text-[10px] uppercase tracking-widest font-bold flex items-center gap-1"><Plus className="w-3 h-3" /> Team</button>
        <DatacardScan onAdd={op => team && updTeam({ operatives: [...team.operatives, op] })} />
        <button onClick={() => { if (confirm('Restore starter Tau & Kroot rosters? Your edits will be lost.')) { const s = starterTeams(); setTeams(s); setSel(s[0].id); } }}
          className="tactical-card !py-2 !px-3 text-[10px] uppercase tracking-widest font-bold flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Reset starters</button>
      </div>
      <p className="text-[10px] text-muted-foreground">Starter stats are approximate — check them against your current datacards.</p>
      {team && (
        <>
          <div className="flex gap-2">
            <input value={team.name} onChange={e => updTeam({ name: e.target.value })} className="flex-1 bg-card border border-border rounded-sm px-2 py-2 font-mono text-sm" />
            <button onClick={() => updTeam({ operatives: [...team.operatives, newOperative('Other')] })} className="tactical-card !py-2 !px-3 text-[10px] uppercase font-bold flex items-center gap-1"><Plus className="w-3 h-3" /> Operative</button>
            <button onClick={() => { if (confirm('Delete team?')) { setTeams(teams.filter(t => t.id !== sel)); setSel(teams[0]?.id); } }} className="tactical-card !py-2 !px-3"><Trash2 className="w-3 h-3" /></button>
          </div>
          {team.operatives.map(op => (
            <div key={op.id} className="tactical-card !p-3 space-y-2">
              <div className="flex gap-2 items-end flex-wrap">
                <input value={op.name} onChange={e => updOp(op.id, { name: e.target.value })} className="flex-1 min-w-[140px] bg-background border border-border rounded-sm px-2 py-1 font-mono text-sm" />
                <NumIn label="APL" value={op.apl} onChange={v => updOp(op.id, { apl: v })} />
                <NumIn label='Move"' value={op.move} onChange={v => updOp(op.id, { move: v })} />
                <NumIn label="Save+" value={op.save} onChange={v => updOp(op.id, { save: v })} />
                <NumIn label="Wounds" value={op.wounds} onChange={v => updOp(op.id, { wounds: v })} />
                <button onClick={() => updTeam({ operatives: team.operatives.filter(o => o.id !== op.id) })} className="p-2 border border-border rounded-sm"><Trash2 className="w-3 h-3" /></button>
              </div>
              {op.weapons.map(wp => (
                <div key={wp.id} className="flex gap-2 items-end flex-wrap pl-2 border-l border-border">
                  <input value={wp.name} onChange={e => updWp(op, wp.id, { name: e.target.value })} className="min-w-[120px] flex-1 bg-background border border-border rounded-sm px-2 py-1 text-xs" />
                  <button onClick={() => updWp(op, wp.id, { melee: !wp.melee })} className="px-2 py-1 border border-border rounded-sm text-[9px] uppercase">{wp.melee ? 'Melee' : 'Ranged'}</button>
                  <NumIn label="A" value={wp.attacks} onChange={v => updWp(op, wp.id, { attacks: v })} />
                  <NumIn label="Hit+" value={wp.hit} onChange={v => updWp(op, wp.id, { hit: v })} />
                  <NumIn label="Dmg" value={wp.normalDmg} onChange={v => updWp(op, wp.id, { normalDmg: v })} />
                  <NumIn label="Crit" value={wp.critDmg} onChange={v => updWp(op, wp.id, { critDmg: v })} />
                  <input value={wp.rules} onChange={e => updWp(op, wp.id, { rules: e.target.value })} placeholder="Rules" className="min-w-[120px] flex-1 bg-background border border-border rounded-sm px-2 py-1 text-xs" />
                  <button onClick={() => updOp(op.id, { weapons: op.weapons.filter(w => w.id !== wp.id) })} className="p-2 border border-border rounded-sm"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={() => updOp(op.id, { weapons: [...op.weapons, newWeapon()] })} className="text-[9px] uppercase tracking-widest text-secondary">+ Weapon</button>
              </div>
              <textarea value={op.abilities} onChange={e => updOp(op.id, { abilities: e.target.value })} placeholder="Abilities..." rows={2}
                className="w-full bg-background border border-border rounded-sm px-2 py-1 text-xs" />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
