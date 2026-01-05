<template>
  <div class="pve-panel">
    <!-- 血洗山林 -->
    <div class="pve-section blood-forest">
      <div class="section-header">
        <div class="header-icon forest">
          <Trees :size="20" />
        </div>
        <div class="header-info">
          <h3>血洗山林</h3>
          <p>{{ BLOOD_FOREST_CONFIG.realmName }}解锁 · 狩猎妖兽获取精魄</p>
        </div>
      </div>

      <div class="section-content">
        <!-- 状态信息 -->
        <div class="status-row">
          <div class="status-item">
            <span class="label">今日次数</span>
            <span class="value">{{ BLOOD_FOREST_CONFIG.dailyLimit - (bloodForestStatus?.dailyRemaining || 0) }}/{{ BLOOD_FOREST_CONFIG.dailyLimit }}</span>
          </div>
          <div class="status-item">
            <span class="label">消耗煞气</span>
            <span class="value cost">{{ BLOOD_FOREST_CONFIG.shaCost }}</span>
          </div>
        </div>

        <!-- 可遇敌怪列表 -->
        <div class="enemy-list">
          <div class="enemy-title">
            <Skull :size="14" />
            <span>可遇敌怪</span>
          </div>
          <div class="enemy-grid">
            <div v-for="enemy in bloodForestEnemies" :key="enemy.id" class="enemy-card">
              <span class="enemy-name">{{ enemy.name }}</span>
              <span class="enemy-power">战力×{{ enemy.powerMultiplier }}</span>
            </div>
          </div>
        </div>

        <!-- 产出说明 -->
        <div class="output-info">
          <Package :size="14" />
          <span>产出: 妖兽精魄 + 阴魂丝 + 凝血草</span>
        </div>

        <!-- 操作按钮 -->
        <button class="action-btn forest-btn" :disabled="!canRaidForest || operating" @click="handleRaidForest">
          <Loader2 v-if="operatingAction === 'forest'" :size="16" class="spin" />
          <Swords v-else :size="16" />
          {{ getForestButtonText }}
        </button>
      </div>
    </div>

    <!-- 召唤魔影 -->
    <div class="pve-section shadow-summon">
      <div class="section-header">
        <div class="header-icon shadow">
          <Ghost :size="20" />
        </div>
        <div class="header-info">
          <h3>召唤魔影</h3>
          <p>{{ SHADOW_SUMMON_CONFIG.realmName }}解锁 · 献祭妖丹召唤魔影</p>
        </div>
      </div>

      <div class="section-content">
        <!-- 状态信息 -->
        <div class="status-row">
          <div class="status-item">
            <span class="label">今日次数</span>
            <span class="value">{{ SHADOW_SUMMON_CONFIG.dailyLimit - (shadowSummonStatus?.dailyRemaining || 0) }}/{{ SHADOW_SUMMON_CONFIG.dailyLimit }}</span>
          </div>
          <div class="status-item">
            <span class="label">祭品消耗</span>
            <span class="value cost">{{ SHADOW_SUMMON_CONFIG.sacrificeItemName }} ×{{ SHADOW_SUMMON_CONFIG.sacrificeQuantity }}</span>
          </div>
        </div>

        <!-- Boss列表 -->
        <div class="boss-list">
          <div class="boss-title">
            <Flame :size="14" />
            <span>可召魔影</span>
          </div>
          <div class="boss-grid">
            <div v-for="boss in shadowBosses" :key="boss.id" class="boss-card">
              <span class="boss-name">{{ boss.name }}</span>
              <span class="boss-power">战力×{{ boss.powerMultiplier }}</span>
              <span class="boss-reward">灵石 +{{ boss.rewards.spiritStones }}</span>
            </div>
          </div>
        </div>

        <!-- 产出说明 -->
        <div class="output-info">
          <Package :size="14" />
          <span>产出: 凶兽戾魄 + 四级妖丹 + 阴魂丝</span>
        </div>

        <!-- 操作按钮 -->
        <button class="action-btn shadow-btn" :disabled="!canSummonShadow || operating" @click="handleSummonShadow">
          <Loader2 v-if="operatingAction === 'shadow'" :size="16" class="spin" />
          <Zap v-else :size="16" />
          {{ getShadowButtonText }}
        </button>
      </div>
    </div>

    <!-- 战斗结果弹窗 -->
    <Teleport to="body">
      <div v-if="showBattleResult" class="modal-overlay" @click="showBattleResult = false">
        <div class="battle-result-modal" :class="{ win: battleResult?.victory, lose: !battleResult?.victory }" @click.stop>
          <div class="result-header">
            <Trophy v-if="battleResult?.victory" :size="40" />
            <Frown v-else :size="40" />
          </div>
          <div class="result-title">
            {{ battleResult?.victory ? '战斗胜利!' : '战斗失败' }}
          </div>
          <div class="result-enemy">
            {{ battleResult?.enemyName }}
          </div>

          <div v-if="battleResult?.victory && battleResult?.rewards" class="result-rewards">
            <div v-if="battleResult.rewards.spiritStones > 0" class="reward-item">
              <Package :size="14" />
              <span>灵石</span>
              <span class="reward-count">+{{ battleResult.rewards.spiritStones }}</span>
            </div>
            <div v-for="soul in battleResult.rewards.souls" :key="soul.type" class="reward-item">
              <Package :size="14" />
              <span>{{ soul.name }}</span>
              <span class="reward-count">×{{ soul.count }}</span>
            </div>
            <div v-for="mat in battleResult.rewards.materials" :key="mat.itemId" class="reward-item">
              <Package :size="14" />
              <span>{{ mat.name }}</span>
              <span class="reward-count">×{{ mat.count }}</span>
            </div>
          </div>

          <div v-else class="result-loss">
            <span>未能战胜对手，请提升实力后再来!</span>
          </div>

          <button class="result-btn" @click="showBattleResult = false">确定</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useBloodSoulBannerStore } from '@/stores/bloodSoulBanner'
  import { usePlayerStore } from '@/stores/player'
  import { BLOOD_FOREST_CONFIG, SHADOW_SUMMON_CONFIG } from '@/game/constants/bloodSoulBanner'
  import { Trees, Skull, Package, Swords, Ghost, Flame, Zap, Loader2, Trophy, Frown } from 'lucide-vue-next'

  const bannerStore = useBloodSoulBannerStore()
  const playerStore = usePlayerStore()
  const { bloodForestStatus, shadowSummonStatus } = storeToRefs(bannerStore)

  const operatingAction = ref<'forest' | 'shadow' | null>(null)
  const showBattleResult = ref(false)
  const battleResult = ref<{
    victory: boolean
    enemyName: string
    rewards?: {
      spiritStones: number
      souls: { type: string; name: string; count: number }[]
      materials: { itemId: string; name: string; count: number }[]
    }
  } | null>(null)

  const operating = computed(() => operatingAction.value !== null)

  // 血洗山林敌怪列表
  const bloodForestEnemies = [
    { id: 'blood_wolf', name: '血煞妖狼', powerMultiplier: 0.8 },
    { id: 'red_snake', name: '赤目魔蛇', powerMultiplier: 0.9 },
    { id: 'soul_crow', name: '噬魂阴鸦', powerMultiplier: 1.0 },
    { id: 'blood_tiger', name: '血骨妖虎', powerMultiplier: 1.1 }
  ]

  // 召唤魔影Boss列表
  const shadowBosses = [
    { id: 'blood_rakshasa', name: '血狱罗刹', powerMultiplier: 1.5, rewards: { spiritStones: 500 } },
    { id: 'netherworld_king', name: '九幽冥王', powerMultiplier: 2.0, rewards: { spiritStones: 800 } },
    { id: 'demon_lord', name: '天魔尊者', powerMultiplier: 2.5, rewards: { spiritStones: 1200 } }
  ]

  const canRaidForest = computed(() => {
    // 检查境界是否达标
    const realmTier = playerStore.character?.realm?.tier || 0
    if (realmTier < BLOOD_FOREST_CONFIG.minRealm) return false

    // 检查今日剩余次数
    const dailyRemaining = bloodForestStatus.value?.dailyRemaining || 0
    if (dailyRemaining <= 0) return false

    // 检查煞气是否足够
    const currentSha = bannerStore.shaPoolStatus?.current || 0
    if (currentSha < BLOOD_FOREST_CONFIG.shaCost) return false

    return true
  })

  const canSummonShadow = computed(() => {
    // 检查境界是否达标
    const realmTier = playerStore.character?.realm?.tier || 0
    if (realmTier < SHADOW_SUMMON_CONFIG.minRealm) return false

    // 检查今日剩余次数
    const dailyRemaining = shadowSummonStatus.value?.dailyRemaining || 0
    if (dailyRemaining <= 0) return false

    // 检查祭品是否足够
    if (!shadowSummonStatus.value?.hasSacrifice) return false

    return true
  })

  const getForestButtonText = computed(() => {
    if (operatingAction.value === 'forest') return '战斗中...'

    const realmTier = playerStore.character?.realm?.tier || 0
    if (realmTier < BLOOD_FOREST_CONFIG.minRealm) return '境界不足'

    const dailyRemaining = bloodForestStatus.value?.dailyRemaining || 0
    if (dailyRemaining <= 0) return '今日已用尽'

    const currentSha = bannerStore.shaPoolStatus?.current || 0
    if (currentSha < BLOOD_FOREST_CONFIG.shaCost) return '煞气不足'

    return '血洗山林'
  })

  const getShadowButtonText = computed(() => {
    if (operatingAction.value === 'shadow') return '召唤中...'

    const realmTier = playerStore.character?.realm?.tier || 0
    if (realmTier < SHADOW_SUMMON_CONFIG.minRealm) return '境界不足'

    const dailyRemaining = shadowSummonStatus.value?.dailyRemaining || 0
    if (dailyRemaining <= 0) return '今日已用尽'

    if (!shadowSummonStatus.value?.hasSacrifice) return '祭品不足'

    return '召唤魔影'
  })

  async function handleRaidForest() {
    if (operating.value || !canRaidForest.value) return

    operatingAction.value = 'forest'
    try {
      const result = await bannerStore.raidBloodForest()
      battleResult.value = {
        victory: result.victory,
        enemyName: result.enemy.name,
        rewards: result.rewards
      }
      showBattleResult.value = true
    } finally {
      operatingAction.value = null
    }
  }

  async function handleSummonShadow() {
    if (operating.value || !canSummonShadow.value) return

    operatingAction.value = 'shadow'
    try {
      const result = await bannerStore.summonShadow()
      battleResult.value = {
        victory: result.victory,
        enemyName: result.boss.name,
        rewards: result.rewards
      }
      showBattleResult.value = true
    } finally {
      operatingAction.value = null
    }
  }

  onMounted(() => {
    bannerStore.fetchBloodForestStatus()
    bannerStore.fetchShadowSummonStatus()
  })
