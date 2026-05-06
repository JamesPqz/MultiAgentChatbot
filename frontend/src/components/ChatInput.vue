<template>
    <div class="chat-input-container">
        <div class="image-upload">
            <button class="image-btn" @click="triggerFileInput" :disabled="isLoading">
                Image
            </button>
            <input ref="fileInput" type="file" accept="image/*" @change="handleImageUpload" hidden />
            <div v-if="imagePreview" class="image-preview-wrapper">
                <img :src="imagePreview" alt="Preview" class="image-preview" />
                <button @click="clearImage" class="image-clear">x</button>
            </div>
        </div>
        <textarea
            v-model="message"
            class="chat-input"
            placeholder="Type your message..."
            rows="1"
            :disabled="isLoading"
            @keydown="handleKeyDown"
        />
        <button class="send-btn" @click="handleSend" :disabled="isLoading || (!message.trim() && !image)">
            {{ isLoading ? '...' : 'Send' }}
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ isLoading: boolean }>();
const emit = defineEmits<{
    (e: 'send', message: string, image: string | null): void;
}>();

const message = ref('');
const image = ref<string | null>(null);
const imagePreview = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const triggerFileInput = () => {
    fileInput.value?.click();
};

const handleImageUpload = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const result = event.target?.result as string;
        image.value = result;
        imagePreview.value = result;
    };
    reader.readAsDataURL(file);
};

const clearImage = () => {
    image.value = null;
    imagePreview.value = null;
    if (fileInput.value) fileInput.value.value = '';
};

const handleSend = () => {
    if ((!message.value.trim() && !image.value) || props.isLoading) return;
    emit('send', message.value.trim(), image.value);
    message.value = '';
    clearImage();
};

const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
};
</script>

<style scoped>
.chat-input-container {
    padding: 20px;
    background: white;
    border-top: 1px solid #e0e0e0;
    display: flex;
    gap: 10px;
}

.chat-input {
    flex: 1;
    padding: 12px;
    border: 1px solid #e0e0e0;
    border-radius: 25px;
    outline: none;
    font-size: 14px;
    resize: none;
    font-family: inherit;
}

.chat-input:focus {
    border-color: #667eea;
}

.send-btn {
    padding: 12px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 25px;
    cursor: pointer;
    font-size: 14px;
    transition: transform 0.2s;
}

.send-btn:hover:not(:disabled) {
    transform: scale(1.02);
}

.send-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.image-upload {
    display: flex;
    align-items: center;
    gap: 10px;
}

.image-btn {
    padding: 12px;
    background: #f0f0f0;
    border-radius: 25px;
    cursor: pointer;
    font-size: 14px;
    border: none;
}

.image-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.image-preview-wrapper {
    position: relative;
    display: inline-block;
}

.image-preview {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    object-fit: cover;
}

.image-clear {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #ff4444;
    color: white;
    border: none;
    font-size: 12px;
    cursor: pointer;
}
</style>