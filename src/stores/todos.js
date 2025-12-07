import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// Утилита для форматирования времени
const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const useTodosStore = defineStore('todos', () => {
  // Загружаем задачи из localStorage с обработкой ошибок
  const loadTodosFromStorage = () => {
    try {
      const stored = localStorage.getItem('todos')
      if (!stored) return []
      
      const parsed = JSON.parse(stored)
      // Миграция старых задач без полей completed, priority, tags и order
      const migrated = parsed.map((todo, index) => ({
        ...todo,
        completed: todo.completed ?? false,
        priority: todo.priority ?? 'medium', // low, medium, high
        tags: todo.tags ?? [], // массив тегов
        order: todo.order ?? index, // порядок для drag & drop
        createdAtFormatted: todo.createdAtFormatted || formatDateTime(todo.createdAt)
      }))
      
      // Сортируем по order, если он есть
      return migrated.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    } catch (error) {
      console.error('Ошибка при загрузке задач из localStorage:', error)
      return []
    }
  }

  // Сохраняем задачи в localStorage с обработкой ошибок
  const saveTodosToStorage = (todos) => {
    try {
      localStorage.setItem('todos', JSON.stringify(todos))
    } catch (error) {
      console.error('Ошибка при сохранении задач в localStorage:', error)
      // Можно показать уведомление пользователю
    }
  }

  const todos = ref(loadTodosFromStorage())

  // Загружаем теги из localStorage
  const loadTagsFromStorage = () => {
    try {
      const stored = localStorage.getItem('tags')
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Ошибка при загрузке тегов из localStorage:', error)
      return []
    }
  }

  // Сохраняем теги в localStorage
  const saveTagsToStorage = (tags) => {
    try {
      localStorage.setItem('tags', JSON.stringify(tags))
    } catch (error) {
      console.error('Ошибка при сохранении тегов в localStorage:', error)
    }
  }

  const tags = ref(loadTagsFromStorage())

  // Загружаем историю поисков из localStorage
  const loadSearchHistoryFromStorage = () => {
    try {
      const stored = localStorage.getItem('searchHistory')
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Ошибка при загрузке истории поисков из localStorage:', error)
      return []
    }
  }

  // Сохраняем историю поисков в localStorage
  const saveSearchHistoryToStorage = (history) => {
    try {
      localStorage.setItem('searchHistory', JSON.stringify(history))
    } catch (error) {
      console.error('Ошибка при сохранении истории поисков в localStorage:', error)
    }
  }

  const searchHistory = ref(loadSearchHistoryFromStorage())
  const MAX_SEARCH_HISTORY = 10 // Максимальное количество записей в истории

  // Добавление поискового запроса в историю
  function addToSearchHistory(query) {
    if (!query || query.trim() === '') return
    
    const trimmedQuery = query.trim().toLowerCase()
    
    // Удаляем дубликаты
    const filtered = searchHistory.value.filter(item => item.toLowerCase() !== trimmedQuery)
    
    // Добавляем в начало
    filtered.unshift(trimmedQuery)
    
    // Ограничиваем размер истории
    searchHistory.value = filtered.slice(0, MAX_SEARCH_HISTORY)
    saveSearchHistoryToStorage(searchHistory.value)
  }

  // Очистка истории поисков
  function clearSearchHistory() {
    searchHistory.value = []
    saveSearchHistoryToStorage(searchHistory.value)
  }

  // Получение автодополнений на основе запроса
  function getAutocompleteSuggestions(query) {
    if (!query || query.trim() === '') return []
    
    const trimmedQuery = query.trim().toLowerCase()
    const suggestions = []
    
    // 1. Предложения из истории поисков
    const historyMatches = searchHistory.value
      .filter(item => item.includes(trimmedQuery) && item !== trimmedQuery)
      .slice(0, 3)
      .map(item => ({ text: item, type: 'history', source: 'history' }))
    
    suggestions.push(...historyMatches)
    
    // 2. Предложения из текста задач
    const taskMatches = todos.value
      .filter(todo => {
        const text = todo.text.toLowerCase()
        return text.includes(trimmedQuery) && text !== trimmedQuery
      })
      .slice(0, 5)
      .map(todo => ({
        text: todo.text,
        type: 'task',
        source: 'task',
        todoId: todo.id
      }))
    
    suggestions.push(...taskMatches)
    
    // 3. Предложения из тегов
    const tagMatches = tags.value
      .filter(tag => {
        const name = tag.displayName.toLowerCase()
        return name.includes(trimmedQuery) && name !== trimmedQuery
      })
      .slice(0, 3)
      .map(tag => ({
        text: tag.displayName,
        type: 'tag',
        source: 'tag',
        tagId: tag.id
      }))
    
    suggestions.push(...tagMatches)
    
    // Удаляем дубликаты и ограничиваем количество
    const unique = []
    const seen = new Set()
    
    for (const suggestion of suggestions) {
      const key = suggestion.text.toLowerCase()
      if (!seen.has(key) && unique.length < 8) {
        seen.add(key)
        unique.push(suggestion)
      }
    }
    
    return unique
  }

  // Getters
  const todosCount = computed(() => todos.value.length)
  
  const activeTodos = computed(() => 
    todos.value.filter(todo => !todo.completed)
  )
  
  const completedTodos = computed(() => 
    todos.value.filter(todo => todo.completed)
  )
  
  const activeTodosCount = computed(() => activeTodos.value.length)
  
  const completedTodosCount = computed(() => completedTodos.value.length)
  
  const hasTodos = computed(() => todos.value.length > 0)
  
  const hasCompletedTodos = computed(() => completedTodos.value.length > 0)

  // Добавление новой задачи
  function addTodo(text, priority = 'medium', selectedTags = []) {
    if (!text || text.trim() === '') {
      return false
    }

    // Определяем максимальный order
    const maxOrder = todos.value.length > 0 
      ? Math.max(...todos.value.map(t => t.order ?? 0))
      : -1

    const newTodo = {
      id: Date.now(),
      text: text.trim(),
      completed: false,
      priority: priority, // low, medium, high
      tags: selectedTags || [],
      order: maxOrder + 1, // порядок для drag & drop
      createdAt: new Date().toISOString(),
      createdAtFormatted: formatDateTime(new Date().toISOString())
    }

    todos.value.push(newTodo)
    saveTodosToStorage(todos.value)
    return true
  }

  // Переключение статуса выполнения задачи
  function toggleTodo(id) {
    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      todo.completed = !todo.completed
      saveTodosToStorage(todos.value)
    }
  }

  // Редактирование задачи
  function updateTodo(id, newText, priority = null, selectedTags = null) {
    if (!newText || newText.trim() === '') {
      return false
    }

    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      todo.text = newText.trim()
      if (priority !== null) {
        todo.priority = priority
      }
      if (selectedTags !== null) {
        todo.tags = selectedTags
      }
      saveTodosToStorage(todos.value)
      return true
    }
    return false
  }

  // Изменение приоритета задачи
  function updatePriority(id, priority) {
    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      todo.priority = priority
      saveTodosToStorage(todos.value)
    }
  }

  // Сортировка задач
  function sortTodos(sortBy) {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    
    switch (sortBy) {
      case 'date-new':
        todos.value.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        break
      case 'date-old':
        todos.value.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
      case 'priority-high':
        todos.value.sort((a, b) => {
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
          if (priorityDiff !== 0) return priorityDiff
          return new Date(b.createdAt) - new Date(a.createdAt)
        })
        break
      case 'priority-low':
        todos.value.sort((a, b) => {
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
          if (priorityDiff !== 0) return priorityDiff
          return new Date(b.createdAt) - new Date(a.createdAt)
        })
        break
      case 'alphabet-asc':
        todos.value.sort((a, b) => a.text.localeCompare(b.text, 'ru'))
        break
      case 'alphabet-desc':
        todos.value.sort((a, b) => b.text.localeCompare(a.text, 'ru'))
        break
      default:
        return
    }
    
    // Обновляем порядок после сортировки
    updateOrders()
    saveTodosToStorage(todos.value)
  }

  // Обновление порядка задач (для drag & drop)
  function updateOrders() {
    todos.value.forEach((todo, index) => {
      todo.order = index
    })
  }

  // Изменение порядка задачи (drag & drop)
  function reorderTodos(draggedId, targetId) {
    const draggedIndex = todos.value.findIndex(t => t.id === draggedId)
    const targetIndex = todos.value.findIndex(t => t.id === targetId)
    
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      return
    }

    // Перемещаем элемент
    const [draggedTodo] = todos.value.splice(draggedIndex, 1)
    todos.value.splice(targetIndex, 0, draggedTodo)
    
    // Обновляем порядок
    updateOrders()
    saveTodosToStorage(todos.value)
  }

  // Удаление задачи
  function removeTodo(id) {
    const index = todos.value.findIndex(todo => todo.id === id)
    if (index !== -1) {
      todos.value.splice(index, 1)
      saveTodosToStorage(todos.value)
    }
  }

  // Удаление всех выполненных задач
  function removeCompletedTodos() {
    todos.value = todos.value.filter(todo => !todo.completed)
    saveTodosToStorage(todos.value)
  }

  // Очистка всех задач
  function clearAllTodos() {
    todos.value = []
    saveTodosToStorage(todos.value)
  }

  // Работа с тегами
  function createTag(name, color = null) {
    if (!name || name.trim() === '') {
      return false
    }

    const trimmedName = name.trim().toLowerCase()
    
    // Проверяем, не существует ли уже такой тег
    if (tags.value.some(tag => tag.name.toLowerCase() === trimmedName)) {
      return false
    }

    // Генерируем цвет, если не указан
    const tagColor = color || generateTagColor(tags.value.length)
    
    const newTag = {
      id: Date.now(),
      name: trimmedName,
      displayName: name.trim(), // Оригинальное имя с регистром
      color: tagColor
    }

    tags.value.push(newTag)
    saveTagsToStorage(tags.value)
    return true
  }

  // Генерация цвета для тега
  function generateTagColor(index) {
    const colors = [
      '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
      '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b',
      '#2980b9', '#27ae60', '#d35400', '#8e44ad', '#f1c40f'
    ]
    return colors[index % colors.length]
  }

  function removeTag(id) {
    const index = tags.value.findIndex(tag => tag.id === id)
    if (index !== -1) {
      // Удаляем тег из всех задач
      todos.value.forEach(todo => {
        if (todo.tags) {
          todo.tags = todo.tags.filter(tagId => tagId !== id)
        }
      })
      tags.value.splice(index, 1)
      saveTagsToStorage(tags.value)
      saveTodosToStorage(todos.value)
    }
  }

  function updateTag(id, newName, newColor = null) {
    const tag = tags.value.find(t => t.id === id)
    if (tag) {
      const trimmedName = newName.trim().toLowerCase()
      // Проверяем, не существует ли уже такой тег (кроме текущего)
      if (tags.value.some(t => t.id !== id && t.name.toLowerCase() === trimmedName)) {
        return false
      }
      tag.name = trimmedName
      tag.displayName = newName.trim()
      if (newColor) {
        tag.color = newColor
      }
      saveTagsToStorage(tags.value)
      return true
    }
    return false
  }

  // Получить тег по ID
  function getTagById(id) {
    return tags.value.find(tag => tag.id === id)
  }

  // Получить все теги задачи
  function getTodoTags(todo) {
    if (!todo.tags || todo.tags.length === 0) return []
    return todo.tags.map(tagId => getTagById(tagId)).filter(Boolean)
  }

  // Computed для тегов
  const tagsCount = computed(() => tags.value.length)
  const hasTags = computed(() => tags.value.length > 0)

  return {
    todos,
    tags,
    todosCount,
    tagsCount,
    activeTodos,
    completedTodos,
    activeTodosCount,
    completedTodosCount,
    hasTodos,
    hasTags,
    hasCompletedTodos,
    addTodo,
    toggleTodo,
    updateTodo,
    updatePriority,
    removeTodo,
    removeCompletedTodos,
    clearAllTodos,
    sortTodos,
    createTag,
    removeTag,
    updateTag,
    getTagById,
    getTodoTags,
    reorderTodos,
    updateOrders,
    searchHistory,
    addToSearchHistory,
    clearSearchHistory,
    getAutocompleteSuggestions
  }
})

