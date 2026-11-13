import { addTask, changeTask, MAX_TASK_LENGTH, readTasks, saveTasks, STORAGE_KEY } from './tasks.mjs';

const form = document.querySelector('#task-form');
const input = document.querySelector('#task-input');
const inputError = document.querySelector('#input-error');
const storageNotice = document.querySelector('#storage-notice');
const list = document.querySelector('#task-list');
const template = document.querySelector('#task-template');
const filters = [...document.querySelectorAll('[data-filter]')];
const emptyState = document.querySelector('#empty-state');
const emptyTitle = document.querySelector('#empty-title');
const emptyDescription = document.querySelector('#empty-description');
const doneCount = document.querySelector('#done-count');
const totalCount = document.querySelector('#total-count');
const progress = document.querySelector('#progress');
const percentage = document.querySelector('#percentage');
const announcement = document.querySelector('#announcement');

let tasks = [];
let filter = 'all';
let storageReadable = true;
let hasUnsavedChanges = false;

const emptyMessages = {
  all: ['Пока нет задач', 'Добавьте первое дело в поле выше.'],
  active: ['Нет активных задач', 'Можно добавить новое дело или открыть все задачи.'],
  done: ['Пока нет выполненных задач', 'Отмеченные задачи появятся здесь.'],
};

function showStorageNotice(message = '') {
  storageNotice.hidden = !message;
  storageNotice.textContent = message;
}

function loadTasks() {
  try {
    tasks = readTasks(window.localStorage);
    storageReadable = true;
    showStorageNotice();
  } catch {
    storageReadable = false;
    showStorageNotice('Не удалось прочитать сохранённые задачи. Изменения будут доступны только до закрытия или перезагрузки страницы.');
  }
}

function updateTasks(next) {
  tasks = next;
  hasUnsavedChanges = true;
  if (storageReadable) {
    try {
      saveTasks(window.localStorage, tasks);
      hasUnsavedChanges = false;
      showStorageNotice();
    } catch {
      showStorageNotice('Не удалось сохранить изменения. Они могут потеряться при перезагрузке страницы.');
    }
  }
  render();
}

function visibleTasks() {
  if (filter === 'all') return tasks;
  return tasks.filter((task) => task.done === (filter === 'done'));
}

function render() {
  const visible = visibleTasks();
  const rows = document.createDocumentFragment();
  for (const task of visible) {
    const row = template.content.firstElementChild.cloneNode(true);
    row.dataset.id = task.id;
    row.querySelector('.task-check').checked = task.done;
    row.querySelector('.task-text').textContent = task.text;
    row.querySelector('.delete-button').setAttribute('aria-label', `Удалить задачу «${task.text}»`);
    rows.append(row);
  }
  list.replaceChildren(rows);
  emptyState.hidden = visible.length > 0;
  const [title, description] = emptyMessages[tasks.length ? filter : 'all'];
  emptyTitle.textContent = title;
  emptyDescription.textContent = description;

  const completed = tasks.filter((task) => task.done).length;
  const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  doneCount.textContent = completed;
  totalCount.textContent = tasks.length;
  percentage.textContent = `${percent}%`;
  progress.style.setProperty('--progress', `${percent}%`);
  progress.setAttribute('aria-valuenow', percent);
  for (const button of filters) {
    button.setAttribute('aria-pressed', button.dataset.filter === filter);
  }
}

function setInputError(message = '') {
  inputError.textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function updateRow(event, selector, done, message) {
  const control = event.target.closest(selector);
  if (!control) return;
  const row = control.closest('.task');
  const nextFocusIndex = [...list.children].indexOf(row);
  const hadFocus = document.activeElement === control;
  updateTasks(changeTask(tasks, row.dataset.id, done));
  announcement.textContent = message;

  if (hadFocus) {
    const replacement = [...list.children].find((item) => item.dataset.id === row.dataset.id);
    const neighbor = list.children[Math.min(nextFocusIndex, list.children.length - 1)];
    const target = (replacement ?? neighbor)?.querySelector(selector);
    (target ?? filters.find((button) => button.dataset.filter === filter)).focus();
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || text.length > MAX_TASK_LENGTH) {
    setInputError(text ? `Введите не больше ${MAX_TASK_LENGTH} символов.` : 'Введите название задачи.');
    input.focus();
    return;
  }

  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  if (filter === 'done') filter = 'all';
  updateTasks(addTask(tasks, text, id));
  setInputError();
  form.reset();
  input.focus();
  announcement.textContent = 'Задача добавлена.';
});

input.addEventListener('input', () => setInputError());
list.addEventListener('change', (event) => {
  const done = event.target.checked;
  updateRow(event, '.task-check', done, done ? 'Задача выполнена.' : 'Задача снова активна.');
});
list.addEventListener('click', (event) => {
  updateRow(event, '.delete-button', null, 'Задача удалена.');
});
for (const button of filters) {
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    render();
    announcement.textContent = `Задач в списке: ${list.childElementCount}.`;
  });
}

window.addEventListener('storage', (event) => {
  if ((event.key === STORAGE_KEY || event.key === null) && !hasUnsavedChanges) {
    loadTasks();
    render();
  }
});

const date = new Date();
const today = document.querySelector('#today');
const localDate = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
today.dateTime = localDate.map((part) => String(part).padStart(2, '0')).join('-');
today.textContent = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long', month: 'long', day: 'numeric',
}).format(date);

loadTasks();
render();
