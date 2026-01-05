<template>
  <div class="diplomacy-panel">
    <!-- 加载状态 -->
    <div v-if="diplomacyStore.loading" class="loading-state">
      <Loader2 :size="24" class="spinning" />
      <span>加载中...</span>
    </div>

    <!-- 非掌门提示 -->
    <template v-else>
      <!-- 掌门信息卡片 -->
      <div class="master-card">
        <div class="master-header">
          <Crown :size="18" />
          <span>本宗掌门</span>
        </div>
        <div class="master-content">
          <div v-if="diplomacyStore.masterName" class="master-info">
            <span class="master-name">{{ diplomacyStore.masterName }}</span>
            <span class="master-badge" v-if="diplomacyStore.isMaster">（你）</span>
          </div>
          <div v-else class="no-master">暂无掌门</div>
        </div>
        <div v-if="!diplomacyStore.isMaster" class="master-hint">只有掌门才能进行外交操作</div>
      </div>

      <!-- 背盟惩罚提示 -->
      <div v-if="diplomacyStore.isInAlliancePenalty" class="penalty-warning">
        <AlertTriangle :size="16" />
        <span>背盟惩罚中，剩余 {{ diplomacyStore.alliancePenaltyRemaining }}</span>
      </div>

      <!-- 待处理的结盟请求 -->
      <div v-if="diplomacyStore.pendingAllianceRequests.length > 0 && diplomacyStore.isMaster" class="alliance-requests">
        <h3 class="section-title">
          <Mail :size="16" />
          <span>待处理的结盟请求</span>
          <span class="badge">{{ diplomacyStore.pendingAllianceRequests.length }}</span>
        </h3>
        <div class="request-list">
          <div v-for="request in diplomacyStore.pendingAllianceRequests" :key="request.fromSectId" class="request-item">
            <div class="request-info">
              <span class="from-sect">{{ request.fromSectName }}</span>
              <span class="expires">{{ formatRemainingTime(request.remainingMs) }} 后过期</span>
            </div>
            <div class="request-actions">
              <button class="accept-btn" @click="handleAcceptAlliance(request.fromSectId)">
                <Check :size="14" />
                接受
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 当前外交关系 -->
      <div class="relations-section">
        <h3 class="section-title">
          <Globe :size="16" />
          <span>外交关系</span>
        </h3>

        <!-- 盟友 -->
        <div v-if="diplomacyStore.allies.length > 0" class="relation-group">
          <div class="group-header allied">
            <Handshake :size="14" />
            <span>盟友</span>
          </div>
          <div class="relation-list">
            <div v-for="relation in diplomacyStore.allies" :key="relation.sectId" class="relation-item allied">
              <span class="sect-name">{{ relation.sectName }}</span>
              <button
                v-if="diplomacyStore.isMaster"
                class="cancel-btn"
                :disabled="!relation.canChange"
                @click="handleCancelRelation(relation.sectId)"
                :title="relation.canChange ? '解除同盟' : `冷却中 ${diplomacyStore.formatCooldown(relation.cooldownRemainingMs)}`"
              >
                <X :size="12" />
              </button>
            </div>
          </div>
        </div>

        <!-- 敌对 -->
        <div v-if="diplomacyStore.enemies.length > 0" class="relation-group">
          <div class="group-header hostile">
            <Swords :size="14" />
            <span>敌对</span>
          </div>
          <div class="relation-list">
            <div v-for="relation in diplomacyStore.enemies" :key="relation.sectId" class="relation-item hostile">
              <span class="sect-name">{{ relation.sectName }}</span>
              <button
                v-if="diplomacyStore.isMaster"
                class="cancel-btn"
                :disabled="!relation.canChange"
                @click="handleCancelRelation(relation.sectId)"
                :title="relation.canChange ? '解除敌对' : `冷却中 ${diplomacyStore.formatCooldown(relation.cooldownRemainingMs)}`"
              >
                <X :size="12" />
              </button>
            </div>
          </div>
        </div>

        <!-- 友好 -->
        <div v-if="diplomacyStore.friends.length > 0" class="relation-group">
          <div class="group-header friendly">
            <Heart :size="14" />
            <span>友好</span>
          </div>
          <div class="relation-list">
            <div v-for="relation in diplomacyStore.friends" :key="relation.sectId" class="relation-item friendly">
              <span class="sect-name">{{ relation.sectName }}</span>
              <button
                v-if="diplomacyStore.isMaster"
                class="cancel-btn"
                :disabled="!relation.canChange"
                @click="handleCancelRelation(relation.sectId)"
                :title="relation.canChange ? '解除友好' : `冷却中 ${diplomacyStore.formatCooldown(relation.cooldownRemainingMs)}`"
              >
                <X :size="12" />
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="diplomacyStore.allies.length === 0 && diplomacyStore.enemies.length === 0 && diplomacyStore.friends.length === 0"
          class="no-relations"
        >
          <Globe :size="24" />
          <span>暂无特殊外交关系</span>
        </div>
      </div>

      <!-- 外交操作（仅掌门可见） -->
      <div v-if="diplomacyStore.isMaster" class="diplomacy-actions">
        <h3 class="section-title">
          <Settings :size="16" />
          <span>外交操作</span>
        </h3>

        <div class="action-form">
          <NSelect v-model:value="selectedSectId" :options="sectOptions" placeholder="选择目标宗门" class="sect-select" />

          <div v-if="selectedSectId" class="current-status">
            <span>当前关系：</span>
            <span class="status-tag" :class="currentRelationStatus" :style="{ color: getStatusColor(currentRelationStatus) }">
              {{ getStatusName(currentRelationStatus) }}
            </span>
          </div>

          <div v-if="selectedSectId" class="action-buttons">
            <button
              class="action-btn friendly"
              :disabled="currentRelationStatus === 'friendly' || currentRelationStatus === 'allied'"
              @click="handleSetFriendly"
            >
              <Heart :size="14" />
              <span>示好</span>
            </button>
            <button class="action-btn hostile" :disabled="currentRelationStatus === 'hostile'" @click="handleSetHostile">
              <Swords :size="14" />
              <span>敌对</span>
            </button>
            <button
              class="action-btn allied"
              :disabled="currentRelationStatus !== 'friendly' || diplomacyStore.isInAlliancePenalty"
              @click="handleProposeAlliance"
              :title="
                currentRelationStatus !== 'friendly' ? '需先设为友好' : diplomacyStore.isInAlliancePenalty ? '背盟惩罚中' : '发起结盟'
              "
            >
              <Handshake :size="14" />
              <span>结盟</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 外交效果说明 -->
      <div class="effects-section">
        <h3 class="section-title">
          <Info :size="16" />
          <span>外交效果</span>
        </h3>
        <div class="effects-list">
          <div class="effect-item allied">
            <Handshake :size="14" />
            <span class="effect-name">结盟</span>
            <span class="effect-desc">斗法时战力+5%</span>
          </div>
          <div class="effect-item hostile">
            <Swords :size="14" />
            <span class="effect-name">敌对</span>
            <span class="effect-desc">额外夺取15%修为/贡献</span>
          </div>
          <div class="effect-item friendly">
            <Heart :size="14" />
            <span class="effect-name">友好</span>
            <span class="effect-desc">掠夺量-5%</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useDiplomacyStore, DIPLOMACY_STATUS_CONFIG, type DiplomacyStatus } from '@/stores/diplomacy'
  import { NSelect, useMessage } from 'naive-ui'
  import { Crown, Globe, Handshake, Swords, Heart, Mail, Check, X, Settings, Info, AlertTriangle, Loader2 } from 'lucide-vue-next'

  const diplomacyStore = useDiplomacyStore()
  const message = useMessage()

  const selectedSectId = ref<string | null>(null)

  // 可选宗门列表
  const sectOptions = computed(() => {
    return diplomacyStore.otherSects.map(sect => ({
      label: sect.name,
      value: sect.id
    }))
  })

  // 当前选中宗门的关系状态
  const currentRelationStatus = computed<DiplomacyStatus>(() => {
    if (!selectedSectId.value) return 'neutral'
    const relation = diplomacyStore.getRelationWith(selectedSectId.value)
    return relation?.status || 'neutral'
  })

  // 获取状态颜色
  const getStatusColor = (status: DiplomacyStatus): string => {
    return DIPLOMACY_STATUS_CONFIG[status]?.color || '#9ca3af'
  }

  // 获取状态名称
  const getStatusName = (status: DiplomacyStatus): string => {
    return DIPLOMACY_STATUS_CONFIG[status]?.name || '中立'
  }

  // 格式化剩余时间
  const formatRemainingTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000)
    if (minutes < 60) return `${minutes}分钟`
    const hours = Math.floor(minutes / 60)
    return `${hours}小时${minutes % 60}分钟`
  }

  // 设置友好
  const handleSetFriendly = async () => {
    if (!selectedSectId.value) return
    const result = await diplomacyStore.setFriendly(selectedSectId.value)
    if (result.success) {
      message.success(result.message)
    } else {
      message.error(result.message)
    }
  }

  // 设置敌对
  const handleSetHostile = async () => {
    if (!selectedSectId.value) return
    const result = await diplomacyStore.setHostile(selectedSectId.value)
    if (result.success) {
      message.success(result.message)
    } else {
      message.error(result.message)
    }
  }

  // 发起结盟
  const handleProposeAlliance = async () => {
    if (!selectedSectId.value) return
    const result = await diplomacyStore.proposeAlliance(selectedSectId.value)
    if (result.success) {
      message.success(result.message)
    } else {
      message.error(result.message)
    }
  }

  // 接受结盟
  const handleAcceptAlliance = async (fromSectId: string) => {
    const result = await diplomacyStore.acceptAlliance(fromSectId)
    if (result.success) {
      message.success(result.message)
    } else {
      message.error(result.message)
    }
  }

  // 解除关系
  const handleCancelRelation = async (targetSectId: string) => {
    const result = await diplomacyStore.cancelRelation(targetSectId)
    if (result.success) {
      message.success(result.message)
    } else {
      message.error(result.message)
    }
  }

  onMounted(() => {
    diplomacyStore.init()
  })
