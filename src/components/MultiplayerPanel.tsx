import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Copy, Check, Users, LogIn, LogOut, Globe } from 'lucide-react';
import { useMultiplayer } from '@/lib/MultiplayerContext';
import { useGame } from '@/lib/GameContext';

export function MultiplayerPanel() {
  const { status, roomCode, playerName, setPlayerName, connectedPeers, isHost, hostSession, joinSession, disconnect, error } = useMultiplayer();
  const { isDM } = useGame();
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [nameInput, setNameInput] = useState(playerName);

  const handleHost = async () => {
    if (!nameInput.trim()) return;
    setPlayerName(nameInput.trim());
    try {
      await hostSession();
    } catch {}
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !nameInput.trim()) return;
    setPlayerName(nameInput.trim());
    try {
      await joinSession(joinCode.trim());
    } catch {}
  };

  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}?join=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === 'disconnected' || status === 'error') {
    return (
      <div className="border border-border rounded-sm overflow-hidden">
        <div className="p-2 border-b border-border flex items-center gap-2">
          <WifiOff className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex-1">Multiplayer</span>
        </div>
        <div className="p-3 space-y-2">
          {error && (
            <p className="text-[10px] text-destructive font-mono">{error}</p>
          )}
          <div>
            <label className="text-[9px] uppercase tracking-widest text-muted-foreground block mb-1">Your Name</label>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Enter name..."
              className="w-full bg-transparent font-mono text-xs text-foreground outline-none border border-border rounded-sm px-2 py-1.5 placeholder:text-muted-foreground/50 focus:border-foreground/30"
            />
          </div>

          {isDM ? (
            <button
              onClick={handleHost}
              disabled={!nameInput.trim() || status === 'error'}
              className="w-full tactical-card !p-2 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider font-bold hover:border-secondary hover:text-secondary disabled:opacity-30"
            >
              <Globe className="w-3 h-3" />
              Host Session
            </button>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="text-[9px] uppercase tracking-widest text-muted-foreground block mb-1">Room Code</label>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCDEF"
                  maxLength={6}
                  className="w-full bg-transparent font-mono text-sm text-foreground outline-none border border-border rounded-sm px-2 py-1.5 placeholder:text-muted-foreground/50 focus:border-foreground/30 tracking-widest text-center"
                />
              </div>
              <button
                onClick={handleJoin}
                disabled={!joinCode.trim() || !nameInput.trim()}
                className="w-full tactical-card !p-2 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider font-bold hover:border-secondary hover:text-secondary disabled:opacity-30"
              >
                <LogIn className="w-3 h-3" />
                Join Session
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === 'hosting' || status === 'joining') {
    return (
      <div className="border border-border rounded-sm overflow-hidden">
        <div className="p-2 border-b border-border flex items-center gap-2">
          <Wifi className="w-3 h-3 text-secondary animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-secondary flex-1">
            {status === 'hosting' ? 'Hosting' : 'Connecting...'}
          </span>
          <button onClick={disconnect} className="text-muted-foreground hover:text-destructive">
            <LogOut className="w-3 h-3" />
          </button>
        </div>

        {status === 'hosting' && roomCode && (
          <div className="p-3 space-y-2">
            <div>
              <label className="text-[9px] uppercase tracking-widest text-muted-foreground block mb-1">Room Code</label>
              <div className="flex items-center gap-1">
                <span className="font-mono text-lg text-foreground tracking-[0.3em] font-bold flex-1 text-center">
                  {roomCode}
                </span>
                <button onClick={copyCode} className="tactical-card !p-1 px-2">
                  {copied ? <Check className="w-3 h-3 text-secondary" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <button
              onClick={copyLink}
              className="w-full tactical-card !p-1.5 flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider font-bold"
            >
              <Globe className="w-3 h-3" />
              Copy Join Link
            </button>
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>{connectedPeers.length} player{connectedPeers.length !== 1 ? 's' : ''} connected</span>
            </div>
            {connectedPeers.map(p => (
              <div key={p.id} className="flex items-center gap-1 text-[10px] font-mono text-foreground pl-4">
                <div className="w-2 h-2 rounded-full bg-secondary" />
                {p.name}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Connected as player
  return (
    <div className="border border-border rounded-sm overflow-hidden">
      <div className="p-2 border-b border-border flex items-center gap-2">
        <Wifi className="w-3 h-3 text-secondary" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-secondary flex-1">Connected</span>
        <button onClick={disconnect} className="text-muted-foreground hover:text-destructive">
          <LogOut className="w-3 h-3" />
        </button>
      </div>
      <div className="p-3">
        <p className="text-[10px] font-mono text-foreground">{playerName}</p>
        <p className="text-[9px] text-muted-foreground">Room: {roomCode}</p>
      </div>
    </div>
  );
}
