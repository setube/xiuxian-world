<template>
  <div class="observatory-panel">
    <!-- 背景星尘粒子 -->
    <div class="stardust-particles">
      <div
        v-for="i in 20"
        :key="i"
        class="stardust"
        :style="{
          '--delay': Math.random() * 8 + 's',
          '--x': Math.random() * 100 + '%',
          '--size': Math.random() * 4 + 2 + 'px',
          '--duration': Math.random() * 5 + 5 + 's'
        }"
      />
    </div>

    <!-- 观星台信息 -->
    <div class="observatory-header">
      <div class="disk-count">
        <Telescope :size="20" />
        <span>引星盘: {{ observatory?.unlockedDisks ?? 0 }}/{{ observatory?.maxDisks ?? 6 }}</span>
      </div>
      <button v-if="observatory?.canExpand" class="expand-btn" :disabled="loading" @click="handleExpand">
        <Plus :size="16" />
        <span>扩展 ({{ observatory?.expansionCost }}贡献)</span>
      </button>
    </div>

    <!-- 引星盘列表 -->
    <div class="disks-grid">
      <div
        v-for="disk in observatory?.disks ?? []"
        :key="disk.diskIndex"
        class="disk-card"
        :class="{ locked: disk.isLocked, hasEvent: disk.status === 'event' }"
      >
        <!-- 锁定状态 -->
        <template v-if="disk.isLocked">
          <Lock :size="32" />
          <span class="locked-text">未解锁</span>
        </template>

        <!-- 空闲状态 -->
        <template v-else-if="disk.status === 'idle'">
          <div class="disk-header">
            <span class="disk-index">#{{ disk.diskIndex + 1 }}</span>
            <span v-if="disk.hasConsortBonus" class="consort-badge">
              <Heart :size="12" />
            </span>
          </div>
          <div class="disk-idle">
            <CircleDashed :size="40" />
            <span>空闲中</span>
          </div>
          <button class="start-btn" @click="openStartDialog(disk.diskIndex)">开始凝聚</button>
        </template>

        <!-- 凝聚中状态 -->
        <template v-else-if="disk.status === 'gathering'">
          <div class="disk-header">
            <span class="disk-index">#{{ disk.diskIndex + 1 }}</span>
            <span v-if="disk.hasConsortBonus" class="consort-badge">
              <Heart :size="12" />
            </span>
          </div>
          <div class="gathering-info">
            <div class="star-name">{{ getStarName(disk.starType) }}</div>
            <div class="progress-ring">
              <svg viewBox="0 0 60 60">
                <circle class="bg" cx="30" cy="30" r="26" />
                <circle
                  class="fill"
                  cx="30"
                  cy="30"
                  r="26"
                  :stroke-dasharray="163.36"
                  :stroke-dashoffset="163.36 * (1 - (disk.progress || 0) / 100)"
                />
              </svg>
              <span class="progress-text">{{ Math.floor(disk.progress || 0) }}%</span>
            </div>
            <div class="time-remaining">{{ getTimeRemaining(disk) }}</div>
          </div>
        </template>

        <!-- 完成状态 -->
        <template v-else-if="disk.status === 'ready'">
          <div class="disk-header">
            <span class="disk-index">#{{ disk.diskIndex + 1 }}</span>
            <span v-if="disk.hasConsortBonus" class="consort-badge">
              <Heart :size="12" />
            </span>
          </div>
          <div class="ready-info">
            <Sparkles :size="40" class="ready-icon" />
            <span class="star-name">{{ getStarName(disk.starType) }}</span>
            <span class="ready-text">凝聚完成</span>
          </div>
          <button class="collect-btn" :disabled="loading" @click="handleCollect(disk.diskIndex)">
            <Package :size="16" />
            <span>收取</span>
          </button>
        </template>

        <!-- 事件状态 -->
        <template v-else-if="disk.status === 'event'">
          <div class="disk-header">
            <span class="disk-index">#{{ disk.diskIndex + 1 }}</span>
            <AlertTriangle :size="16" class="event-icon" />
          </div>
          <div class="event-info">
            <div class="event-name">{{ getEventName(disk.eventType) }}</div>
            <div class="event-desc">{{ getEventDesc(disk.eventType) }}</div>
          </div>
          <button class="handle-btn" :disabled="loading" @click="handleEvent(disk.diskIndex)">
            <Shield :size="16" />
            <span>安抚星辰</span>
          </button>
        </template>
      </div>
    </div>

    <!-- 开始凝聚对话框 -->
    <n-modal v-model:show="showStartDialog" preset="dialog" title="选择凝聚星辰">
      <template #default>
        <div class="start-dialog">
          <p>选择要凝聚的星辰类型</p>
          <div class="star-options">
            <div
              v-for="star in starTypes"
              :key="star.id"
              class="star-option"
              :class="{ selected: selectedStarType === star.id }"
              @click="selectedStarType = star.id"
            >
              <div class="star-icon">
                <component :is="getStarIcon(star.id)" :size="24" />
              </div>
              <div class="star-info">
                <div class="star-name">{{ star.name }}</div>
                <div class="star-duration">{{ star.durationHours }}小时</div>
                <div class="star-yield">产出: {{ star.yieldMin }}-{{ star.yieldMax }}</div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #action>
        <n-button @click="showStartDialog = false">取消</n-button>
        <n-button type="primary" :disabled="!selectedStarType" :loading="loading" @click="handleStart">开始凝聚</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted, markRaw, type Component } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useStarPalaceStore } from '@/stores/starpalace'
  import { extractErrorMessage } from '@/api'
  import { STAR_TYPES, STAR_DISK_EVENTS, type DiskStatus } from '@/game/constants/starpalace'
  import { useMessage } from 'naive-ui'
  import {
    Telescope,
    Plus,
    Lock,
    Heart,
    CircleDashed,
    Sparkles,
    Package,
    AlertTriangle,
    Shield,
    Star,
    Droplets,
    CircleDot
  } from 'lucide-vue-next'

  const starPalaceStore = useStarPalaceStore()
  const { observatory, loading } = storeToRefs(starPalaceStore)
  const message = useMessage()

  const showStartDialog = ref(false)
  const selectedDiskIndex = ref<number | null>(null)
  const selectedStarType = ref<string | null>(null)

  const starTypes = Object.values(STAR_TYPES)

  // 进度更新定时器
  let progressTimer: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    progressTimer = setInterval(() => {
      starPalaceStore.updateDiskProgress()
    }, 1000)
  })

  onUnmounted(() => {
    if (progressTimer) {
      clearInterval(progressTimer)
    }
  })

  function getStarName(starType: string | null): string {
    if (!starType) return ''
    return STAR_TYPES[starType]?.name ?? starType
  }

  function getStarIcon(starType: string): Component {
    const icons: Record<string, Component> = {
      star_essence: markRaw(Star),
      star_liquid: markRaw(Droplets),
      star_core: markRaw(CircleDot)
    }
    return icons[starType] ?? markRaw(Star)
  }

  function getEventName(eventType: string): string {
    return STAR_DISK_EVENTS[eventType as keyof typeof STAR_DISK_EVENTS]?.name ?? eventType
  }

  function getEventDesc(eventType: string): string {
    return STAR_DISK_EVENTS[eventType as keyof typeof STAR_DISK_EVENTS]?.description ?? ''
  }

  function getTimeRemaining(disk: DiskStatus): string {
    if (!disk.readyAt) return ''
    const remaining = disk.readyAt - Date.now()
    if (remaining <= 0) return '即将完成'
    const hours = Math.floor(remaining / (60 * 60 * 1000))
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
    if (hours > 0) return `${hours}时${minutes}分`
    return `${minutes}分钟`
  }

  function openStartDialog(diskIndex: number) {
    selectedDiskIndex.value = diskIndex
    selectedStarType.value = null
    showStartDialog.value = true
  }

  async function handleStart() {
    if (selectedDiskIndex.value === null || !selectedStarType.value) return
    try {
      await starPalaceStore.startGathering(selectedDiskIndex.value, selectedStarType.value)
      message.success('开始凝聚星辰')
      showStartDialog.value = false
    } catch (error) {
      message.error(extractErrorMessage(error, '开始凝聚失败'))
    }
  }

  async function handleCollect(diskIndex: number) {
    try {
      const result = await starPalaceStore.collectDisk(diskIndex)
      message.success(`收获: ${result.itemName} x${result.quantity}`)
    } catch (error) {
      message.error(extractErrorMessage(error, '收取失败'))
    }
  }

  async function handleEvent(diskIndex: number) {
    try {
      await starPalaceStore.handleDiskEvent(diskIndex)
      message.success('星辰已安抚')
    } catch (error) {
      message.error(extractErrorMessage(error, '安抚失败'))
    }
  }

  async function handleExpand() {
    try {
      await starPalaceStore.expandDisks()
      message.success('引星盘扩展成功')
    } catch (error) {
      message.error(extractErrorMessage(error, '扩展失败'))
    }
  }
