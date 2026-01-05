<template>
  <div class="hehuan-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-icon">
        <Heart :size="24" />
      </div>
      <div class="header-info">
        <h1>情缘三境</h1>
        <p>合欢宗秘法，以情入道</p>
      </div>
    </div>

    <!-- 被奴役状态提示 -->
    <div v-if="isEnslaved" class="enslaved-warning">
      <AlertTriangle :size="20" />
      <div class="warning-content">
        <span class="warning-title">身陷心印</span>
        <span class="warning-desc">你被 {{ enslavedInfo?.masterName }} 种下心印，沦为炉鼎</span>
      </div>
      <button class="escape-btn" :disabled="!canEscape" @click="handleEscape">
        <Unlock :size="16" />
        挣脱心印
      </button>
    </div>

    <!-- 待处理邀请 -->
    <div v-if="pendingInvites.length > 0" class="invites-section">
      <h3 class="section-title">
        <Bell :size="16" />
        待处理邀请
        <span class="badge">{{ pendingInvites.length }}</span>
      </h3>
      <div class="invite-list">
        <div v-for="invite in pendingInvites" :key="invite.id" class="invite-item">
          <div class="invite-info">
            <span class="invite-type">{{ getInviteTypeLabel(invite.type) }}</span>
            <span class="invite-from">来自 {{ invite.initiatorName }}</span>
          </div>
          <div class="invite-actions">
            <button class="accept-btn" @click="handleAcceptInvite(invite)">
              <Check :size="14" />
              接受
            </button>
            <button class="reject-btn" @click="handleRejectInvite(invite)">
              <X :size="14" />
              拒绝
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 三境 Tabs -->
    <NTabs v-model:value="activeTab" type="segment" animated class="realm-tabs">
      <!-- 第一层：凡尘缘 -->
      <NTabPane name="basic">
        <template #tab>
          <div class="tab-label">
            <Users :size="14" />
            <span>凡尘缘</span>
          </div>
        </template>
        <div class="tab-content">
          <div class="realm-card basic-realm">
            <div class="realm-header">
              <div class="realm-title">
                <span class="realm-name">凡尘缘</span>
                <span class="realm-subtitle">闭关双修</span>
              </div>
              <div class="realm-requirement" :class="{ met: meetsBasicRequirement }">
                <Lock v-if="!meetsBasicRequirement" :size="14" />
                <Unlock v-else :size="14" />
                炼气四层
              </div>
            </div>
            <p class="realm-desc">与他人闭关双修，共同提升修为。双方均可获得修为，合欢宗弟子额外+10%收益。</p>
            <div class="realm-stats">
              <div class="stat-item">
                <span class="stat-label">基础修为</span>
                <span class="stat-value">+200</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">顿悟概率</span>
                <span class="stat-value">5%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">冷却时间</span>
                <span class="stat-value">4小时</span>
              </div>
            </div>

            <div class="action-section">
              <div class="cooldown-info" v-if="basicCooldown > 0">
                <Clock :size="14" />
                <span>冷却中：{{ formatCooldown(basicCooldown) }}</span>
              </div>
              <div class="target-input" v-else>
                <NInput v-model:value="basicTargetName" placeholder="输入对方道号" />
                <button class="action-btn" :disabled="!basicTargetName || !meetsBasicRequirement" @click="handleInviteBasic">
                  <Heart :size="16" />
                  发起双修
                </button>
              </div>
            </div>
          </div>
        </div>
      </NTabPane>

      <!-- 第二层：同参道 -->
      <NTabPane name="bond">
        <template #tab>
          <div class="tab-label">
            <Link :size="14" />
            <span>同参道</span>
          </div>
        </template>
        <div class="tab-content">
          <!-- 同参状态卡片 -->
          <div class="realm-card bond-realm">
            <div class="realm-header">
              <div class="realm-title">
                <span class="realm-name">同参道</span>
                <span class="realm-subtitle">缔结同参</span>
              </div>
              <div class="realm-requirement" :class="{ met: meetsBondRequirement }">
                <Lock v-if="!meetsBondRequirement" :size="14" />
                <Unlock v-else :size="14" />
                筑基初期
              </div>
            </div>

            <!-- 已有同参 -->
            <div v-if="bondInfo" class="bond-active">
              <div class="bond-partner">
                <div class="partner-avatar">
                  <User :size="24" />
                </div>
                <div class="partner-info">
                  <span class="partner-name">{{ bondInfo.partnerName }}</span>
                  <span class="partner-realm">{{ bondInfo.partnerRealm }}</span>
                </div>
                <div class="bond-timer">
                  <Clock :size="14" />
                  <span>{{ formatTimeLeft(bondInfo.expiresAt) }}</span>
                </div>
              </div>
              <div class="bond-stats">
                <div class="stat-item">
                  <span class="stat-label">温养次数</span>
                  <span class="stat-value">{{ bondInfo.nourishCount }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">累计贡献</span>
                  <span class="stat-value">{{ bondInfo.totalContribution }}</span>
                </div>
              </div>
              <button class="action-btn nourish-btn" :disabled="nourishCooldown > 0" @click="handleNourish">
                <Sparkles :size="16" />
                {{ nourishCooldown > 0 ? `温养冷却：${formatCooldown(nourishCooldown)}` : '双修温养' }}
              </button>
            </div>

            <!-- 无同参 -->
            <div v-else class="bond-empty">
              <p class="realm-desc">与他人缔结7天同参契约，期间可进行双修温养，获得更高修为收益与宗门贡献。</p>
              <div class="realm-stats">
                <div class="stat-item">
                  <span class="stat-label">基础修为</span>
                  <span class="stat-value">+350</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">同参加成</span>
                  <span class="stat-value">+50%</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">冷却时间</span>
                  <span class="stat-value">2小时</span>
                </div>
              </div>
              <div class="target-input">
                <NInput v-model:value="bondTargetName" placeholder="输入对方道号" />
                <button class="action-btn" :disabled="!bondTargetName || !meetsBondRequirement" @click="handleInviteBond">
                  <Link :size="16" />
                  缔结同参
                </button>
              </div>
            </div>
          </div>
        </div>
      </NTabPane>

      <!-- 第三层：魔染道 -->
      <NTabPane name="imprint">
        <template #tab>
          <div class="tab-label">
            <Flame :size="14" />
            <span>魔染道</span>
          </div>
        </template>
        <div class="tab-content">
          <div class="realm-card imprint-realm">
            <div class="realm-header">
              <div class="realm-title">
                <span class="realm-name">魔染道</span>
                <span class="realm-subtitle">种下心印</span>
              </div>
              <div class="realm-requirement" :class="{ met: meetsImprintRequirement }">
                <Lock v-if="!meetsImprintRequirement" :size="14" />
                <Unlock v-else :size="14" />
                金丹初期
              </div>
            </div>
            <p class="realm-desc warning-text">通过心神之战，将他人化为炉鼎，可从其身上采补修为。此为魔道禁术，需谨慎行事。</p>
            <div class="realm-stats">
              <div class="stat-item">
                <span class="stat-label">采补修为</span>
                <span class="stat-value">+500</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">奴役时长</span>
                <span class="stat-value">3天</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">最大炉鼎</span>
                <span class="stat-value">3</span>
              </div>
            </div>

            <!-- 发起心神之战 -->
            <div class="action-section">
              <div class="target-input">
                <NInput v-model:value="soulBattleTargetName" placeholder="输入目标道号" />
                <button
                  class="action-btn danger-btn"
                  :disabled="!soulBattleTargetName || !meetsImprintRequirement || slaves.length >= 3"
                  @click="handleSoulBattle"
                >
                  <Skull :size="16" />
                  心神之战
                </button>
              </div>
            </div>
          </div>

          <!-- 炉鼎列表 -->
          <div v-if="slaves.length > 0" class="slaves-section">
            <h3 class="section-title">
              <Users :size="16" />
              炉鼎列表
              <span class="count">{{ slaves.length }}/3</span>
            </h3>
            <div class="slaves-list">
              <div v-for="slave in slaves" :key="slave.id" class="slave-item">
                <div class="slave-info">
                  <div class="slave-avatar">
                    <User :size="20" />
                  </div>
                  <div class="slave-details">
                    <span class="slave-name">{{ slave.targetName }}</span>
                    <span class="slave-realm">{{ slave.targetRealm }}</span>
                  </div>
                </div>
                <div class="slave-stats">
                  <span class="stat">采补 {{ slave.harvestCount }} 次</span>
                  <span class="timer">
                    <Clock :size="12" />
                    {{ formatTimeLeft(slave.expiresAt) }}
                  </span>
                </div>
                <button class="harvest-btn" :disabled="slave.cooldown > 0" @click="handleHarvest(slave.id)">
                  <Zap :size="14" />
                  {{ slave.cooldown > 0 ? formatCooldown(slave.cooldown) : '采补' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </NTabPane>
    </NTabs>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { hehuanApi, extractErrorMessage } from '@/api'
  import { usePlayerStore } from '@/stores/player'
  import { NTabs, NTabPane, NInput, useMessage } from 'naive-ui'
  import {
    Heart,
    Users,
    Link,
    Flame,
    Lock,
    Unlock,
    Clock,
    Bell,
    Check,
    X,
    User,
    Sparkles,
    Skull,
    Zap,
    AlertTriangle
  } from 'lucide-vue-next'

  const message = useMessage()
  const playerStore = usePlayerStore()

  const activeTab = ref('basic')
  const loading = ref(false)

  // 输入框
  const basicTargetName = ref('')
  const bondTargetName = ref('')
  const soulBattleTargetName = ref('')

  // 状态数据
  const isEnslaved = ref(false)
  const enslavedInfo = ref<{ masterName: string; masterId: string } | null>(null)
  const canEscape = ref(false)
  const pendingInvites = ref<any[]>([])
  const bondInfo = ref<any>(null)
  const slaves = ref<any[]>([])

  // 冷却时间
  const basicCooldown = ref(0)
  const nourishCooldown = ref(0)

  // 境界要求检查
  const meetsBasicRequirement = computed(() => {
    const char = playerStore.character
    if (!char?.realm) return false
    return char.realm.tier > 1 || (char.realm.tier === 1 && char.realm.subTier >= 4)
  })

  const meetsBondRequirement = computed(() => {
    const char = playerStore.character
    if (!char?.realm) return false
    return char.realm.tier >= 2
  })

  const meetsImprintRequirement = computed(() => {
    const char = playerStore.character
    if (!char?.realm) return false
    return char.realm.tier >= 3
  })

  // 格式化冷却时间
  function formatCooldown(ms: number): string {
    if (ms <= 0) return '可用'
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    if (hours > 0) return `${hours}时${minutes}分`
    return `${minutes}分钟`
  }

  // 格式化剩余时间
  function formatTimeLeft(timestamp: number): string {
    const now = Date.now()
    const diff = timestamp - now
    if (diff <= 0) return '已到期'

    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)

    if (days > 0) return `${days}天${hours}时`
    return `${hours}小时`
  }

  // 获取邀请类型标签
  function getInviteTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      basic: '闭关双修',
      bond: '缔结同参',
      nourish: '双修温养'
    }
    return labels[type] || type
  }

  // 加载状态
  async function loadStatus() {
    try {
      loading.value = true
      const { data } = await hehuanApi.getStatus()

      // 更新状态
      isEnslaved.value = data.isEnslaved || false
      enslavedInfo.value = data.enslavedInfo || null
      canEscape.value = data.canEscape || false
      pendingInvites.value = data.pendingInvites || []
      bondInfo.value = data.bondInfo || null
      slaves.value = data.slaves || []
      basicCooldown.value = data.basicCooldown || 0
      nourishCooldown.value = data.nourishCooldown || 0
    } catch (error) {
      message.error(extractErrorMessage(error, '获取状态失败'))
    } finally {
      loading.value = false
    }
  }

  // 发起闭关双修
  async function handleInviteBasic() {
    try {
      const { data } = await hehuanApi.inviteBasicDual(basicTargetName.value)
      message.success(data.message || '双修邀请已发送')
      basicTargetName.value = ''
    } catch (error) {
      message.error(extractErrorMessage(error, '发送邀请失败'))
    }
  }

  // 发起缔结同参
  async function handleInviteBond() {
    try {
      const { data } = await hehuanApi.inviteSoulBond(bondTargetName.value)
      message.success(data.message || '同参邀请已发送')
      bondTargetName.value = ''
    } catch (error) {
      message.error(extractErrorMessage(error, '发送邀请失败'))
    }
  }

  // 双修温养
  async function handleNourish() {
    try {
      const { data } = await hehuanApi.initiateNourish()
      message.success(data.message || '温养邀请已发送')
      await loadStatus()
    } catch (error) {
      message.error(extractErrorMessage(error, '发起温养失败'))
    }
  }

  // 发起心神之战
  async function handleSoulBattle() {
    try {
      const { data } = await hehuanApi.initiateSoulBattle(soulBattleTargetName.value)
      if (data.success) {
        message.success(data.message || '心神之战胜利，目标已成为你的炉鼎')
      } else {
        message.warning(data.message || '心神之战失败')
      }
      soulBattleTargetName.value = ''
      await loadStatus()
    } catch (error) {
      message.error(extractErrorMessage(error, '心神之战失败'))
    }
  }

  // 采补炉鼎
  async function handleHarvest(slaveId: string) {
    try {
      const { data } = await hehuanApi.harvestSlave(slaveId)
      message.success(data.message || `采补成功，获得 ${data.expGain} 修为`)
      await loadStatus()
      await playerStore.fetchStats()
    } catch (error) {
      message.error(extractErrorMessage(error, '采补失败'))
    }
  }

  // 挣脱心印
  async function handleEscape() {
    try {
      const { data } = await hehuanApi.attemptEscape()
      if (data.escaped) {
        message.success('成功挣脱心印！')
      } else {
        message.warning(data.message || '挣脱失败，被反噬采补')
      }
      await loadStatus()
      await playerStore.fetchStats()
    } catch (error) {
      message.error(extractErrorMessage(error, '挣脱失败'))
    }
  }

  // 接受邀请
  async function handleAcceptInvite(invite: any) {
    try {
      if (invite.type === 'basic') {
        await hehuanApi.acceptBasicDual(invite.id)
      } else if (invite.type === 'bond') {
        await hehuanApi.acceptSoulBond(invite.id)
      } else if (invite.type === 'nourish') {
        await hehuanApi.acceptNourish(invite.id)
      }
      message.success('已接受邀请')
      await loadStatus()
      await playerStore.fetchStats()
    } catch (error) {
      message.error(extractErrorMessage(error, '接受邀请失败'))
    }
  }

  // 拒绝邀请
  async function handleRejectInvite(invite: any) {
    try {
      if (invite.type === 'basic') {
        await hehuanApi.rejectBasicDual(invite.id)
      } else if (invite.type === 'bond') {
        await hehuanApi.rejectSoulBond(invite.id)
      }
      message.success('已拒绝邀请')
      await loadStatus()
    } catch (error) {
      message.error(extractErrorMessage(error, '拒绝邀请失败'))
    }
  }

  onMounted(() => {
    loadStatus()
  })
