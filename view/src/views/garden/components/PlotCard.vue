<template>
  <div
    class="plot-card"
    :class="{
      locked: isLocked,
      empty: plot?.status === 'empty',
      growing: plot?.status === 'growing',
      mature: plot?.status === 'mature',
      withered: plot?.status === 'withered',
      'has-event': plot?.eventType !== 'none',
      'elder-plot': isElderPlot
    }"
  >
    <!-- 锁定状态 -->
    <div v-if="isLocked" class="locked-overlay">
      <Lock :size="20" />
      <span>未解锁</span>
    </div>

    <!-- 正常状态 -->
    <template v-else-if="plot">
      <!-- 地块图标 -->
      <div class="plot-icon">
        <Sprout v-if="plot.status === 'empty'" :size="24" />
        <Leaf v-else-if="plot.status === 'growing'" :size="24" class="growing-icon" />
        <Flower v-else-if="plot.status === 'mature'" :size="24" class="mature-icon" />
        <XCircle v-else-if="plot.status === 'withered'" :size="24" class="withered-icon" />
      </div>

      <!-- 地块信息 -->
      <div class="plot-info">
        <span class="plot-index">{{ index + 1 }}号</span>

        <!-- 空闲状态 -->
        <template v-if="plot.status === 'empty'">
          <span class="plot-status empty">空闲</span>
          <button class="plot-action-btn plant-btn" @click="$emit('plant', index)">
            <Plus :size="12" />
            播种
          </button>
        </template>

        <!-- 生长中 -->
        <template v-else-if="plot.status === 'growing'">
          <span class="seed-name">{{ plot.seedName }}</span>
          <div class="growth-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: plot.growthProgress + '%' }" />
            </div>
            <span class="progress-text">{{ plot.growthProgress }}%</span>
          </div>
          <span class="remaining-time">
            <Clock :size="10" />
            {{ plot.remainingTime }}
          </span>
        </template>

        <!-- 成熟状态 -->
        <template v-else-if="plot.status === 'mature'">
          <span class="seed-name mature-name">{{ plot.seedName }}</span>
          <span class="plot-status mature">可采收</span>
          <button class="plot-action-btn harvest-btn" @click="$emit('harvest', index)">
            <Hand :size="12" />
            采收
          </button>
        </template>

        <!-- 枯萎状态 -->
        <template v-else-if="plot.status === 'withered'">
          <span class="seed-name withered-name">{{ plot.seedName }}</span>
          <span class="plot-status withered">已枯萎</span>
          <button class="plot-action-btn clear-btn" @click="$emit('harvest', index)">
            <Trash2 :size="12" />
            清理
          </button>
        </template>
      </div>

      <!-- 事件提示 -->
      <div v-if="plot.eventType !== 'none'" class="event-badge" @click.stop="handleEventClick">
        <AlertTriangle :size="14" />
        <span>{{ plot.eventName }}</span>
      </div>
    </template>

    <!-- 长老地块探索按钮 -->
    <button v-if="isElderPlot && !isLocked && plot?.status === 'empty'" class="explore-badge" @click.stop="$emit('explore', index)">
      <Compass :size="12" />
      探索
    </button>
  </div>
</template>

<script setup lang="ts">
  import type { PlotInfo } from '@/stores/herbGarden'
  import { GARDEN_EVENTS, type GardenEventType, type EventAction } from '@/game/constants/herbGarden'
  import { Lock, Sprout, Leaf, Flower, XCircle, Plus, Clock, Hand, Trash2, AlertTriangle, Compass } from 'lucide-vue-next'

  const props = defineProps<{
    plot: PlotInfo | null
    index: number
    isLocked: boolean
    isElderPlot?: boolean
  }>()

  const emit = defineEmits<{
    (e: 'plant', index: number): void
    (e: 'harvest', index: number): void
    (e: 'handle-event', index: number, action: EventAction): void
    (e: 'explore', index: number): void
  }>()

  const handleEventClick = () => {
    if (!props.plot || props.plot.eventType === 'none') return

    const eventConfig = GARDEN_EVENTS[props.plot.eventType as GardenEventType]
    if (eventConfig) {
      emit('handle-event', props.index, eventConfig.action)
    }
  }
