import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import Peer, { DataConnection } from 'peerjs';

export type ConnectionStatus = 'disconnected' | 'hosting' | 'joining' | 'connected' | 'error';

export interface MultiplayerMessage {
  type: 'state-sync' | 'token-move' | 'token-update' | 'combat-action' | 'chat' | 'request-sync' | 'full-state';
  payload: any;
  senderId?: string;
  senderName?: string;
}

export interface PeerInfo {
  id: string;
  name: string;
}

interface MultiplayerContextValue {
  status: ConnectionStatus;
  roomCode: string | null;
  playerName: string;
  setPlayerName: (name: string) => void;
  connectedPeers: PeerInfo[];
  isHost: boolean;
  hostSession: () => Promise<string>;
  joinSession: (code: string) => Promise<void>;
  disconnect: () => void;
  broadcast: (msg: MultiplayerMessage) => void;
  sendToHost: (msg: MultiplayerMessage) => void;
  onMessage: (handler: (msg: MultiplayerMessage) => void) => () => void;
  error: string | null;
}

const MultiplayerContext = createContext<MultiplayerContextValue>({
  status: 'disconnected',
  roomCode: null,
  playerName: '',
  setPlayerName: () => {},
  connectedPeers: [],
  isHost: false,
  hostSession: async () => '',
  joinSession: async () => {},
  disconnect: () => {},
  broadcast: () => {},
  sendToHost: () => {},
  onMessage: () => () => {},
  error: null,
});

const PEER_PREFIX = 'tslate-';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function MultiplayerProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('mp_player_name') || '');
  const [connectedPeers, setConnectedPeers] = useState<PeerInfo[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const handlersRef = useRef<Set<(msg: MultiplayerMessage) => void>>(new Set());
  const hostConnectionRef = useRef<DataConnection | null>(null);

  const handlePlayerName = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('mp_player_name', name);
  };

  // Persist session for reconnection on refresh
  const saveSession = useCallback((code: string, hosting: boolean) => {
    sessionStorage.setItem('mp_session', JSON.stringify({ code, hosting, playerName }));
  }, [playerName]);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('mp_session');
  }, []);

  const setupConnectionHandlers = useCallback((conn: DataConnection, asHost: boolean) => {
    conn.on('data', (data) => {
      const msg = data as MultiplayerMessage;
      // If host receives a message, re-broadcast to other peers
      if (asHost) {
        connectionsRef.current.forEach((c, id) => {
          if (id !== conn.peer && c.open) {
            try { c.send(msg); } catch {}
          }
        });
      }
      handlersRef.current.forEach(h => h(msg));
    });

    conn.on('close', () => {
      connectionsRef.current.delete(conn.peer);
      setConnectedPeers(prev => prev.filter(p => p.id !== conn.peer));
    });

    conn.on('error', () => {
      connectionsRef.current.delete(conn.peer);
      setConnectedPeers(prev => prev.filter(p => p.id !== conn.peer));
    });
  }, []);

  const hostSession = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const code = generateRoomCode();
      const peerId = PEER_PREFIX + code;

      setStatus('hosting');
      setError(null);

      const peer = new Peer(peerId, { debug: 0 });
      peerRef.current = peer;

      peer.on('open', () => {
        setStatus('hosting');
        setRoomCode(code);
        setIsHost(true);
        saveSession(code, true);
        resolve(code);
      });

      peer.on('connection', (conn) => {
        conn.on('open', () => {
          connectionsRef.current.set(conn.peer, conn);
          setupConnectionHandlers(conn, true);

          // Exchange names
          conn.on('data', (data) => {
            const msg = data as MultiplayerMessage;
            if (msg.type === 'chat' && msg.payload?.type === 'join') {
              setConnectedPeers(prev => {
                const exists = prev.find(p => p.id === conn.peer);
                if (exists) return prev;
                return [...prev, { id: conn.peer, name: msg.senderName || 'Player' }];
              });
              // Send current peer list to new joiner
              conn.send({
                type: 'chat',
                payload: { type: 'peer-list', peers: Array.from(connectionsRef.current.keys()) },
                senderName: playerName,
              } as MultiplayerMessage);
            }
            handlersRef.current.forEach(h => h(msg));
          });
        });
      });

      peer.on('error', (err) => {
        setError(err.message || 'Connection failed');
        setStatus('error');
        reject(err);
      });
    });
  }, [playerName, setupConnectionHandlers]);

  const joinSession = useCallback(async (code: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const hostPeerId = PEER_PREFIX + cleanCode;

      setStatus('joining');
      setError(null);

      const peer = new Peer(undefined, { debug: 0 });
      peerRef.current = peer;

      peer.on('open', () => {
        const conn = peer.connect(hostPeerId, { reliable: true });
        hostConnectionRef.current = conn;

        conn.on('open', () => {
          connectionsRef.current.set(conn.peer, conn);
          setStatus('connected');
          setRoomCode(cleanCode);
          setIsHost(false);
          saveSession(cleanCode, false);

          // Send join message
          conn.send({
            type: 'chat',
            payload: { type: 'join' },
            senderId: peer.id,
            senderName: playerName,
          } as MultiplayerMessage);

          // Request full state sync
          conn.send({
            type: 'request-sync',
            payload: {},
            senderId: peer.id,
            senderName: playerName,
          } as MultiplayerMessage);

          setupConnectionHandlers(conn, false);
          resolve();
        });

        conn.on('error', (err) => {
          setError('Could not connect to host');
          setStatus('error');
          reject(err);
        });
      });

      peer.on('error', (err) => {
        setError(err.message || 'Connection failed');
        setStatus('error');
        reject(err);
      });
    });
  }, [playerName, setupConnectionHandlers]);

  const disconnect = useCallback(() => {
    connectionsRef.current.forEach(c => { try { c.close(); } catch {} });
    connectionsRef.current.clear();
    hostConnectionRef.current = null;
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch {}
      peerRef.current = null;
    }
    setStatus('disconnected');
    setRoomCode(null);
    setIsHost(false);
    setConnectedPeers([]);
    setError(null);
  }, []);

  const broadcast = useCallback((msg: MultiplayerMessage) => {
    msg.senderId = peerRef.current?.id;
    msg.senderName = playerName;
    connectionsRef.current.forEach(conn => {
      if (conn.open) {
        try { conn.send(msg); } catch {}
      }
    });
  }, [playerName]);

  const sendToHost = useCallback((msg: MultiplayerMessage) => {
    msg.senderId = peerRef.current?.id;
    msg.senderName = playerName;
    if (hostConnectionRef.current?.open) {
      try { hostConnectionRef.current.send(msg); } catch {}
    }
  }, [playerName]);

  const onMessage = useCallback((handler: (msg: MultiplayerMessage) => void) => {
    handlersRef.current.add(handler);
    return () => { handlersRef.current.delete(handler); };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  return (
    <MultiplayerContext.Provider value={{
      status, roomCode, playerName, setPlayerName: handlePlayerName,
      connectedPeers, isHost, hostSession, joinSession, disconnect,
      broadcast, sendToHost, onMessage, error,
    }}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  return useContext(MultiplayerContext);
}
