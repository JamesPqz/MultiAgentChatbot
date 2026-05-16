<template>
    <div class="chat-header">
        <h1>AI Chatbot</h1>
        <div class="header-controls">
            <div class="session-control">
                <input 
                    v-model="localSessionId" 
                    type="text" 
                    class="session-input" 
                    placeholder="Session ID"
                    @blur="onSessionChange"
                />
                <button class="refresh-btn" @click="$emit('refresh')" title="refresh session">
                    refresh
                </button>
                <button class="clear-btn" @click="$emit('clear-history')" title="clear session history">
                    clear
                </button>
            </div>
            
            <div class="mode-selector">
                <label><input type="radio" value="single" v-model="selectedMode" /> Single</label>
                <label><input type="radio" value="multi" v-model="selectedMode" /> Multi</label>
                <label><input type="radio" value="auto" v-model="selectedMode" /> Auto</label>
            </div>
            
            <button class="abtest-btn" @click="$emit('toggle-stats')">
                A/B Test
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
    sessionId: string;
    agentMode: 'single' | 'multi' | 'auto';
}>();

const emit = defineEmits(['update:sessionId', 'update:agentMode', 'refresh', 'toggle-stats', 'clear-history']);

const localSessionId = ref(props.sessionId);

watch(() => props.sessionId, (val) => localSessionId.value = val);

const onSessionChange = () => {
    emit('update:sessionId', localSessionId.value);
};

const selectedMode = ref(props.agentMode);  

watch(selectedMode, (val) => {
    emit('update:agentMode', val);
});

watch(() => props.agentMode, (val) => {
    selectedMode.value = val;
});
</script>

<style scoped>
.chat-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px 20px;
}
.chat-header h1 {
    font-size: 1.3rem;
    margin-bottom: 10px;
}
.header-controls {
    display: flex;
    gap: 15px;
    align-items: center;
    flex-wrap: wrap;
}
.session-control {
    display: flex;
    gap: 5px;
    align-items: center;
}
.session-input {
    padding: 6px 10px;
    border-radius: 20px;
    border: none;
    outline: none;
    font-size: 12px;
    width: 150px;
}
.refresh-btn, .abtest-btn {
    padding: 6px 12px;
    border-radius: 20px;
    border: none;
    cursor: pointer;
    background: rgba(255,255,255,0.2);
    color: white;
    font-size: 12px;
}
.mode-selector {
    display: flex;
    gap: 12px;
    background: rgba(255,255,255,0.15);
    padding: 4px 12px;
    border-radius: 25px;
}
.mode-selector label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    cursor: pointer;
}
.clear-btn {
    padding: 6px 12px;
    border-radius: 20px;
    border: none;
    cursor: pointer;
    background: rgba(255,255,255,0.2);
    color: white;
    font-size: 12px;
}
.clear-btn:hover {
    background: rgba(255,0,0,0.5);
}
</style>