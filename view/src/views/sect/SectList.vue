<template>
  <div class="sect-list-page">
    <div class="page-header">
      <h1 class="page-title">
        <Building2 :size="24" />
        <span>拜入宗门</span>
      </h1>
      <p class="page-desc">散修之路艰辛，拜入宗门方有依仗</p>
    </div>

    <!-- 冷却提示 -->
    <div v-if="sectStore.isInLeaveCooldown" class="cooldown-notice">
      <Clock :size="18" />
      <span>叛门冷却中：{{ sectStore.leaveCooldownRemaining }}后可拜入新宗门</span>
    </div>

    <!-- 已有宗门提示 -->
    <div v-if="sectStore.hasSect" class="has-sect-notice">
      <Info :size="18" />
      <span>你已是{{ sectStore.currentSect?.name }}弟子</span>
      <router-link to="/sect/my" class="link-btn">查看我的宗门</router-link>
    </div>

    <!-- 阵营筛选 -->
    <div class="filter-tabs">
      <button
        v-for="tab in alignmentTabs"
        :key="tab.value"
        class="filter-tab"
        :class="{ active: currentAlignment === tab.value }"
        @click="currentAlignment = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 宗门列表 -->
    <div class="sect-grid">
      <div
        v-for="sect in filteredSects"
        :key="sect.id"
        class="sect-card"
        :class="[`alignment-${sect.alignment}`]"
        :style="{ '--sect-color': sect.color }"
      >
        <div class="sect-header">
          <div class="sect-icon" :style="{ background: sect.color + '20', color: sect.color }">
            <component :is="getIcon(sect.icon)" :size="28" />
          </div>
          <div class="sect-title">
            <h3 class="sect-name">{{ sect.name }}</h3>
            <span class="sect-alignment" :class="sect.alignment">
              {{ getAlignmentLabel(sect.alignment) }}
            </span>
          </div>
        </div>

        <p class="sect-desc">{{ sect.description }}</p>

        <div class="sect-features">
          <div v-for="(feature, index) in sect.features.slice(0, 3)" :key="index" class="feature-item">
            <Sparkles :size="14" />
            <span class="feature-name">{{ feature.name }}</span>
          </div>
        </div>

        <div class="sect-info">
          <div class="info-item">
            <MapPin :size="14" />
            <span>{{ sect.location }}</span>
          </div>
          <div class="info-item">
            <Coins :size="14" />
            <span>日俸 {{ sect.baseSalary }} 灵石</span>
          </div>
        </div>

        <div class="sect-actions">
          <button class="detail-btn" @click="showSectDetail(sect)">
            <Eye :size="16" />
            <span>详情</span>
          </button>
          <button
            class="join-btn"
            :class="{ disabled: !canJoin(sect.id).canJoin }"
            :disabled="!canJoin(sect.id).canJoin"
            @click="handleJoin(sect)"
          >
            <UserPlus :size="16" />
            <span>{{ canJoin(sect.id).canJoin ? '拜入' : canJoin(sect.id).reason }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 宗门详情弹窗 -->
    <NModal v-model:show="showDetailModal" preset="card" :style="{ width: '480px' }">
      <template #header>
        <div class="detail-header" v-if="selectedSect">
          <div class="detail-icon" :style="{ background: selectedSect.color + '20', color: selectedSect.color }">
            <component :is="getIcon(selectedSect.icon)" :size="24" />
          </div>
          <span>{{ selectedSect.name }}</span>
        </div>
      </template>

      <div class="detail-content" v-if="selectedSect">
        <div class="detail-section">
          <h4 class="section-title">宗门背景</h4>
          <p class="lore-text">{{ selectedSect.lore }}</p>
        </div>

        <div class="detail-section">
          <h4 class="section-title">宗门特性</h4>
          <div class="features-list">
            <div v-for="(feature, index) in selectedSect.features" :key="index" class="feature-detail">
              <div class="feature-header">
                <Sparkles :size="16" :style="{ color: selectedSect.color }" />
                <span class="feature-title">{{ feature.name }}</span>
              </div>
              <p class="feature-desc">{{ feature.description }}</p>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="section-title">每日福利</h4>
          <div class="daily-bonus" v-if="selectedSect.dailyBonus">
            <Gift :size="16" />
            <span>{{ selectedSect.dailyBonus.description }}</span>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="section-title">入门条件</h4>
          <div class="requirements">
            <div class="req-item" v-if="selectedSect.requirements.minRealm">
              <span class="req-label">最低境界：</span>
              <span class="req-value">{{ getRealmName(selectedSect.requirements.minRealm) }}</span>
            </div>
            <div class="req-item" v-if="selectedSect.requirements.spiritRootTypes">
              <span class="req-label">灵根要求：</span>
              <span class="req-value">{{ getRootTypeNames(selectedSect.requirements.spiritRootTypes) }}</span>
            </div>
            <div class="req-item" v-if="!selectedSect.requirements.minRealm && !selectedSect.requirements.spiritRootTypes">
              <span class="req-value">无特殊要求</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="detail-footer">
          <NButton @click="showDetailModal = false">关闭</NButton>
          <NButton type="primary" :disabled="!selectedSect || !canJoin(selectedSect.id).canJoin" @click="handleJoin(selectedSect!)">
            {{ selectedSect && canJoin(selectedSect.id).canJoin ? '拜入宗门' : canJoin(selectedSect?.id || '').reason }}
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- 确认拜入弹窗 -->
    <NModal v-model:show="showConfirmModal" preset="dialog" :style="{ width: '400px' }">
      <template #header>
        <span>确认拜入</span>
      </template>
      <div class="confirm-content" v-if="selectedSect">
        <p>
          确定要拜入
          <strong :style="{ color: selectedSect.color }">{{ selectedSect.name }}</strong>
          吗？
        </p>
        <p class="confirm-hint">拜入后将获得宗门特性加成和每日福利。</p>
      </div>
      <template #action>
        <NButton @click="showConfirmModal = false">取消</NButton>
        <NButton type="primary" :loading="sectStore.loading" @click="confirmJoin">确认拜入</NButton>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useSectStore } from '@/stores/sect'
  import { NModal, NButton, useMessage } from 'naive-ui'
  import {
    Building2,
    Clock,
    Info,
    MapPin,
    Coins,
    Eye,
    UserPlus,
    Sparkles,
    Gift,
    // 宗门图标
    Leaf,
    Sword,
    Heart,
    Star,
    Sun,
    Skull,
    Rabbit
  } from 'lucide-vue-next'
  import type { Sect } from '@/game/constants/sects'

  const router = useRouter()
  const sectStore = useSectStore()
  const message = useMessage()

  // 筛选标签
  const alignmentTabs = [
    { label: '全部', value: 'all' },
    { label: '正道', value: 'righteous' },
    { label: '中立', value: 'neutral' },
    { label: '魔道', value: 'demonic' }
  ]

  const currentAlignment = ref<string>('all')

  // 筛选后的宗门列表
  const filteredSects = computed(() => {
    const allSects = sectStore.getAllSects()
    if (currentAlignment.value === 'all') {
      return allSects
    }
    return allSects.filter(sect => sect.alignment === currentAlignment.value)
  })

  // 弹窗状态
  const showDetailModal = ref(false)
  const showConfirmModal = ref(false)
  const selectedSect = ref<Sect | null>(null)

  // 检查是否可以加入
  const canJoin = (sectId: string) => {
    return sectStore.canJoinSect(sectId)
  }

  // 显示宗门详情
  const showSectDetail = (sect: Sect) => {
    selectedSect.value = sect
    showDetailModal.value = true
  }

  // 处理拜入
  const handleJoin = (sect: Sect) => {
    const check = canJoin(sect.id)
    if (!check.canJoin) {
      message.warning(check.reason || '无法拜入')
      return
    }
    selectedSect.value = sect
    showDetailModal.value = false
    showConfirmModal.value = true
  }

  // 确认拜入
  const confirmJoin = async () => {
    if (!selectedSect.value) return

    const result = await sectStore.joinSect(selectedSect.value.id)
    if (result.success) {
      message.success(result.message)
      showConfirmModal.value = false
      router.push('/sect/my')
    } else {
      message.error(result.message)
    }
  }

  // 获取图标组件
  const getIcon = (iconName: string) => {
    const icons: Record<string, unknown> = {
      Leaf,
      Eye: Sun, // 用 Sun 代替 Eye
      Heart,
      Star,
      Rabbit,
      Skull,
      Sword,
      Sun
    }
    return icons[iconName] || Star
  }

  // 获取阵营标签
  const getAlignmentLabel = (alignment: string): string => {
    const labels: Record<string, string> = {
      righteous: '正道',
      neutral: '中立',
      demonic: '魔道'
    }
    return labels[alignment] || alignment
  }

  // 获取境界名称
  const getRealmName = (tier: number): string => {
    const names: Record<number, string> = {
      1: '炼气期',
      2: '筑基期',
      3: '结丹期',
      4: '元婴期',
      5: '化神期',
      6: '炼虚期'
    }
    return names[tier] || '未知'
  }

  // 获取灵根类型名称
  const getRootTypeNames = (types: string[]): string => {
    const names: Record<string, string> = {
      heavenly: '天灵根',
      variant: '异灵根',
      true: '真灵根',
      pseudo: '伪灵根',
      waste: '废灵根'
    }
    return types.map(t => names[t] || t).join('、')
  }

  // 初始化时加载宗门状态
  onMounted(() => {
    sectStore.init()
  })