</script>

<style scoped>
  .diplomacy-panel {
    padding: 4px;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px;
    color: var(--text-muted);
  }

  .spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* 掌门卡片 */
  .master-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 16px;
  }

  .master-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-gold);
    margin-bottom: 10px;
  }

  .master-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .master-info {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .master-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .master-badge {
    font-size: 0.75rem;
    padding: 2px 8px;
    background: rgba(201, 169, 89, 0.2);
    border-radius: 4px;
    color: var(--color-gold);
  }

  .no-master {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .master-hint {
    margin-top: 10px;
    font-size: 0.8rem;
    color: var(--text-muted);
    padding: 8px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 4px;
  }

  /* 背盟惩罚 */
  .penalty-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #ef4444;
    font-size: 0.85rem;
    margin-bottom: 16px;
  }

  /* 结盟请求 */
  .alliance-requests {
    background: var(--bg-card);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 16px;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px;
  }

  .badge {
    font-size: 0.7rem;
    padding: 2px 8px;
    background: rgba(59, 130, 246, 0.2);
    border-radius: 10px;
    color: #3b82f6;
  }

  .request-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .request-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px;
    background: rgba(59, 130, 246, 0.05);
    border-radius: 6px;
  }

  .request-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .from-sect {
    font-weight: 600;
    color: var(--text-primary);
  }

  .expires {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .request-actions .accept-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    border: none;
    border-radius: 4px;
    color: white;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .request-actions .accept-btn:hover {
    transform: translateY(-1px);
  }

  /* 外交关系 */
  .relations-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 16px;
  }

  .relation-group {
    margin-bottom: 12px;
  }

  .relation-group:last-child {
    margin-bottom: 0;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 8px;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .group-header.allied {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }

  .group-header.hostile {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .group-header.friendly {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }

  .relation-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .relation-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .relation-item.allied {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .relation-item.hostile {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .relation-item.friendly {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .sect-name {
    color: var(--text-primary);
  }

  .cancel-btn {
    padding: 2px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    opacity: 0.6;
    transition: all 0.2s ease;
  }

  .cancel-btn:hover:not(:disabled) {
    opacity: 1;
    color: #ef4444;
  }

  .cancel-btn:disabled {
    cursor: not-allowed;
    opacity: 0.3;
  }

  .no-relations {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 30px;
    color: var(--text-muted);
  }

  /* 外交操作 */
  .diplomacy-actions {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 16px;
  }

  .action-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sect-select {
    width: 100%;
  }

  .current-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .status-tag {
    font-weight: 600;
  }

  .action-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 12px;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn.friendly {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
  }

  .action-btn.hostile {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
  }

  .action-btn.allied {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
  }

  .action-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* 外交效果 */
  .effects-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 14px;
  }

  .effects-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .effect-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 0.85rem;
  }

  .effect-item.allied {
    background: rgba(59, 130, 246, 0.05);
    color: #3b82f6;
  }

  .effect-item.hostile {
    background: rgba(239, 68, 68, 0.05);
    color: #ef4444;
  }

  .effect-item.friendly {
    background: rgba(34, 197, 94, 0.05);
    color: #22c55e;
  }

  .effect-name {
    font-weight: 600;
    min-width: 50px;
  }

  .effect-desc {
    color: var(--text-secondary);
  }
</style>
