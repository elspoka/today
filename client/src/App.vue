<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { createTodo, fetchTodos, patchTodo, removeTodo } from "./services/todoApi.js";
import { fetchLists, createList, removeList, fetchListMembers, inviteToList, removeMember } from "./services/listApi.js";
import { authService, supabaseConfigError } from "./services/authService.js";
import { fetchNotifications, markAllNotificationsRead } from "./services/notificationApi.js";

const appVersion = __APP_VERSION__;
const { t, locale } = useI18n();

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
const language = ref("en");

const languages = [
  { key: "en", label: "English" },
  { key: "de", label: "Deutsch" },
  { key: "fr", label: "Français" },
  { key: "es", label: "Español" },
  { key: "nl", label: "Nederlands" },
  { key: "el", label: "Ελληνικά" },
];

function updateLanguage(event) {
  const lang = event.detail.selectedOption.value;
  locale.value = lang;
  document.documentElement.lang = lang;
}

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
  if (activeListId.value === null) return t("todo.allTasks");
  return lists.value.find((l) => l.id === activeListId.value)?.name ?? t("todo.allTasks");
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
  try {
    await removeList(listId);
    lists.value = lists.value.filter((l) => l.id !== listId);
    if (shareListId.value === listId) shareListId.value = null;
    if (activeListId.value === listId) {
      await selectList(null);
    }
  } catch (err) {
    error.value = err.message;
  }
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

async function toggleImportant(todo, event) {
  event?.currentTarget?.blur();
  const original = todo.important;
  todo.important = !todo.important;
  try {
    await patchTodo(todo.id, { important: todo.important });
  } catch (err) {
    todo.important = original;
    error.value = err.message;
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

const sortedTodos = computed(() =>
  [...todos.value].sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0))
);

const dragIndex = ref(null);
const dragOverIndex = ref(null);

function onDragStart(index) {
  dragIndex.value = index;
}

function onDrop(index) {
  if (dragIndex.value === null || dragIndex.value === index) {
    dragIndex.value = null;
    dragOverIndex.value = null;
    return;
  }
  const items = [...sortedTodos.value];
  const [moved] = items.splice(dragIndex.value, 1);
  items.splice(index, 0, moved);
  todos.value = items;
  dragIndex.value = null;
  dragOverIndex.value = null;
}

function onDragEnd() {
  dragIndex.value = null;
  dragOverIndex.value = null;
}