</script>

<style scoped>
  .plot-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 8px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    min-height: 120px;
    transition: all 0.2s ease;
  }

  .plot-card:hover:not(.locked) {
    border-color: rgba(93, 124, 111, 0.5);
    transform: translateY(-2px);
  }

  .plot-card.elder-plot {
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(201, 169, 89, 0.05) 100%);
    border-color: rgba(201, 169, 89, 0.2);
  }

  .plot-card.has-event {
    border-color: rgba(250, 173, 20, 0.5);
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(250, 173, 20, 0.05) 100%);
  }

  .plot-card.mature {
    border-color: rgba(82, 196, 26, 0.5);
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(82, 196, 26, 0.05) 100%);
  }

  .plot-card.withered {
    border-color: rgba(245, 34, 45, 0.3);
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(245, 34, 45, 0.05) 100%);
  }

  /* 锁定状态 */
  .locked-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .plot-card.locked {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* 地块图标 */
  .plot-icon {
    margin-bottom: 8px;
    color: var(--text-muted);
  }

  .growing-icon {
    color: #52c41a;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }

  .mature-icon {
    color: #faad14;
  }

  .withered-icon {
    color: #f5222d;
  }

  /* 地块信息 */
  .plot-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 100%;
  }

  .plot-index {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .plot-status {
    font-size: 0.75rem;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 10px;
  }

  .plot-status.empty {
    background: rgba(102, 102, 102, 0.1);
    color: #666;
  }

  .plot-status.mature {
    background: rgba(82, 196, 26, 0.15);
    color: #52c41a;
  }

  .plot-status.withered {
    background: rgba(245, 34, 45, 0.15);
    color: #f5222d;
  }

  .seed-name {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-primary);
    text-align: center;
    line-height: 1.2;
  }

  .mature-name {
    color: #faad14;
  }

  .withered-name {
    color: #f5222d;
    text-decoration: line-through;
  }

  /* 生长进度 */
  .growth-progress {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .progress-bar {
    flex: 1;
    height: 4px;
    background: rgba(93, 124, 111, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #5d7c6f, #7a9e8e);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 0.65rem;
    color: var(--text-muted);
    min-width: 28px;
    text-align: right;
  }

  .remaining-time {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 0.65rem;
    color: var(--text-muted);
  }

  /* 操作按钮 */
  .plot-action-btn {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 4px 10px;
    border: none;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 4px;
  }

  .plant-btn {
    background: rgba(93, 124, 111, 0.1);
    color: #5d7c6f;
  }

  .plant-btn:hover {
    background: rgba(93, 124, 111, 0.2);
  }

  .harvest-btn {
    background: rgba(82, 196, 26, 0.15);
    color: #52c41a;
  }

  .harvest-btn:hover {
    background: rgba(82, 196, 26, 0.25);
  }

  .clear-btn {
    background: rgba(245, 34, 45, 0.1);
    color: #f5222d;
  }

  .clear-btn:hover {
    background: rgba(245, 34, 45, 0.2);
  }

  /* 事件徽章 */
  .event-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 3px 8px;
    background: #faad14;
    border-radius: 10px;
    color: #1a1812;
    font-size: 0.65rem;
    font-weight: 600;
    cursor: pointer;
    animation: shake 0.5s ease-in-out infinite;
  }

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-2px);
    }
    75% {
      transform: translateX(2px);
    }
  }

  .event-badge:hover {
    animation: none;
    transform: scale(1.1);
  }

  /* 探索徽章 */
  .explore-badge {
    position: absolute;
    bottom: 6px;
    right: 6px;
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 3px 8px;
    background: rgba(201, 169, 89, 0.15);
    border: 1px solid rgba(201, 169, 89, 0.3);
    border-radius: 4px;
    color: var(--color-gold);
    font-size: 0.65rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .explore-badge:hover {
    background: rgba(201, 169, 89, 0.25);
  }
</style>
