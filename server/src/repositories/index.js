import { InMemoryTodoRepository } from "./memory/todoRepository.js";
import { SupabaseTodoRepository } from "./supabase/todoRepository.js";
import { InMemoryListRepository } from "./memory/listRepository.js";
import { SupabaseListRepository } from "./supabase/listRepository.js";
import { InMemoryListMembersRepository } from "./memory/listMembersRepository.js";
import { SupabaseListMembersRepository } from "./supabase/listMembersRepository.js";
import { InMemoryNotificationRepository } from "./memory/notificationRepository.js";
import { SupabaseNotificationRepository } from "./supabase/notificationRepository.js";
import { getSupabaseClients } from "../providers/supabase.js";
import { getRuntimeSettings } from "../config/runtimeSettings.js";

function createSupabaseRepositories() {
  const { supabaseAdminClient } = getSupabaseClients();
  return {
    todos: new SupabaseTodoRepository(supabaseAdminClient),
    lists: new SupabaseListRepository(supabaseAdminClient),
    listMembers: new SupabaseListMembersRepository(supabaseAdminClient),
    notifications: new SupabaseNotificationRepository(supabaseAdminClient)
  };
}

function createMemoryRepositories() {
  return {
    todos: new InMemoryTodoRepository(),
    lists: new InMemoryListRepository(),
    listMembers: new InMemoryListMembersRepository(),
    notifications: new InMemoryNotificationRepository()
  };
}

export function createRepositories() {
  const settings = getRuntimeSettings();

  try {
    switch (settings.dbProvider) {
      case "supabase":
        return createSupabaseRepositories();
      case "memory":
        return createMemoryRepositories();
      case "firebase":
      case "mongodb":
        throw new Error(`DB provider "${settings.dbProvider}" is recognized but not implemented yet`);
      default:
        throw new Error(`Unsupported DB_PROVIDER: ${settings.dbProvider}`);
    }
  } catch (error) {
    if (settings.dbStrict || settings.dbFallbackProvider !== "memory") {
      throw error;
    }

    console.warn(`Database provider failed (${error.message}). Falling back to memory provider.`);
    return createMemoryRepositories();
  }
}

