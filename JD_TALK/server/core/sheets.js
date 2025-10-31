import { google } from "googleapis";
import { env, hasGoogleCredentials, missingGoogleEnv } from "../../env.js";
function getAuth() {
  if (!hasGoogleCredentials) throw new Error("Ambiente incompleto: " + missingGoogleEnv().join(", "));
  return new google.auth.GoogleAuth({
    credentials: { client_email: env.googleServiceAccountEmail, private_key: env.googlePrivateKey },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });
}
export async function readRange(range) {
  const auth = await getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: env.sheetId, range });
  return res.data.values ?? [];
}
export async function listTab(tabName) { return readRange(`${tabName}!A1:ZZ`); }