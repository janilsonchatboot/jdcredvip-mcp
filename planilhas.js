import { google } from "googleapis";

export default async function planilhas({ acao, aba, linha, dados }) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  const sheets = google.sheets({ version: "v4", auth });
  const id = process.env.SHEET_ID;

  if (acao === "ler") {
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: `${aba}!A${linha}:Z${linha}`
    });
    return resp.data.values;
  }

  if (acao === "atualizar") {
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${aba}!A${linha}`,
      valueInputOption: "USER_ENTERED",
      resource: { values: [dados] }
    });
    return { status: "ok", mensagem: "Linha atualizada" };
  }

  throw new Error("Ação inválida: use 'ler' ou 'atualizar'");
}