</script>

<style scoped>
  .sect-list-page {
    padding: 16px;
    padding-bottom: 100px;
  }

  .page-header {
    text-align: center;
    margin-bottom: 24px;
  }

  .page-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 8px;
  }

  .page-desc {
    color: var(--text-muted);
    margin: 0;
  }

  /* 提示 */
  .cooldown-notice,
  .has-sect-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 16px;
    font-size: 0.9rem;
  }

  .cooldown-notice {
    background: rgba(201, 106, 90, 0.1);
    border: 1px solid rgba(201, 106, 90, 0.3);
    color: #c96a5a;
  }

  .has-sect-notice {
    background: rgba(107, 142, 122, 0.1);
    border: 1px solid rgba(107, 142, 122, 0.3);
    color: #6b8e7a;
  }

  .link-btn {
    color: var(--color-gold);
    text-decoration: none;
    margin-left: 8px;
  }

  .link-btn:hover {
    text-decoration: underline;
  }

  /* 筛选标签 */
  .filter-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .filter-tab {
    padding: 8px 20px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .filter-tab:hover {
    border-color: var(--color-gold);
    color: var(--text-primary);
  }

  .filter-tab.active {
    background: rgba(201, 169, 89, 0.1);
    border-color: var(--color-gold);
    color: var(--color-gold);
  }

  /* 宗门网格 */
  .sect-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  /* 宗门卡片 */
  .sect-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 20px;
    transition: all 0.3s ease;
  }

  .sect-card:hover {
    transform: translateY(-4px);
    border-color: var(--sect-color);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .sect-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 14px;
  }

  .sect-icon {
    width: 56px;
    height: 56px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sect-title {
    flex: 1;
  }

  .sect-name {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0 0 4px;
    color: var(--text-primary);
  }

  .sect-alignment {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 2px;
  }

  .sect-alignment.righteous {
    background: rgba(107, 142, 122, 0.2);
    color: #7cb88a;
  }

  .sect-alignment.neutral {
    background: rgba(201, 169, 89, 0.2);
    color: #c9a959;
  }

  .sect-alignment.demonic {
    background: rgba(201, 106, 90, 0.2);
    color: #c96a5a;
  }

  .sect-desc {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0 0 14px;
  }

  .sect-features {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: rgba(201, 169, 89, 0.08);
    border-radius: 4px;
    font-size: 0.8rem;
    color: var(--color-gold);
  }

  .sect-info {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--border-color);
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .sect-actions {
    display: flex;
    gap: 10px;
  }

  .detail-btn,
  .join-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 16px;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .detail-btn {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
  }

  .detail-btn:hover {
    border-color: var(--color-gold);
    color: var(--text-primary);
  }

  .join-btn {
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    border: 1px solid rgba(201, 169, 89, 0.3);
    color: var(--text-primary);
  }

  .join-btn:hover:not(.disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(93, 124, 111, 0.3);
  }

  .join-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    font-size: 0.8rem;
  }

  /* 详情弹窗 */
  .detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.2rem;
    font-weight: 700;
  }

  .detail-icon {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .detail-content {
    max-height: 60vh;
    overflow-y: auto;
  }

  .detail-section {
    margin-bottom: 20px;
  }

  .detail-section:last-child {
    margin-bottom: 0;
  }

  .section-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0 0 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border-color);
  }

  .lore-text {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.8;
    margin: 0;
  }

  .features-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .feature-detail {
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .feature-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .feature-title {
    font-weight: 600;
    color: var(--text-primary);
  }

  .feature-desc {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .daily-bonus {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: rgba(201, 169, 89, 0.08);
    border-radius: 4px;
    color: var(--color-gold);
  }

  .requirements {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .req-item {
    display: flex;
    gap: 8px;
  }

  .req-label {
    color: var(--text-muted);
  }

  .req-value {
    color: var(--text-primary);
  }

  .detail-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  /* 确认弹窗 */
  .confirm-content {
    text-align: center;
  }

  .confirm-content p {
    margin: 0 0 10px;
  }

  .confirm-content strong {
    font-weight: 700;
  }

  .confirm-hint {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  @media (max-width: 640px) {
    .sect-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
