import { useEffect, useState } from "react";
export function useGuidelines() {
  const [text, setText] = useState("");
  useEffect(() => { fetch("/api/guidelines").then(r => r.json()).then(j => setText(j.text || "")); }, []);
  return text;
}