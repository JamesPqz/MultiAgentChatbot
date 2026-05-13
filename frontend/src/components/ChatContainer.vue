<template>
    <div class="chat-container">
        <ChatHeader 
            :sessionId="sessionId"
            :agentMode="agentMode"
            @update:sessionId="handleSessionChange"
            @update:agentMode="agentMode = $event"
            @refresh="loadHistory"
            @toggle-stats="showABStats = !showABStats"
            @clear-history="clearHistory"
        />

        <ABStatsPanel 
            :visible="showABStats"
            :loading="abLoading"
            :stats="abStats"
            @refresh="refreshABStats"
            @clear="clearABStatsHandler"
            @close="showABStats = false"
        />

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
            <InterruptConfirm 
                :visible="interruptVisible"
                :message="interruptMessage"
                @confirm="handleInterruptConfirm"
            />
            <div ref="messagesEnd" />
        </div>

        <ChatInput :isLoading="isLoading" @send="handleSend" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import ChatMessage from './ChatMessage.vue';
import ChatInput from './ChatInput.vue';
import ChatHeader from './ChatHeader.vue';
import ABStatsPanel from './ABStatsPanel.vue';
import InterruptConfirm from './InterruptConfirm.vue';
import { sendMessage, getABStats, clearABStats, getChatHistory, clearChatHistory, resumeInterrupt, sendMessageStream } from '../services/api';
import type { ChatMessage as ChatMessageType } from '../types';

const messages = ref<ChatMessageType[]>([
    { role: 'assistant', content: 'Hello, I am AI assistant. Can I help you?"' }
]);
const isLoading = ref(false);
const isTyping = ref(false);
const sessionId = ref<string | null>(localStorage.getItem('sessionId'));

const agentMode = ref<'single' | 'multi' | 'auto'>('multi');
watch(agentMode, (val) => {
    console.log('ChatContainer agentMode changed to:', val);
});

const showABStats = ref(false);
const abStats = ref({ total: 0, variantA: { count: 0, avgLatency: 0, avgResponseLength: 0 }, variantB: { count: 0, avgLatency: 0, avgResponseLength: 0 } });
const abLoading = ref(false);

const messagesEnd = ref<HTMLElement | null>(null);
const messagesContainer = ref<HTMLElement | null>(null);

// Interrupt
const interruptVisible = ref(false);
const interruptMessage = ref('');
const pendingSessionId = ref('');


const scrollToBottom = () => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
    });
};

const handleSend = async (message: string, image: string | null) => {
    if (!message && !image) return;

    messages.value.push({ role: 'user', content: message || '[Image]' });
    scrollToBottom();

    isLoading.value = true;
    isTyping.value = true;

    const tempIndex = messages.value.length;
    messages.value.push({ role: 'assistant', content: '' });
    try {
        if(image) {
            const data = await sendMessage({ message, sessionId: sessionId.value, image, agentMode: agentMode.value });
            if (data.interrupted) {
                interruptVisible.value = true;
                interruptMessage.value = data.message || 'Operation requires confirmation.';
                pendingSessionId.value = sessionId.value;
                scrollToBottom();
                return;
            }
            isTyping.value = false;
            messages.value.push({ role: 'assistant', content: data.response.response || data.response });
        }else {
            await sendMessageStream(
                { 
                    message, 
                    sessionId: sessionId.value, 
                    image, 
                    agentMode: agentMode.value 
                },
                {
                    onChunk: (chunk: string) => {
                        messages.value[tempIndex].content += chunk;
                        scrollToBottom();
                    },
                    onEnd: (fullResponse: string) => {
                        isLoading.value = false;
                        if (messages.value[tempIndex].content !== fullResponse) {
                            messages.value[tempIndex].content = fullResponse;
                        }
                        isTyping.value = false;
                        scrollToBottom();
                    },
                    onInterrupt: (msg: string) => {
                        isLoading.value = false;
                        messages.value.splice(tempIndex, 1);
                        interruptVisible.value = true;
                        interruptMessage.value = msg || 'Operation requires confirmation.';
                        pendingSessionId.value = sessionId.value;
                        scrollToBottom();
                    },
                    onError: (error: string) => {
                        isLoading.value = false;
                        messages.value[tempIndex].content = `Error: ${error}`;
                        scrollToBottom();
                        isTyping.value = false;
                    }
                }
            )
        }

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

const loadHistory = async () => {
    if (!sessionId.value) return;
    try {
        const history = await getChatHistory(sessionId.value);
        if (history?.length) {
            messages.value = history.filter((h: any) => h.role !== 'system').map((h: any) => ({ role: h.role, content: h.content }));
        }
    } catch (error) {
        console.error('Failed to load history:', error);
    }
    scrollToBottom();
};

const clearHistory = async () => {
    if (!sessionId.value) return;
    if (confirm('are you sure to clear the chat history?')) {
        try {
            await clearChatHistory(sessionId.value);
            messages.value = [];
            messages.value.push({ role: 'assistant', content: 'Chat history cleared. How can I help you?' });
            scrollToBottom();
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    }
};

const handleSessionChange = (newId: string) => {
    sessionId.value = newId;
    localStorage.setItem('sessionId', newId);
    loadHistory();
};

const refreshABStats = async () => {
    abLoading.value = true;
    try {
        abStats.value = await getABStats();
    } catch (error) {
        console.error('Failed to load AB stats:', error);
    } finally {
        abLoading.value = false;
    }
};

const clearABStatsHandler = async () => {
    await clearABStats();
    await refreshABStats();
};

const handleInterruptConfirm = async (confirmed: boolean) => {
    interruptVisible.value = false;
    isTyping.value = true;
    
    try {
        const responseText = await resumeInterrupt(pendingSessionId.value, confirmed);
        messages.value.push({ role: 'assistant', content: confirmed ? responseText : 'user cancelled the operation.' });
        scrollToBottom();
    } catch (error) {
        messages.value.push({ role: 'assistant', content: 'Resume failed: ' + (error as Error).message });
    } finally {
        isTyping.value = false;
    }
};

onMounted(async () => {
    await loadHistory();
    await refreshABStats();
});

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