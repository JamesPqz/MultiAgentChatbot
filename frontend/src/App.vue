<template>
    <div class="app">
        <ChatContainer />
    </div>
</template>

<script setup lang="ts">
import ChatContainer from './components/ChatContainer.vue';
</script>

<style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
}

.app {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>
