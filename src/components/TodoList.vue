<template>
  <div class="todo-container">
    <!-- Шапка с переключателем темы -->
    <div class="todo-header">
      <div class="header-top">
        <h2>{{ t.appTitle }}</h2>
        <div class="header-controls">
          <select v-model="currentLocale" @change="setLocale(currentLocale)" class="locale-select" :title="t.lightTheme">
            <option v-for="loc in availableLocales" :key="loc.code" :value="loc.code">
              {{ loc.flag }} {{ loc.name }}
            </option>
          </select>
          <button @click="toggleTheme" class="theme-toggle" :title="isDark ? t.lightTheme : t.darkTheme">
            {{ isDark ? '☀️' : '🌙' }}
          </button>
        </div>
      </div>
      <div class="todos-stats">
        <span v-if="hasTodos" class="stat-item">
          {{ t.total }}: <strong>{{ todosCount }}</strong>
        </span>
        <span v-if="activeTodosCount > 0" class="stat-item">
          {{ t.active }}: <strong>{{ activeTodosCount }}</strong>
        </span>
        <span v-if="completedTodosCount > 0" class="stat-item">
          {{ t.completed }}: <strong>{{ completedTodosCount }}</strong>
        </span>
      </div>
    </div>

    <!-- Поиск задач с автодополнением -->
    <div v-if="hasTodos" class="search-section">
      <div class="search-wrapper">
        <input
          ref="searchInput"
          v-model="searchQuery"
          @input="handleSearchInput"
          @keydown="handleSearchKeydown"
          @focus="showSuggestions = true"
          @blur="handleSearchBlur"
          type="text"
          :placeholder="`🔍 ${t.searchPlaceholder}`"
          class="search-input"
        />
        <button
          v-if="searchQuery"
          @click="clearSearch"
          class="clear-search-button"
          :title="t.clearSearch"
        >
          ✕
        </button>
        <span v-if="searchQuery && !showSuggestions" class="search-results">
          {{ t.searchFound }}: {{ searchedTodos.length }}
        </span>
      </div>
      
      <!-- Выпадающий список с автодополнением -->
      <div
        v-if="showSuggestions && autocompleteSuggestions.length > 0"
        class="autocomplete-dropdown"
      >
        <div
          v-for="(suggestion, index) in autocompleteSuggestions"
          :key="`${suggestion.type}-${index}`"
          @click="selectSuggestion(suggestion)"
          @mouseenter="selectedSuggestionIndex = index"
          :class="['autocomplete-item', {
            'selected': selectedSuggestionIndex === index,
            'history': suggestion.type === 'history',
            'task': suggestion.type === 'task',
            'tag': suggestion.type === 'tag'
          }]"
        >
          <span class="suggestion-icon">
            {{ getSuggestionIcon(suggestion.type) }}
          </span>
          <span class="suggestion-text">{{ highlightSuggestion(suggestion.text) }}</span>
          <span class="suggestion-type">{{ t[`suggestion${suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}`] }}</span>
        </div>
      </div>
      
      <!-- История поисков -->
      <div
        v-if="showSuggestions && searchQuery === '' && searchHistory.length > 0"
        class="search-history"
      >
        <div class="search-history-header">
          <span>{{ t.recentSearches }}</span>
          <button @click="clearSearchHistory" class="clear-history-button" :title="t.clearHistory">
            {{ t.clearHistory }}
          </button>
        </div>
        <div
          v-for="(item, index) in searchHistory.slice(0, 5)"
          :key="index"
          @click="selectHistoryItem(item)"
          class="history-item"
        >
          <span class="history-icon">🕐</span>
          <span class="history-text">{{ item }}</span>
        </div>
      </div>
    </div>

    <!-- Управление тегами -->
    <div class="tags-section">
      <div class="tags-header">
        <h3>{{ t.tagsTitle }}</h3>
        <button @click="showTagForm = !showTagForm" class="toggle-tag-form-button">
          {{ showTagForm ? '✕' : '+' }} {{ showTagForm ? t.hideTagForm : t.createTag }}
        </button>
      </div>
      
      <!-- Форма создания тега -->
      <div v-if="showTagForm" class="tag-form">
        <input
          v-model="newTagName"
          @keyup.enter="handleCreateTag"
          type="text"
          :placeholder="t.tagNamePlaceholder"
          class="tag-input"
        />
        <input
          v-model="newTagColor"
          type="color"
          class="tag-color-input"
          title="Выберите цвет"
        />
        <button @click="handleCreateTag" class="create-tag-button">
          {{ t.addButton }}
        </button>
      </div>
      <p v-if="tagErrorMessage" class="error-message">{{ tagErrorMessage }}</p>

      <!-- Список тегов -->
      <div v-if="hasTags" class="tags-list">
        <div
          v-for="tag in tags"
          :key="tag.id"
          class="tag-item"
          :style="{ backgroundColor: tag.color + '20', borderColor: tag.color }"
        >
          <span
            class="tag-badge"
            :style="{ backgroundColor: tag.color }"
            @click="toggleTagFilter(tag.id)"
            :class="{ 'active': selectedTagFilter === tag.id }"
          >
            {{ tag.displayName }}
            <span class="tag-count">({{ getTagUsageCount(tag.id) }})</span>
          </span>
          <button
            @click="handleRemoveTag(tag.id)"
            class="remove-tag-button"
            title="Удалить тег"
          >
            ✕
          </button>
        </div>
      </div>
      <p v-else class="no-tags-message">{{ t.noTags }}</p>
    </div>

    <!-- Форма добавления задачи с приоритетом и тегами -->
    <div class="todo-form">
      <input
        v-model="newTodoText"
        @keyup.enter="handleAddTodo"
        @blur="clearError"
        type="text"
        :placeholder="t.newTaskPlaceholder"
        :class="['todo-input', { 'error': errorMessage }]"
      />
      <select v-model="newTodoPriority" class="priority-select">
        <option value="low">🟢 {{ t.priorityLow }}</option>
        <option value="medium">🟡 {{ t.priorityMedium }}</option>
        <option value="high">🔴 {{ t.priorityHigh }}</option>
      </select>
      <button @click="handleAddTodo" class="add-button">
        {{ t.addButton }}
      </button>
    </div>
    
    <!-- Выбор тегов для новой задачи -->
    <div v-if="hasTags" class="tags-selection">
      <span class="tags-selection-label">{{ t.tagsLabel }}:</span>
      <div class="tags-checkboxes">
        <label
          v-for="tag in tags"
          :key="tag.id"
          class="tag-checkbox-label"
        >
          <input
            type="checkbox"
            :value="tag.id"
            v-model="newTodoTags"
            class="tag-checkbox"
          />
          <span
            class="tag-checkbox-badge"
            :style="{ backgroundColor: tag.color }"
          >
            {{ tag.displayName }}
          </span>
        </label>
      </div>
    </div>
    
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

    <!-- Фильтры и сортировка -->
    <div v-if="hasTodos" class="controls-section">
      <div class="filters">
        <button
          v-for="filter in filters"
          :key="filter.value"
          @click="currentFilter = filter.value; selectedTagFilter = null"
          :class="['filter-button', { 'active': currentFilter === filter.value && !selectedTagFilter }]"
        >
          {{ filter.label }}
        </button>
        <button
          v-if="selectedTagFilter"
          @click="selectedTagFilter = null"
          class="filter-button active tag-filter-active"
        >
          Тег: {{ getTagById(selectedTagFilter)?.displayName }} ✕
        </button>
      </div>
      
      <div class="sort-section">
        <label class="sort-label">{{ t.sortLabel }}:</label>
        <select v-model="currentSort" @change="handleSort" class="sort-select">
          <option value="date-new">📅 {{ t.sortDateNew }}</option>
          <option value="date-old">📅 {{ t.sortDateOld }}</option>
          <option value="priority-high">⬆️ {{ t.sortPriorityHigh }}</option>
          <option value="priority-low">⬇️ {{ t.sortPriorityLow }}</option>
          <option value="alphabet-asc">🔤 {{ t.sortAlphabetAsc }}</option>
          <option value="alphabet-desc">🔤 {{ t.sortAlphabetDesc }}</option>
        </select>
      </div>
    </div>

    <!-- Список задач -->
    <TransitionGroup
      v-if="displayedTodos.length > 0"
      name="todo-list"
      tag="div"
      class="todos-list"
    >
      <div
        v-for="todo in displayedTodos"
        :key="todo.id"
        :class="['todo-item', `priority-${todo.priority}`, { 
          'completed': todo.completed,
          'dragging': draggedTodoId === todo.id,
          'drag-over': dragOverId === todo.id
        }]"
        :draggable="true"
        @dragstart="handleDragStart($event, todo.id)"
        @dragover.prevent="handleDragOver($event, todo.id)"
        @dragenter.prevent="handleDragEnter(todo.id)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, todo.id)"
        @dragend="handleDragEnd"
      >
        <!-- Чекбокс для отметки выполнения -->
        <input
          type="checkbox"
          :checked="todo.completed"
          @change="handleToggleTodo(todo.id)"
          class="todo-checkbox"
        />

        <!-- Индикатор приоритета -->
        <div :class="['priority-indicator', `priority-${todo.priority}`]"></div>

        <!-- Контент задачи -->
        <div class="todo-content" @dblclick="startEditing(todo)">
          <!-- Режим редактирования -->
          <div v-if="editingId === todo.id" class="edit-mode">
            <input
              v-model="editingText"
              @keyup.enter="saveEdit(todo.id)"
              @keyup.esc="cancelEdit"
              @blur="saveEdit(todo.id)"
              type="text"
              class="todo-edit-input"
              ref="editInput"
            />
            <div class="edit-controls">
              <select v-model="editingPriority" class="priority-select-small">
          <option value="low">🟢 {{ t.priorityLow }}</option>
          <option value="medium">🟡 {{ t.priorityMedium }}</option>
          <option value="high">🔴 {{ t.priorityHigh }}</option>
              </select>
              <div v-if="hasTags" class="edit-tags-selection">
                <span class="edit-tags-label">{{ t.tagsLabel }}:</span>
                <div class="edit-tags-checkboxes">
                  <label
                    v-for="tag in tags"
                    :key="tag.id"
                    class="tag-checkbox-label-small"
                  >
                    <input
                      type="checkbox"
                      :value="tag.id"
                      v-model="editingTags"
                      class="tag-checkbox-small"
                    />
                    <span
                      class="tag-checkbox-badge-small"
                      :style="{ backgroundColor: tag.color }"
                    >
                      {{ tag.displayName }}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <!-- Режим просмотра -->
          <template v-else>
            <p class="todo-text" v-html="highlightSearch(todo.text)"></p>
            <div class="todo-meta">
              <span class="todo-time">{{ todo.createdAtFormatted }}</span>
              <div v-if="getTodoTags(todo).length > 0" class="todo-tags">
                <span
                  v-for="tag in getTodoTags(todo)"
                  :key="tag.id"
                  class="todo-tag"
                  :style="{ backgroundColor: tag.color }"
                  @click.stop="toggleTagFilter(tag.id)"
                >
                  {{ tag.displayName }}
                </span>
              </div>
            </div>
          </template>
        </div>

        <!-- Кнопки действий -->
        <div class="todo-actions">
          <button
            v-if="editingId !== todo.id"
            @click="startEditing(todo)"
            class="edit-button"
            :title="t.editTask"
          >
            ✎
          </button>
          <button
            @click="handleRemoveTodo(todo.id)"
            class="remove-button"
            :title="t.deleteTask"
          >
            ✕
          </button>
        </div>
      </div>
    </TransitionGroup>

    <!-- Пустое состояние -->
    <div v-else class="empty-state">
      <p v-if="!hasTodos">
        {{ t.noTasks }}
      </p>
      <p v-else-if="searchQuery">
        {{ t.searchFound }}: "{{ searchQuery }}" - {{ t.noResults }}
      </p>
      <p v-else>
        {{ getEmptyMessage() }}
      </p>
    </div>

    <!-- Действия с задачами -->
    <div v-if="hasTodos" class="actions-section">
      <button
        v-if="hasCompletedTodos"
        @click="handleRemoveCompleted"
        class="action-button remove-completed-button"
      >
        {{ t.removeCompleted }} ({{ completedTodosCount }})
      </button>
      <button
        @click="handleClearAll"
        class="action-button clear-button"
      >
        {{ t.clearAll }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useTodosStore } from '../stores/todos'
