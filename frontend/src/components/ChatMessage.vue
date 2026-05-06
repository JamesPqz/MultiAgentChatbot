<template>
    <div :class="['message', message.role]">
        <div class="message-avatar">{{ isUser ? 'You' : 'AI' }}</div>
        <div class="message-content">{{ message.content }}</div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ChatMessage } from '../types';

const props = defineProps<{ message: ChatMessage }>();
const isUser = computed(() => props.message.role === 'user');
</script>

<style scoped>
.message {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 15px;
}

.message.user {
    flex-direction: row-reverse;
}

.message-avatar {
    width: 35px;
    height: 35px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    background: #e0e0e0;
    flex-shrink: 0;
}

.message.user .message-avatar {
    background: #667eea;
    color: white;
}

.message.assistant .message-avatar {
    background: #764ba2;
    color: white;
}

.message-content {
    max-width: 70%;
    padding: 12px 16px;
    border-radius: 15px;
    word-wrap: break-word;
}

.message.user .message-content {
    background: #667eea;
    color: white;
    border-bottom-right-radius: 5px;
}

.message.assistant .message-content {
    background: white;
    color: #333;
    border-bottom-left-radius: 5px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
</style>