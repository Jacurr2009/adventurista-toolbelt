import { useState, useEffect, useCallback } from 'react';
import { getCharacters } from '@/lib/store';
import { Character } from '@/lib/types';
import { CharacterCard } from '@/components/CharacterCard';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useMultiplayer } from '@/lib/MultiplayerContext';

export default function CharacterList() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [remoteCharacters, setRemoteCharacters] = useState<Map<string, Character[]>>(new Map());
  const { status, isHost, broadcast, onMessage } = useMultiplayer();
  const connected = status === 'hosting' || status === 'connected';

  useEffect(() => {
    setCharacters(getCharacters());
  }, []);

  // Players: broadcast characters when connected or characters change
  useEffect(() => {
    if (!connected || isHost) return;
    const chars = getCharacters();
    broadcast({
      type: 'characters-sync',
      payload: { characters: chars },
    } as any);
  }, [connected, isHost, characters, broadcast]);

  // Host: listen for character syncs from players
  useEffect(() => {
    if (!connected) return;
    const unsub = onMessage((msg) => {
      if (msg.type === 'characters-sync' && msg.senderId) {
        setRemoteCharacters(prev => {
          const next = new Map(prev);
          next.set(msg.senderId!, msg.payload.characters);
          return next;
        });
      }
    });
    return unsub;
  }, [connected, onMessage]);

  // Merge local + remote characters (deduplicate by id)
  const allCharacters = (() => {
    if (!connected || !isHost) return characters;
    const merged = new Map<string, Character>();
    characters.forEach(c => merged.set(c.id, c));
    remoteCharacters.forEach(chars => {
      chars.forEach(c => merged.set(c.id, c));
    });
    return Array.from(merged.values());
  })();

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-lg text-foreground">CHARACTER ROSTER</h1>
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest">
            {allCharacters.length} BUILD{allCharacters.length !== 1 ? 'S' : ''} REGISTERED
            {connected && isHost && remoteCharacters.size > 0 && (
              <span className="ml-2 text-tactical-gold">• {remoteCharacters.size} PLAYER{remoteCharacters.size !== 1 ? 'S' : ''} SYNCED</span>
            )}
          </p>
        </div>
        <Link to="/create">
          <motion.div
            className="tactical-card py-2 px-4 flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold cursor-pointer"
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-3 h-3" /> NEW BUILD
          </motion.div>
        </Link>
      </div>

      {allCharacters.length === 0 ? (
        <div className="tactical-card text-center py-16">
          <p className="font-display text-muted-foreground text-sm tracking-widest mb-4">NO CHARACTERS FOUND.</p>
          <Link to="/create">
            <motion.span
              className="text-[11px] uppercase tracking-widest text-foreground border-b border-foreground/30 pb-0.5 hover:border-foreground transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              INITIATE FIRST BUILD →
            </motion.span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
          {allCharacters.map(char => (
            <CharacterCard key={char.id} character={char} />
          ))}
        </div>
      )}
    </div>
  );
}