async function deleteItem(todoId) {
  const previous = todos.value;
  todos.value = todos.value.filter((todo) => todo.id !== todoId);

  try {
    await removeTodo(todoId);
  } catch (err) {
    todos.value = previous;
    error.value = err.message;
  }
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

// async function signInWithGoogle() {
//   if (!supabase) {
//     authError.value = supabaseConfigError;
//     return;
//   }
//
//   authError.value = "";
//   authInfo.value = "";
//
//   const { error: oauthError } = await supabase.auth.signInWithOAuth({
//     provider: "google",
//     options: {
//       redirectTo: window.location.origin
//     }
//   });
//
//   if (oauthError) {
//     authError.value = oauthError.message;
//   }
// }

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
      <button class="profile-menu-item profile-signout" @click="signOut">{{ $t('profile.signOut') }}</button>
    </div>

    <!-- Notifications panel -->
    <div v-if="showNotificationsPanel && isAuthenticated" class="notifications-panel">
      <div class="notifications-header">
        <strong>{{ $t('notifications.title') }}</strong>
        <button class="notifications-close" @click="showNotificationsPanel = false">×</button>
      </div>
      <div v-if="notifications.length === 0" class="notifications-empty">
        {{ $t('notifications.empty') }}
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

    <section class="content-area" :class="{ 'content-area--centered': !isAuthenticated }">
      <article v-if="!isAuthenticated" class="fiori-card auth-card">
        <div class="auth-brand">
          <div class="auth-brand-icon">✓</div>
          <ui5-title level="H2">To-Day</ui5-title>
        </div>

        <div>
          <ui5-title level="H4">{{ authMode === 'login' ? $t('auth.loginTitle') : $t('auth.registerTitle') }}</ui5-title>
          <p class="subtitle">{{ authMode === 'login' ? $t('auth.loginSubtitle') : $t('auth.registerSubtitle') }}</p>
        </div>

        <div class="auth-switch">
          <ui5-button
            :design="authMode === 'login' ? 'Emphasized' : 'Transparent'"
            @click="authMode = 'login'"
          >
            {{ $t('auth.loginTab') }}
          </ui5-button>
          <ui5-button
            :design="authMode === 'register' ? 'Emphasized' : 'Transparent'"
            @click="authMode = 'register'"
          >
            {{ $t('auth.registerTab') }}
          </ui5-button>
        </div>

        <form class="auth-form" @submit.prevent="submitAuth">
          <div class="auth-form-field">
            <ui5-label for="auth-email" required>{{ $t('auth.emailLabel') }}</ui5-label>
            <ui5-input
              id="auth-email"
              :value="email"
              type="Email"
              :placeholder="$t('auth.emailPlaceholder')"
              @input="updateEmail"
            />
          </div>
          <div class="auth-form-field">
            <ui5-label for="auth-password" required>{{ $t('auth.passwordLabel') }}</ui5-label>
            <ui5-input
              id="auth-password"
              :value="password"
              type="Password"
              placeholder="••••••••"
              @input="updatePassword"
            />
          </div>
          <ui5-button design="Emphasized" type="Submit" :disabled="authLoading">
            {{ authMode === "login" ? $t('auth.loginBtn') : $t('auth.createAccountBtn') }}
          </ui5-button>
        </form>

        <!-- <ui5-button design="Transparent" @click="signInWithGoogle">
          Continue with Google
        </ui5-button> -->

        <ui5-message-strip v-if="authError" design="Negative" hide-close-button>
          {{ authError }}
        </ui5-message-strip>
        <ui5-message-strip v-else-if="authInfo" design="Information" hide-close-button>
          {{ authInfo }}
        </ui5-message-strip>

        <div class="auth-language">
          <ui5-icon name="globe" class="auth-language-icon" />
          <ui5-select @change="updateLanguage">
            <ui5-option
              v-for="lang in languages"
              :key="lang.key"
              :value="lang.key"
              :selected="lang.key === locale"
            >{{ lang.label }}</ui5-option>
          </ui5-select>
        </div>
      </article>

      <article v-else class="fiori-card todo-card">
        <header class="todo-header">
          <div>
            <ui5-title level="H3">{{ activeListName }}</ui5-title>
            <p class="subtitle">{{ $t('todo.completed', { done: completedCount, total: totalCount }) }}</p>
          </div>
        </header>

        <!-- List tabs -->
        <div class="list-tabs">
          <button
            class="list-tab"
            :class="{ active: activeListId === null }"
            @click="selectList(null)"
          >
            {{ $t('todo.all') }}
          </button>
          <div v-for="list in lists" :key="list.id" class="list-tab-wrap">
            <button
              class="list-tab"
              :class="{ active: activeListId === list.id }"
              @click="selectList(list.id)"
            >
              {{ list.name }}
              <span v-if="!list.isOwner" class="shared-badge" :title="$t('todo.sharedWithYou')">👥</span>
            </button>
            <button
              v-if="list.isOwner !== false"
              class="list-tab-action"
              :title="$t('todo.shareList')"
              @click.stop="openSharePanel(list.id)"
            >
              👥
            </button>
            <button
              v-if="list.isOwner !== false"
              class="list-tab-delete"
              :title="$t('todo.deleteList')"
              @click.stop="deleteList(list.id)"
            >
              ×
            </button>
          </div>
          <div v-if="showNewListInput" class="new-list-form">
            <ui5-input
              :value="newListName"
              :placeholder="$t('todo.listNamePlaceholder')"
              maxlength="100"
              @input="updateNewListName"
              @keydown.enter="addList"
              @keydown.escape="showNewListInput = false"
            />
            <ui5-button design="Emphasized" :disabled="addingList" @click="addList">{{ $t('todo.add') }}</ui5-button>
            <ui5-button design="Transparent" @click="showNewListInput = false">{{ $t('todo.cancel') }}</ui5-button>
          </div>
          <button v-else class="list-tab list-tab-add" @click="showNewListInput = true">{{ $t('todo.newList') }}</button>
        </div>

        <!-- Share panel -->
        <div v-if="shareListId" class="share-panel">
          <div class="share-panel-header">
            <strong>{{ $t('share.title', { name: shareList?.name }) }}</strong>
            <button class="share-panel-close" @click="closeSharePanel">×</button>
          </div>
          <div class="share-invite-form">
            <ui5-input
              :value="inviteEmail"
              type="Email"
              :placeholder="$t('share.invitePlaceholder')"
              @input="updateInviteEmail"
              @keydown.enter="sendInvite"
            />
            <ui5-button design="Emphasized" :disabled="inviting" @click="sendInvite">{{ $t('share.invite') }}</ui5-button>
          </div>
          <ui5-message-strip v-if="shareError" design="Negative" hide-close-button>
            {{ shareError }}
          </ui5-message-strip>
          <div v-if="shareMembers.length > 0" class="share-members">
            <p class="share-members-label">{{ $t('share.membersLabel') }}</p>
            <div v-for="member in shareMembers" :key="member.id" class="share-member-row">
              <span>{{ member.email }}</span>
              <button class="share-member-remove" @click="kickMember(member.id)" :title="$t('share.remove')">×</button>
            </div>
          </div>
          <p v-else class="share-members-label">{{ $t('share.noMembers') }}</p>
        </div>

        <form class="todo-create" @submit.prevent="addTodo">
          <ui5-input
            :value="inputValue"
            maxlength="200"
              :placeholder="$t('todo.placeholder')"
            :disabled="submitting"
            @input="updateTodoInput"
          />
          <ui5-button icon="add" design="Emphasized" type="Submit" :disabled="submitting">
            {{ $t('todo.add') }}
          </ui5-button>
        </form>

        <ui5-message-strip v-if="error" design="Negative" hide-close-button>
          {{ error }}
        </ui5-message-strip>

        <div v-else-if="loading" class="loading-wrap">
          <ui5-busy-indicator active size="Medium"></ui5-busy-indicator>
          <span>{{ $t('todo.loading') }}</span>
        </div>

        <ui5-list v-else separators="Inner" class="todo-list">
          <ui5-li-custom v-for="(todo, index) in sortedTodos" :key="todo.id">
            <div
              class="todo-row"
              :class="{ 'todo-row--dragging': dragIndex === index, 'todo-row--drag-over': dragOverIndex === index }"
              draggable="true"
              @dragstart="onDragStart(index)"
              @dragover.prevent="dragOverIndex = index"
              @drop.prevent="onDrop(index)"
              @dragend="onDragEnd"
            >
              <ui5-icon name="vertical-grip" class="todo-drag-handle" />
              <label class="todo-label">
                <ui5-checkbox :checked="todo.completed" @change="toggleTodo(todo)"></ui5-checkbox>
                <span :class="{ done: todo.completed }">{{ todo.text }}</span>
              </label>
              <ui5-icon v-if="dragIndex === index" name="menu2" class="todo-dragging-icon" />
              <template v-else>
                <ui5-button
                  class="todo-important-btn"
                  :class="{ 'todo-important-btn--active': todo.important }"
                  design="Transparent"
                  icon="flag"
                  @click.stop="toggleImportant(todo, $event)"
                />
                <ui5-button class="todo-delete-btn" design="Transparent" icon="delete" @click="deleteItem(todo.id)" />
              </template>
            </div>
          </ui5-li-custom>
        </ui5-list>
      </article>
    </section>
  </main>
</template>
