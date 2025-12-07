<template>
  <div class="todo-view">
    <TodoList />
  </div>
</template>

<script setup>
import TodoList from '../components/TodoList.vue'
</script>

<style scoped>
.todo-view {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: background 0.3s;
}

:global(.dark-theme) .todo-view {
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
}
</style>

