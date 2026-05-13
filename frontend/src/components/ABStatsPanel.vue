<template>
    <div v-if="visible" class="ab-stats-panel">
        <div class="ab-stats-header">
            <h3>A/B Test Statistics</h3>
            <button @click="$emit('refresh')" class="refresh-stats">refresh</button>
            <button @click="$emit('clear')" class="clear-stats">clear</button>
            <button @click="$emit('close')" class="close-stats">✕</button>
        </div>
        <div v-if="loading" class="stats-loading">Loading...</div>
        <div v-else class="ab-stats-content">
            <div class="stat-card stat-a">
                <h4>Variant A (Single)</h4>
                <p>Count: {{ stats.variantA?.count || 0 }}</p>
                <p>Avg Latency: {{ (stats.variantA?.avgLatency || 0).toFixed(0) }}ms</p>
                <p>Avg Response: {{ (stats.variantA?.avgResponseLength || 0).toFixed(0) }} chars</p>
            </div>
            <div class="stat-card stat-b">
                <h4>Variant B (Multi)</h4>
                <p>Count: {{ stats.variantB?.count || 0 }}</p>
                <p>Avg Latency: {{ (stats.variantB?.avgLatency || 0).toFixed(0) }}ms</p>
                <p>Avg Response: {{ (stats.variantB?.avgResponseLength || 0).toFixed(0) }} chars</p>
            </div>
            <div class="stat-total">Total Requests: {{ stats.total || 0 }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    visible: boolean;
    loading: boolean;
    stats: { total: number; variantA: { count: number; avgLatency: number; avgResponseLength: number }; variantB: { count: number; avgLatency: number; avgResponseLength: number } };
}>();

defineEmits(['refresh', 'clear', 'close']);
</script>

<style scoped>
.ab-stats-panel {
    background: #f0f0f0;
    padding: 15px;
    border-bottom: 1px solid #ddd;
}
.ab-stats-header {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 10px;
}
.ab-stats-header h3 { margin: 0; font-size: 14px; }
.ab-stats-content {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
}
.stat-card {
    background: white;
    padding: 10px 15px;
    border-radius: 12px;
    flex: 1;
    min-width: 150px;
}
.stat-card h4 { margin: 0 0 8px 0; font-size: 12px; }
.stat-card p { margin: 4px 0; font-size: 12px; }
.stat-total {
    background: white;
    padding: 10px 15px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
}
.refresh-stats, .clear-stats, .close-stats {
    background: rgba(0,0,0,0.1);
    border: none;
    border-radius: 20px;
    padding: 4px 10px;
    cursor: pointer;
}
</style>