import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getCharacters } from '@/lib/store';
import { Character } from '@/lib/types';
import { useMultiplayer } from '@/lib/MultiplayerContext';

interface CharacterSyncContextValue {
  /** All characters visible to this user (local + remote if DM) */
  allCharacters: Character[];
  /** Number of remote players who have synced characters */
  syncedPlayerCount: number;
  /** Force a re-read of local characters (e.g. after creating one) */
  refreshLocal: () => void;
}

const CharacterSyncContext = createContext<CharacterSyncContextValue>({
  allCharacters: [],
  syncedPlayerCount: 0,
  refreshLocal: () => {},
});

export function CharacterSyncProvider({ children }: { children: ReactNode }) {
  const [localCharacters, setLocalCharacters] = useState<Character[]>(getCharacters());
  const [remoteCharacters, setRemoteCharacters] = useState<Map<string, Character[]>>(new Map());
  const { status, isHost, broadcast, onMessage } = useMultiplayer();
  const connected = status === 'hosting' || status === 'connected';

  const refreshLocal = useCallback(() => {
    setLocalCharacters(getCharacters());
  }, []);

  // Players: broadcast characters when connected or characters change
  useEffect(() => {
    if (!connected || isHost) return;
    broadcast({
      type: 'characters-sync',
      payload: { characters: localCharacters },
    } as any);
  }, [connected, isHost, localCharacters, broadcast]);

  // Listen for character syncs from players (host receives), or from host (players receive)
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

  // Clear remote characters when disconnected
  useEffect(() => {
    if (!connected) {
      setRemoteCharacters(new Map());
    }
  }, [connected]);

  // Merge local + remote characters (deduplicate by id)
  const allCharacters = (() => {
    if (!connected || !isHost) return localCharacters;
    const merged = new Map<string, Character>();
    localCharacters.forEach(c => merged.set(c.id, c));
    remoteCharacters.forEach(chars => {
      chars.forEach(c => merged.set(c.id, c));
    });
    return Array.from(merged.values());
  })();

  return (
    <CharacterSyncContext.Provider value={{
      allCharacters,
      syncedPlayerCount: remoteCharacters.size,
      refreshLocal,
    }}>
      {children}
    </CharacterSyncContext.Provider>
  );
}

export function useCharacterSync() {
  return useContext(CharacterSyncContext);
}
