export const STORAGE_KEY = 'todo-list-ai.tasks.v1';
export const MAX_TASK_LENGTH = 160;

export function addTask(tasks, text, id) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MAX_TASK_LENGTH) {
    throw new RangeError('Invalid task length');
  }
  return [{ id, text: trimmed, done: false }, ...tasks];
}

export function changeTask(tasks, id, done) {
  if (done === null) return tasks.filter((task) => task.id !== id);
  return tasks.map((task) => task.id === id ? { ...task, done } : task);
}

export function readTasks(storage) {
  const value = storage.getItem(STORAGE_KEY);
  if (value === null) return [];
  const tasks = JSON.parse(value);
  if (!Array.isArray(tasks)) throw new TypeError('Invalid task list');

  const ids = new Set();
  for (const task of tasks) {
    if (!task || typeof task.id !== 'string' || !task.id || ids.has(task.id)
      || typeof task.text !== 'string' || !task.text.trim()
      || task.text.length > MAX_TASK_LENGTH || typeof task.done !== 'boolean') {
      throw new TypeError('Invalid task');
    }
    ids.add(task.id);
  }
  return tasks;
}

export function saveTasks(storage, tasks) {
  storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
