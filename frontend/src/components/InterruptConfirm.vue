<template>
    <div v-if="visible" class="interrupt-confirm">
        <div class="interrupt-box">
            <div class="interrupt-icon">⚠️</div>
            <div class="interrupt-message">{{ message }}</div>
            <div class="interrupt-buttons">
                <button @click="handleConfirm(true)" class="confirm-btn">Confirm</button>
                <button @click="handleConfirm(false)" class="cancel-btn">Cancel</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    visible: boolean;
    message: string;
}>();

const emit = defineEmits(['confirm']);

const handleConfirm = (confirmed: boolean) => {
    emit('confirm', confirmed);
};
</script>

<style scoped>
.interrupt-confirm {
    display: flex;
    justify-content: center;
    margin: 10px 0;
}
.interrupt-box {
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 12px;
    padding: 15px 20px;
    text-align: center;
    max-width: 80%;
}
.interrupt-icon { font-size: 24px; margin-bottom: 8px; }
.interrupt-message { font-size: 14px; margin-bottom: 12px; white-space: pre-wrap; text-align: left; }
.interrupt-buttons { display: flex; gap: 10px; justify-content: center; }
.confirm-btn { background: #28a745; color: white; border: none; padding: 6px 20px; border-radius: 20px; cursor: pointer; }
.cancel-btn { background: #dc3545; color: white; border: none; padding: 6px 20px; border-radius: 20px; cursor: pointer; }
</style>