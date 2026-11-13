import assert from 'node:assert/strict';
import test from 'node:test';
import { addTask, changeTask, readTasks, saveTasks } from '../public/tasks.mjs';

const storageKey = 'todo-list-ai.tasks.v1';

function memoryStorage(initial = []) {
  const data = new Map(initial);
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}

test('trims task text, assigns its ID and keeps the original list intact', () => {
  const previous = [{ id: 'old', text: 'Первая задача', done: false }];
  assert.deepEqual(addTask(previous, '  Новая задача  ', 'new'), [
    { id: 'new', text: 'Новая задача', done: false },
    ...previous,
  ]);
  assert.equal(previous.length, 1);
});

test('rejects whitespace-only and excessively long tasks', () => {
  assert.throws(() => addTask([], ' \t ', 'id'), RangeError);
  assert.throws(() => addTask([], 'я'.repeat(161), 'id'), RangeError);
  assert.equal(addTask([], 'я'.repeat(160), 'id')[0].text.length, 160);
});

test('completes, reopens and removes the selected task by ID', () => {
  const original = addTask(addTask([], 'Задача', 'one'), 'Задача', 'two');
  const completed = changeTask(original, 'one', true);
  assert.equal(completed[1].done, true);
  assert.equal(completed[0].done, false);
  assert.equal(original[1].done, false);
  assert.deepEqual(changeTask(completed, 'one', false), original);
  assert.deepEqual(changeTask(completed, 'one', null), [original[0]]);
});

test('round-trips completion and deletion through browser storage', () => {
  const storage = memoryStorage();
  assert.deepEqual(readTasks(storage), []);
  const completed = changeTask(addTask([], 'Проверить сохранение', 'id'), 'id', true);
  saveTasks(storage, completed);
  assert.deepEqual(readTasks(storage), completed);
  saveTasks(storage, changeTask(completed, 'id', null));
  assert.deepEqual(readTasks(storage), []);
});

test('reports invalid JSON, malformed entries and duplicate IDs without overwriting them', () => {
  for (const value of ['{', '{}', '[null]', '[{"id":"a","text":" ","done":true}]',
    JSON.stringify([
      { id: 'same', text: 'Одна', done: false },
      { id: 'same', text: 'Другая', done: true },
    ]),
  ]) {
    const storage = memoryStorage([[storageKey, value]]);
    assert.throws(() => readTasks(storage));
    assert.equal(storage.getItem(storageKey), value);
  }
});

test('surfaces storage read and write errors to the caller', () => {
  const failure = new Error('Storage unavailable');
  const storage = {
    getItem() { throw failure; },
    setItem() { throw failure; },
  };
  assert.throws(() => readTasks(storage), failure);
  assert.throws(() => saveTasks(storage, []), failure);
});
