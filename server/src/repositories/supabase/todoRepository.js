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
      .select("id, text, completed, important, list_id, due_date, created_at")
      .or(userFilter)
      .order("created_at", { ascending: false });

    if (listId !== null) {
      query = query.eq("list_id", listId);
    }

    let { data, error } = await query;

    if (error) {
      if (
        error.message &&
        (error.message.includes("list_id") ||
          (error.message.includes("column") && error.message.includes("does not exist")))
      ) {
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
          dueDate: null,
          createdAt: item.created_at
        }));
      }

      throw mapSupabaseError(error);
    }

    return (data ?? []).map((item) => ({
      id: item.id,
      text: item.text,
      completed: item.completed,
      important: item.important ?? false,
      listId: item.list_id,
      dueDate: item.due_date ?? null,
      createdAt: item.created_at
    }));
  }

  async create(userId, text, listId = null, dueDate = null) {
    const insertPayload = { user_id: userId, text, completed: false };
    if (listId !== null) {
      insertPayload.list_id = listId;
    }
    if (dueDate !== null && dueDate !== undefined) {
      insertPayload.due_date = dueDate;
    }

    let { data, error } = await this.client
      .from(this.table)
      .insert(insertPayload)
      .select("id, text, completed, list_id, due_date, created_at")
      .single();

    if (error && error.message && error.message.includes("does not exist")) {
      const fallbackPayload = { ...insertPayload };
      delete fallbackPayload.due_date;
      const fallbackResult = await this.client
        .from(this.table)
        .insert(fallbackPayload)
        .select("id, text, completed, list_id, created_at")
        .single();

      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      throw mapSupabaseError(error);
    }

    return {
      id: data.id,
      text: data.text,
      completed: data.completed,
      listId: data.list_id,
      dueDate: data.due_date ?? null,
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

    if (payload.important !== undefined) {
      updatePayload.important = payload.important;
    }

    if (payload.dueDate !== undefined) {
      updatePayload.due_date = payload.dueDate;
    }

    const userFilter = memberListIds.length > 0
      ? `user_id.eq.${userId},list_id.in.(${memberListIds.join(",")})`
      : `user_id.eq.${userId}`;

    let { data, error } = await this.client
      .from(this.table)
      .update(updatePayload)
      .eq("id", id)
      .or(userFilter)
      .select("id, text, completed, important, list_id, due_date, created_at")
      .maybeSingle();

    if (error && error.message && error.message.includes("does not exist")) {
      const fallbackPayload = { ...updatePayload };
      delete fallbackPayload.due_date;
      const fallbackResult = await this.client
        .from(this.table)
        .update(fallbackPayload)
        .eq("id", id)
        .or(userFilter)
        .select("id, text, completed, important, list_id, created_at")
        .maybeSingle();

      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      // list_id or user_id column may not exist yet — fall back to id-only update
      if (error.message && error.message.includes("does not exist")) {
        const { data: fallbackData, error: fallbackError } = await this.client
          .from(this.table)
          .update(updatePayload)
          .eq("id", id)
          .select("id, text, completed, created_at")
          .maybeSingle();

        if (fallbackError) throw mapSupabaseError(fallbackError);
        if (!fallbackData) return null;

        return {
          id: fallbackData.id,
          text: fallbackData.text,
          completed: fallbackData.completed,
          listId: null,
          dueDate: fallbackData.due_date ?? null,
          createdAt: fallbackData.created_at
        };
      }
      throw mapSupabaseError(error);
    }

    if (!data) return null;

    return {
      id: data.id,
      text: data.text,
      completed: data.completed,
      important: data.important ?? false,
      listId: data.list_id,
      dueDate: data.due_date ?? null,
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
      // list_id or user_id column may not exist yet — fall back to id-only delete
      if (error.message && error.message.includes("does not exist")) {
        const { data: fallbackData, error: fallbackError } = await this.client
          .from(this.table)
          .delete()
          .eq("id", id)
          .select("id")
          .maybeSingle();

        if (fallbackError) throw mapSupabaseError(fallbackError);
        return Boolean(fallbackData);
      }
      throw mapSupabaseError(error);
    }

    return Boolean(data);
  }
}
