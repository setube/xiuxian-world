<template>
  <div v-if="showBadge" class="soul-status-badge" :class="statusClass">
    <div class="status-icon">
      <component :is="statusIcon" :size="16" />
    </div>
    <div class="status-info">
      <div class="status-title">{{ statusTitle }}</div>
      <div class="status-countdown">
        <Clock :size="12" />
        <span>{{ countdown }}</span>
      </div>
    </div>
    <div v-if="showEffect" class="status-effect">{{ effectText }}</div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, onMounted, onUnmounted } from 'vue'
  import { AlertTriangle, HeartCrack, Clock } from 'lucide-vue-next'
  import { usePlayerStore } from '@/stores/player'

  interface Props {
    showEffect?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    showEffect: true
  })

  const playerStore = usePlayerStore()
  const now = ref(Date.now())
  let timer: number | null = null

  // 更新当前时间
  onMounted(() => {
    timer = window.setInterval(() => {
      now.value = Date.now()
    }, 1000)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  // 是否显示徽章
  const showBadge = computed(() => {
    return playerStore.isSoulTurbulent || playerStore.isSoulShattered
  })

  // 状态类型（神魂动荡优先显示）
  const statusType = computed(() => {
    if (playerStore.isSoulTurbulent) return 'turbulent'
    if (playerStore.isSoulShattered) return 'shattered'
    return null
  })

  // 状态样式类
  const statusClass = computed(() => {
    return statusType.value ? `status-${statusType.value}` : ''
  })

  // 状态图标
  const statusIcon = computed(() => {
    return statusType.value === 'turbulent' ? AlertTriangle : HeartCrack
  })

  // 状态标题
  const statusTitle = computed(() => {
    return statusType.value === 'turbulent' ? '神魂动荡' : '道心破碎'
  })

  // 效果文本
  const effectText = computed(() => {
    if (!playerStore.soulStatus) return ''
    if (statusType.value === 'turbulent') {
      const reduction = playerStore.soulStatus.turbulent.powerReduction * 100
      return `战力-${reduction}%`
    }
    if (statusType.value === 'shattered') {
      const penalty = playerStore.soulStatus.shattered.cultivationPenalty * 100
      return `闭关-${penalty}%`
    }
    return ''
  })

  // 倒计时
  const countdown = computed(() => {
    if (!playerStore.soulStatus) return ''

    let expiresAt: number | null = null
    if (statusType.value === 'turbulent') {
      expiresAt = playerStore.soulStatus.turbulent.expiresAt
    } else if (statusType.value === 'shattered') {
      expiresAt = playerStore.soulStatus.shattered.expiresAt
    }

    if (!expiresAt) return ''

    const remaining = expiresAt - now.value
    if (remaining <= 0) return '已结束'

    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

    if (hours > 0) {
      return `${hours}时${minutes}分`
    }
    return `${minutes}分${seconds}秒`
  })
</script>

<style scoped>
  .soul-status-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 4px;
    border: 1px solid;
  }

  .status-turbulent {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.4);
  }

  .status-shattered {
    background: rgba(168, 85, 247, 0.1);
    border-color: rgba(168, 85, 247, 0.4);
  }

  .status-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 4px;
  }

  .status-turbulent .status-icon {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .status-shattered .status-icon {
    background: rgba(168, 85, 247, 0.2);
    color: #a855f7;
  }

  .status-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .status-title {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .status-turbulent .status-title {
    color: #ef4444;
  }

  .status-shattered .status-title {
    color: #a855f7;
  }

  .status-countdown {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .status-effect {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .status-turbulent .status-effect {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .status-shattered .status-effect {
    background: rgba(168, 85, 247, 0.2);
    color: #a855f7;
  }
</style>
