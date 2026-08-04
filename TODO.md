# To-Day — Backlog

## In progress / done
- [x] Native list select (mobile-friendly)
- [x] Mobile touch drag-and-drop reorder
- [x] Swipe right to complete, swipe left to delete (mobile)
- [x] Real-time sync via Supabase subscriptions
- [x] Per-notification dismiss button
- [x] Dark mode toggle (SAP Horizon Dark theme)
- [x] Keyboard shortcuts: Enter to add todo, Escape to clear input

## Planned

### Due dates
- Add optional `due_date` column to `todos` table
- Date picker in the todo creation form
- Visual indicator (red) for overdue tasks
- Sort/filter by due date option

### Search & filter
- Text filter bar above the todo list
- Filter by: completed, important, overdue
- Clear filter button

### PWA / offline support
- Service worker with background sync
- Cache todos locally (IndexedDB or localStorage)
- Queue mutations when offline, replay on reconnect
- Works well with existing Capacitor mobile setup

### Recurring todos
- Repeat options: daily, weekly, monthly, weekdays
- Auto-create next occurrence on completion
- Show recurrence indicator on todo row

### Notifications improvements
- Action buttons inside notifications (e.g. "View list")
- Mark individual notification as read without dismissing
- Notification categories / filters
