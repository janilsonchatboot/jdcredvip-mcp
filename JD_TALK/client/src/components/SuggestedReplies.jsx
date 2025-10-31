import { useState } from "react";
export default function SuggestedReplies({ context }) {
  const [items, setItems] = useState([]);
  async function generate() {
    const prompt = `Gere 3 respostas curtas, profissionais e acolhedoras para este contexto:\n${context}\nUse CTA final: "➡️ Saiba mais e simule no WhatsApp: 84 98856-2331".`;
    const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: prompt, channel: "assist" })});
    const j = await r.json();
    const list = (j.reply || "").split("\n").filter(Boolean).slice(0, 3);
    setItems(list);
  }
  return (<div><button className="px-3 py-2 rounded bg-orange-500 text-white" onClick={generate}>Sugerir respostas</button><ul className="mt-2 list-disc pl-5">{items.map((t, i)=><li key={i}>{t}</li>)}</ul></div>);
}