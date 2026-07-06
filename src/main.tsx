import React, { FormEvent, PointerEvent, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { io, Socket } from 'socket.io-client';
import type { ChatMessage, ClientToServerEvents, DrawPoint, DrawStroke, ServerSnapshot, ServerToClientEvents, Tool } from './types';
import './styles.css';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const COLORS = ['#111827', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

type DrawSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const drawStroke = (ctx: CanvasRenderingContext2D, stroke: DrawStroke) => {
  if (stroke.points.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = stroke.size;
  ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = stroke.color;
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  stroke.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.stroke();
  ctx.restore();
};

const pointerToPoint = (canvas: HTMLCanvasElement, event: PointerEvent<HTMLCanvasElement>): DrawPoint => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
  };
};

function App() {
  const [userName, setUserName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [users, setUsers] = useState<string[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(8);
  const [tool, setTool] = useState<Tool>('pen');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<DrawSocket | null>(null);
  const activeStrokeRef = useRef<DrawStroke | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const redraw = (strokes: DrawStroke[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach((stroke) => drawStroke(ctx, stroke));
  };

  useEffect(() => {
    const socket: DrawSocket = io();
    socketRef.current = socket;

    socket.on('draw:stroke', (stroke) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) drawStroke(ctx, stroke);
    });
    socket.on('canvas:clear', () => redraw([]));
    socket.on('chat:message', (message) => setMessages((current) => [...current.slice(-99), message]));
    socket.on('users:update', setUsers);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const join = (event: FormEvent) => {
    event.preventDefault();
    const nextName = nameInput.trim();
    if (!nextName) return;
    socketRef.current?.emit('user:join', nextName, (snapshot: ServerSnapshot) => {
      setUserName(nextName);
      setMessages(snapshot.messages);
      setUsers(snapshot.users);
      requestAnimationFrame(() => redraw(snapshot.strokes));
    });
  };

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!userName || !canvasRef.current) return;
    canvasRef.current.setPointerCapture(event.pointerId);
    const point = pointerToPoint(canvasRef.current, event);
    activeStrokeRef.current = { id: crypto.randomUUID(), userName, color, size, tool, points: [point] };
  };

  const moveDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    const stroke = activeStrokeRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!stroke || !canvas || !ctx) return;
    const point = pointerToPoint(canvas, event);
    const segment = { ...stroke, points: [stroke.points.at(-1)!, point] };
    stroke.points.push(point);
    drawStroke(ctx, segment);
  };

  const finishDrawing = () => {
    const stroke = activeStrokeRef.current;
    if (!stroke) return;
    activeStrokeRef.current = null;
    socketRef.current?.emit('draw:stroke', stroke);
  };

  const sendChat = (event: FormEvent) => {
    event.preventDefault();
    if (!chatInput.trim()) return;
    socketRef.current?.emit('chat:message', chatInput);
    setChatInput('');
  };

  const clearCanvas = () => {
    if (confirm('全員のキャンバスを全消しします。よろしいですか？')) socketRef.current?.emit('canvas:clear');
  };

  if (!userName) {
    return <main className="join-screen"><form className="join-card" onSubmit={join}><h1>お絵かきチャット</h1><p>ユーザー名を入力して参加してください。</p><input value={nameInput} maxLength={24} onChange={(e) => setNameInput(e.target.value)} placeholder="ユーザー名" autoFocus /><button>参加する</button></form></main>;
  }

  return (
    <main className="app-shell">
      <header><h1>お絵かきチャット</h1><div className="status"><span>接続人数: {users.length}</span><span>ユーザー: {userName}</span></div></header>
      <section className="workspace">
        <div className="canvas-card"><canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} onPointerDown={startDrawing} onPointerMove={moveDrawing} onPointerUp={finishDrawing} onPointerCancel={finishDrawing} onPointerLeave={finishDrawing} /></div>
        <aside className="chat-card"><div className="messages">{messages.map((message) => <div key={message.id} className={`message ${message.type}`}><b>{message.type === 'system' ? 'お知らせ' : message.userName}</b><span>{message.text}</span></div>)}<div ref={messagesEndRef} /></div><form className="chat-form" onSubmit={sendChat}><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="メッセージ" maxLength={500} /><button>送信</button></form></aside>
      </section>
      <footer className="toolbar"><div className="colors">{COLORS.map((nextColor) => <button key={nextColor} className={color === nextColor && tool === 'pen' ? 'selected' : ''} style={{ background: nextColor }} aria-label={`${nextColor}を選択`} onClick={() => { setColor(nextColor); setTool('pen'); }} />)}</div><label>太さ <input type="range" min="2" max="40" value={size} onChange={(e) => setSize(Number(e.target.value))} /> {size}px</label><button className={tool === 'eraser' ? 'active' : ''} onClick={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')}>消しゴム</button><button className="danger" onClick={clearCanvas}>全消し</button></footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