import { useTheme } from '../composables/useTheme'
import { useI18n } from '../composables/useI18n'
import { storeToRefs } from 'pinia'

const todosStore = useTodosStore()
const { isDark, toggleTheme } = useTheme()
const { t, translate, locale, currentLocale, setLocale, availableLocales } = useI18n()

const { 
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
  searchHistory
} = storeToRefs(todosStore)

const newTodoText = ref('')
const newTodoPriority = ref('medium')
const newTodoTags = ref([])
const errorMessage = ref('')
const currentFilter = ref('all')
const currentSort = ref('date-new')
const searchQuery = ref('')
const selectedTagFilter = ref(null)

// Автодополнение
const showSuggestions = ref(false)
const autocompleteSuggestions = ref([])
const selectedSuggestionIndex = ref(-1)
const searchInput = ref(null)
const editingId = ref(null)
const editingText = ref('')
const editingPriority = ref('medium')
const editingTags = ref([])
const editInput = ref(null)

// Управление тегами
const showTagForm = ref(false)
const newTagName = ref('')
const newTagColor = ref('#3498db')
const tagErrorMessage = ref('')

// Drag & Drop состояние
const draggedTodoId = ref(null)
const dragOverId = ref(null)

const filters = computed(() => [
  { value: 'all', label: t.value.filterAll },
  { value: 'active', label: t.value.filterActive },
  { value: 'completed', label: t.value.filterCompleted }
])

