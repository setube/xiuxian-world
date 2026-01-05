<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useTribulationStore } from '@/stores/tribulation'
import { Sparkles } from 'lucide-vue-next'

const tribulationStore = useTribulationStore()

// 定时刷新状态
let refreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await tribulationStore.init()

  // 每秒更新剩余时间
  refreshTimer = setInterval(() => {
    tribulationStore.refreshNangongWanTime()
  }, 1000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

// 是否显示
const isVisible = computed(() => tribulationStore.isNangongWanActive)

// 显示数据
const storedExp = computed(() => tribulationStore.nangongWan?.storedExp || 0)
const remainingTime = computed(() => tribulationStore.nangongWanRemainingTimeDisplay || '计算中...')
</script>

<template>
  <Transition name="nangong-slide">
    <div v-if="isVisible" class="nangong-wan-floating">
      <div class="nangong-content">
        <div class="nangong-icon">
          <n-icon :size="24" color="#722ed1">
            <Sparkles />
          </n-icon>
        </div>
        <div class="nangong-info">
          <div class="nangong-title">南宫婉奇遇中</div>
          <div class="nangong-details">
            <span class="stored-exp">储存: {{ storedExp.toLocaleString() }} 修为</span>
            <span class="remaining-time">{{ remainingTime }}</span>
          </div>
        </div>
      </div>
      <div class="nangong-glow"></div>
    </div>
  </Transition>
</template>

<style scoped>
.nangong-wan-floating {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 1000;
  background: linear-gradient(135deg, rgba(114, 46, 209, 0.95) 0%, rgba(156, 89, 217, 0.9) 100%);
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow:
    0 4px 20px rgba(114, 46, 209, 0.4),
    0 0 40px rgba(114, 46, 209, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  overflow: hidden;
}

.nangong-content {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 2;
}

.nangong-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
  }
}

.nangong-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nangong-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.nangong-details {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.stored-exp {
  background: rgba(255, 255, 255, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
}

.remaining-time {
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 8px;
  border-radius: 4px;
}

.nangong-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
    ellipse at center,
    rgba(255, 255, 255, 0.1) 0%,
    transparent 70%
  );
  animation: rotate-glow 8s linear infinite;
  pointer-events: none;
}

@keyframes rotate-glow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 进入/离开动画 */
.nangong-slide-enter-active {
  animation: slide-in 0.5s ease-out;
}

.nangong-slide-leave-active {
  animation: slide-out 0.5s ease-in;
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slide-out {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
</style>
