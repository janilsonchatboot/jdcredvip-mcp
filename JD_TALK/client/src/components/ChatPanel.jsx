import { useState } from "react";
export default function ChatPanel() {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState([]);
  async function send() {
    const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: input, channel: "blog" }) });
    const j = await r.json();
    setMsgs(m => [...m, { role: "user", content: input }, { role: "assistant", content: j.reply }]);
    setInput("");
  }
  return (<div className="p-4 rounded-2xl shadow"><div className="h-64 overflow-auto border rounded p-2 mb-2">{msgs.map((m, i) => <div key={i}><b>{m.role}:</b> {m.content}</div>)}</div><div className="flex gap-2"><input className="flex-1 border rounded p-2" value={input} onChange={e=>setInput(e.target.value)} placeholder="Digite sua mensagem..." /><button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={send}>Enviar</button></div></div>);
}