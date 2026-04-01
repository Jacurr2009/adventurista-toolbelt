import { useEffect, useRef, useCallback } from 'react';
import { useMultiplayer, MultiplayerMessage } from '@/lib/MultiplayerContext';
import { MapToken } from '@/components/MapCanvas';
import { Obstacle } from '@/lib/obstacles';
import { InitiativeEntry } from '@/components/InitiativeTracker';

export interface MapSyncState {
  tokens: MapToken[];
  obstacles: Obstacle[];
  initiativeEntries: InitiativeEntry[];
  combatActive: boolean;
  currentTurnIndex: number;
  gridSize: number;
  ftPerCell: number;
  activeMapId?: string;
  activeMapImage?: string;
  activeMapName?: string;
}

interface UseMultiplayerSyncOptions {
  isHost: boolean;
  getState: () => MapSyncState;
  applyState: (state: Partial<MapSyncState>) => void;
  onTokenMove?: (tokenId: string, x: number, y: number, senderId?: string) => void;
  onDamageToken?: (tokenId: string, damage: number) => void;
}

export function useMultiplayerSync({ isHost, getState, applyState, onTokenMove, onDamageToken }: UseMultiplayerSyncOptions) {
  const { status, broadcast, onMessage } = useMultiplayer();
  const connected = status === 'hosting' || status === 'connected';
  const lastBroadcastRef = useRef<string>('');

  // Host: broadcast full state periodically on changes
  const broadcastState = useCallback(() => {
    if (!connected || !isHost) return;
    const state = getState();
    const key = JSON.stringify(state);
    if (key === lastBroadcastRef.current) return;
    lastBroadcastRef.current = key;
    broadcast({ type: 'full-state', payload: state });
  }, [connected, isHost, getState, broadcast]);

  // Host: broadcast on token/combat changes
  const broadcastTokenMove = useCallback((tokenId: string, x: number, y: number) => {
    if (!connected) return;
    broadcast({ type: 'token-move', payload: { tokenId, x, y } });
  }, [connected, broadcast]);

  const broadcastDamage = useCallback((tokenId: string, damage: number) => {
    if (!connected) return;
    broadcast({ type: 'token-update', payload: { tokenId, damage } });
  }, [connected, broadcast]);

  const broadcastCombatAction = useCallback((action: string, data?: any) => {
    if (!connected) return;
    broadcast({ type: 'combat-action', payload: { action, ...data } });
  }, [connected, broadcast]);

  // Listen for messages
  useEffect(() => {
    if (!connected) return;

    const unsub = onMessage((msg: MultiplayerMessage) => {
      switch (msg.type) {
        case 'full-state':
          if (!isHost) {
            applyState(msg.payload);
          }
          break;
        case 'request-sync':
          if (isHost) {
            broadcastState();
          }
          break;
        case 'token-move':
          if (msg.payload?.tokenId) {
            onTokenMove?.(msg.payload.tokenId, msg.payload.x, msg.payload.y, msg.senderId);
          }
          break;
        case 'token-update':
          if (msg.payload?.tokenId && msg.payload?.damage) {
            onDamageToken?.(msg.payload.tokenId, msg.payload.damage);
          }
          break;
        case 'combat-action':
          // Host receives player combat actions
          break;
      }
    });

    return unsub;
  }, [connected, isHost, onMessage, applyState, broadcastState, onTokenMove, onDamageToken]);

  return {
    connected,
    broadcastState,
    broadcastTokenMove,
    broadcastDamage,
    broadcastCombatAction,
  };
}
