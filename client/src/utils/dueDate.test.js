import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDueDate, getDueDateState } from './dueDate.js';

test('formatDueDate returns a readable label for a provided date', () => {
  assert.equal(formatDueDate('2026-08-08'), 'Aug 8');
});

test('getDueDateState flags an overdue date', () => {
  const today = new Date();
  const overdue = new Date(today);
  overdue.setDate(today.getDate() - 1);
  const value = overdue.toISOString().slice(0, 10);

  assert.deepEqual(getDueDateState(value), { isOverdue: true, isToday: false, label: 'Overdue' });
});

test('getDueDateState flags a date due today', () => {
  const today = new Date().toISOString().slice(0, 10);

  assert.deepEqual(getDueDateState(today), { isOverdue: false, isToday: true, label: 'Due today' });
});