</script>

<style scoped>
  .observatory-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: relative;
    overflow: hidden;
  }

  /* 背景星尘 */
  .stardust-particles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .stardust {
    position: absolute;
    bottom: -10px;
    left: var(--x);
    width: var(--size);
    height: var(--size);
    background: radial-gradient(circle, rgba(99, 102, 241, 0.8) 0%, transparent 70%);
    border-radius: 50%;
    animation: floatStardust var(--duration) ease-out infinite;
    animation-delay: var(--delay);
  }

  @keyframes floatStardust {
    0% {
      transform: translateY(0) scale(0.5);
      opacity: 0;
    }
    10% {
      opacity: 0.8;
    }
    100% {
      transform: translateY(-500px) scale(1);
      opacity: 0;
    }
  }

  .observatory-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.03) 100%);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 10px;
    position: relative;
    z-index: 1;
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.1);
  }

  .disk-count {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #6366f1;
  }

  .expand-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 0 12px rgba(99, 102, 241, 0.3);
  }

  .expand-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 0 18px rgba(99, 102, 241, 0.5);
  }

  .expand-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 引星盘网格 */
  .disks-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    position: relative;
    z-index: 1;
  }

  @media (max-width: 480px) {
    .disks-grid {
      grid-template-columns: 1fr;
    }
  }

  .disk-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.02) 100%);
    border: 1px solid rgba(99, 102, 241, 0.15);
    border-radius: 12px;
    min-height: 160px;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }

  .disk-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 60%);
    pointer-events: none;
  }

  .disk-card:not(.locked):hover {
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.15);
    transform: translateY(-2px);
  }

  .disk-card.locked {
    opacity: 0.5;
    color: var(--text-muted);
  }

  .disk-card.hasEvent {
    border-color: #f59e0b;
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(245, 158, 11, 0.05) 100%);
  }

  .locked-text {
    margin-top: 8px;
    font-size: 0.85rem;
  }

  .disk-header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    margin-bottom: 12px;
  }

  .disk-index {
    font-weight: 700;
    color: #6366f1;
  }

  .consort-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: rgba(236, 72, 153, 0.1);
    border-radius: 50%;
    color: #ec4899;
  }

  .event-icon {
    color: #f59e0b;
    margin-left: auto;
  }

  /* 空闲状态 */
  .disk-idle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    flex: 1;
    justify-content: center;
  }

  .start-btn {
    width: 100%;
    padding: 8px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .start-btn:hover {
    transform: translateY(-1px);
  }

  /* 凝聚中状态 */
  .gathering-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    justify-content: center;
  }

  .gathering-info .star-name {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .progress-ring {
    position: relative;
    width: 60px;
    height: 60px;
  }

  .progress-ring svg {
    transform: rotate(-90deg);
  }

  .progress-ring circle {
    fill: none;
    stroke-width: 4;
  }

  .progress-ring .bg {
    stroke: rgba(99, 102, 241, 0.1);
  }

  .progress-ring .fill {
    stroke: #6366f1;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.3s ease;
    filter: drop-shadow(0 0 3px rgba(99, 102, 241, 0.6));
  }

  .progress-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 0.75rem;
    font-weight: 600;
    color: #6366f1;
  }

  .time-remaining {
    margin-top: 8px;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* 完成状态 */
  .ready-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex: 1;
    justify-content: center;
  }

  .ready-icon {
    color: #f59e0b;
    animation: readyPulse 1.5s ease-in-out infinite;
    filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.6));
  }

  @keyframes readyPulse {
    0%,
    100% {
      transform: scale(1);
      filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.6));
    }
    50% {
      transform: scale(1.2);
      filter: drop-shadow(0 0 15px rgba(245, 158, 11, 0.9));
    }
  }

  .ready-info .star-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .ready-text {
    font-size: 0.8rem;
    color: #52c41a;
  }

  .collect-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 100%;
    padding: 8px;
    background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .collect-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  /* 事件状态 */
  .event-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .event-name {
    font-weight: 600;
    color: #f59e0b;
    margin-bottom: 4px;
  }

  .event-desc {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .handle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 100%;
    padding: 8px;
    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .handle-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  /* 对话框 */
  .start-dialog p {
    margin: 0 0 16px;
    color: var(--text-secondary);
  }

  .star-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .star-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--bg-secondary);
    border: 2px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .star-option:hover {
    border-color: #6366f1;
  }

  .star-option.selected {
    background: rgba(99, 102, 241, 0.1);
    border-color: #6366f1;
  }

  .star-icon {
    position: relative;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 50%;
    color: white;
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
  }

  .star-option.selected .star-icon {
    animation: starIconGlow 2s ease-in-out infinite;
  }

  @keyframes starIconGlow {
    0%,
    100% {
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
    }
    50% {
      box-shadow: 0 0 25px rgba(99, 102, 241, 0.7);
    }
  }

  .star-info {
    flex: 1;
  }

  .star-info .star-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .star-duration,
  .star-yield {
    font-size: 0.8rem;
    color: var(--text-muted);
  }
</style>
