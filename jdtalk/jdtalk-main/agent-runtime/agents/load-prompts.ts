import fs from "fs";
import path from "path";

export interface PromptEntry {
  id: string;
  title: string;
  path: string;
  tags: string[];
  content: string;
}

type Manifest = {
  name: string;
  entries: Array<Omit<PromptEntry, "content">>;
};

export function loadPromptsFromManifest(
  manifestPath = "supabase_prompts/index.json",
): Record<string, PromptEntry> {
  const absoluteManifestPath = path.isAbsolute(manifestPath)
    ? manifestPath
    : path.join(process.cwd(), manifestPath);
  const baseDir = path.dirname(absoluteManifestPath);

  if (!fs.existsSync(absoluteManifestPath)) {
    console.warn(`⚠️ Manifesto não encontrado: ${absoluteManifestPath}`);
    return {};
  }

  const manifest = JSON.parse(
    fs.readFileSync(absoluteManifestPath, "utf-8"),
  ) as Manifest;

  const prompts: Record<string, PromptEntry> = {};

  for (const entry of manifest.entries) {
    const filePath = path.join(baseDir, entry.path);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Arquivo não encontrado: ${entry.path}`);
      continue;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    prompts[entry.id] = {
      ...entry,
      content,
    };
  }

  console.log(
    `ℹ️ ${Object.keys(prompts).length} guias carregados de ${manifest.name}`,
  );
  return prompts;
}

export function loadPromptCollections() {
  return {
    supabase: loadPromptsFromManifest("supabase_prompts/index.json"),
    jdcredvip: loadPromptsFromManifest("jdcredvip_prompts/index.json"),
  };
}
