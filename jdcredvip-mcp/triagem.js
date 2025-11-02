export default async function triagem(input) {
  const url = process.env.TRIAGEM_URL;
  const apiKey = process.env.API_KEY;

  const res = await fetch(`${url}/triagem`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify(input)
  });

  if (!res.ok) throw new Error(`Erro motor triagem: ${res.status}`);
  return await res.json();
}