<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { setTheme } from "@ui5/webcomponents-base/dist/config/Theme.js";
import { createTodo, fetchTodos, patchTodo, removeTodo } from "./services/todoApi.js";
import { fetchLists, createList, removeList, fetchListMembers, inviteToList, removeMember } from "./services/listApi.js";
import { authService, supabaseConfigError } from "./services/authService.js";
import { supabase } from "./providers/supabase.js";
import { fetchNotifications, markAllNotificationsRead, deleteNotification as deleteNotificationApi } from "./services/notificationApi.js";

const appVersion = __APP_VERSION__;
const { t, locale } = useI18n();

// Update these once you have hosted legal pages
const PRIVACY_POLICY_URL = "/privacy.html";
const TERMS_URL = "/terms.html";

const toastRef = ref(null);
const toastMessage = ref("");

function showToast(msg) {
  toastMessage.value = msg;
  nextTick(() => {
    if (toastRef.value) {
      toastRef.value.open = true;
    }
  });
}

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

const darkMode = ref(localStorage.getItem("darkMode") === "true");

function applyTheme() {
  setTheme(darkMode.value ? "sap_horizon_dark" : "sap_horizon");
}

function toggleDarkMode(event) {
  darkMode.value = event?.detail?.checked ?? !darkMode.value;
  localStorage.setItem("darkMode", String(darkMode.value));
  applyTheme();
}

// Swipe gesture state (mobile complete/delete)
const swipe = ref(null); // { id, startX, startY, dx, active }

function onSwipeTouchStart(e, todo) {
  if (e.target.closest(".todo-drag-handle")) return;
  const t = e.touches[0];
  swipe.value = { id: todo.id, startX: t.clientX, startY: t.clientY, dx: 0, active: false };
}

function onSwipeTouchMove(e) {
  if (!swipe.value) return;
  const t = e.touches[0];
  const dx = t.clientX - swipe.value.startX;
  const dy = t.clientY - swipe.value.startY;
  if (!swipe.value.active) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dy) > Math.abs(dx)) { swipe.value = null; return; }
    swipe.value = { ...swipe.value, active: true };
  }
  swipe.value = { ...swipe.value, dx };
}

function onSwipeTouchEnd() {
  if (!swipe.value?.active) { swipe.value = null; return; }
  const { id, dx } = swipe.value;
  swipe.value = null;
  if (dx > 80) {
    const todo = todos.value.find((t) => t.id === id);
    if (todo) toggleTodo(todo);
  } else if (dx < -80) {
    deleteItem(id);
  }
}

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
const profilePopoverRef = ref(null);
const notifPopoverRef = ref(null);

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
const activeList = computed(() => lists.value.find((l) => l.id === activeListId.value) ?? null);
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

async function onNotificationsClick(event) {
  profilePopoverRef.value?.close();
  if (notifPopoverRef.value?.open) {
    notifPopoverRef.value.close();
  } else {
    notifPopoverRef.value?.showAt(event.detail.targetRef);
    if (unreadCount.value > 0) {
      await markAllNotificationsRead();
      notifications.value = notifications.value.map((n) => ({ ...n, read: true }));
    }
  }
}

function onProfileClick(event) {
  notifPopoverRef.value?.close();
  if (profilePopoverRef.value?.open) {
    profilePopoverRef.value.close();
  } else {
    profilePopoverRef.value?.showAt(event.detail.targetRef);
  }
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

function onListSelectChange(event) {
  const value = event.target.value || null;
  selectList(value || null);
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
    showToast(t('toast.listCreated'));
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
    showToast(t('toast.listDeleted'));
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
    showToast(t('toast.inviteSent'));
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
    showToast(t('toast.todoAdded'));
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
    showToast(todo.important ? t('toast.todoFlagged') : t('toast.todoUnflagged'));
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
    showToast(todo.completed ? t('toast.todoCompleted') : t('toast.todoReopened'));
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

function onTouchStart(event, index) {
  event.preventDefault();
  dragIndex.value = index;
  dragOverIndex.value = index;
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd, { once: true });
}

function onTouchMove(event) {
  event.preventDefault();
  const touch = event.touches[0];
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  if (!el) return;
  const row = el.closest('[data-todo-index]');
  if (row) dragOverIndex.value = parseInt(row.dataset.todoIndex, 10);
}

function onTouchEnd() {
  document.removeEventListener('touchmove', onTouchMove);
  if (dragIndex.value !== null && dragOverIndex.value !== null) {
    onDrop(dragOverIndex.value);
  } else {
    dragIndex.value = null;
    dragOverIndex.value = null;
  }
}

async function deleteItem(todoId) {
  const previous = todos.value;
  todos.value = todos.value.filter((todo) => todo.id !== todoId);

  try {
    await removeTodo(todoId);
    showToast(t('toast.todoDeleted'));
  } catch (err) {
    todos.value = previous;
    error.value = err.message;
  }
}

async function removeNotification(id) {
  notifications.value = notifications.value.filter((n) => n.id !== id);
  try {
    await deleteNotificationApi(id);
    showToast(t('toast.notificationDeleted'));
  } catch {
    await loadNotifications();
  }
}

function mapDbTodo(row) {
  return {
    id: row.id,
    text: row.text,
    completed: row.completed,
    important: row.important ?? false,
    listId: row.list_id ?? null,
    createdAt: row.created_at,
  };
}

let realtimeChannel = null;

function subscribeToRealtime() {
  if (!supabase) return;
  realtimeChannel = supabase
    .channel("app-realtime")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
      loadNotifications();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "todos" }, (payload) => {
      if (payload.eventType === "INSERT") {
        const t = mapDbTodo(payload.new);
        const belongs = activeListId.value === null || t.listId === activeListId.value;
        if (belongs && !todos.value.find((x) => x.id === t.id)) todos.value = [t, ...todos.value];
      } else if (payload.eventType === "UPDATE") {
        const t = mapDbTodo(payload.new);
        todos.value = todos.value.map((x) => (x.id === t.id ? t : x));
      } else if (payload.eventType === "DELETE") {
        todos.value = todos.value.filter((x) => x.id !== payload.old.id);
      }
    })
    .subscribe();
}

