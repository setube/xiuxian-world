<template>
  <div class="refinement-slots">
    <!-- 标题 -->
    <div class="panel-header">
      <Flame :size="20" />
      <span>炼化槽</span>
      <span class="slot-count">{{ activeSlotCount }}/{{ totalSlots }}</span>
    </div>

    <!-- 槽位列表 -->
    <div class="slots-container">
      <div
        v-for="(slot, index) in displaySlots"
        :key="index"
        class="slot-card"
        :class="{
          locked: slot.locked,
          empty: !slot.locked && slot.status === 'empty',
          refining: slot.status === 'refining',
          complete: slot.status === 'complete'
        }"
      >
        <!-- 锁定的槽位 -->
        <template v-if="slot.locked">
          <div class="slot-locked">
            <Lock :size="24" />
            <span>升级血魂幡解锁</span>
          </div>
        </template>

        <!-- 空槽位 -->
        <template v-else-if="slot.status === 'empty'">
          <div class="slot-empty" @click="openSelectSoulModal(index)">
            <Plus :size="32" />
            <span>囚禁魂魄</span>
          </div>
        </template>

        <!-- 炼化中 -->
        <template v-else-if="slot.status === 'refining'">
          <div class="slot-refining">
            <div class="refining-header">
              <Ghost :size="20" />
              <span class="soul-name">{{ getSoulName(slot.soulType) }}</span>
            </div>
            <div class="refining-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: getProgressPercent(slot) + '%' }" />
              </div>
              <div class="progress-time">
                <Clock :size="14" />
                <span>{{ formatRemainingTime(slot) }}</span>
              </div>
            </div>
            <div class="refining-stability">
              <div class="stability-label">
                <Shield :size="14" />
                <span>稳定度</span>
              </div>
              <div class="stability-value" :style="{ color: getStabilityColor(slot.stability) }">{{ slot.stability }}%</div>
              <button class="maintain-btn" :disabled="operating" @click="handleMaintain(index)">
                <Wrench :size="14" />
                安抚
              </button>
            </div>
          </div>
        </template>

        <!-- 炼化完成 -->
        <template v-else-if="slot.status === 'complete'">
          <div class="slot-complete">
            <div class="complete-icon">
              <Sparkles :size="32" />
            </div>
            <span class="soul-name">{{ getSoulName(slot.soulType) }}</span>
            <button class="collect-btn" :disabled="operating" @click="handleCollect(index)">
              <Package :size="16" />
              收取精华
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- 选择魂魄弹窗 -->
    <Teleport to="body">
      <div v-if="showSelectModal" class="modal-overlay" @click="showSelectModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <Ghost :size="20" />
            <span>选择魂魄</span>
            <button class="close-btn" @click="showSelectModal = false">
              <X :size="20" />
            </button>
          </div>

          <div class="modal-body">
            <div v-if="availableSouls.length === 0" class="no-souls">
              <Ghost :size="40" />
              <span>暂无可用魂魄</span>
              <span class="hint">通过PvP或PvE活动获取魂魄</span>
            </div>

            <div v-else class="soul-select-list">
              <div
                v-for="soul in availableSouls"
                :key="soul.id"
                class="soul-select-item"
                :class="{ disabled: !canRefineSoul(soul) }"
                @click="canRefineSoul(soul) && selectSoul(soul)"
              >
                <div class="soul-icon" :style="{ color: soul.color }">
                  <Ghost :size="24" />
                </div>
                <div class="soul-info">
                  <div class="soul-header">
                    <span class="soul-name">{{ soul.name }}</span>
                    <span class="soul-grade" :style="{ color: soul.color }">{{ soul.gradeName }}</span>
                  </div>
                  <div class="soul-details">
                    <span>炼化: {{ soul.refineTime }}</span>
                    <span>煞气: {{ soul.shaCost }}</span>
                  </div>
                </div>
                <div class="soul-count">×{{ soul.count }}</div>
                <div v-if="!canRefineSoul(soul)" class="soul-locked-hint">等级不足</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 收取结果弹窗 -->
    <Teleport to="body">
      <div v-if="showResultModal" class="modal-overlay" @click="showResultModal = false">
        <div class="result-modal" @click.stop>
          <div class="result-header">
            <Sparkles :size="24" />
            <span>炼化完成!</span>
          </div>
          <div class="result-rewards">
            <div v-for="(reward, index) in collectResult" :key="index" class="reward-item">
              <Package :size="16" />
              <span>{{ reward.name }}</span>
              <span class="reward-count">×{{ reward.quantity }}</span>
            </div>
          </div>
          <button class="result-btn" @click="showResultModal = false">确定</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useBloodSoulBannerStore } from '@/stores/bloodSoulBanner'
  import {
    SOUL_TYPES,
    BANNER_LEVEL_CONFIG,
    formatRefineTime,
    getSoulGradeColor,
    getSoulGradeName,
    getStabilityColor
  } from '@/game/constants/bloodSoulBanner'
  import { Flame, Lock, Plus, Ghost, Clock, Shield, Wrench, Sparkles, Package, X } from 'lucide-vue-next'

  const bannerStore = useBloodSoulBannerStore()
  const { bannerStatus, refinementSlots, soulStorage } = storeToRefs(bannerStore)

  const showSelectModal = ref(false)
  const showResultModal = ref(false)
  const selectedSlotIndex = ref(0)
  const operating = ref(false)
  const collectResult = ref<{ name: string; quantity: number }[]>([])

  // 刷新定时器
  let refreshTimer: ReturnType<typeof setInterval> | null = null

  const totalSlots = computed(() => {
    const level = bannerStatus.value?.level || 1
    return BANNER_LEVEL_CONFIG[level]?.slots || 1
  })

  const activeSlotCount = computed(() => {
    return refinementSlots.value?.filter(s => s.status !== 'empty').length || 0
  })

  const maxSoulGrade = computed(() => {
    const level = bannerStatus.value?.level || 1
    return BANNER_LEVEL_CONFIG[level]?.maxSoulGrade || 1
  })

  interface DisplaySlot {
    locked: boolean
    status: 'empty' | 'refining' | 'complete'
    soulType: string | null
    progress: number
    remainingMs: number
    stability: number
  }

  const displaySlots = computed<DisplaySlot[]>(() => {
    const slots: DisplaySlot[] = []
    const maxSlots = 5 // 最大槽位数

    for (let i = 0; i < maxSlots; i++) {
      if (i >= totalSlots.value) {
        slots.push({
          locked: true,
          status: 'empty',
          soulType: null,
          progress: 0,
          remainingMs: 0,
          stability: 100
        })
      } else {
        const slotData = refinementSlots.value?.[i]
        slots.push({
          locked: false,
          status: slotData?.status || 'empty',
          soulType: slotData?.soulType || null,
          progress: slotData?.progress || 0,
          remainingMs: slotData?.remainingMs || 0,
          stability: slotData?.stability || 100
        })
      }
    }

    return slots
  })

  interface SoulSelectInfo {
    id: string
    name: string
    grade: number
    gradeName: string
    color: string
    refineTime: string
    shaCost: number
    count: number
  }

  const availableSouls = computed<SoulSelectInfo[]>(() => {
    return Object.values(SOUL_TYPES)
      .filter(soul => (soulStorage.value?.souls[soul.id]?.count || 0) > 0)
      .map(soul => ({
        id: soul.id,
        name: soul.name,
        grade: soul.grade,
        gradeName: getSoulGradeName(soul.grade),
        color: getSoulGradeColor(soul.grade),
        refineTime: formatRefineTime(soul.refineTimeMs),
        shaCost: soul.shaCost,
        count: soulStorage.value?.souls[soul.id]?.count || 0
      }))
  })

  function getSoulName(soulType: string | null): string {
    if (!soulType) return '未知'
    return SOUL_TYPES[soulType]?.name || '未知'
  }

  function canRefineSoul(soul: SoulSelectInfo): boolean {
    return soul.grade <= maxSoulGrade.value
  }

  function getProgressPercent(slot: DisplaySlot): number {
    return slot.progress
  }

  function formatRemainingTime(slot: DisplaySlot): string {
    return formatRefineTime(slot.remainingMs)
  }

  function openSelectSoulModal(slotIndex: number) {
    selectedSlotIndex.value = slotIndex
    showSelectModal.value = true
  }

  async function selectSoul(soul: SoulSelectInfo) {
    if (operating.value) return

    operating.value = true
    try {
      await bannerStore.startRefinement(selectedSlotIndex.value, soul.id)
      showSelectModal.value = false
    } finally {
      operating.value = false
    }
  }

  async function handleMaintain(slotIndex: number) {
    if (operating.value) return

    operating.value = true
    try {
      await bannerStore.maintainSlot(slotIndex)
    } finally {
      operating.value = false
    }
  }

  async function handleCollect(slotIndex: number) {
    if (operating.value) return

    operating.value = true
    try {
      const result = await bannerStore.collectRefinement(slotIndex)
      if (result.outputs && result.outputs.length > 0) {
        collectResult.value = result.outputs.map(o => ({
          name: o.itemName,
          quantity: o.quantity
        }))
        showResultModal.value = true
      }
    } finally {
      operating.value = false
    }
  }

  onMounted(() => {
    bannerStore.fetchRefinementSlots()
    bannerStore.fetchSoulStorage()

    // 每30秒刷新一次槽位状态
    refreshTimer = setInterval(() => {
      bannerStore.fetchRefinementSlots()
    }, 30000)
  })

  onUnmounted(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
    }
  })
