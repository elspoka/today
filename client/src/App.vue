<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { createTodo, fetchTodos, patchTodo, removeTodo } from "./services/todoApi.js";
import { fetchLists, createList, removeList, fetchListMembers, inviteToList, removeMember } from "./services/listApi.js";
import { authService, supabaseConfigError } from "./services/authService.js";
import { fetchNotifications, markAllNotificationsRead } from "./services/notificationApi.js";

const appVersion = __APP_VERSION__;

// Deletion is undoable for a few seconds instead of being instant (easy to trigger via mobile swipe)
const UNDO_DELETE_MS = 5000;
const pendingDelete = ref(null); // { todo, index, timerId }
const pendingListDelete = ref(null); // { list, index, timerId, wasActive }

const todos = ref([]);
const inputValue = ref("");
const error = ref("");
const loading = ref(false);
const submitting = ref(false);
const session = ref(null);
const authMode = ref("login");
const email = ref("");
const password = ref("");
const authLoading = ref(false);
const authError = ref("");
const authInfo = ref("");

const lists = ref([]);
const activeListId = ref(null); // null = "All"
const newListName = ref("");
const addingList = ref(false);
const showNewListInput = ref(false);

// Share panel state
const shareListId = ref(null); // which list is open in share panel
const shareMembers = ref([]);
const inviteEmail = ref("");
const inviting = ref(false);
const shareError = ref("");

// Notifications
const notifications = ref([]);
const showNotificationsPanel = ref(false);
const showProfileMenu = ref(false);

const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length);

const totalCount = computed(() => todos.value.length);
const completedCount = computed(() => todos.value.filter((todo) => todo.completed).length);
const isAuthenticated = computed(() => Boolean(session.value?.access_token));
const accessToken = computed(() => session.value?.access_token ?? "");
const userEmail = computed(() => session.value?.user?.email ?? "");
const activeListName = computed(() => {
  if (activeListId.value === null) return "All Tasks";
  return lists.value.find((l) => l.id === activeListId.value)?.name ?? "Tasks";
});
const shareList = computed(() => lists.value.find((l) => l.id === shareListId.value) ?? null);

async function loadLists() {
  if (!isAuthenticated.value) return;
  try {
    lists.value = await fetchLists();
  } catch {
    // non-fatal
  }
}

async function loadNotifications() {
  if (!isAuthenticated.value) return;
  try {
    notifications.value = await fetchNotifications();
  } catch {
    // non-fatal
  }
}

async function toggleNotificationsPanel() {
  showProfileMenu.value = false;
  showNotificationsPanel.value = !showNotificationsPanel.value;
  if (showNotificationsPanel.value && unreadCount.value > 0) {
    await markAllNotificationsRead();
    notifications.value = notifications.value.map((n) => ({ ...n, read: true }));
  }
}

function toggleProfileMenu() {
  showNotificationsPanel.value = false;
  showProfileMenu.value = !showProfileMenu.value;
}

