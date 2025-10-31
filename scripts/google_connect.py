import argparse
import base64
import html
import json
import os
import re
from pathlib import Path
from typing import Iterable, Optional

from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2 import credentials as user_credentials
from google.oauth2 import service_account
from googleapiclient.discovery import build


ENV_CANDIDATES: tuple[Path, ...] = (Path(".env"), Path(".env.example"))


def load_environment() -> None:
    """Load environment variables from the first available env file."""
    for candidate in ENV_CANDIDATES:
        if candidate.exists():
            load_dotenv(candidate)
            return
    raise FileNotFoundError(
        "Nenhum arquivo .env encontrado. Crie um arquivo com as credenciais."
    )


def build_sheets_service():
    """Create Google Sheets API client using a service account."""
    key_path = os.getenv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_PATH")
    raw_info = os.getenv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")

    if key_path:
        key_file = Path(key_path)
        if not key_file.exists():
            raise FileNotFoundError(
                f"Arquivo de credencial nao encontrado em GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_PATH: {key_path}"
            )
        raw_info = key_file.read_text(encoding="utf-8")

    spreadsheet_id = os.getenv("SHEETS_SPREADSHEET_ID")

    if not raw_info or not spreadsheet_id:
        raise RuntimeError(
            "Variaveis SHEETS_SPREADSHEET_ID e GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (ou *_PATH) sao obrigatorias."
        )

    try:
        info = json.loads(raw_info)
    except json.JSONDecodeError as exc:
        raise ValueError(
            "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY deve conter o JSON completo da credencial."
        ) from exc

    if "private_key" in info:
        info["private_key"] = info["private_key"].replace("\\n", "\n")

    scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    credentials = service_account.Credentials.from_service_account_info(
        info, scopes=scopes
    )
    service = build("sheets", "v4", credentials=credentials)
    return service, spreadsheet_id


def fetch_sheet_values(range_: str) -> list[list[str]]:
    service, spreadsheet_id = build_sheets_service()
    response = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=spreadsheet_id, range=range_)
        .execute()
    )
    return response.get("values", [])


def build_blogger_service():
    """Return Blogger API client using the stored refresh token."""
    client_id = os.getenv("BLOGGER_CLIENT_ID")
    client_secret = os.getenv("BLOGGER_CLIENT_SECRET")
    refresh_token = os.getenv("BLOGGER_REFRESH_TOKEN")

    if not all([client_id, client_secret, refresh_token]):
        raise RuntimeError(
            "BLOGGER_CLIENT_ID, BLOGGER_CLIENT_SECRET e BLOGGER_REFRESH_TOKEN sao obrigatorios."
        )

    credentials = user_credentials.Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=["https://www.googleapis.com/auth/blogger"],
    )
    credentials.refresh(Request())

    service = build("blogger", "v3", credentials=credentials)
    return service, credentials.token, credentials.expiry


def get_blog_info(blog_id: Optional[str] = None) -> dict:
    service, access_token, expiry = build_blogger_service()
    blog_id = blog_id or os.getenv("BLOGGER_BLOG_ID")
    if not blog_id:
        raise RuntimeError("BLOGGER_BLOG_ID nao foi definido.")

    blog = service.blogs().get(blogId=blog_id).execute()
    blog["_access_token"] = access_token
    blog["_access_token_expiry"] = expiry.isoformat() if expiry else None
    return blog


def list_recent_posts(blog_id: Optional[str], max_results: int = 5) -> list[dict]:
    service, access_token, expiry = build_blogger_service()
    blog_id = blog_id or os.getenv("BLOGGER_BLOG_ID")
    if not blog_id:
        raise RuntimeError("BLOGGER_BLOG_ID nao foi definido.")

    posts = (
        service.posts()
        .list(blogId=blog_id, fetchBodies=False, maxResults=max_results)
        .execute()
        .get("items", [])
    )
    for post in posts:
        post["_access_token"] = access_token[:8] + "..." if access_token else None
        post["_access_token_expiry"] = expiry.isoformat() if expiry else None
    return posts


