<template>
  <div class="spirit-root-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-icon">
        <Scroll :size="22" />
      </div>
      <div class="header-text">
        <h2>修仙档案</h2>
        <p>灵根资质与修炼信息</p>
      </div>
    </div>

    <!-- 道号与境界 -->
    <div class="identity-card">
      <div class="identity-left">
        <div class="avatar">
          <span>{{ character?.daoName?.charAt(0) || '修' }}</span>
        </div>
        <div class="identity-info">
          <span class="dao-label">道号</span>
          <span class="dao-name">{{ character?.daoName || '未命名' }}</span>
        </div>
      </div>
      <div class="identity-right">
        <span class="realm-label">境界</span>
        <span class="realm-value" :class="`realm-tier-${character?.realm?.tier || 1}`">
          {{ playerStore.realmDisplay }}
        </span>
      </div>
    </div>

    <!-- 灵根信息卡片 -->
    <div class="spirit-root-card" v-if="spiritRoot">
      <div class="card-header">
        <Sparkles :size="18" :style="{ color: spiritRoot.color }" />
        <span>先天灵根</span>
      </div>

      <div class="root-display">
        <div
          class="root-icon"
          :style="{
            background: `linear-gradient(135deg, ${spiritRoot.color}30, ${spiritRoot.color}10)`,
            borderColor: spiritRoot.color
          }"
        >
          <Sparkles :size="32" :style="{ color: spiritRoot.color }" />
        </div>
        <div class="root-info">
          <div class="root-name" :style="{ color: spiritRoot.color }">{{ spiritRoot.name }}</div>
          <div class="root-tags">
            <span class="tag type" :style="{ color: rootTypeInfo?.color }">{{ rootTypeInfo?.label }}</span>
            <span class="tag rarity" :style="{ color: rarityInfo?.color }">{{ rarityInfo?.label }}品</span>
          </div>
          <div class="root-element">
            <Flame :size="14" />
            <span>{{ spiritRoot.element }}</span>
          </div>
        </div>
      </div>

      <div class="root-desc">「{{ spiritRoot.description }}」</div>

      <!-- 灵根加成 -->
      <div class="bonus-section">
        <div class="bonus-title">灵根加成</div>
        <div class="bonus-grid">
          <div class="bonus-item highlight">
            <Zap :size="16" />
            <span class="bonus-name">战力</span>
            <span class="bonus-val purple">+{{ spiritRoot.combatPowerBonus }}%</span>
          </div>
          <div class="bonus-item highlight">
            <TrendingUp :size="16" />
            <span class="bonus-name">修炼</span>
            <span class="bonus-val gold">+{{ spiritRoot.cultivationBonus }}%</span>
          </div>
          <div class="bonus-item" v-for="(value, key) in spiritRoot.attributes" :key="key">
            <component :is="getAttrIcon(key)" :size="16" />
            <span class="bonus-name">{{ getAttrName(key) }}</span>
            <span class="bonus-val green">+{{ value }}</span>
          </div>
        </div>
      </div>

      <!-- 五行相克 -->
      <div class="counter-section" v-if="counterElements.length > 0">
        <div class="counter-header">
          <Swords :size="16" />
          <span>五行相克</span>
        </div>
        <div class="counter-body">
          <div class="counter-row">
            <span class="counter-label">克制属性</span>
            <div class="counter-tags">
              <span v-for="el in counterElements" :key="el" class="counter-tag">{{ el }}</span>
            </div>
          </div>
          <div class="counter-effect">
            <span>额外伤害</span>
            <span class="effect-val">+15%</span>
          </div>
        </div>
        <p class="counter-note">※ 天灵根与异灵根可触发五行相克效果</p>
      </div>
    </div>

    <!-- 修为进度 -->
    <div class="section-card">
      <div class="section-header">
        <Activity :size="16" />
        <span>修为进度</span>
      </div>
      <div class="progress-content">
        <div class="progress-row">
          <span class="progress-realm">{{ playerStore.realmDisplay }}</span>
          <span class="progress-pct">{{ character?.realmProgress || 0 }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${character?.realmProgress || 0}%` }" />
        </div>
        <div class="exp-row">
          <span>当前修为</span>
          <span class="exp-val">{{ (character?.experience || 0).toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <!-- 属性面板 -->
    <div class="section-card">
      <div class="section-header">
        <BarChart3 :size="16" />
        <span>当前属性</span>
      </div>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-icon hp">
            <Heart :size="18" />
          </div>
          <div class="stat-data">
            <span class="stat-val">{{ stats?.maxHp || 0 }}</span>
            <span class="stat-name">生命</span>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-icon mp">
            <Sparkles :size="18" />
          </div>
          <div class="stat-data">
            <span class="stat-val">{{ stats?.maxMp || 0 }}</span>
            <span class="stat-name">灵力</span>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-icon attack">
            <Sword :size="18" />
          </div>
          <div class="stat-data">
            <span class="stat-val">{{ stats?.attack || 0 }}</span>
            <span class="stat-name">攻击</span>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-icon defense">
            <Shield :size="18" />
          </div>
          <div class="stat-data">
            <span class="stat-val">{{ stats?.defense || 0 }}</span>
            <span class="stat-name">防御</span>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-icon speed">
            <Wind :size="18" />
          </div>
          <div class="stat-data">
            <span class="stat-val">{{ stats?.speed || 0 }}</span>
            <span class="stat-name">速度</span>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-icon luck">
            <Star :size="18" />
          </div>
          <div class="stat-data">
            <span class="stat-val">{{ stats?.luck || 0 }}</span>
            <span class="stat-name">幸运</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 宗门信息 -->
    <div class="section-card">
      <div class="section-header">
        <Mountain :size="16" />
        <span>所属宗门</span>
      </div>
      <div class="sect-content">
        <template v-if="isLoading">
          <div class="sect-loading">加载中...</div>
        </template>
        <template v-else-if="!character?.sect">
          <div class="sect-empty">
            <Users :size="28" />
            <span class="empty-text">尚未加入宗门</span>
            <p class="empty-hint">前往坊市或秘境，寻找拜师机缘</p>
          </div>
        </template>
        <template v-else>
          <div class="sect-info">
            <span class="sect-name">{{ character.sect.name }}</span>
            <span class="sect-rank">{{ character.sect.rankName || '外门弟子' }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { usePlayerStore } from '@/stores/player'
  import { SPIRIT_ROOTS, RARITY_CONFIG, ROOT_TYPE_CONFIG, ELEMENT_COUNTER, canTriggerCounter } from '@/game/constants/spiritRoots'
  import {
    Sparkles,
    Scroll,
    TrendingUp,
    Sword,
    Shield,
    Wind,
    Star,
    Mountain,
    Users,
    Zap,
    Flame,
    Swords,
    Activity,
    Heart,
    BarChart3
  } from 'lucide-vue-next'

  const playerStore = usePlayerStore()
  const isLoading = ref(true)

  onMounted(async () => {
    try {
      await playerStore.fetchStats()
    } catch (error) {
      console.error('获取角色数据失败:', error)
    } finally {
      isLoading.value = false
    }
  })

  const character = computed(() => playerStore.character)
  const stats = computed(() => playerStore.stats)

  const spiritRoot = computed(() => {
    const rootId = character.value?.spiritRootId
    return rootId ? SPIRIT_ROOTS[rootId] : null
  })

  const rarityInfo = computed(() => {
    if (!spiritRoot.value) return null
    return RARITY_CONFIG[spiritRoot.value.rarity]
  })

  const rootTypeInfo = computed(() => {
    if (!spiritRoot.value) return null
    return ROOT_TYPE_CONFIG[spiritRoot.value.rootType]
  })

  const counterElements = computed(() => {
    if (!spiritRoot.value || !canTriggerCounter(spiritRoot.value)) return []
    const counters: string[] = []
    for (const element of spiritRoot.value.elements) {
      const targets = ELEMENT_COUNTER[element] || []
      counters.push(...targets)
    }
    return [...new Set(counters)]
  })

  const getAttrIcon = (key: string) => {
    const icons: Record<string, any> = { attack: Sword, defense: Shield, speed: Wind, luck: Star }
    return icons[key] || Star
  }

  const getAttrName = (key: string) => {
    const names: Record<string, string> = { attack: '攻击', defense: '防御', speed: '速度', luck: '幸运' }
    return names[key] || key
  }
</script>

<style scoped>
  .spirit-root-page {
    padding: 16px;
    padding-bottom: 100px;
    max-width: 500px;
    margin: 0 auto;
  }

  /* 页面标题 */
  .page-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .header-icon {
    width: 44px;
    height: 44px;
    border-radius: 4px;
    background: linear-gradient(135deg, var(--color-gold) 0%, #a08040 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1a1812;
  }

  .header-text h2 {
    margin: 0 0 2px;
    font-size: 1.1rem;
    color: var(--text-primary);
    letter-spacing: 2px;
  }

  .header-text p {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  /* 身份卡片 */
  .identity-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: linear-gradient(135deg, rgba(201, 169, 89, 0.12) 0%, rgba(160, 128, 64, 0.06) 100%);
    border: 1px solid rgba(201, 169, 89, 0.25);
    border-radius: 6px;
    margin-bottom: 14px;
  }

  .identity-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text-primary);
    border: 2px solid var(--color-gold);
  }

  .identity-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .dao-label,
  .realm-label {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .dao-name {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-gold);
    letter-spacing: 1px;
  }

  .identity-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .realm-value {
    font-size: 0.95rem;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 3px;
  }

  /* 灵根卡片 */
  .spirit-root-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 14px;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 12px;
    margin-bottom: 14px;
    border-bottom: 1px solid var(--border-color);
    font-weight: 600;
    color: var(--text-primary);
  }

  .root-display {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 14px;
  }

  .root-icon {
    width: 64px;
    height: 64px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid;
    flex-shrink: 0;
  }

  .root-info {
    flex: 1;
  }

  .root-name {
    font-size: 1.2rem;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .root-tags {
    display: flex;
    gap: 8px;
    margin-bottom: 6px;
  }

  .tag {
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 0.75rem;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.05);
  }

  .root-element {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .root-element svg {
    color: #c96a5a;
  }

  .root-desc {
    padding: 12px 14px;
    background: rgba(93, 124, 111, 0.08);
    border-left: 3px solid var(--color-primary);
    border-radius: 0 4px 4px 0;
    color: var(--text-secondary);
    font-size: 0.88rem;
    line-height: 1.7;
    margin-bottom: 14px;
  }

  /* 加成区块 */
  .bonus-section {
    background: rgba(201, 169, 89, 0.06);
    border-radius: 4px;
    padding: 12px;
  }

  .bonus-title {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 10px;
  }

  .bonus-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .bonus-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 4px;
  }

  .bonus-item.highlight {
    background: linear-gradient(135deg, rgba(201, 169, 89, 0.1) 0%, rgba(201, 169, 89, 0.05) 100%);
    border: 1px solid rgba(201, 169, 89, 0.2);
  }

  .bonus-item svg {
    color: var(--text-muted);
  }

  .bonus-item.highlight svg {
    color: var(--color-gold);
  }

  .bonus-name {
    flex: 1;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .bonus-val {
    font-weight: 700;
    font-size: 0.9rem;
  }

  .bonus-val.gold {
    color: var(--color-gold);
  }
  .bonus-val.purple {
    color: #9c7ab8;
  }
  .bonus-val.green {
    color: #7cb88a;
  }

  /* 五行相克 */
  .counter-section {
    margin-top: 14px;
    padding: 12px;
    background: rgba(201, 106, 90, 0.06);
    border: 1px solid rgba(201, 106, 90, 0.15);
    border-radius: 4px;
  }

  .counter-header {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #c96a5a;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 10px;
  }

  .counter-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .counter-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .counter-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .counter-tags {
    display: flex;
    gap: 6px;
  }

  .counter-tag {
    padding: 3px 10px;
    background: rgba(201, 106, 90, 0.15);
    border-radius: 3px;
    font-size: 0.8rem;
    color: #c96a5a;
    font-weight: 600;
  }

  .counter-effect {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    background: rgba(201, 106, 90, 0.08);
    border-radius: 4px;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .effect-val {
    color: #c96a5a;
    font-weight: 700;
  }

  .counter-note {
    margin: 10px 0 0;
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  /* 通用卡片 */
  .section-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 14px;
    margin-bottom: 12px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-gold);
    font-size: 0.88rem;
    font-weight: 600;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border-color);
  }

  /* 修炼进度 */
  .progress-content {
    background: rgba(93, 124, 111, 0.06);
    border-radius: 4px;
    padding: 12px;
  }

  .progress-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .progress-realm {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .progress-pct {
    font-size: 0.9rem;
    color: var(--color-gold);
    font-weight: 600;
  }

  .progress-bar {
    height: 10px;
    background: rgba(93, 124, 111, 0.15);
    border-radius: 5px;
    overflow: hidden;
    margin-bottom: 10px;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #5d7c6f, var(--color-gold));
    border-radius: 5px;
    transition: width 0.3s ease;
  }

  .exp-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .exp-val {
    color: var(--text-secondary);
    font-weight: 600;
  }

  /* 属性面板 */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .stat-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.12);
    border-radius: 4px;
  }

  .stat-icon {
    width: 36px;
    height: 36px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-icon.hp {
    background: rgba(155, 74, 60, 0.15);
    color: #9b4a3c;
  }
  .stat-icon.mp {
    background: rgba(93, 124, 111, 0.15);
    color: #5d7c6f;
  }
  .stat-icon.attack {
    background: rgba(201, 106, 90, 0.15);
    color: #c96a5a;
  }
  .stat-icon.defense {
    background: rgba(107, 142, 122, 0.15);
    color: #6b8e7a;
  }
  .stat-icon.speed {
    background: rgba(90, 184, 184, 0.15);
    color: #5ab8b8;
  }
  .stat-icon.luck {
    background: rgba(201, 169, 89, 0.15);
    color: #c9a959;
  }

  .stat-data {
    display: flex;
    flex-direction: column;
  }

  .stat-val {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .stat-name {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  /* 宗门信息 */
  .sect-content {
    padding: 16px;
    background: rgba(93, 124, 111, 0.05);
    border-radius: 4px;
    min-height: 80px;
  }

  .sect-loading {
    text-align: center;
    color: var(--text-muted);
    padding: 20px;
  }

  .sect-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    color: var(--text-muted);
    gap: 8px;
  }

  .empty-text {
    font-size: 0.95rem;
  }

  .empty-hint {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-muted);
    opacity: 0.8;
  }

  .sect-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .sect-name {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--color-gold);
  }

  .sect-rank {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  /* 境界颜色 */
  .realm-tier-1 {
    color: #9ca3af;
    background: rgba(156, 163, 175, 0.15);
  }
  .realm-tier-2 {
    color: #7cb88a;
    background: rgba(124, 184, 138, 0.15);
  }
  .realm-tier-3 {
    color: #6b9fc9;
    background: rgba(107, 159, 201, 0.15);
  }
  .realm-tier-4 {
    color: #9c7ab8;
    background: rgba(156, 122, 184, 0.15);
  }
  .realm-tier-5 {
    color: #c9a959;
    background: rgba(201, 169, 89, 0.15);
  }
  .realm-tier-6 {
    color: #c96a5a;
    background: rgba(201, 106, 90, 0.15);
  }
  .realm-tier-7 {
    color: #d4a5c9;
    background: rgba(212, 165, 201, 0.15);
  }
  .realm-tier-8 {
    color: #5ab8b8;
    background: rgba(90, 184, 184, 0.15);
  }
  .realm-tier-9 {
    color: #f0e6c8;
    background: rgba(240, 230, 200, 0.15);
  }

  @media (max-width: 400px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