</script>

<style scoped>
  .hehuan-page {
    padding: 16px;
    padding-bottom: 100px;
  }

  /* 页面头部 */
  .page-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
  }

  .header-icon {
    width: 48px;
    height: 48px;
    background: rgba(236, 72, 153, 0.15);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ec4899;
  }

  .header-info h1 {
    font-size: 1.3rem;
    font-weight: 700;
    margin: 0 0 4px;
    color: var(--text-primary);
  }

  .header-info p {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin: 0;
  }

  /* 被奴役警告 */
  .enslaved-warning {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    margin-bottom: 16px;
    color: #ef4444;
  }

  .warning-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .warning-title {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .warning-desc {
    font-size: 0.8rem;
    opacity: 0.9;
  }

  .escape-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 4px;
    color: #ef4444;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .escape-btn:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.3);
  }

  .escape-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 邀请区域 */
  .invites-section {
    margin-bottom: 20px;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px;
  }

  .badge {
    padding: 2px 8px;
    background: rgba(236, 72, 153, 0.2);
    border-radius: 10px;
    font-size: 0.75rem;
    color: #ec4899;
  }

  .invite-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .invite-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
  }

  .invite-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .invite-type {
    font-size: 0.85rem;
    font-weight: 600;
    color: #ec4899;
  }

  .invite-from {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .invite-actions {
    display: flex;
    gap: 8px;
  }

  .accept-btn,
  .reject-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .accept-btn {
    background: rgba(34, 197, 94, 0.15);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #22c55e;
  }

  .accept-btn:hover {
    background: rgba(34, 197, 94, 0.25);
  }

  .reject-btn {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }

  .reject-btn:hover {
    background: rgba(239, 68, 68, 0.25);
  }

  /* Tab 样式 */
  .realm-tabs {
    margin-top: 10px;
  }

  .realm-tabs :deep(.n-tabs-rail) {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 4px;
  }

  .realm-tabs :deep(.n-tabs-capsule) {
    background: rgba(236, 72, 153, 0.2);
    border-radius: 6px;
  }

  .realm-tabs :deep(.n-tabs-tab) {
    padding: 8px 12px;
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .realm-tabs :deep(.n-tabs-tab--active) {
    color: #ec4899 !important;
    font-weight: 600;
  }

  .tab-label {
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }

  .tab-content {
    padding: 16px 4px;
  }

  /* 境界卡片 */
  .realm-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 18px;
  }

  .realm-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .realm-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .realm-name {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .realm-subtitle {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .realm-requirement {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 4px;
    font-size: 0.75rem;
    color: #ef4444;
  }

  .realm-requirement.met {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }

  .realm-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0 0 16px;
  }

  .warning-text {
    color: #f59e0b;
  }

  .realm-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 8px;
    background: var(--bg-secondary);
    border-radius: 6px;
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .stat-value {
    font-size: 0.95rem;
    font-weight: 600;
    color: #ec4899;
  }

  /* 操作区域 */
  .action-section {
    margin-top: 16px;
  }

  .cooldown-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: rgba(107, 114, 128, 0.1);
    border-radius: 6px;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .target-input {
    display: flex;
    gap: 10px;
  }

  .target-input :deep(.n-input) {
    flex: 1;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 20px;
    background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .action-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .danger-btn {
    background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  }

  .danger-btn:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  .nourish-btn {
    width: 100%;
    padding: 12px;
    justify-content: center;
  }

  /* 同参激活状态 */
  .bond-active {
    margin-top: 16px;
  }

  .bond-partner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: rgba(236, 72, 153, 0.05);
    border: 1px solid rgba(236, 72, 153, 0.2);
    border-radius: 8px;
    margin-bottom: 14px;
  }

  .partner-avatar {
    width: 44px;
    height: 44px;
    background: rgba(236, 72, 153, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ec4899;
  }

  .partner-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .partner-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .partner-realm {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .bond-timer {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: #ec4899;
  }

  .bond-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 14px;
  }

  .bond-empty {
    margin-top: 12px;
  }

  /* 炉鼎列表 */
  .slaves-section {
    margin-top: 20px;
  }

  .count {
    font-size: 0.8rem;
    color: var(--text-muted);
    font-weight: normal;
  }

  .slaves-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .slave-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-left: 3px solid #ef4444;
    border-radius: 8px;
  }

  .slave-info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
  }

  .slave-avatar {
    width: 36px;
    height: 36px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ef4444;
  }

  .slave-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .slave-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  .slave-realm {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .slave-stats {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .slave-stats .stat {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .slave-stats .timer {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: #ef4444;
  }

  .harvest-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 14px;
    background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
    border: none;
    border-radius: 4px;
    color: white;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .harvest-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .harvest-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--bg-secondary);
    color: var(--text-muted);
  }
</style>