def publish_blog_post(
    content_path: Path,
    image_path: Optional[Path] = None,
    *,
    blog_id: Optional[str] = None,
    labels: Optional[Iterable[str]] = None,
    title_override: Optional[str] = None,
    draft: bool = False,
) -> dict:
    service, _, _ = build_blogger_service()
    blog_id = blog_id or os.getenv("BLOGGER_BLOG_ID")
    if not blog_id:
        raise RuntimeError("BLOGGER_BLOG_ID nao foi definido.")

    markdown_text = read_markdown(content_path)
    title, body_md = split_title(markdown_text)
    if title_override:
        title = title_override
    html_content = markdown_to_html(body_md)

    image_tag = ""
    if image_path:
        if not image_path.exists():
            raise FileNotFoundError(f"Imagem nao encontrada: {image_path}")
        image_bytes = image_path.read_bytes()
        image_b64 = base64.b64encode(image_bytes).decode("ascii")
        mimetype = guess_mimetype(image_path)
        image_tag = (
            "<div class='separator' style='text-align:center;'>"
            f"<img src='data:{mimetype};base64,{image_b64}' alt='{html.escape(title)}' "
            "style='max-width:100%; height:auto;'/>"
            "</div>\n"
        )

    body_payload = {
        "kind": "blogger#post",
        "title": title.strip(),
        "content": f"{image_tag}{html_content}" if image_tag else html_content,
    }
    if labels:
        body_payload["labels"] = list(labels)

    insert_request = service.posts().insert(
        blogId=blog_id,
        body=body_payload,
        isDraft=draft,
    )
    post = insert_request.execute()

    if not draft and not post.get("url"):
        post = (
            service.posts()
            .publish(blogId=blog_id, postId=post["id"])
            .execute()
        )

    return post


def read_markdown(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Arquivo nao encontrado: {path}")

    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="cp1252")


def split_title(markdown_text: str) -> tuple[str, str]:
    lines = markdown_text.splitlines()
    title = ""
    body_lines: list[str] = []
    for index, line in enumerate(lines):
        if line.startswith("# "):
            title = line[2:].strip()
            body_lines = lines[index + 1 :]
            break
    if not title:
        title = "Post sem titulo"
        body_lines = lines
    return title, "\n".join(body_lines).strip()


def markdown_to_html(markdown_text: str) -> str:
    lines = markdown_text.splitlines()
    html_parts: list[str] = []
    in_ul = False
    in_ol = False

    def close_lists():
        nonlocal in_ul, in_ol
        if in_ul:
            html_parts.append("</ul>")
            in_ul = False
        if in_ol:
            html_parts.append("</ol>")
            in_ol = False

    for raw_line in lines:
        line = raw_line.rstrip()
        stripped = line.strip()

        if not stripped:
            close_lists()
            continue

        if stripped.startswith("### "):
            close_lists()
            html_parts.append(f"<h3>{render_inline(stripped[4:])}</h3>")
            continue
        if stripped.startswith("## "):
            close_lists()
            html_parts.append(f"<h2>{render_inline(stripped[3:])}</h2>")
            continue
        if stripped.startswith("# "):
            close_lists()
            html_parts.append(f"<h2>{render_inline(stripped[2:])}</h2>")
            continue
        if stripped.startswith("- "):
            if not in_ul:
                close_lists()
                html_parts.append("<ul>")
                in_ul = True
            html_parts.append(f"<li>{render_inline(stripped[2:])}</li>")
            continue
        if re.match(r"\d+\.\s", stripped):
            if not in_ol:
                close_lists()
                html_parts.append("<ol>")
                in_ol = True
            item_text = re.sub(r"^\d+\.\s", "", stripped)
            html_parts.append(f"<li>{render_inline(item_text)}</li>")
            continue
        if stripped.startswith("---"):
            close_lists()
            html_parts.append("<hr/>")
            continue

        close_lists()
        html_parts.append(f"<p>{render_inline(stripped)}</p>")

    close_lists()
    return "\n".join(html_parts)


def render_inline(text: str) -> str:
    escaped = html.escape(text)

    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"__(.+?)__", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"\*(.+?)\*", r"<em>\1</em>", escaped)
    escaped = re.sub(r"_(.+?)_", r"<em>\1</em>", escaped)
    escaped = re.sub(
        r"\[(.+?)\]\((https?://[^\s)]+)\)",
        r"<a href='\2' target='_blank' rel='noopener'>\1</a>",
        escaped,
    )
    return escaped.replace("\n", "<br/>")