</script>

<style scoped>
  .pve-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .pve-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: var(--bg-secondary);
  }

  .header-icon {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
  }

  .header-icon.forest {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(21, 128, 61, 0.3) 100%);
    color: #4ade80;
  }

  .header-icon.shadow {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(88, 28, 135, 0.3) 100%);
    color: #a855f7;
  }

  .header-info h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .header-info p {
    margin: 4px 0 0;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .section-content {
    padding: 16px;
  }

  .status-row {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
  }

  .status-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    background: var(--bg-secondary);
    border-radius: 8px;
  }

  .status-item .label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .status-item .value {
    font-weight: 600;
    color: var(--text-primary);
  }

  .status-item .value.cost {
    color: #f87171;
  }

  /* 敌怪/Boss列表 */
  .enemy-list,
  .boss-list {
    margin-bottom: 12px;
  }

  .enemy-title,
  .boss-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .enemy-grid,
  .boss-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .enemy-card,
  .boss-card {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    background: var(--bg-secondary);
    border-radius: 6px;
    font-size: 0.8rem;
  }

  .enemy-name,
  .boss-name {
    font-weight: 500;
    color: var(--text-primary);
  }

  .enemy-power,
  .boss-power {
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  .boss-reward {
    color: #fbbf24;
    font-size: 0.75rem;
  }

  /* 产出信息 */
  .output-info {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 16px;
    padding: 10px 12px;
    background: rgba(74, 222, 128, 0.1);
    border-radius: 8px;
    font-size: 0.8rem;
    color: #4ade80;
  }

  /* 操作按钮 */
  .action-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn.forest-btn {
    background: linear-gradient(135deg, #15803d 0%, #4ade80 100%);
  }

  .action-btn.shadow-btn {
    background: linear-gradient(135deg, #581c87 0%, #a855f7 100%);
  }

  .action-btn:hover:not(:disabled) {
    transform: scale(1.02);
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 战斗结果弹窗 */
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

  .battle-result-modal {
    width: 90%;
    max-width: 320px;
    background: var(--bg-card);
    border-radius: 16px;
    padding: 24px;
    text-align: center;
    animation: scaleIn 0.3s ease;
  }

  .battle-result-modal.win {
    border: 2px solid #4ade80;
    box-shadow: 0 0 30px rgba(74, 222, 128, 0.3);
  }

  .battle-result-modal.lose {
    border: 2px solid #f87171;
    box-shadow: 0 0 30px rgba(248, 113, 113, 0.3);
  }

  .result-header {
    margin-bottom: 12px;
  }

  .battle-result-modal.win .result-header {
    color: #4ade80;
  }

  .battle-result-modal.lose .result-header {
    color: #f87171;
  }

  .result-title {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .result-enemy {
    font-size: 0.9rem;
    color: var(--text-muted);
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
    font-size: 0.9rem;
  }

  .reward-count {
    color: #4ade80;
    font-weight: 600;
  }

  .result-loss {
    padding: 16px;
    margin-bottom: 20px;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .result-btn {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .battle-result-modal.win .result-btn {
    background: linear-gradient(135deg, #15803d 0%, #4ade80 100%);
    color: white;
  }

  .battle-result-modal.lose .result-btn {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .result-btn:hover {
    transform: scale(1.02);
  }

  .spin {
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

  @media (max-width: 400px) {
    .status-row {
      flex-direction: column;
    }

    .enemy-grid,
    .boss-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
