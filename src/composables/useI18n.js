import { ref, computed, watch, onMounted } from 'vue'

const LOCALE_KEY = 'todo-locale'

// Переводы
const translations = {
  ru: {
    // Общие
    appTitle: 'Список задач',
    lightTheme: 'Светлая тема',
    darkTheme: 'Темная тема',
    
    // Статистика
    total: 'Всего',
    active: 'Активных',
    completed: 'Выполнено',
    
    // Поиск
    searchPlaceholder: 'Поиск задач... (Ctrl+F)',
    searchFound: 'Найдено',
    noResults: 'ничего не найдено',
    recentSearches: 'Недавние поиски',
    clearHistory: 'Очистить',
    clearSearch: 'Очистить поиск',
    suggestionHistory: 'История',
    suggestionTask: 'Задача',
    suggestionTag: 'Тег',
    
    // Форма задачи
    newTaskPlaceholder: 'Введите новую задачу...',
    addButton: 'Добавить',
    priorityLow: 'Низкий',
    priorityMedium: 'Средний',
    priorityHigh: 'Высокий',
    tagsLabel: 'Теги',
    
    // Теги
    tagsTitle: 'Теги / Категории',
    createTag: 'Создать тег',
    hideTagForm: 'Скрыть',
    tagNamePlaceholder: 'Название тега...',
    noTags: 'Нет тегов. Создайте первый тег выше.',
    
    // Фильтры
    filterAll: 'Все',
    filterActive: 'Активные',
    filterCompleted: 'Выполненные',
    
    // Сортировка
    sortLabel: 'Сортировка',
    sortDateNew: 'Новые сначала',
    sortDateOld: 'Старые сначала',
    sortPriorityHigh: 'По приоритету (высокий)',
    sortPriorityLow: 'По приоритету (низкий)',
    sortAlphabetAsc: 'А-Я',
    sortAlphabetDesc: 'Я-А',
    
    // Задачи
    editTask: 'Редактировать',
    deleteTask: 'Удалить задачу',
    noTasks: 'Нет задач. Добавьте новую задачу выше.',
    noActiveTasks: 'Нет активных задач. Все задачи выполнены!',
    noCompletedTasks: 'Нет выполненных задач.',
    noTasksWithTag: 'Нет задач с тегом',
    
    // Действия
    removeCompleted: 'Удалить выполненные',
    clearAll: 'Очистить все',
    confirmRemoveCompleted: 'Вы уверены, что хотите удалить {count} выполненных задач?',
    confirmClearAll: 'Вы уверены, что хотите удалить все задачи?',
    confirmRemoveTag: 'Удалить тег "{name}"? Все задачи с этим тегом потеряют его.',
    confirmClearHistory: 'Очистить историю поисков?',
    
    // Ошибки
    errorEmptyTask: 'Пожалуйста, введите текст задачи',
    errorAddTask: 'Не удалось добавить задачу',
    errorEmptyTag: 'Пожалуйста, введите название тега',
    errorTagExists: 'Тег с таким названием уже существует',
    
    // Время
    createdAt: 'Создано'
  },
  en: {
    // General
    appTitle: 'Todo List',
    lightTheme: 'Light theme',
    darkTheme: 'Dark theme',
    
    // Statistics
    total: 'Total',
    active: 'Active',
    completed: 'Completed',
    
    // Search
    searchPlaceholder: 'Search tasks... (Ctrl+F)',
    searchFound: 'Found',
    noResults: 'nothing found',
    recentSearches: 'Recent searches',
    clearHistory: 'Clear',
    clearSearch: 'Clear search',
    suggestionHistory: 'History',
    suggestionTask: 'Task',
    suggestionTag: 'Tag',
    
    // Task form
    newTaskPlaceholder: 'Enter new task...',
    addButton: 'Add',
    priorityLow: 'Low',
    priorityMedium: 'Medium',
    priorityHigh: 'High',
    tagsLabel: 'Tags',
    
    // Tags
    tagsTitle: 'Tags / Categories',
    createTag: 'Create tag',
    hideTagForm: 'Hide',
    tagNamePlaceholder: 'Tag name...',
    noTags: 'No tags. Create the first tag above.',
    
    // Filters
    filterAll: 'All',
    filterActive: 'Active',
    filterCompleted: 'Completed',
    
    // Sort
    sortLabel: 'Sort',
    sortDateNew: 'New first',
    sortDateOld: 'Old first',
    sortPriorityHigh: 'By priority (high)',
    sortPriorityLow: 'By priority (low)',
    sortAlphabetAsc: 'A-Z',
    sortAlphabetDesc: 'Z-A',
    
    // Tasks
    editTask: 'Edit',
    deleteTask: 'Delete task',
    noTasks: 'No tasks. Add a new task above.',
    noActiveTasks: 'No active tasks. All tasks completed!',
    noCompletedTasks: 'No completed tasks.',
    noTasksWithTag: 'No tasks with tag',
    
    // Actions
    removeCompleted: 'Remove completed',
    clearAll: 'Clear all',
    confirmRemoveCompleted: 'Are you sure you want to delete {count} completed tasks?',
    confirmClearAll: 'Are you sure you want to delete all tasks?',
    confirmRemoveTag: 'Delete tag "{name}"? All tasks with this tag will lose it.',
    confirmClearHistory: 'Clear search history?',
    
    // Errors
    errorEmptyTask: 'Please enter task text',
    errorAddTask: 'Failed to add task',
    errorEmptyTag: 'Please enter tag name',
    errorTagExists: 'Tag with this name already exists',
    
    // Time
    createdAt: 'Created'
  }
}

export function useI18n() {
  // Загружаем язык из localStorage или определяем по умолчанию
  const loadLocale = () => {
    try {
      const saved = localStorage.getItem(LOCALE_KEY)
      if (saved && translations[saved]) {
        return saved
      }
      // Определяем язык браузера
      const browserLang = navigator.language.split('-')[0]
      return translations[browserLang] ? browserLang : 'ru'
    } catch (error) {
      console.error('Ошибка при загрузке языка:', error)
      return 'ru'
    }
  }

  const locale = ref(loadLocale())

  // Сохраняем язык в localStorage
  const saveLocale = (newLocale) => {
    try {
      localStorage.setItem(LOCALE_KEY, newLocale)
    } catch (error) {
      console.error('Ошибка при сохранении языка:', error)
    }
  }

  // Текущие переводы
  const t = computed(() => {
    return translations[locale.value] || translations.ru
  })

  // Функция перевода с поддержкой параметров
  const translate = (key, params = {}) => {
    let text = t.value[key] || key
    
    // Заменяем параметры в формате {param}
    if (params) {
      Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param])
      })
    }
    
    return text
  }

  // Установка языка
  const setLocale = (newLocale) => {
    if (translations[newLocale]) {
      locale.value = newLocale
      saveLocale(newLocale)
    }
  }

  // Переключение языка
  const toggleLocale = () => {
    const newLocale = locale.value === 'ru' ? 'en' : 'ru'
    setLocale(newLocale)
  }

  // Доступные языки
  const availableLocales = [
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇬🇧' }
  ]

  // Следим за изменениями языка
  watch(locale, (newLocale) => {
    saveLocale(newLocale)
  })

  // Computed для текущего языка (для v-model)
  const currentLocale = computed({
    get: () => locale.value,
    set: (value) => setLocale(value)
  })

  return {
    locale,
    currentLocale,
    t,
    translate,
    setLocale,
    toggleLocale,
    availableLocales
  }
}

