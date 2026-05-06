<template>
    <div class="chat-container">
        <div class="chat-header">
            <h1>AI Chatbot</h1>
        </div>

        <div class="chat-messages" ref="messagesContainer">
            <ChatMessage v-for="(msg, idx) in messages" :key="idx" :message="msg" />
            <div v-if="isTyping" class="message assistant">
                <div class="message-avatar">AI</div>
                <div class="message-content">
                    <div class="typing">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            </div>
            <div ref="messagesEnd" />
        </div>

        <ChatInput :isLoading="isLoading" @send="handleSend" />
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import ChatMessage from './ChatMessage.vue';
import ChatInput from './ChatInput.vue';
import { sendMessage } from '../services/api';
import type { ChatMessage as ChatMessageType } from '../types';

const messages = ref<ChatMessageType[]>([
    { role: 'assistant', content: 'Hello, I am AI assistant. Can I help you?"' }
]);
const isLoading = ref(false);
const isTyping = ref(false);
const sessionId = ref<string | null>(localStorage.getItem('sessionId'));
const messagesEnd = ref<HTMLElement | null>(null);
const messagesContainer = ref<HTMLElement | null>(null);

const scrollToBottom = () => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
    });
};

const handleSend = async (message: string, image: string | null) => {
    messages.value.push({ role: 'user', content: message || '[Image]' });
    scrollToBottom();

    isLoading.value = true;
    isTyping.value = true;

    try {
        const response = await sendMessage({ message, sessionId: sessionId.value, image });
        isTyping.value = false;
        messages.value.push({ role: 'assistant', content: response });

        if (!sessionId.value) {
            const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
            sessionId.value = newSessionId;
            localStorage.setItem('sessionId', newSessionId);
        }
        scrollToBottom();
    } catch (error) {
        isTyping.value = false;
        messages.value.push({ role: 'assistant', content: 'Error: ' + (error as Error).message });
        scrollToBottom();
    } finally {
        isLoading.value = false;
    }
};
</script>

<style scoped>
.chat-container {
    background: white;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    width: 800px;
    max-width: 90vw;
    min-width: 320px;
    height: 600px;
}

.chat-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    text-align: center;
}

.chat-header h1 {
    font-size: 1.5rem;
    margin-bottom: 5px;
}

.chat-header p {
    font-size: 0.8rem;
    opacity: 0.9;
}

.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #f5f5f5;
}

.typing {
    display: flex;
    gap: 4px;
    padding: 12px 16px;
}

.typing span {
    width: 8px;
    height: 8px;
    background: #999;
    border-radius: 50%;
    animation: typing 1.4s infinite ease-in-out;
}

.typing span:nth-child(1) { animation-delay: 0s; }
.typing span:nth-child(2) { animation-delay: 0.2s; }
.typing span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
    30% { transform: translateY(-10px); opacity: 1; }
}
</style>