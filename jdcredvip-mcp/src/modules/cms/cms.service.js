import { db } from "#core/database.js";

const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const sanitizeStatus = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (["draft", "published", "scheduled"].includes(normalized)) {
    return normalized;
  }
  return "draft";
};

export async function listPosts({ status, search, limit = 20, offset = 0 } = {}) {
  const query = db("cms_posts").orderBy("created_at", "desc");

  if (status) {
    query.where("status", sanitizeStatus(status));
  }

  if (search) {
    const like = `%${search.trim().toLowerCase()}%`;
    if (typeof query.whereILike === "function") {
      query.whereILike("title", like);
    } else {
      query.where("title", "like", like);
    }
  }

  const rows = await query.limit(limit).offset(offset);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    status: row.status,
    scheduledFor: row.scheduled_for,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function getPost(idOrSlug) {
  const post = await db("cms_posts")
    .modify((query) => {
      if (Number.isFinite(Number(idOrSlug))) {
        query.where("id", idOrSlug);
      } else {
        query.where("slug", idOrSlug);
      }
    })
    .first();

  if (!post) return null;

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    status: post.status,
    scheduledFor: post.scheduled_for,
    publishedAt: post.published_at,
    createdAt: post.created_at,
    updatedAt: post.updated_at
  };
}

export async function createPost({ title, excerpt, content, status, scheduledFor }) {
  const now = new Date();
  const slugBase = slugify(title || `post-${now.getTime()}`);
  let slug = slugBase;
  let suffix = 1;

  // garantir slug único
  while (await db("cms_posts").where({ slug }).first()) {
    slug = `${slugBase}-${suffix}`;
    suffix += 1;
  }

  const payload = {
    title: title || "Post sem título",
    slug,
    excerpt: excerpt || null,
    content: content || "",
    status: sanitizeStatus(status),
    scheduled_for: scheduledFor || null,
    published_at: sanitizeStatus(status) === "published" ? now : null,
    created_at: now,
    updated_at: now
  };

  const [id] = await db("cms_posts").insert(payload);
  return getPost(id);
}

export async function updatePost(id, { title, excerpt, content, status, scheduledFor }) {
  const existing = await getPost(id);
  if (!existing) {
    throw new Error("Post não encontrado.");
  }

  const updates = {
    updated_at: new Date()
  };

  if (title !== undefined) updates.title = title;
  if (excerpt !== undefined) updates.excerpt = excerpt;
  if (content !== undefined) updates.content = content;
  if (status !== undefined) {
    const normalizedStatus = sanitizeStatus(status);
    updates.status = normalizedStatus;
    if (normalizedStatus === "published" && !existing.publishedAt) {
      updates.published_at = new Date();
    }
  }
  if (scheduledFor !== undefined) updates.scheduled_for = scheduledFor || null;

  await db("cms_posts").where({ id: existing.id }).update(updates);
  return getPost(existing.id);
}

export async function deletePost(id) {
  await db("cms_posts").where({ id }).delete();
}
