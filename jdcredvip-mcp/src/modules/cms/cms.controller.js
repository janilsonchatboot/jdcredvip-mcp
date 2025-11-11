import { listPosts, getPost, createPost, updatePost, deletePost } from "./cms.service.js";

export async function listar(req, res) {
  try {
    const posts = await listPosts(req.query?.limit ? Number(req.query.limit) : undefined);
    res.json({ status: "ok", dados: posts });
  } catch (error) {
    console.error("Erro ao listar posts CMS:", error);
    res.status(500).json({ status: "erro", mensagem: "Falha ao listar posts." });
  }
}

export async function obter(req, res) {
  try {
    const post = await getPost(req.params.id);
    if (!post) {
      return res.status(404).json({ status: "erro", mensagem: "Post nao encontrado." });
    }
    res.json({ status: "ok", dados: post });
  } catch (error) {
    console.error("Erro ao carregar post CMS:", error);
    res.status(500).json({ status: "erro", mensagem: "Falha ao carregar post." });
  }
}

export async function criar(req, res) {
  try {
    const post = await createPost(req.body ?? {});
    res.status(201).json({ status: "ok", dados: post });
  } catch (error) {
    console.error("Erro ao criar post CMS:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao criar post." });
  }
}

export async function atualizar(req, res) {
  try {
    const post = await updatePost(req.params.id, req.body ?? {});
    res.json({ status: "ok", dados: post });
  } catch (error) {
    console.error("Erro ao atualizar post CMS:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao atualizar post." });
  }
}

export async function remover(req, res) {
  try {
    await deletePost(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Erro ao remover post CMS:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao remover post." });
  }
}