function unsubscribeFromRealtime() {
  if (realtimeChannel) {
    supabase?.removeChannel(realtimeChannel);
    realtimeChannel = null;
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
  unsubscribeFromRealtime();
  await authService.signOut();
  todos.value = [];
  lists.value = [];
  notifications.value = [];
  activeListId.value = null;
  shareListId.value = null;
  shareMembers.value = [];

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
  applyTheme();

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
    subscribeToRealtime();
  }

  const {
    data: { subscription }
  } = authService.onAuthStateChange(async (_event, nextSession) => {
    session.value = nextSession;

    if (nextSession?.access_token) {
      await loadLists();
      await loadTodos();
      await loadNotifications();
      subscribeToRealtime();
    } else {
      todos.value = [];
      lists.value = [];
      notifications.value = [];
      unsubscribeFromRealtime();
    }
  });

  authSubscription = subscription;
});

onUnmounted(() => {
  authSubscription?.unsubscribe();
  unsubscribeFromRealtime();
});
</script>

<template>
  <main class="fiori-layout">
    <ui5-shellbar
      primary-title="To-Day"
      :secondary-title="'v' + appVersion"
      show-notifications
      :notifications-count="unreadCount > 0 ? String(unreadCount) : ''"
      @notifications-click="onNotificationsClick"
      @profile-click="onProfileClick"
    >
      <ui5-avatar slot="profile" size="XS" shape="Circle" color-scheme="Accent5">
        {{ userEmail ? userEmail[0].toUpperCase() : '?' }}
      </ui5-avatar>
    </ui5-shellbar>

    <!-- Profile popover -->
    <ui5-popover
      v-if="isAuthenticated"
      ref="profilePopoverRef"
      placement="Bottom"
      horizontal-align="End"
      hide-arrow
    >
      <div class="profile-popover-content">
        <div class="profile-popover-header">
          <div class="profile-avatar-large">{{ userEmail ? userEmail[0].toUpperCase() : '?' }}</div>
          <div class="profile-info">
            <span class="profile-email">{{ userEmail }}</span>
            <span class="profile-version">v{{ appVersion }}</span>
          </div>
        </div>
        <div class="profile-popover-divider"></div>
        <div class="profile-popover-item profile-popover-language">
          <ui5-icon name="globe" class="profile-popover-item-icon" />
          <ui5-select @change="updateLanguage">
            <ui5-option v-for="lang in languages" :key="lang.key" :value="lang.key" :selected="lang.key === locale">{{ lang.label }}</ui5-option>
          </ui5-select>
        </div>
        <div class="profile-popover-divider"></div>
        <div class="profile-popover-item profile-popover-switch-row">
          <ui5-icon :name="darkMode ? 'light-mode' : 'dark-mode'" class="profile-popover-item-icon" />
          <span class="profile-popover-switch-label">{{ darkMode ? $t('profile.lightMode') : $t('profile.darkMode') }}</span>
          <ui5-switch :checked="darkMode" @change="toggleDarkMode" />
        </div>
        <div class="profile-popover-divider"></div>
        <a :href="PRIVACY_POLICY_URL" target="_blank" rel="noopener noreferrer" class="profile-popover-item">
          <ui5-icon name="shield" class="profile-popover-item-icon" />
          {{ $t('profile.privacyPolicy') }}
        </a>
        <a :href="TERMS_URL" target="_blank" rel="noopener noreferrer" class="profile-popover-item">
          <ui5-icon name="document" class="profile-popover-item-icon" />
          {{ $t('profile.terms') }}
        </a>
        <div class="profile-popover-divider"></div>
        <button class="profile-popover-item profile-signout" @click="signOut">
          <ui5-icon name="log" class="profile-popover-item-icon" />
          {{ $t('profile.signOut') }}
        </button>
      </div>
    </ui5-popover>

    <!-- Notifications popover -->
    <ui5-popover
      v-if="isAuthenticated"
      ref="notifPopoverRef"
      placement="Bottom"
      horizontal-align="End"
      hide-arrow
    >
      <div class="notif-popover-content">
        <div v-if="notifications.length === 0" class="notif-popover-empty">
          {{ $t('notifications.empty') }}
        </div>
        <ui5-notification-list v-else>
          <ui5-notification-list-item
            v-for="n in notifications"
            :key="n.id"
            :title-text="n.message"
            :read="n.read"
            show-close
            wrapping-type="Normal"
            @close="removeNotification(n.id)"
          >{{ new Date(n.createdAt).toLocaleString() }}</ui5-notification-list-item>
        </ui5-notification-list>
      </div>
    </ui5-popover>

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
          <div class="todo-header-controls">
            <select class="list-select-compact" @change="onListSelectChange">
              <option value="" :selected="activeListId === null">{{ $t('todo.all') }}</option>
              <option
                v-for="list in lists"
                :key="list.id"
                :value="list.id"
                :selected="activeListId === list.id"
              >{{ list.name }}{{ !list.isOwner ? ' 👥' : '' }}</option>
            </select>
            <ui5-button
              v-if="activeListId && activeList?.isOwner !== false"
              design="Transparent"
              icon="collaborate"
              :title="$t('todo.shareList')"
              @click="openSharePanel(activeListId)"
            />
            <ui5-button
              v-if="activeListId && activeList?.isOwner !== false"
              design="Transparent"
              icon="delete"
              :title="$t('todo.deleteList')"
              @click="deleteList(activeListId)"
            />
            <ui5-button design="Transparent" icon="add" :title="$t('todo.newList')" @click="showNewListInput = true" />
          </div>
        </header>

        <!-- New list inline form -->
        <div v-if="showNewListInput" class="new-list-form">
          <ui5-input
            :value="newListName"
            :placeholder="$t('todo.listNamePlaceholder')"
            maxlength="100"
            @input="updateNewListName"
            @keydown.enter="addList"
            @keydown.escape="showNewListInput = false"
          />
          <div class="new-list-form-btns">
            <ui5-button design="Emphasized" :disabled="addingList" @click="addList">{{ $t('todo.add') }}</ui5-button>
            <ui5-button design="Transparent" @click="showNewListInput = false">{{ $t('todo.cancel') }}</ui5-button>
          </div>
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
            @keydown.enter="addTodo"
            @keydown.escape="inputValue = ''"
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
              class="todo-swipe-wrapper"
              @touchstart.passive="onSwipeTouchStart($event, todo)"
              @touchmove.passive="onSwipeTouchMove"
              @touchend="onSwipeTouchEnd"
            >
              <div v-if="swipe?.id === todo.id && swipe.dx > 20" class="todo-swipe-bg todo-swipe-bg--complete">✓</div>
              <div v-if="swipe?.id === todo.id && swipe.dx < -20" class="todo-swipe-bg todo-swipe-bg--delete">🗑</div>
              <div
                class="todo-row"
                :data-todo-index="index"
                :class="{ 'todo-row--dragging': dragIndex === index, 'todo-row--drag-over': dragOverIndex === index }"
                :style="swipe?.id === todo.id ? { transform: `translateX(${swipe.dx}px)`, transition: 'none', background: 'var(--sapList_Background)' } : {}"
                draggable="true"
                @dragstart="onDragStart(index)"
                @dragover.prevent="dragOverIndex = index"
                @drop.prevent="onDrop(index)"
                @dragend="onDragEnd"
              >
              <ui5-icon name="vertical-grip" class="todo-drag-handle" :title="$t('todo.dragToReorder')" @touchstart.prevent="onTouchStart($event, index)" />
              <label class="todo-label">
                <ui5-checkbox
                  :checked="todo.completed"
                  :accessible-name="todo.completed ? $t('todo.markIncomplete') : $t('todo.markComplete')"
                  :title="todo.completed ? $t('todo.markIncomplete') : $t('todo.markComplete')"
                  @change="toggleTodo(todo)"
                ></ui5-checkbox>
                <span :class="{ done: todo.completed }">{{ todo.text }}</span>
                <span v-if="activeListId === null && todo.listId" class="todo-list-badge">{{ lists.find(l => l.id === todo.listId)?.name }}</span>
              </label>
              <ui5-icon v-if="dragIndex === index" name="menu2" class="todo-dragging-icon" />
              <template v-else>
                <ui5-button
                  class="todo-important-btn"
                  :class="{ 'todo-important-btn--active': todo.important }"
                  design="Transparent"
                  icon="flag"
                  :title="todo.important ? $t('todo.removeImportant') : $t('todo.markImportant')"
                  @click.stop="toggleImportant(todo, $event)"
                />
                <ui5-button class="todo-delete-btn" design="Transparent" icon="delete" :title="$t('todo.deleteTodo')" @click="deleteItem(todo.id)" />
              </template>
            </div>
            </div>
          </ui5-li-custom>
        </ui5-list>
      </article>
    </section>
      <ui5-toast ref="toastRef" placement="BottomCenter" duration="2500">{{ toastMessage }}</ui5-toast>
  </main>
</template>
