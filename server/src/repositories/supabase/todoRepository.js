import { TodoRepository } from "../todoRepository.js";

function mapSupabaseError(error) {
  const mappedError = new Error(error.message);

  if (error.message.includes("Could not find the table 'public.todos'")) {
    mappedError.statusCode = 503;
    mappedError.publicMessage =
      "Database not initialized. Create the public.todos table in Supabase SQL editor (see README).";
  }

  return mappedError;
}

export class SupabaseTodoRepository extends TodoRepository {
  constructor(supabaseAdminClient) {
    super();
    this.client = supabaseAdminClient;
    this.table = "todos";
  }

  async getAll(userId, listId = null, memberListIds = []) {
    const userFilter = memberListIds.length > 0
      ? `user_id.eq.${userId},list_id.in.(${memberListIds.join(",")})`
      : `user_id.eq.${userId}`;

    let query = this.client
      .from(this.table)
      .select("id, text, completed, list_id, created_at")
      .or(userFilter)
      .order("created_at", { ascending: false });

    if (listId !== null) {
      query = query.eq("list_id", listId);
    }

    const { data, error } = await query;

    if (error) {
      if (error.message && error.message.includes("list_id")) {
        const { data: fallbackData, error: fallbackError } = await this.client
          .from(this.table)
          .select("id, text, completed, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (fallbackError) {
          throw mapSupabaseError(fallbackError);
        }

        return (fallbackData ?? []).map((item) => ({
          id: item.id,
          text: item.text,
          completed: item.completed,
          listId: null,
          createdAt: item.created_at
        }));
      }

      throw mapSupabaseError(error);
    }

    return (data ?? []).map((item) => ({
      id: item.id,
      text: item.text,
      completed: item.completed,
      listId: item.list_id,
      createdAt: item.created_at
    }));
  }

  async create(userId, text, listId = null) {
    const insertPayload = { user_id: userId, text, completed: false };
    if (listId !== null) {
      insertPayload.list_id = listId;
    }

    const { data, error } = await this.client
      .from(this.table)
      .insert(insertPayload)
      .select("id, text, completed, list_id, created_at")
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    return {
      id: data.id,
      text: data.text,
      completed: data.completed,
      listId: data.list_id,
      createdAt: data.created_at
    };
  }

  async update(userId, id, payload, memberListIds = []) {
    const updatePayload = {};

    if (payload.text !== undefined) {
      updatePayload.text = payload.text;
    }

    if (payload.completed !== undefined) {
      updatePayload.completed = payload.completed;
    }

    const userFilter = memberListIds.length > 0
      ? `user_id.eq.${userId},list_id.in.(${memberListIds.join(",")})`
      : `user_id.eq.${userId}`;

    const { data, error } = await this.client
      .from(this.table)
      .update(updatePayload)
      .eq("id", id)
      .or(userFilter)
      .select("id, text, completed, list_id, created_at")
      .maybeSingle();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      text: data.text,
      completed: data.completed,
      listId: data.list_id,
      createdAt: data.created_at
    };
  }

  async remove(userId, id, memberListIds = []) {
    const userFilter = memberListIds.length > 0
      ? `user_id.eq.${userId},list_id.in.(${memberListIds.join(",")})`
      : `user_id.eq.${userId}`;

    const { data, error } = await this.client
      .from(this.table)
      .delete()
      .eq("id", id)
      .or(userFilter)
      .select("id")
      .maybeSingle();

    if (error) {
      throw mapSupabaseError(error);
    }

    return Boolean(data);
  }
}
