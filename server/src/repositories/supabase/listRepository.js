import { ListRepository } from "../listRepository.js";

export class SupabaseListRepository extends ListRepository {
  constructor(supabaseAdminClient) {
    super();
    this.client = supabaseAdminClient;
    this.table = "todo_lists";
  }

  async getAll(userId) {
    const { data: ownedData, error: ownedError } = await this.client
      .from(this.table)
      .select("id, name, user_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (ownedError) {
      throw new Error(ownedError.message);
    }

    const { data: memberData, error: memberError } = await this.client
      .from("list_members")
      .select("list_id, todo_lists(id, name, user_id, created_at)")
      .eq("user_id", userId);

    if (memberError) {
      return (ownedData ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        ownerId: item.user_id,
        isOwner: true,
        createdAt: item.created_at
      }));
    }

    const ownedIds = new Set((ownedData ?? []).map((l) => l.id));

    const sharedLists = (memberData ?? [])
      .filter((m) => m.todo_lists && !ownedIds.has(m.todo_lists.id))
      .map((m) => ({
        id: m.todo_lists.id,
        name: m.todo_lists.name,
        ownerId: m.todo_lists.user_id,
        isOwner: false,
        createdAt: m.todo_lists.created_at
      }));

    const ownedLists = (ownedData ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      ownerId: item.user_id,
      isOwner: true,
      createdAt: item.created_at
    }));

    return [...ownedLists, ...sharedLists].sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : 1
    );
  }

  async create(userId, name) {
    const { data, error } = await this.client
      .from(this.table)
      .insert({ user_id: userId, name })
      .select("id, name, created_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data.id,
      name: data.name,
      createdAt: data.created_at
    };
  }

  async remove(userId, id) {
    const { data, error } = await this.client
      .from(this.table)
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data);
  }

  async getById(id) {
    const { data, error } = await this.client
      .from(this.table)
      .select("id, name, user_id, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return { id: data.id, name: data.name, ownerId: data.user_id, createdAt: data.created_at };
  }
}