def guess_mimetype(path: Path) -> str:
    extension = path.suffix.lower()
    if extension in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if extension == ".png":
        return "image/png"
    if extension == ".webp":
        return "image/webp"
    return "application/octet-stream"


def main():
    load_environment()

    parser = argparse.ArgumentParser(
        description="Ferramentas para Google Sheets e Blogger."
    )
    subparsers = parser.add_subparsers(dest="command")

    sheets_parser = subparsers.add_parser("sheets", help="Busca dados da planilha")
    sheets_parser.add_argument(
        "--range",
        default="A1:D10",
        help="Intervalo no formato A1 (ex.: 'Aba!A1:C5'). Padrao: A1:D10",
    )

    blog_info_parser = subparsers.add_parser(
        "blog-info", help="Mostra dados do blog e renova o token"
    )
    blog_info_parser.add_argument("--blog-id", help="ID do blog. Usa BLOGGER_BLOG_ID se omitido.")

    blog_posts_parser = subparsers.add_parser(
        "blog-posts", help="Lista posts recentes"
    )
    blog_posts_parser.add_argument("--blog-id", help="ID do blog. Usa BLOGGER_BLOG_ID se omitido.")
    blog_posts_parser.add_argument(
        "--limit",
        type=int,
        default=5,
        help="Quantidade de posts para listar (padrao 5)",
    )

    blog_publish_parser = subparsers.add_parser(
        "blog-publish", help="Publica um novo post usando arquivo markdown"
    )
    blog_publish_parser.add_argument(
        "--content",
        required=True,
        type=Path,
        help="Caminho para o arquivo markdown com o post.",
    )
    blog_publish_parser.add_argument(
        "--image",
        type=Path,
        help="Imagem destacada (png, jpg, webp). Opcional.",
    )
    blog_publish_parser.add_argument(
        "--labels",
        nargs="*",
        help="Lista de etiquetas do post.",
    )
    blog_publish_parser.add_argument(
        "--title",
        help="Titulo sobrescrito. Se omitido, usa o primeiro heading do markdown.",
    )
    blog_publish_parser.add_argument(
        "--blog-id",
        help="ID do blog. Usa BLOGGER_BLOG_ID se omitido.",
    )
    blog_publish_parser.add_argument(
        "--draft",
        action="store_true",
        help="Publica como rascunho.",
    )

    args = parser.parse_args()

    if args.command == "sheets":
        values = fetch_sheet_values(args.range)
        if not values:
            print("Nenhum dado encontrado para o intervalo informado.")
        else:
            for row in values:
                print(" | ".join(str(cell) for cell in row))
    elif args.command == "blog-info":
        info = get_blog_info(args.blog_id)
        access_token = info.pop("_access_token", None)
        expiry = info.pop("_access_token_expiry", None)
        print("Token renovado. Guarde-o se precisar usar fora deste script.")
        print(f"Expira em: {expiry}")
        print(f"Token (inicio): {access_token[:12] + '...' if access_token else 'N/A'}")
        print("Informacoes do blog:")
        for key, value in info.items():
            print(f"- {key}: {value}")
    elif args.command == "blog-posts":
        posts = list_recent_posts(args.blog_id, args.limit)
        if not posts:
            print("Nenhum post encontrado.")
        else:
            print(f"Token renovado (parcial): {posts[0].get('_access_token')}")
            print(f"Expira em: {posts[0].get('_access_token_expiry')}")
            for post in posts:
                print(f"- {post.get('title')} (ID: {post.get('id')})")
    elif args.command == "blog-publish":
        post = publish_blog_post(
            content_path=args.content,
            image_path=args.image,
            blog_id=args.blog_id,
            labels=args.labels,
            title_override=args.title,
            draft=args.draft,
        )
        status = "rascunho" if args.draft else "publicado"
        print(f"Post {status} com sucesso! ID: {post.get('id')}")
        if post.get("url"):
            print(f"URL: {post['url']}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
