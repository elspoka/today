export function formatDueDate(value) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(date);
}

export function getDueDateState(value) {
  if (!value) return { isOverdue: false, isToday: false, label: "" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) return { isOverdue: false, isToday: false, label: "" };

  if (dueDate < today) {
    return { isOverdue: true, isToday: false, label: "Overdue" };
  }

  if (dueDate.getTime() === today.getTime()) {
    return { isOverdue: false, isToday: true, label: "Due today" };
  }

  return { isOverdue: false, isToday: false, label: "" };
}
