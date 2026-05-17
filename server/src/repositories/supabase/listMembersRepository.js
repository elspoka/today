import { ListMembersRepository } from "../listMembersRepository.js";

export class SupabaseListMembersRepository extends ListMembersRepository {
  constructor(supabaseAdminClient) {
    super();
    this.client = supabaseAdminClient;
    this.table = "list_members";
  }

  async invite(listId, inviteeEmail) {
    const { data: userData, error: userError } = await this.client.auth.admin.listUsers();

    if (userError) {
      throw new Error(userError.message);
    }

    const invitee = userData.users.find((u) => u.email === inviteeEmail);

    if (!invitee) {
      const err = new Error("No account found with that email address");
      err.statusCode = 404;
      throw err;
    }

    const { data, error } = await this.client
      .from(this.table)
      .insert({ list_id: listId, user_id: invitee.id, email: inviteeEmail })
      .select("id, list_id, user_id, email, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        const err = new Error("User is already a member of this list");
        err.statusCode = 409;
        throw err;
      }
      if (this._isTableMissing(error)) {
        const err = new Error("Sharing is not set up yet. Run the SQL migration in Supabase first.");
        err.statusCode = 503;
        throw err;
      }
      throw new Error(error.message);
    }

    return {
      id: data.id,
      listId: data.list_id,
      userId: data.user_id,
      email: data.email,
      createdAt: data.created_at
    };
  }

  async getMembers(listId) {
    const { data, error } = await this.client
      .from(this.table)
      .select("id, list_id, user_id, email, created_at")
      .eq("list_id", listId)
      .order("created_at", { ascending: true });

    if (error) {
      if (this._isTableMissing(error)) return [];
      throw new Error(error.message);
    }

    return (data ?? []).map((item) => ({
      id: item.id,
      listId: item.list_id,
      userId: item.user_id,
      email: item.email,
      createdAt: item.created_at
    }));
  }

  async removeMember(listId, memberId) {
    const { data, error } = await this.client
      .from(this.table)
      .delete()
      .eq("id", memberId)
      .eq("list_id", listId)
      .select("id")
      .maybeSingle();

    if (error) {
      if (this._isTableMissing(error)) return false;
      throw new Error(error.message);
    }

    return Boolean(data);
  }

  async isMember(userId, listId) {
    const { data, error } = await this.client
      .from(this.table)
      .select("id")
      .eq("user_id", userId)
      .eq("list_id", listId)
      .maybeSingle();

    if (error) {
      return false;
    }

    return Boolean(data);
  }

  async getMemberListIds(userId) {
    const { data, error } = await this.client
      .from(this.table)
      .select("list_id")
      .eq("user_id", userId);

    if (error) {
      return [];
    }

    return (data ?? []).map((item) => item.list_id);
  }

  _isTableMissing(error) {
    return (
      error.message?.includes("list_members") ||
      error.code === "42P01" ||
      error.message?.includes("schema cache")
    );
  }
}
