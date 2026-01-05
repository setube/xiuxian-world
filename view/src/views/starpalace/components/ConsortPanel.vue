<template>
  <div class="consort-panel">
    <!-- 背景心形粒子 -->
    <div class="heart-particles">
      <div
        v-for="i in 12"
        :key="i"
        class="heart-particle"
        :style="{ '--delay': Math.random() * 6 + 's', '--x': Math.random() * 100 + '%', '--duration': Math.random() * 4 + 4 + 's' }"
      >
        ♥
      </div>
    </div>

    <!-- 没有侍妾时 -->
    <div v-if="!consort" class="no-consort">
      <Heart :size="48" />
      <p>暂无侍妾</p>
    </div>

    <!-- 侍妾信息 -->
    <template v-else>
      <!-- 侍妾卡片 -->
      <div class="consort-card">
        <div class="consort-avatar">
          <Heart :size="32" />
        </div>
        <div class="consort-info">
          <div class="consort-name">
            <span class="name">{{ consort.name }}</span>
            <span class="title">{{ consort.title }}</span>
          </div>
          <div class="consort-personality">{{ consort.personality }}</div>
          <div class="consort-desc">{{ consort.description }}</div>
        </div>
      </div>

      <!-- 好感度 -->
      <div class="affection-section">
        <div class="section-header">
          <Heart :size="18" />
          <span>好感度</span>
          <span class="affection-level">{{ consort.affectionLevel.name }}</span>
        </div>
        <div class="affection-bar">
          <div class="affection-fill" :style="{ width: consort.affection + '%' }" />
        </div>
        <div class="affection-info">
          <span>{{ consort.affection }}/100</span>
          <span class="bonus">修炼加成 +{{ consort.cultivationBonus }}%</span>
        </div>
      </div>

      <!-- 特殊技能 -->
      <div class="skill-card">
        <div class="skill-header">
          <Sparkles :size="18" />
          <span>{{ consort.specialSkill.name }}</span>
        </div>
        <div class="skill-desc">{{ consort.specialSkill.description }}</div>
      </div>

      <!-- 灵力反哺状态 -->
      <div v-if="consort.spiritFeedbackActive" class="buff-active">
        <Zap :size="18" />
        <span>灵力反哺生效中</span>
        <span class="buff-time">剩余 {{ formatTime(consort.spiritFeedbackExpiresIn) }}</span>
      </div>

      <!-- 派遣状态 -->
      <div v-if="consort.assignedDiskIndex !== null" class="assigned-info">
        <Telescope :size="18" />
        <span>已派遣至引星盘 #{{ consort.assignedDiskIndex + 1 }}</span>
      </div>

      <!-- 操作按钮 -->
      <div class="actions">
        <!-- 问安 -->
        <button class="action-btn greet" :disabled="!consort.canGreet || actionLoading" @click="handleGreet">
          <MessageCircle :size="18" />
          <span v-if="consort.canGreet">每日问安</span>
          <span v-else>{{ formatTime(consort.greetingCooldownMs) }}</span>
        </button>

        <!-- 赠予 -->
        <button class="action-btn gift" :disabled="actionLoading" @click="showGiftDialog = true">
          <Gift :size="18" />
          <span>赠予侍妾</span>
        </button>

        <!-- 灵力反哺 -->
        <button class="action-btn feedback" :disabled="consort.spiritFeedbackActive || actionLoading" @click="handleSpiritFeedback">
          <Zap :size="18" />
          <span>灵力反哺</span>
        </button>

        <!-- 派遣/召回 -->
        <button
          v-if="consort.assignedDiskIndex === null"
          class="action-btn assign"
          :disabled="actionLoading"
          @click="showAssignDialog = true"
        >
          <Send :size="18" />
          <span>派遣侍妾</span>
        </button>
        <button v-else class="action-btn recall" :disabled="actionLoading" @click="handleRecall">
          <RotateCcw :size="18" />
          <span>召回侍妾</span>
        </button>
      </div>
    </template>

    <!-- 赠予对话框 -->
    <n-modal v-model:show="showGiftDialog" preset="dialog" title="赠予侍妾">
      <template #default>
        <div class="gift-dialog">
          <p>消耗灵石赠予侍妾，增加好感度</p>
          <div class="gift-input">
            <span>赠予数量:</span>
            <n-input-number v-model:value="giftAmount" :min="1" :max="10" />
          </div>
          <div class="gift-cost">消耗: {{ giftAmount * 100 }} 灵石，好感度+{{ giftAmount * 3 }}</div>
        </div>
      </template>
      <template #action>
        <n-button @click="showGiftDialog = false">取消</n-button>
        <n-button type="primary" :loading="actionLoading" @click="handleGift">确认赠予</n-button>
      </template>
    </n-modal>

    <!-- 派遣对话框 -->
    <n-modal v-model:show="showAssignDialog" preset="dialog" title="派遣侍妾">
      <template #default>
        <div class="assign-dialog">
          <p>选择要派遣的引星盘，侍妾将增加15%产出</p>
          <div class="disk-options">
            <div
              v-for="disk in availableDisks"
              :key="disk.diskIndex"
              class="disk-option"
              :class="{ selected: selectedDisk === disk.diskIndex }"
              @click="selectedDisk = disk.diskIndex"
            >
              <Telescope :size="20" />
              <span>引星盘 #{{ disk.diskIndex + 1 }}</span>
            </div>
          </div>
        </div>
      </template>
      <template #action>
        <n-button @click="showAssignDialog = false">取消</n-button>
        <n-button type="primary" :disabled="selectedDisk === null" :loading="actionLoading" @click="handleAssign">确认派遣</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useStarPalaceStore } from '@/stores/starpalace'
  import { extractErrorMessage } from '@/api'
  import { CONSORT_CONFIG } from '@/game/constants/starpalace'
  import { useMessage } from 'naive-ui'
  import { Heart, Sparkles, Zap, Telescope, MessageCircle, Gift, Send, RotateCcw } from 'lucide-vue-next'

  const starPalaceStore = useStarPalaceStore()
  const { consort, observatory, loading: actionLoading } = storeToRefs(starPalaceStore)
  const message = useMessage()

  const showGiftDialog = ref(false)
  const showAssignDialog = ref(false)
  const giftAmount = ref(1)
  const selectedDisk = ref<number | null>(null)

  // 可派遣的引星盘
  const availableDisks = computed(() => {
    return observatory.value?.disks.filter(d => !d.isLocked && !d.hasConsortBonus) ?? []
  })

  // 格式化时间
  function formatTime(ms: number): string {
    if (ms <= 0) return '可用'
    const hours = Math.floor(ms / (60 * 60 * 1000))
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
    if (hours > 0) return `${hours}时${minutes}分`
    return `${minutes}分钟`
  }

  // 问安
  async function handleGreet() {
    try {
      const result = await starPalaceStore.greetConsort()
      message.success(result.message)
    } catch (error) {
      message.error(extractErrorMessage(error, '问安失败'))
    }
  }

  // 赠予
  async function handleGift() {
    try {
      const result = await starPalaceStore.giftConsort(giftAmount.value)
      message.success(`赠予成功，好感度+${result.affectionGained}`)
      showGiftDialog.value = false
      giftAmount.value = 1
    } catch (error) {
      message.error(extractErrorMessage(error, '赠予失败'))
    }
  }

  // 灵力反哺
  async function handleSpiritFeedback() {
    try {
      await starPalaceStore.spiritFeedback()
      message.success(`灵力反哺成功，修炼加成+${CONSORT_CONFIG.spiritFeedbackBonus}%，持续1小时`)
    } catch (error) {
      message.error(extractErrorMessage(error, '灵力反哺失败'))
    }
  }

  // 派遣
  async function handleAssign() {
    if (selectedDisk.value === null) return
    try {
      await starPalaceStore.assignConsort(selectedDisk.value)
      message.success('侍妾已派遣')
      showAssignDialog.value = false
      selectedDisk.value = null
    } catch (error) {
      message.error(extractErrorMessage(error, '派遣失败'))
    }
  }

  // 召回
  async function handleRecall() {
    try {
      await starPalaceStore.recallConsort()
      message.success('侍妾已召回')
    } catch (error) {
      message.error(extractErrorMessage(error, '召回失败'))
    }
  }
