import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from dotenv import load_dotenv

# Carrega o .env (ajuste para ".env.example" se for o caso)
load_dotenv(".env.example")

spreadsheet_id = os.getenv("SHEETS_SPREADSHEET_ID")
service_account_data = os.getenv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")

if not spreadsheet_id or not service_account_data:
    raise RuntimeError("Verifique SHEETS_SPREADSHEET_ID e GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY nas variáveis de ambiente.")

creds_info = json.loads(service_account_data)
creds_info["private_key"] = creds_info["private_key"].replace("\\n", "\n")

scopes = ["https://www.googleapis.com/auth/spreadsheets"]
credentials = service_account.Credentials.from_service_account_info(creds_info, scopes=scopes)

service = build("sheets", "v4", credentials=credentials)

range_name = "Dashboard!A1:D5"

try:
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range=range_name
    ).execute()
    values = result.get("values", [])

    if not values:
        print("Conexão estabelecida, mas o intervalo está vazio.")
    else:
        print("Conexão bem-sucedida! Valores encontrados:\n")
        for row in values:
            print(row)
except Exception as e:
    print("Erro ao acessar a planilha:")
    print(e)
