import { NotificationRepository } from "../notificationRepository.js";

export class SupabaseNotificationRepository extends NotificationRepository {
  constructor(supabaseAdminClient) {
    super();
    this.client = supabaseAdminClient;
    this.table = "notifications";
  }

  _map(row) {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      message: row.message,
      read: row.read,
      metadata: row.metadata,
      createdAt: row.created_at
    };
  }

  async getForUser(userId) {
    const { data, error } = await this.client
      .from(this.table)
      .select("id, user_id, type, message, read, metadata, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      if (error.code === "42P01") return []; // table not yet created
      throw new Error(error.message);
    }

    return (data ?? []).map((r) => this._map(r));
  }

  async create(userId, type, message, metadata = null) {
    const { data, error } = await this.client
      .from(this.table)
      .insert({ user_id: userId, type, message, metadata })
      .select("id, user_id, type, message, read, metadata, created_at")
      .single();

    if (error) {
      if (error.code === "42P01") return null; // table not yet created, fail gracefully
      throw new Error(error.message);
    }

    return this._map(data);
  }

  async markRead(notificationId, userId) {
    const { data, error } = await this.client
      .from(this.table)
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) return false;
    return Boolean(data);
  }

  async markAllRead(userId) {
    const { error } = await this.client
      .from(this.table)
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) throw new Error(error.message);
    return true;
  }
}