</script>

<style scoped>
  .consort-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: relative;
    overflow: hidden;
  }

  /* 背景心形粒子 */
  .heart-particles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .heart-particle {
    position: absolute;
    bottom: -20px;
    left: var(--x);
    font-size: 12px;
    color: rgba(236, 72, 153, 0.4);
    animation: floatHeart var(--duration) ease-out infinite;
    animation-delay: var(--delay);
  }

  @keyframes floatHeart {
    0% {
      transform: translateY(0) scale(0.5);
      opacity: 0;
    }
    10% {
      opacity: 0.6;
    }
    100% {
      transform: translateY(-400px) scale(1);
      opacity: 0;
    }
  }

  .no-consort {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px;
    color: var(--text-muted);
  }

  /* 侍妾卡片 */
  .consort-card {
    display: flex;
    gap: 16px;
    padding: 16px;
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(236, 72, 153, 0.03) 100%);
    border: 1px solid rgba(236, 72, 153, 0.2);
    border-radius: 12px;
    position: relative;
    z-index: 1;
    box-shadow: 0 0 15px rgba(236, 72, 153, 0.1);
  }

  .consort-avatar {
    position: relative;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
    border-radius: 50%;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 0 20px rgba(236, 72, 153, 0.4);
    animation: avatarGlow 3s ease-in-out infinite;
  }

  .consort-avatar::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    border: 2px solid rgba(236, 72, 153, 0.5);
    border-radius: 50%;
    animation: avatarRing 2.5s ease-out infinite;
  }

  @keyframes avatarGlow {
    0%,
    100% {
      box-shadow: 0 0 20px rgba(236, 72, 153, 0.4);
    }
    50% {
      box-shadow: 0 0 30px rgba(236, 72, 153, 0.7);
    }
  }

  @keyframes avatarRing {
    0% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.6;
    }
    100% {
      transform: translate(-50%, -50%) scale(1.5);
      opacity: 0;
    }
  }

  .consort-info {
    flex: 1;
  }

  .consort-name {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .consort-name .name {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .consort-name .title {
    font-size: 0.75rem;
    padding: 2px 8px;
    background: rgba(236, 72, 153, 0.1);
    color: #ec4899;
    border-radius: 4px;
  }

  .consort-personality {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 6px;
  }

  .consort-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  /* 好感度 */
  .affection-section {
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    position: relative;
    z-index: 1;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #ec4899;
    margin-bottom: 12px;
  }

  .affection-level {
    margin-left: auto;
    font-size: 0.85rem;
    padding: 2px 8px;
    background: rgba(236, 72, 153, 0.1);
    border-radius: 4px;
  }

  .affection-bar {
    height: 12px;
    background: rgba(236, 72, 153, 0.1);
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .affection-fill {
    height: 100%;
    background: linear-gradient(90deg, #ec4899, #f472b6);
    border-radius: 6px;
    transition: width 0.3s ease;
  }

  .affection-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .affection-info .bonus {
    color: #52c41a;
    font-weight: 500;
  }

  /* 技能卡片 */
  .skill-card {
    padding: 12px 16px;
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(236, 72, 153, 0.05) 100%);
    border: 1px solid rgba(236, 72, 153, 0.2);
    border-radius: 10px;
    position: relative;
    z-index: 1;
    box-shadow: 0 0 12px rgba(236, 72, 153, 0.08);
  }

  .skill-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #ec4899;
    margin-bottom: 6px;
  }

  .skill-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  /* 状态提示 */
  .buff-active,
  .assigned-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 0.85rem;
    position: relative;
    z-index: 1;
  }

  .buff-active {
    background: rgba(250, 173, 20, 0.1);
    color: #faad14;
  }

  .buff-active .buff-time {
    margin-left: auto;
    font-weight: 500;
  }

  .assigned-info {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
  }

  /* 操作按钮 */
  .actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    position: relative;
    z-index: 1;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px 16px;
    border: none;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-btn.greet {
    background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
    color: white;
  }

  .action-btn.gift {
    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
    color: white;
  }

  .action-btn.feedback {
    background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
    color: white;
  }

  .action-btn.assign,
  .action-btn.recall {
    background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
    color: white;
  }

  .action-btn:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  /* 对话框 */
  .gift-dialog,
  .assign-dialog {
    padding: 8px 0;
  }

  .gift-dialog p,
  .assign-dialog p {
    margin: 0 0 16px;
    color: var(--text-secondary);
  }

  .gift-input {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .gift-cost {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .disk-options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .disk-option {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: var(--bg-secondary);
    border: 2px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .disk-option:hover {
    border-color: #6366f1;
  }

  .disk-option.selected {
    background: rgba(99, 102, 241, 0.1);
    border-color: #6366f1;
    color: #6366f1;
  }
</style>
