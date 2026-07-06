export type Tool = 'pen' | 'eraser';

export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawStroke {
  id: string;
  userName: string;
  color: string;
  size: number;
  tool: Tool;
  points: DrawPoint[];
}

export interface ChatMessage {
  id: string;
  userName: string;
  text: string;
  type: 'user' | 'system';
  createdAt: string;
}

export interface ServerSnapshot {
  strokes: DrawStroke[];
  messages: ChatMessage[];
  users: string[];
}

export interface ServerToClientEvents {
  snapshot: (snapshot: ServerSnapshot) => void;
  'users:update': (users: string[]) => void;
  'draw:stroke': (stroke: DrawStroke) => void;
  'canvas:clear': () => void;
  'chat:message': (message: ChatMessage) => void;
}

export interface ClientToServerEvents {
  'user:join': (userName: string, callback: (snapshot: ServerSnapshot) => void) => void;
  'draw:stroke': (stroke: DrawStroke) => void;
  'canvas:clear': () => void;
  'chat:message': (text: string) => void;
}