// Фильтрация задач по статусу и тегам
const filteredTodos = computed(() => {
  let result
  switch (currentFilter.value) {
    case 'active':
      result = activeTodos.value
      break
    case 'completed':
      result = completedTodos.value
      break
    default:
      result = todos.value
  }
  
  // Фильтрация по тегу
  if (selectedTagFilter.value) {
    result = result.filter(todo => 
      todo.tags && todo.tags.includes(selectedTagFilter.value)
    )
  }
  
  // Сортируем по порядку (order)
  return result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
})

// Поиск задач
const searchedTodos = computed(() => {
  if (!searchQuery.value.trim()) {
    return filteredTodos.value
  }
  
  const query = searchQuery.value.toLowerCase().trim()
  return filteredTodos.value.filter(todo => 
    todo.text.toLowerCase().includes(query)
  )
})

// Обработчики поиска с автодополнением
const handleSearchInput = () => {
  if (searchQuery.value.trim()) {
    autocompleteSuggestions.value = todosStore.getAutocompleteSuggestions(searchQuery.value)
    selectedSuggestionIndex.value = -1
  } else {
    autocompleteSuggestions.value = []
  }
}

const handleSearchKeydown = (event) => {
  if (event.key === 'Escape') {
    showSuggestions.value = false
    return
  }
  
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (autocompleteSuggestions.value.length > 0) {
      selectedSuggestionIndex.value = Math.min(
        selectedSuggestionIndex.value + 1,
        autocompleteSuggestions.value.length - 1
      )
    }
    return
  }
  
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedSuggestionIndex.value = Math.max(selectedSuggestionIndex.value - 1, -1)
    return
  }
  
  if (event.key === 'Enter') {
    if (selectedSuggestionIndex.value >= 0) {
      event.preventDefault()
      const suggestion = autocompleteSuggestions.value[selectedSuggestionIndex.value]
      if (suggestion) {
        selectSuggestion(suggestion)
      }
    } else if (searchQuery.value.trim()) {
      // Сохраняем текущий запрос в историю при нажатии Enter
      todosStore.addToSearchHistory(searchQuery.value)
      showSuggestions.value = false
    }
    return
  }
  
  // Ctrl+F для фокуса на поиске
  if (event.ctrlKey && event.key === 'f') {
    event.preventDefault()
    if (searchInput.value) {
      searchInput.value.focus()
      showSuggestions.value = true
    }
  }
}