</script>

<style scoped>
  .refinement-slots {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(30, 30, 30, 0.9) 100%);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 12px;
    color: #f87171;
    font-weight: 600;
  }

  .slot-count {
    margin-left: auto;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .slots-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .slot-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .slot-card.locked {
    opacity: 0.5;
  }

  .slot-card.refining {
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.2);
  }

  .slot-card.complete {
    border-color: rgba(74, 222, 128, 0.5);
    box-shadow: 0 0 15px rgba(74, 222, 128, 0.2);
    animation: completePulse 2s ease-in-out infinite;
  }

  @keyframes completePulse {
    0%,
    100% {
      box-shadow: 0 0 15px rgba(74, 222, 128, 0.2);
    }
    50% {
      box-shadow: 0 0 25px rgba(74, 222, 128, 0.4);
    }
  }

  /* 锁定槽位 */
  .slot-locked {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  /* 空槽位 */
  .slot-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .slot-empty:hover {
    background: var(--bg-secondary);
    color: #a855f7;
  }

  /* 炼化中 */
  .slot-refining {
    padding: 16px;
  }

  .refining-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    color: #a855f7;
  }

  .refining-header .soul-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .refining-progress {
    margin-bottom: 12px;
  }

  .progress-bar {
    height: 8px;
    background: var(--bg-secondary);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 6px;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #7c3aed 0%, #a855f7 100%);
    border-radius: 4px;
    transition: width 0.5s ease;
  }

  .progress-time {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .refining-stability {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: var(--bg-secondary);
    border-radius: 8px;
  }

  .stability-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .stability-value {
    font-weight: 600;
  }

  .maintain-btn {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .maintain-btn:hover:not(:disabled) {
    border-color: #a855f7;
    color: #a855f7;
  }

  .maintain-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 完成状态 */
  .slot-complete {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 20px;
  }

  .complete-icon {
    color: #4ade80;
    animation: sparkle 1.5s ease-in-out infinite;
  }

  @keyframes sparkle {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
  }

  .slot-complete .soul-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .collect-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    background: linear-gradient(135deg, #15803d 0%, #4ade80 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .collect-btn:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(74, 222, 128, 0.5);
  }

  .collect-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 弹窗样式 */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  .modal-content {
    width: 90%;
    max-width: 400px;
    max-height: 80vh;
    background: var(--bg-card);
    border-radius: 16px;
    overflow: hidden;
    animation: scaleIn 0.3s ease;
  }

  .modal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: var(--bg-secondary);
    font-weight: 600;
    color: #a855f7;
  }

  .close-btn {
    margin-left: auto;
    padding: 4px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: 4px;
  }

  .close-btn:hover {
    background: var(--bg-card);
    color: var(--text-primary);
  }

  .modal-body {
    max-height: 400px;
    overflow-y: auto;
  }

  .no-souls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 48px;
    color: var(--text-muted);
    text-align: center;
  }

  .no-souls .hint {
    font-size: 0.8rem;
  }

  .soul-select-list {
    padding: 8px;
  }

  .soul-select-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .soul-select-item:hover:not(.disabled) {
    background: var(--bg-secondary);
  }

  .soul-select-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .soul-select-item .soul-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-secondary);
    border-radius: 8px;
  }

  .soul-select-item .soul-info {
    flex: 1;
  }

  .soul-select-item .soul-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
  }

  .soul-select-item .soul-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .soul-select-item .soul-grade {
    font-size: 0.7rem;
    padding: 1px 4px;
    background: rgba(139, 92, 246, 0.1);
    border-radius: 3px;
  }

  .soul-select-item .soul-details {
    display: flex;
    gap: 8px;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .soul-count {
    font-weight: 600;
    color: #a855f7;
  }

  .soul-locked-hint {
    font-size: 0.75rem;
    color: #f87171;
  }

  /* 结果弹窗 */
  .result-modal {
    width: 90%;
    max-width: 320px;
    background: var(--bg-card);
    border-radius: 16px;
    padding: 24px;
    text-align: center;
    animation: scaleIn 0.3s ease;
  }

  .result-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #4ade80;
    font-size: 1.2rem;
    font-weight: 700;
    margin-bottom: 16px;
  }

  .result-rewards {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
  }

  .reward-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px;
    background: var(--bg-secondary);
    border-radius: 8px;
  }

  .reward-count {
    color: #4ade80;
    font-weight: 600;
  }

  .result-btn {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #15803d 0%, #4ade80 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .result-btn:hover {
    transform: scale(1.02);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
