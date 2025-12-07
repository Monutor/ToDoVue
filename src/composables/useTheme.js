import { ref, watch, onMounted } from 'vue'

const THEME_KEY = 'todo-theme'
const DARK_THEME_CLASS = 'dark-theme'

export function useTheme() {
  const isDark = ref(false)

  // Загружаем тему из localStorage
  const loadTheme = () => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY)
      if (savedTheme) {
        isDark.value = savedTheme === 'dark'
      } else {
        // Проверяем системные настройки
        isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      applyTheme()
    } catch (error) {
      console.error('Ошибка при загрузке темы:', error)
    }
  }

  // Применяем тему к документу
  const applyTheme = () => {
    if (isDark.value) {
      document.documentElement.classList.add(DARK_THEME_CLASS)
    } else {
      document.documentElement.classList.remove(DARK_THEME_CLASS)
    }
  }

  // Переключаем тему
  const toggleTheme = () => {
    isDark.value = !isDark.value
    try {
      localStorage.setItem(THEME_KEY, isDark.value ? 'dark' : 'light')
    } catch (error) {
      console.error('Ошибка при сохранении темы:', error)
    }
    applyTheme()
  }

  // Устанавливаем конкретную тему
  const setTheme = (dark) => {
    isDark.value = dark
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
    } catch (error) {
      console.error('Ошибка при сохранении темы:', error)
    }
    applyTheme()
  }

  // Следим за изменениями темы
  watch(isDark, () => {
    applyTheme()
  })

  // Загружаем тему при монтировании
  onMounted(() => {
    loadTheme()
  })

  return {
    isDark,
    toggleTheme,
    setTheme
  }
}