const handleSearchBlur = () => {
  // Задержка для обработки клика по подсказке
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

const selectSuggestion = (suggestion) => {
  searchQuery.value = suggestion.text
  showSuggestions.value = false
  
  // Если это тег, применяем фильтр по тегу
  if (suggestion.type === 'tag' && suggestion.tagId) {
    toggleTagFilter(suggestion.tagId)
  }
  
  // Если это задача, можно добавить логику для перехода к задаче
  if (suggestion.type === 'task' && suggestion.todoId) {
    // Можно добавить прокрутку к задаче
  }
  
  // Сохраняем в историю
  todosStore.addToSearchHistory(suggestion.text)
  
  // Фокус на поле поиска
  if (searchInput.value) {
    searchInput.value.focus()
  }
}

const selectHistoryItem = (item) => {
  searchQuery.value = item
  showSuggestions.value = false
  if (searchInput.value) {
    searchInput.value.focus()
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  autocompleteSuggestions.value = []
  showSuggestions.value = false
  if (searchInput.value) {
    searchInput.value.focus()
  }
}

const clearSearchHistory = () => {
  if (confirm(t.value.confirmClearHistory)) {
    todosStore.clearSearchHistory()
  }
}

const getSuggestionIcon = (type) => {
  switch (type) {
    case 'history':
      return '🕐'
    case 'task':
      return '📝'
    case 'tag':
      return '🏷️'
    default:
      return '🔍'
  }
}

const getSuggestionTypeLabel = (type) => {
  const key = `suggestion${type.charAt(0).toUpperCase() + type.slice(1)}`
  return t.value[key] || ''
}

const highlightSuggestion = (text) => {
  if (!searchQuery.value.trim()) return text
  
  const query = searchQuery.value.trim()
  const regex = new RegExp(`(${query})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

// Горячие клавиши
const handleKeydown = (event) => {
  // Ctrl+F для фокуса на поиске
  if (event.ctrlKey && event.key === 'f') {
    event.preventDefault()
    if (searchInput.value) {
      searchInput.value.focus()
      showSuggestions.value = true
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Отображаемые задачи (после поиска)
const displayedTodos = computed(() => {
  return searchedTodos.value
})

// Подсветка найденного текста
const highlightSearch = (text) => {
  if (!searchQuery.value.trim()) {
    return text
  }
  
  const query = searchQuery.value.trim()
  const regex = new RegExp(`(${query})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

const handleAddTodo = () => {
  errorMessage.value = ''
  
  if (!newTodoText.value.trim()) {
    errorMessage.value = t.value.errorEmptyTask
    return
  }

  const success = todosStore.addTodo(newTodoText.value, newTodoPriority.value, newTodoTags.value)
  if (success) {
    newTodoText.value = ''
    newTodoPriority.value = 'medium'
    newTodoTags.value = []
  } else {
    errorMessage.value = t.value.errorAddTask
  }
}

const clearError = () => {
  setTimeout(() => {
    errorMessage.value = ''
  }, 3000)
}

const handleSort = () => {
  todosStore.sortTodos(currentSort.value)
}

const handleToggleTodo = (id) => {
  todosStore.toggleTodo(id)
}

const startEditing = async (todo) => {
  editingId.value = todo.id
  editingText.value = todo.text
  editingPriority.value = todo.priority || 'medium'
  editingTags.value = todo.tags ? [...todo.tags] : []
  
  await nextTick()
  const input = Array.isArray(editInput.value) ? editInput.value[0] : editInput.value
  if (input) {
    input.focus()
    input.select()
  }
}

const saveEdit = (id) => {
  if (editingText.value.trim()) {
    todosStore.updateTodo(id, editingText.value, editingPriority.value, editingTags.value)
  }
  cancelEdit()
}

const cancelEdit = () => {
  editingId.value = null
  editingText.value = ''
  editingPriority.value = 'medium'
  editingTags.value = []
}

const handleRemoveTodo = (id) => {
  todosStore.removeTodo(id)
  if (editingId.value === id) {
    cancelEdit()
  }
}

const handleRemoveCompleted = () => {
  if (confirm(translate('confirmRemoveCompleted', { count: completedTodosCount.value }))) {
    todosStore.removeCompletedTodos()
  }
}

const handleClearAll = () => {
  if (confirm(t.value.confirmClearAll)) {
    todosStore.clearAllTodos()
    cancelEdit()
  }
}

const getEmptyMessage = () => {
  if (selectedTagFilter.value) {
    return `${t.noTasksWithTag} "${getTagById(selectedTagFilter.value)?.displayName}".`
  }
  switch (currentFilter.value) {
    case 'active':
      return t.noActiveTasks
    case 'completed':
      return t.noCompletedTasks
    default:
      return t.noTasks
  }
}

// Функции для работы с тегами
const handleCreateTag = () => {
  tagErrorMessage.value = ''
  
  if (!newTagName.value.trim()) {
    tagErrorMessage.value = t.value.errorEmptyTag
    return
  }

  const success = todosStore.createTag(newTagName.value, newTagColor.value)
  if (success) {
    newTagName.value = ''
    newTagColor.value = '#3498db'
    showTagForm.value = false
  } else {
    tagErrorMessage.value = t.value.errorTagExists
  }
}

const handleRemoveTag = (id) => {
  const tag = todosStore.getTagById(id)
  if (tag && confirm(translate('confirmRemoveTag', { name: tag.displayName }))) {
    todosStore.removeTag(id)
    if (selectedTagFilter.value === id) {
      selectedTagFilter.value = null
    }
  }
}

const toggleTagFilter = (tagId) => {
  if (selectedTagFilter.value === tagId) {
    selectedTagFilter.value = null
  } else {
    selectedTagFilter.value = tagId
    currentFilter.value = 'all'
  }
}

const getTagById = (id) => {
  return todosStore.getTagById(id)
}

const getTodoTags = (todo) => {
  return todosStore.getTodoTags(todo)
}

const getTagUsageCount = (tagId) => {
  return todos.value.filter(todo => 
    todo.tags && todo.tags.includes(tagId)
  ).length
}

// Drag & Drop обработчики
const handleDragStart = (event, todoId) => {
  draggedTodoId.value = todoId
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', todoId.toString())
  
  // Добавляем визуальный эффект
  if (event.target) {
    event.target.style.opacity = '0.5'
  }
}

const handleDragOver = (event, todoId) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  
  if (draggedTodoId.value !== todoId) {
    dragOverId.value = todoId
  }
}

const handleDragEnter = (todoId) => {
  if (draggedTodoId.value !== todoId) {
    dragOverId.value = todoId
  }
}

const handleDragLeave = () => {
  // Не очищаем dragOverId здесь, чтобы избежать мерцания
  // Очистим в handleDrop или handleDragEnd
}

const handleDrop = (event, targetTodoId) => {
  event.preventDefault()
  
  if (draggedTodoId.value && draggedTodoId.value !== targetTodoId) {
    todosStore.reorderTodos(draggedTodoId.value, targetTodoId)
  }
  
  // Сбрасываем состояние
  dragOverId.value = null
  draggedTodoId.value = null
  
  // Восстанавливаем прозрачность
  if (event.target) {
    event.target.style.opacity = '1'
  }
}

const handleDragEnd = (event) => {
  // Сбрасываем состояние
  dragOverId.value = null
  draggedTodoId.value = null
  
  // Восстанавливаем прозрачность
  if (event.target) {
    event.target.style.opacity = '1'
  }
}
</script>

<style scoped>
.todo-container {
  max-width: 700px;
  margin: 0 auto;
  padding: 20px;
  transition: background-color 0.3s, color 0.3s;
}

.todo-header {
  margin-bottom: 30px;
  text-align: center;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.header-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.locale-select {
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  background: white;
  transition: border-color 0.3s;
  font-family: inherit;
}

.locale-select:focus {
  outline: none;
  border-color: #42b983;
}

.locale-select:hover {
  border-color: #42b983;
}

.todo-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 28px;
  flex: 1;
}

.theme-toggle {
  width: 40px;
  height: 40px;
  border: 2px solid #e0e0e0;
  border-radius: 50%;
  background: white;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle:hover {
  border-color: #42b983;
  transform: scale(1.1);
}

.todos-stats {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.stat-item {
  color: #7f8c8d;
  font-size: 14px;
}

.stat-item strong {
  color: #42b983;
  font-weight: 600;
}

.search-section {
  margin-bottom: 20px;
  position: relative;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  padding-right: 40px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #42b983;
}

.clear-search-button {
  position: absolute;
  right: 12px;
  width: 24px;
  height: 24px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  z-index: 1;
}

.clear-search-button:hover {
  background-color: #c0392b;
  transform: scale(1.1);
}

.search-results {
  color: #7f8c8d;
  font-size: 12px;
  white-space: nowrap;
}

/* Автодополнение */
.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
}

.autocomplete-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.autocomplete-item:last-child {
  border-bottom: none;
}

.autocomplete-item:hover,
.autocomplete-item.selected {
  background-color: #f8f9fa;
}

.autocomplete-item.history {
  border-left: 3px solid #3498db;
}

.autocomplete-item.task {
  border-left: 3px solid #2ecc71;
}

.autocomplete-item.tag {
  border-left: 3px solid #9b59b6;
}

.suggestion-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.suggestion-text {
  flex: 1;
  color: #2c3e50;
  font-size: 14px;
}

.suggestion-text :deep(mark) {
  background-color: #ffeb3b;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 600;
}

.suggestion-type {
  font-size: 11px;
  color: #7f8c8d;
  background-color: #f0f0f0;
  padding: 4px 8px;
  border-radius: 12px;
  white-space: nowrap;
}

/* История поисков */
.search-history {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 250px;
  overflow-y: auto;
}

.search-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 2px solid #f0f0f0;
  background-color: #f8f9fa;
  border-radius: 8px 8px 0 0;
}

.search-history-header span {
  font-size: 12px;
  font-weight: 600;
  color: #7f8c8d;
}

.clear-history-button {
  padding: 4px 8px;
  background-color: transparent;
  color: #e74c3c;
  border: 1px solid #e74c3c;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.3s;
}

.clear-history-button:hover {
  background-color: #e74c3c;
  color: white;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.history-item:last-child {
  border-bottom: none;
}

.history-item:hover {
  background-color: #f8f9fa;
}

.history-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.history-text {
  flex: 1;
  color: #2c3e50;
  font-size: 14px;
}

/* Стили для тегов */
.tags-section {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
}

.tags-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tags-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 18px;
}

.toggle-tag-form-button {
  padding: 6px 12px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.toggle-tag-form-button:hover {
  background-color: #35a372;
}

.tag-form {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.tag-input {
  flex: 1;
  min-width: 150px;
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.tag-input:focus {
  outline: none;
  border-color: #42b983;
}

.tag-color-input {
  width: 50px;
  height: 38px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.3s;
}

.tag-color-input:focus {
  outline: none;
  border-color: #42b983;
}

.create-tag-button {
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.create-tag-button:hover {
  background-color: #2980b9;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 2px solid;
  transition: transform 0.2s;
}

.tag-item:hover {
  transform: scale(1.05);
}

.tag-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tag-badge.active {
  box-shadow: 0 0 0 3px rgba(155, 89, 182, 0.3);
  transform: scale(1.1);
}

.tag-count {
  font-size: 10px;
  opacity: 0.9;
}

.remove-tag-button {
  width: 20px;
  height: 20px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  flex-shrink: 0;
}

.remove-tag-button:hover {
  background-color: #c0392b;
  transform: scale(1.1);
}

.no-tags-message {
  color: #7f8c8d;
  font-size: 14px;
  text-align: center;
  margin: 10px 0;
}

.tags-selection {
  margin-bottom: 15px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.tags-selection-label {
  display: block;
  margin-bottom: 8px;
  color: #7f8c8d;
  font-size: 14px;
  font-weight: 600;
}

.tags-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.tag-checkbox {
  display: none;
}

.tag-checkbox-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  transition: all 0.3s;
}

.tag-checkbox:checked + .tag-checkbox-badge {
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.3);
  transform: scale(1.1);
}

.tag-checkbox:not(:checked) + .tag-checkbox-badge {
  opacity: 0.7;
}

.todo-form {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.todo-input {
  flex: 1;
  min-width: 200px;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.todo-input:focus {
  outline: none;
  border-color: #42b983;
}

.todo-input.error {
  border-color: #e74c3c;
}

.priority-select {
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  background: white;
  transition: border-color 0.3s;
}

.priority-select:focus {
  outline: none;
  border-color: #42b983;
}

.error-message {
  margin: 0 0 20px 0;
  color: #e74c3c;
  font-size: 14px;
  text-align: center;
}

.add-button {
  padding: 12px 24px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.2s;
  white-space: nowrap;
}

.add-button:hover {
  background-color: #35a372;
}

.add-button:active {
  transform: scale(0.98);
}

.controls-section {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.filters {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.filter-button {
  padding: 8px 16px;
  background-color: #f8f9fa;
  color: #2c3e50;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-button:hover {
  border-color: #42b983;
  color: #42b983;
}

.filter-button.active {
  background-color: #42b983;
  color: white;
  border-color: #42b983;
}

.filter-button.tag-filter-active {
  background-color: #9b59b6;
  border-color: #9b59b6;
}

.sort-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sort-label {
  color: #7f8c8d;
  font-size: 14px;
}

.sort-select {
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  background: white;
  transition: border-color 0.3s;
}

.sort-select:focus {
  outline: none;
  border-color: #42b983;
}

.todos-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #42b983;
  transition: all 0.3s;
  position: relative;
}

.todo-item.priority-low {
  border-left-color: #27ae60;
}

.todo-item.priority-medium {
  border-left-color: #f39c12;
}

.todo-item.priority-high {
  border-left-color: #e74c3c;
}

.todo-item.completed {
  opacity: 0.7;
}

.todo-item.completed.priority-low {
  border-left-color: #95a5a6;
}

.todo-item.completed.priority-medium {
  border-left-color: #95a5a6;
}

.todo-item.completed.priority-high {
  border-left-color: #95a5a6;
}

.todo-item:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.todo-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
  transform: scale(0.95);
}

.todo-item.drag-over {
  border-top: 3px solid #42b983;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.3);
}

.todo-item[draggable="true"] {
  cursor: grab;
}

.todo-item[draggable="true"]:active {
  cursor: grabbing;
}

.priority-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.priority-indicator.priority-low {
  background-color: #27ae60;
}

.priority-indicator.priority-medium {
  background-color: #f39c12;
}

.priority-indicator.priority-high {
  background-color: #e74c3c;
}

.todo-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  flex-shrink: 0;
}

.todo-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
}

.todo-text {
  margin: 0;
  color: #2c3e50;
  font-size: 16px;
  word-break: break-word;
  transition: all 0.3s;
}

.todo-text :deep(mark) {
  background-color: #ffeb3b;
  padding: 2px 4px;
  border-radius: 3px;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  color: #95a5a6;
}

.todo-time {
  color: #7f8c8d;
  font-size: 12px;
}

.todo-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.todo-tag {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  white-space: nowrap;
}

.todo-tag:hover {
  transform: scale(1.1);
  opacity: 0.9;
}

.edit-mode {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.edit-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit-tags-selection {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.edit-tags-label {
  font-size: 12px;
  color: #7f8c8d;
  font-weight: 600;
}

.edit-tags-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-checkbox-label-small {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.tag-checkbox-small {
  display: none;
}

.tag-checkbox-badge-small {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  transition: opacity 0.2s;
}

.tag-checkbox-small:checked + .tag-checkbox-badge-small {
  opacity: 1;
  box-shadow: 0 0 0 2px #42b983;
}

.tag-checkbox-small:not(:checked) + .tag-checkbox-badge-small {
  opacity: 0.6;
}

.todo-edit-input {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #42b983;
  border-radius: 6px;
  font-size: 16px;
  font-family: inherit;
}

.todo-edit-input:focus {
  outline: none;
  border-color: #35a372;
}

.priority-select-small {
  padding: 6px 10px;
  border: 2px solid #42b983;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  background: white;
}

.priority-select-small:focus {
  outline: none;
  border-color: #35a372;
}

.todo-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.edit-button,
.remove-button {
  width: 32px;
  height: 32px;
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.edit-button {
  background-color: #3498db;
}

.edit-button:hover {
  background-color: #2980b9;
  transform: scale(1.1);
}

.remove-button {
  background-color: #e74c3c;
}

.remove-button:hover {
  background-color: #c0392b;
  transform: scale(1.1);
}

.edit-button:active,
.remove-button:active {
  transform: scale(0.95);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #7f8c8d;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
}

.actions-section {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
  flex-wrap: wrap;
}

.action-button {
  padding: 10px 20px;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.remove-completed-button {
  background-color: #f39c12;
}

.remove-completed-button:hover {
  background-color: #e67e22;
}

.clear-button {
  background-color: #e74c3c;
}

.clear-button:hover {
  background-color: #c0392b;
}

.action-button:active {
  transform: scale(0.98);
}

/* Анимации для списка задач */
.todo-list-enter-active,
.todo-list-leave-active {
  transition: all 0.3s ease;
}

.todo-list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.todo-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.todo-list-move {
  transition: transform 0.3s ease;
}

/* Темная тема */
:global(.dark-theme) .todo-container {
  background-color: transparent;
}

:global(.dark-theme) .todo-header h2 {
  color: #ecf0f1;
}

:global(.dark-theme) .theme-toggle {
  background: #34495e;
  border-color: #34495e;
  color: #ecf0f1;
}

:global(.dark-theme) .theme-toggle:hover {
  border-color: #42b983;
}

:global(.dark-theme) .stat-item {
  color: #bdc3c7;
}

:global(.dark-theme) .search-input,
:global(.dark-theme) .todo-input,
:global(.dark-theme) .priority-select,
:global(.dark-theme) .sort-select,
:global(.dark-theme) .locale-select {
  background-color: #34495e;
  border-color: #4a5568;
  color: #ecf0f1;
}

:global(.dark-theme) .search-input:focus,
:global(.dark-theme) .todo-input:focus,
:global(.dark-theme) .priority-select:focus,
:global(.dark-theme) .sort-select:focus,
:global(.dark-theme) .locale-select:focus {
  border-color: #42b983;
}

:global(.dark-theme) .filter-button {
  background-color: #34495e;
  border-color: #4a5568;
  color: #ecf0f1;
}

:global(.dark-theme) .filter-button:hover {
  border-color: #42b983;
  color: #42b983;
}

:global(.dark-theme) .filter-button.active {
  background-color: #42b983;
  color: white;
}

:global(.dark-theme) .todo-item {
  background-color: #2c3e50;
  border-left-color: #42b983;
}

:global(.dark-theme) .todo-item.priority-low {
  border-left-color: #27ae60;
}

:global(.dark-theme) .todo-item.priority-medium {
  border-left-color: #f39c12;
}

:global(.dark-theme) .todo-item.priority-high {
  border-left-color: #e74c3c;
}

:global(.dark-theme) .todo-text {
  color: #ecf0f1;
}

:global(.dark-theme) .todo-time {
  color: #95a5a6;
}

:global(.dark-theme) .todo-edit-input,
:global(.dark-theme) .priority-select-small {
  background-color: #34495e;
  border-color: #42b983;
  color: #ecf0f1;
}

:global(.dark-theme) .empty-state {
  color: #95a5a6;
}

:global(.dark-theme) .sort-label {
  color: #bdc3c7;
}

:global(.dark-theme) .search-results {
  color: #95a5a6;
}

:global(.dark-theme) .tags-section {
  background-color: #2c3e50;
  border-color: #4a5568;
}

:global(.dark-theme) .tags-header h3 {
  color: #ecf0f1;
}

:global(.dark-theme) .tag-input,
:global(.dark-theme) .tag-color-input {
  background-color: #34495e;
  border-color: #4a5568;
  color: #ecf0f1;
}

:global(.dark-theme) .tag-input:focus,
:global(.dark-theme) .tag-color-input:focus {
  border-color: #42b983;
}

:global(.dark-theme) .no-tags-message {
  color: #95a5a6;
}

:global(.dark-theme) .tags-selection {
  background-color: #2c3e50;
  border-color: #4a5568;
}

:global(.dark-theme) .tags-selection-label {
  color: #bdc3c7;
}

:global(.dark-theme) .edit-tags-label {
  color: #bdc3c7;
}

:global(.dark-theme) .autocomplete-dropdown,
:global(.dark-theme) .search-history {
  background-color: #2c3e50;
  border-color: #4a5568;
}

:global(.dark-theme) .autocomplete-item {
  border-bottom-color: #34495e;
}

:global(.dark-theme) .autocomplete-item:hover,
:global(.dark-theme) .autocomplete-item.selected {
  background-color: #34495e;
}

:global(.dark-theme) .suggestion-text {
  color: #ecf0f1;
}

:global(.dark-theme) .suggestion-type {
  background-color: #34495e;
  color: #bdc3c7;
}

:global(.dark-theme) .search-history-header {
  background-color: #34495e;
  border-bottom-color: #4a5568;
}

:global(.dark-theme) .search-history-header span {
  color: #bdc3c7;
}

:global(.dark-theme) .history-item {
  border-bottom-color: #34495e;
}

:global(.dark-theme) .history-item:hover {
  background-color: #34495e;
}

:global(.dark-theme) .history-text {
  color: #ecf0f1;
}
</style>