async function loadTodos() {
  if (!isAuthenticated.value) {
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    todos.value = await fetchTodos(activeListId.value);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function selectList(listId) {
  activeListId.value = listId;
  await loadTodos();
}

async function addList() {
  const name = newListName.value.trim();
  if (!name || addingList.value) return;

  addingList.value = true;
  try {
    const created = await createList(name);
    lists.value = [...lists.value, created];
    newListName.value = "";
    showNewListInput.value = false;
    await selectList(created.id);
  } catch (err) {
    error.value = err.message;
  } finally {
    addingList.value = false;
  }
}

async function deleteList(listId) {
  const index = lists.value.findIndex((l) => l.id === listId);
  if (index === -1) return;
  const list = lists.value[index];

  if (pendingListDelete.value) {
    clearTimeout(pendingListDelete.value.timerId);
    finalizeListDelete(pendingListDelete.value.list.id);
  }

  lists.value = lists.value.filter((l) => l.id !== listId);
  if (shareListId.value === listId) shareListId.value = null;
  const wasActive = activeListId.value === listId;
  if (wasActive) await selectList(null);

  const timerId = setTimeout(() => finalizeListDelete(listId), UNDO_DELETE_MS);
  pendingListDelete.value = { list, index, timerId, wasActive };
}

async function finalizeListDelete(listId) {
  if (pendingListDelete.value?.list.id === listId) pendingListDelete.value = null;
  try {
    await removeList(listId);
  } catch (err) {
    error.value = err.message;
    await loadLists();
  }
}

function undoListDelete() {
  if (!pendingListDelete.value) return;
  clearTimeout(pendingListDelete.value.timerId);
  const { list, index, wasActive } = pendingListDelete.value;
  const arr = [...lists.value];
  arr.splice(Math.min(index, arr.length), 0, list);
  lists.value = arr;
  pendingListDelete.value = null;
  if (wasActive) selectList(list.id);
}

async function openSharePanel(listId) {
  shareListId.value = listId;
  shareError.value = "";
  inviteEmail.value = "";
  try {
    shareMembers.value = await fetchListMembers(listId);
  } catch {
    shareMembers.value = [];
  }
}

function closeSharePanel() {
  shareListId.value = null;
  shareMembers.value = [];
  shareError.value = "";
  inviteEmail.value = "";
}

function updateInviteEmail(event) {
  inviteEmail.value = event.target.value;
}

async function sendInvite() {
  const email = inviteEmail.value.trim();
  if (!email || inviting.value) return;

  inviting.value = true;
  shareError.value = "";

  try {
    const member = await inviteToList(shareListId.value, email);
    shareMembers.value = [...shareMembers.value, member];
    inviteEmail.value = "";
  } catch (err) {
    shareError.value = err.message;
  } finally {
    inviting.value = false;
  }
}

async function kickMember(memberId) {
  try {
    await removeMember(shareListId.value, memberId);
    shareMembers.value = shareMembers.value.filter((m) => m.id !== memberId);
  } catch (err) {
    shareError.value = err.message;
  }
}

async function addTodo() {
  const text = inputValue.value.trim();
  if (!text || submitting.value) {
    return;
  }

  submitting.value = true;
  error.value = "";

  try {
    const created = await createTodo(text, activeListId.value);
    todos.value = [created, ...todos.value];
    inputValue.value = "";
  } catch (err) {
    error.value = err.message;
  } finally {
    submitting.value = false;
  }
}

async function toggleTodo(todo) {
  const originalState = todo.completed;
  todo.completed = !todo.completed;

  try {
    await patchTodo(todo.id, { completed: todo.completed });
  } catch (err) {
    todo.completed = originalState;
    error.value = err.message;
  }
}

async function deleteItem(todoId) {
  const index = todos.value.findIndex((todo) => todo.id === todoId);
  if (index === -1) return;
  const todo = todos.value[index];

  // only one undo slot; finalize any earlier pending delete right away
  if (pendingDelete.value) {
    clearTimeout(pendingDelete.value.timerId);
    finalizeDelete(pendingDelete.value.todo.id);
  }

  todos.value = todos.value.filter((t) => t.id !== todoId);

  const timerId = setTimeout(() => finalizeDelete(todoId), UNDO_DELETE_MS);
  pendingDelete.value = { todo, index, timerId };
}

async function finalizeDelete(todoId) {
  if (pendingDelete.value?.todo.id === todoId) pendingDelete.value = null;
  try {
    await removeTodo(todoId);
  } catch (err) {
    error.value = err.message;
    await loadTodos();
  }
}

function undoDelete() {
  if (!pendingDelete.value) return;
  clearTimeout(pendingDelete.value.timerId);
  const { todo, index } = pendingDelete.value;
  const arr = [...todos.value];
  arr.splice(Math.min(index, arr.length), 0, todo);
  todos.value = arr;
  pendingDelete.value = null;
}

async function signIn() {
  if (supabaseConfigError) {
    authError.value = supabaseConfigError;
    return;
  }

  authLoading.value = true;
  authError.value = "";
  authInfo.value = "";

  try {
    const { error: signInError } = await authService.signIn(email.value, password.value);
    if (signInError) {
      authError.value = signInError.message;
    }
  } catch (err) {
    authError.value = err.message;
  }

  authLoading.value = false;
}

async function signUp() {
  if (supabaseConfigError) {
    authError.value = supabaseConfigError;
    return;
  }

  authLoading.value = true;
  authError.value = "";
  authInfo.value = "";

  try {
    const { data, error: signUpError } = await authService.signUp(email.value, password.value);
    if (signUpError) {
      authError.value = signUpError.message;
    } else if (!data.session) {
      authInfo.value = "Check your email to confirm your account, then sign in.";
    }
  } catch (err) {
    authError.value = err.message;
  }

  authLoading.value = false;
}

async function signInWithFacebook() {
  if (supabaseConfigError) {
    authError.value = supabaseConfigError;
    return;
  }

  authError.value = "";
  authInfo.value = "";

  try {
    const { error: oauthError } = await authService.signInWithFacebook();
    if (oauthError) {
      authError.value = oauthError.message;
    }
  } catch (err) {
    authError.value = err.message;
  }
}

async function signOut() {
  showProfileMenu.value = false;
  await authService.signOut();
  todos.value = [];
  lists.value = [];
  notifications.value = [];
  activeListId.value = null;
  shareListId.value = null;
  shareMembers.value = [];
  showNotificationsPanel.value = false;
  inputValue.value = "";
  error.value = "";
}

function updateEmail(event) {
  email.value = event.target.value;
}

function updatePassword(event) {
  password.value = event.target.value;
}

function updateTodoInput(event) {
  inputValue.value = event.target.value;
}

function updateNewListName(event) {
  newListName.value = event.target.value;
}

async function submitAuth() {
  if (!email.value || !password.value || authLoading.value) {
    return;
  }

  if (authMode.value === "login") {
    await signIn();
    return;
  }

  await signUp();
}

let authSubscription;

onMounted(async () => {
  if (supabaseConfigError) {
    authError.value = supabaseConfigError;
    return;
  }

  const {
    data: { session: activeSession }
  } = await authService.getSession();

  session.value = activeSession;

  if (activeSession?.access_token) {
    await loadLists();
    await loadTodos();
    await loadNotifications();
  }

  const {
    data: { subscription }
  } = authService.onAuthStateChange(async (_event, nextSession) => {
    session.value = nextSession;

    if (nextSession?.access_token) {
      await loadLists();
      await loadTodos();
      await loadNotifications();
    } else {
      todos.value = [];
      lists.value = [];
      notifications.value = [];
    }
  });

  authSubscription = subscription;
});

onUnmounted(() => {
  authSubscription?.unsubscribe();
  if (pendingDelete.value) {
    clearTimeout(pendingDelete.value.timerId);
    finalizeDelete(pendingDelete.value.todo.id);
  }
  if (pendingListDelete.value) {
    clearTimeout(pendingListDelete.value.timerId);
    finalizeListDelete(pendingListDelete.value.list.id);
  }
});
</script>

<template>
  <main class="fiori-layout">
    <ui5-shellbar
      primary-title="To-Day"
      :secondary-title="'v' + appVersion"
      show-notifications
      :notifications-count="unreadCount > 0 ? String(unreadCount) : ''"
      @notifications-click="toggleNotificationsPanel"
      @profile-click="toggleProfileMenu"
    >
      <ui5-avatar slot="profile" size="XS" shape="Circle" color-scheme="Accent5">
        {{ userEmail ? userEmail[0].toUpperCase() : '?' }}
      </ui5-avatar>
    </ui5-shellbar>

    <!-- Profile menu -->
    <div v-if="showProfileMenu && isAuthenticated" class="profile-menu">
      <div class="profile-menu-header">
        <div class="profile-avatar-large">{{ userEmail ? userEmail[0].toUpperCase() : '?' }}</div>
        <div class="profile-info">
          <span class="profile-email">{{ userEmail }}</span>
        </div>
      </div>
      <div class="profile-menu-divider"></div>
      <button class="profile-menu-item profile-signout" @click="signOut">Sign Out</button>
    </div>

    <!-- Notifications panel -->
    <div v-if="showNotificationsPanel && isAuthenticated" class="notifications-panel">
      <div class="notifications-header">
        <strong>Notifications</strong>
        <button class="notifications-close" @click="showNotificationsPanel = false">×</button>
      </div>
      <div v-if="notifications.length === 0" class="notifications-empty">
        No notifications yet.
      </div>
      <ul v-else class="notifications-list">
        <li
          v-for="n in notifications"
          :key="n.id"
          class="notification-item"
          :class="{ unread: !n.read }"
        >
          <span class="notification-msg">{{ n.message }}</span>
          <span class="notification-time">{{ new Date(n.createdAt).toLocaleString() }}</span>
        </li>
      </ul>
    </div>

    <section class="content-area">
      <article v-if="!isAuthenticated" class="fiori-card auth-card">
        <ui5-title level="H3">{{ authMode === "login" ? "Sign In" : "Register" }}</ui5-title>
        <p class="subtitle">Use Supabase email/password or Google OAuth</p>

        <div class="auth-switch">
          <ui5-button
            :design="authMode === 'login' ? 'Emphasized' : 'Transparent'"
            @click="authMode = 'login'"
          >
            Login
          </ui5-button>
          <ui5-button
            :design="authMode === 'register' ? 'Emphasized' : 'Transparent'"
            @click="authMode = 'register'"
          >
            Register
          </ui5-button>
        </div>

        <form class="auth-form" @submit.prevent="submitAuth">
          <ui5-input
            :value="email"
            type="Email"
            placeholder="Email"
            @input="updateEmail"
          />
          <ui5-input
            :value="password"
            type="Password"
            placeholder="Password"
            @input="updatePassword"
          />
          <ui5-button design="Emphasized" type="Submit" :disabled="authLoading">
            {{ authMode === "login" ? "Login" : "Create account" }}
          </ui5-button>
        </form>

        <ui5-button design="Transparent" @click="signInWithFacebook">
          Continue with Facebook
        </ui5-button>

        <ui5-message-strip v-if="authError" design="Negative" hide-close-button>
          {{ authError }}
        </ui5-message-strip>
        <ui5-message-strip v-else-if="authInfo" design="Information" hide-close-button>
          {{ authInfo }}
        </ui5-message-strip>
      </article>

      <article v-else class="fiori-card todo-card">
        <header class="todo-header">
          <div>
            <ui5-title level="H3">{{ activeListName }}</ui5-title>
            <p class="subtitle">{{ completedCount }} / {{ totalCount }} completed</p>
          </div>
        </header>

        <!-- List tabs -->
        <div class="list-tabs">
          <button
            class="list-tab"
            :class="{ active: activeListId === null }"
            @click="selectList(null)"
          >
            All
          </button>
          <div v-for="list in lists" :key="list.id" class="list-tab-wrap">
            <button
              class="list-tab"
              :class="{ active: activeListId === list.id }"
              @click="selectList(list.id)"
            >
              {{ list.name }}
              <span v-if="!list.isOwner" class="shared-badge" title="Shared with you">👥</span>
            </button>
            <button
              v-if="list.isOwner !== false"
              class="list-tab-action"
              title="Share list"
              @click.stop="openSharePanel(list.id)"
            >
              👥
            </button>
            <button
              v-if="list.isOwner !== false"
              class="list-tab-delete"
              title="Delete list"
              @click.stop="deleteList(list.id)"
            >
              ×
            </button>
          </div>
          <div v-if="showNewListInput" class="new-list-form">
            <ui5-input
              :value="newListName"
              placeholder="List name"
              maxlength="100"
              @input="updateNewListName"
              @keydown.enter="addList"
              @keydown.escape="showNewListInput = false"
            />
            <ui5-button design="Emphasized" :disabled="addingList" @click="addList">Add</ui5-button>
            <ui5-button design="Transparent" @click="showNewListInput = false">Cancel</ui5-button>
          </div>
          <button v-else class="list-tab list-tab-add" @click="showNewListInput = true">+ New list</button>
        </div>

        <!-- Share panel -->
        <div v-if="shareListId" class="share-panel">
          <div class="share-panel-header">
            <strong>Share "{{ shareList?.name }}"</strong>
            <button class="share-panel-close" @click="closeSharePanel">×</button>
          </div>
          <div class="share-invite-form">
            <ui5-input
              :value="inviteEmail"
              type="Email"
              placeholder="Invite by email address"
              @input="updateInviteEmail"
              @keydown.enter="sendInvite"
            />
            <ui5-button design="Emphasized" :disabled="inviting" @click="sendInvite">Invite</ui5-button>
          </div>
          <ui5-message-strip v-if="shareError" design="Negative" hide-close-button>
            {{ shareError }}
          </ui5-message-strip>
          <div v-if="shareMembers.length > 0" class="share-members">
            <p class="share-members-label">Members with access:</p>
            <div v-for="member in shareMembers" :key="member.id" class="share-member-row">
              <span>{{ member.email }}</span>
              <button class="share-member-remove" @click="kickMember(member.id)" title="Remove">×</button>
            </div>
          </div>
          <p v-else class="share-members-label">No members yet. Invite someone above.</p>
        </div>

        <form class="todo-create" @submit.prevent="addTodo">
          <ui5-input
            :value="inputValue"
            maxlength="200"
            placeholder="What do you need to do?"
            :disabled="submitting"
            @input="updateTodoInput"
          />
          <ui5-button icon="add" design="Emphasized" type="Submit" :disabled="submitting">
            Add
          </ui5-button>
        </form>

        <ui5-message-strip v-if="error" design="Negative" hide-close-button>
          {{ error }}
        </ui5-message-strip>

        <div v-else-if="loading" class="loading-wrap">
          <ui5-busy-indicator active size="Medium"></ui5-busy-indicator>
          <span>Loading tasks...</span>
        </div>

        <ui5-list v-else separators="Inner" class="todo-list">
          <ui5-li-custom v-for="todo in todos" :key="todo.id">
            <div class="todo-row">
              <label class="todo-label">
                <ui5-checkbox :checked="todo.completed" @change="toggleTodo(todo)"></ui5-checkbox>
                <span :class="{ done: todo.completed }">{{ todo.text }}</span>
              </label>
              <ui5-button class="todo-delete-btn" design="Transparent" icon="delete" @click="deleteItem(todo.id)" />
            </div>
          </ui5-li-custom>
        </ui5-list>
      </article>
    </section>
    <div v-if="pendingDelete || pendingListDelete" class="undo-snackbar-stack">
      <div v-if="pendingDelete" class="undo-snackbar">
        <span>Task deleted</span>
        <button type="button" class="undo-snackbar-btn" @click="undoDelete">Undo</button>
      </div>
      <div v-if="pendingListDelete" class="undo-snackbar">
        <span>List deleted</span>
        <button type="button" class="undo-snackbar-btn" @click="undoListDelete">Undo</button>
      </div>
    </div>
  </main>
</template>
