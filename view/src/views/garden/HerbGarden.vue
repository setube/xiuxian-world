<template>
  <div class="herb-garden-page">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <Loader :size="32" class="spinning" />
      <span>正在加载药园...</span>
    </div>

    <!-- 非黄枫谷弟子 -->
    <div v-else-if="!isHuangFeng" class="no-access">
      <div class="no-access-icon">
        <LeafyGreen :size="64" />
      </div>
      <h2>无法进入药园</h2>
      <p>只有黄枫谷弟子才能使用药园功能</p>
      <router-link to="/sect/my" class="back-link">
        <ArrowLeft :size="16" />
        返回宗门
      </router-link>
    </div>

    <!-- 药园主界面 -->
    <template v-else>
      <!-- 背景装饰粒子 -->
      <div class="garden-particles">
        <div v-for="i in 12" :key="i" class="particle" :style="{ '--delay': i * 0.5 + 's', '--x': Math.random() * 100 + '%' }" />
      </div>

      <!-- 顶部信息栏 -->
      <div class="garden-header">
        <div class="header-glow" />
        <div class="header-left">
          <div class="garden-icon-wrapper">
            <div class="icon-glow" />
            <LeafyGreen :size="24" class="garden-icon" />
          </div>
          <div class="header-info">
            <h1>黄枫谷药园</h1>
            <div class="header-meta">
              <span class="plot-count">
                <Sprout :size="12" />
                {{ unlockedCount }}/{{ maxPlots }} 灵田
              </span>
              <span v-if="gardenStore.isAlchemyElder" class="elder-badge">
                <Crown :size="12" />
                丹道长老
              </span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button v-if="gardenStore.canExpand" class="expand-btn" @click="showExpandModal = true">
            <Plus :size="16" />
            扩建
          </button>
          <button v-if="canBecomeElder" class="elder-btn" @click="showElderModal = true">
            <Sparkles :size="16" />
            晋升长老
          </button>
        </div>
      </div>

      <!-- Tab 导航 -->
      <NTabs v-model:value="activeTab" type="segment" animated class="garden-tabs">
        <!-- 灵田 Tab -->
        <NTabPane name="plots">
          <template #tab>
            <div class="tab-label">
              <Grid3x3 :size="14" />
              <span>灵田</span>
            </div>
          </template>
          <div class="tab-content">
            <!-- 需要处理的事件提示 -->
            <div v-if="gardenStore.plotsWithEvents.length > 0" class="events-alert">
              <AlertTriangle :size="16" />
              <span>{{ gardenStore.plotsWithEvents.length }} 块灵田需要处理事件</span>
            </div>

            <!-- 普通灵田区 -->
            <div class="plot-section">
              <h3 class="section-title">
                <Sprout :size="16" />
                <span>凡俗灵田</span>
                <span class="section-count">({{ normalUnlockedCount }}/{{ maxNormalPlots }})</span>
              </h3>
              <div class="plots-grid">
                <div v-for="plotIndex in 8" :key="'normal-' + (plotIndex - 1)" class="plot-wrapper">
                  <PlotCard
                    :plot="getPlotByIndex(plotIndex - 1)"
                    :index="plotIndex - 1"
                    :isLocked="isPlotLocked(plotIndex - 1)"
                    @plant="openPlantModal"
                    @harvest="handleHarvest"
                    @handle-event="handleEvent"
                  />
                </div>
              </div>
            </div>

            <!-- 长老灵田区 -->
            <div class="plot-section elder-section" :class="{ locked: !gardenStore.isAlchemyElder }">
              <h3 class="section-title">
                <Crown :size="16" />
                <span>长老灵田</span>
                <span v-if="!gardenStore.isAlchemyElder" class="locked-hint">(需晋升丹道长老)</span>
              </h3>
              <div class="plots-grid">
                <div v-for="plotIndex in 3" :key="'elder-' + (plotIndex + 7)" class="plot-wrapper">
                  <PlotCard
                    :plot="getPlotByIndex(plotIndex + 7)"
                    :index="plotIndex + 7"
                    :isLocked="!gardenStore.isAlchemyElder"
                    :isElderPlot="true"
                    @plant="openPlantModal"
                    @harvest="handleHarvest"
                    @handle-event="handleEvent"
                    @explore="openExploreModal"
                  />
                </div>
              </div>
            </div>
          </div>
        </NTabPane>

        <!-- 种子 Tab -->
        <NTabPane name="seeds">
          <template #tab>
            <div class="tab-label">
              <Flower2 :size="14" />
              <span>种子</span>
            </div>
          </template>
          <div class="tab-content">
            <div class="seeds-grid">
              <div v-for="seed in gardenStore.seeds" :key="seed.id" class="seed-card" :class="{ 'no-stock': seed.owned <= 0 }">
                <div class="seed-header">
                  <span class="seed-name" :style="{ color: getQualityColor(seed.quality) }">
                    {{ seed.name }}
                  </span>
                  <span class="seed-count">x{{ seed.owned }}</span>
                </div>
                <p class="seed-desc">{{ seed.description }}</p>
                <div class="seed-info">
                  <span class="info-item">
                    <Clock :size="12" />
                    {{ seed.growthHours }}小时
                  </span>
                  <span class="info-item">
                    <Package :size="12" />
                    {{ seed.yieldMin }}-{{ seed.yieldMax }}
                  </span>
                  <span v-if="seed.requiredPlotType === 'elder'" class="info-item elder-only">
                    <Crown :size="12" />
                    长老专属
                  </span>
                </div>
              </div>
              <div v-if="gardenStore.seeds.length === 0" class="no-seeds">
                <Flower2 :size="32" />
                <span>暂无可用种子</span>
                <p>前往宗门宝库购买种子</p>
              </div>
            </div>
          </div>
        </NTabPane>

        <!-- 洞天寻宝 Tab (仅太上长老) -->
        <NTabPane v-if="canExplore" name="explore">
          <template #tab>
            <div class="tab-label">
              <Compass :size="14" />
              <span>寻宝</span>
            </div>
          </template>
          <div class="tab-content">
            <div class="explore-header">
              <div class="explore-info">
                <h3>
                  <Compass :size="20" />
                  洞天寻宝
                </h3>
                <p>在长老灵田中探寻远古秘境，可能遭遇妖兽或发现宝藏</p>
              </div>
              <div class="explore-limit">
                <span>今日剩余：{{ gardenStore.remainingExploreToday }}/3</span>
              </div>
            </div>

            <!-- 战斗状态 -->
            <div v-if="gardenStore.inCombat" class="combat-panel">
              <CombatView
                :combat="gardenStore.exploreStatus?.combat"
                :loading="gardenStore.actionLoading"
                @attack="handleCombatAction('attack')"
                @flee="handleCombatAction('flee')"
              />
            </div>

            <!-- 选择灵田探索 -->
            <div v-else class="explore-plots">
              <h4>选择灵田进行探索</h4>
              <div class="explore-plot-list">
                <div
                  v-for="plotIndex in 3"
                  :key="'explore-' + (plotIndex + 7)"
                  class="explore-plot-item"
                  :class="{ disabled: gardenStore.remainingExploreToday <= 0 }"
                  @click="startExplore(plotIndex + 7)"
                >
                  <div class="explore-plot-icon">
                    <TreeDeciduous :size="24" />
                  </div>
                  <div class="explore-plot-info">
                    <span class="explore-plot-name">{{ plotIndex + 8 }}号灵田</span>
                    <span class="explore-plot-hint">点击开始探索</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </NTabPane>
      </NTabs>
    </template>

    <!-- 播种弹窗 -->
    <NModal v-model:show="showPlantModal" preset="card" style="width: 90%; max-width: 400px">
      <template #header>
        <div class="modal-header">
          <Sprout :size="18" />
          <span>选择种子</span>
        </div>
      </template>
      <div class="plant-modal-content">
        <p class="plant-hint">选择要种植在第 {{ selectedPlotIndex + 1 }} 号灵田的种子：</p>
        <div class="seed-select-list">
          <div
            v-for="seed in availableSeedsForPlot"
            :key="seed.id"
            class="seed-select-item"
            :class="{ disabled: seed.owned <= 0 }"
            @click="selectSeed(seed)"
          >
            <div class="seed-select-left">
              <span class="seed-select-name" :style="{ color: getQualityColor(seed.quality) }">
                {{ seed.name }}
              </span>
              <span class="seed-select-time">
                <Clock :size="12" />
                {{ seed.growthHours }}小时
              </span>
            </div>
            <span class="seed-select-count">x{{ seed.owned }}</span>
          </div>
          <div v-if="availableSeedsForPlot.length === 0" class="no-available-seeds">没有可用的种子</div>
        </div>
      </div>
    </NModal>

    <!-- 扩建弹窗 -->
    <NModal v-model:show="showExpandModal" preset="dialog" type="info">
      <template #header>
        <span>扩建药园</span>
      </template>
      <div class="expand-modal-content">
        <p>
          消耗
          <strong>{{ gardenStore.expansionCost }}</strong>
          宗门贡献扩建一块灵田？
        </p>
        <p class="expand-hint">当前灵田数量：{{ normalUnlockedCount }}/{{ maxNormalPlots }}</p>
      </div>
      <template #action>
        <NButton @click="showExpandModal = false">取消</NButton>
        <NButton type="primary" :loading="gardenStore.actionLoading" @click="handleExpand">确认扩建</NButton>
      </template>
    </NModal>

    <!-- 晋升长老弹窗 -->
    <NModal v-model:show="showElderModal" preset="dialog" type="info">
      <template #header>
        <span>晋升丹道长老</span>
      </template>
      <div class="elder-modal-content">
        <div class="elder-benefits">
          <h4>晋升后可获得：</h4>
          <ul>
            <li>解锁3块长老专属灵田</li>
            <li>可种植金叶仙草等稀有种子</li>
            <li>解锁洞天寻宝功能</li>
          </ul>
        </div>
        <div class="elder-cost">
          <p>
            消耗
            <strong>5000</strong>
            宗门贡献
          </p>
          <p class="requirement-hint">要求：筑基中期以上</p>
        </div>
      </div>
      <template #action>
        <NButton @click="showElderModal = false">取消</NButton>
        <NButton type="primary" :loading="gardenStore.actionLoading" @click="handleBecomeElder">确认晋升</NButton>
      </template>
    </NModal>

    <!-- 探索开始弹窗 -->
    <NModal v-model:show="showExploreResultModal" preset="card" style="width: 90%; max-width: 400px" :closable="!gardenStore.inCombat">
      <template #header>
        <div class="modal-header">
          <Compass :size="18" />
          <span>探索结果</span>
        </div>
      </template>
      <div class="explore-result-content">
        <div v-if="exploreResult" class="explore-result">
          <p class="result-message">{{ exploreResult.message }}</p>
          <!-- 战斗遭遇 -->
          <div v-if="exploreResult.combat?.inCombat" class="encounter-monster">
            <AlertTriangle :size="24" class="monster-alert" />
            <p>
              遭遇
              <strong>{{ exploreResult.combat.monster?.name }}</strong>
              ！
            </p>
            <NButton type="warning" @click="goToCombat">进入战斗</NButton>
          </div>
          <!-- 直接奖励 -->
          <div v-else-if="exploreResult.rewards" class="direct-rewards">
            <h4>获得奖励：</h4>
            <div class="reward-list">
              <span v-if="exploreResult.rewards.spiritStones" class="reward-item">
                <Coins :size="14" />
                {{ exploreResult.rewards.spiritStones }} 灵石
              </span>
              <span v-for="item in exploreResult.rewards.items" :key="item.itemId" class="reward-item">
                <Package :size="14" />
                {{ item.itemName }} x{{ item.quantity }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </NModal>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue'
  import { useHerbGardenStore, type PlotInfo, type SeedWithOwned } from '@/stores/herbGarden'
  import { useSectStore } from '@/stores/sect'

  // 探索结果类型
  interface ExploreResultData {
    message?: string
    combat?: {
      inCombat: boolean
      monster?: { name: string }
    }
    rewards?: {
      spiritStones?: number
      items?: { itemId: string; itemName: string; quantity: number }[]
    }
  }
  import { getQualityColor, GARDEN_EXPANSION } from '@/game/constants/herbGarden'
  import { NModal, NButton, NTabs, NTabPane, useMessage } from 'naive-ui'
  import PlotCard from './components/PlotCard.vue'
  import CombatView from './components/CombatView.vue'
  import {
    LeafyGreen,
    Sprout,
    Crown,
    Plus,
    Sparkles,
    Grid3x3,
    Flower2,
    Compass,
    Clock,
    Package,
    AlertTriangle,
    Loader,
    ArrowLeft,
    TreeDeciduous,
    Coins
  } from 'lucide-vue-next'

  const gardenStore = useHerbGardenStore()
  const sectStore = useSectStore()
  const message = useMessage()

  const loading = ref(true)
  const activeTab = ref('plots')
  const showPlantModal = ref(false)
  const showExpandModal = ref(false)
  const showElderModal = ref(false)
  const showExploreResultModal = ref(false)
  const selectedPlotIndex = ref(0)
  const exploreResult = ref<ExploreResultData | null>(null)

  // 是否黄枫谷弟子
  const isHuangFeng = computed(() => {
    return sectStore.mySect?.sectId === 'huangfeng'
  })

  // 最大普通灵田数
  const maxNormalPlots = computed(() => GARDEN_EXPANSION.maxNormalPlots)

  // 最大总灵田数
  const maxPlots = computed(() => {
    return gardenStore.isAlchemyElder ? 11 : maxNormalPlots.value
  })

  // 已解锁灵田数
  const unlockedCount = computed(() => {
    const normal = gardenStore.garden?.unlockedNormalPlots || 0
    const elder = gardenStore.isAlchemyElder ? 3 : 0
    return normal + elder
  })

  // 普通灵田已解锁数
  const normalUnlockedCount = computed(() => {
    return gardenStore.garden?.unlockedNormalPlots || 0
  })

  // 是否可晋升长老
  const canBecomeElder = computed(() => {
    if (gardenStore.isAlchemyElder) return false
    return gardenStore.garden?.canBecomeElder?.can || false
  })

  // 是否可探索（太上长老）
  const canExplore = computed(() => {
    return gardenStore.isAlchemyElder && sectStore.mySect?.rank === 'elder'
  })

  // 根据索引获取地块
  const getPlotByIndex = (index: number): PlotInfo | null => {
    return gardenStore.getPlot(index) || null
  }

  // 判断地块是否锁定
  const isPlotLocked = (index: number): boolean => {
    const plot = gardenStore.getPlot(index)
    return plot?.isLocked ?? true
  }

  // 可用于当前地块的种子
  const availableSeedsForPlot = computed(() => {
    const plot = gardenStore.getPlot(selectedPlotIndex.value)
    if (!plot) return []

    return gardenStore.seeds.filter(seed => {
      if (seed.owned <= 0) return false
      if (seed.requiredPlotType === 'any') return true
      if (seed.requiredPlotType === 'elder' && plot.plotType === 'elder') return true
      if (seed.requiredPlotType === 'normal' && plot.plotType === 'normal') return true
      return false
    })
  })

  // 打开播种弹窗
  const openPlantModal = (plotIndex: number) => {
    selectedPlotIndex.value = plotIndex
    showPlantModal.value = true
  }

  // 选择种子播种
  const selectSeed = async (seed: SeedWithOwned) => {
    if (seed.owned <= 0) {
      message.warning('种子数量不足')
      return
    }

    try {
      await gardenStore.plant(selectedPlotIndex.value, seed.id)
      message.success(`成功播种 ${seed.name}`)
      showPlantModal.value = false
    } catch (error) {
      message.error((error as Error).message || '播种失败')
    }
  }

  // 采收
  const handleHarvest = async (plotIndex: number) => {
    try {
      const result = await gardenStore.harvest(plotIndex)
      if (result.items && result.items.length > 0) {
        const itemNames = result.items.map((i: { itemName: string; quantity: number }) => `${i.itemName}x${i.quantity}`).join(', ')
        message.success(`采收成功！获得：${itemNames}`)
      } else {
        message.success('采收成功！')
      }
    } catch (error) {
      message.error((error as Error).message || '采收失败')
    }
  }

  // 处理事件
  const handleEvent = async (plotIndex: number, action: 'weed' | 'pesticide' | 'water') => {
    try {
      await gardenStore.handleEvent(plotIndex, action)
      message.success('处理成功！')
    } catch (error) {
      message.error((error as Error).message || '处理失败')
    }
  }

  // 扩建药园
  const handleExpand = async () => {
    try {
      await gardenStore.expandGarden()
      message.success('扩建成功！')
      showExpandModal.value = false
    } catch (error) {
      message.error((error as Error).message || '扩建失败')
    }
  }

  // 晋升丹道长老
  const handleBecomeElder = async () => {
    try {
      await gardenStore.becomeElder()
      message.success('恭喜晋升丹道长老！')
      showElderModal.value = false
    } catch (error) {
      message.error((error as Error).message || '晋升失败')
    }
  }

  // 打开探索弹窗
  const openExploreModal = async (plotIndex: number) => {
    if (gardenStore.remainingExploreToday <= 0) {
      message.warning('今日探索次数已用尽')
      return
    }
    await startExplore(plotIndex)
  }

  // 开始探索
  const startExplore = async (plotIndex: number) => {
    if (gardenStore.remainingExploreToday <= 0) {
      message.warning('今日探索次数已用尽')
      return
    }

    try {
      const result = await gardenStore.startExplore(plotIndex)
      exploreResult.value = result as ExploreResultData
      showExploreResultModal.value = true
    } catch (error) {
      message.error((error as Error).message || '探索失败')
    }
  }

  // 进入战斗
  const goToCombat = () => {
    showExploreResultModal.value = false
    activeTab.value = 'explore'
  }

  // 战斗行动
  const handleCombatAction = async (action: 'attack' | 'flee') => {
    try {
      const result = await gardenStore.combat(action)

      if (result.combatEnded) {
        if (result.victory) {
          let rewardMsg = '战斗胜利！'
          if (result.rewards) {
            if (result.rewards.spiritStones) {
              rewardMsg += ` 获得 ${result.rewards.spiritStones} 灵石`
            }
            if (result.rewards.items && result.rewards.items.length > 0) {
              const itemNames = result.rewards.items.map(i => `${i.itemName}x${i.quantity}`).join(', ')
              rewardMsg += `, ${itemNames}`
            }
          }
          message.success(rewardMsg)
        } else if (action === 'flee') {
          message.info(result.success ? '成功逃跑！' : '逃跑失败！')
        } else {
          message.warning('战斗失败...')
        }
      }
    } catch (error) {
      message.error((error as Error).message || '行动失败')
    }
  }

  // 初始化
  onMounted(async () => {
    try {
      await sectStore.init()
      if (isHuangFeng.value) {
        await Promise.all([gardenStore.fetchGarden(), gardenStore.fetchSeeds(), gardenStore.fetchExploreStatus()])
      }
    } finally {
      loading.value = false
    }
  })

  // 定期刷新药园状态
  let refreshTimer: ReturnType<typeof setInterval> | null = null

  watch(
    () => isHuangFeng.value,
    val => {
      if (val) {
        // 每分钟刷新一次
        refreshTimer = setInterval(() => {
          gardenStore.fetchGarden()
        }, 60000)
      } else if (refreshTimer) {
        clearInterval(refreshTimer)
      }
    },
    { immediate: true }
  )
</script>

<style scoped>
  .herb-garden-page {
    padding-bottom: 100px;
    position: relative;
    overflow: hidden;
  }

  /* ========== 装饰粒子效果 ========== */
  .garden-particles {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .particle {
    position: absolute;
    width: 6px;
    height: 6px;
    background: radial-gradient(circle, rgba(93, 124, 111, 0.6) 0%, transparent 70%);
    border-radius: 50%;
    left: var(--x);
    animation: floatParticle 8s ease-in-out infinite;
    animation-delay: var(--delay);
    opacity: 0;
  }

  .particle::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background: inherit;
    border-radius: inherit;
    filter: blur(2px);
  }

  @keyframes floatParticle {
    0% {
      transform: translateY(100vh) rotate(0deg);
      opacity: 0;
    }
    10% {
      opacity: 0.8;
    }
    90% {
      opacity: 0.8;
    }
    100% {
      transform: translateY(-20vh) rotate(360deg);
      opacity: 0;
    }
  }

  /* 加载状态 */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 16px;
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

  /* 无权限状态 */
  .no-access {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    padding: 40px 20px;
  }

  .no-access-icon {
    width: 120px;
    height: 120px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
    color: var(--text-muted);
  }

  .no-access h2 {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0 0 8px;
    color: var(--text-primary);
  }

  .no-access p {
    color: var(--text-muted);
    margin: 0 0 24px;
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    border: 1px solid rgba(201, 169, 89, 0.3);
    border-radius: 4px;
    color: var(--text-primary);
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .back-link:hover {
    transform: translateY(-2px);
  }

  /* 顶部信息栏 */
  .garden-header {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: linear-gradient(135deg, rgba(93, 124, 111, 0.15) 0%, rgba(93, 124, 111, 0.05) 50%, transparent 100%);
    border-bottom: 1px solid rgba(93, 124, 111, 0.2);
    overflow: hidden;
    z-index: 1;
  }

  .header-glow {
    position: absolute;
    top: -50%;
    left: -10%;
    width: 120%;
    height: 200%;
    background: radial-gradient(ellipse at center, rgba(93, 124, 111, 0.1) 0%, transparent 60%);
    animation: headerGlow 4s ease-in-out infinite alternate;
    pointer-events: none;
  }

  @keyframes headerGlow {
    0% {
      opacity: 0.5;
      transform: translateX(-5%);
    }
    100% {
      opacity: 1;
      transform: translateX(5%);
    }
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
    z-index: 1;
  }

  .garden-icon-wrapper {
    position: relative;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-glow {
    position: absolute;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(93, 124, 111, 0.4) 0%, transparent 70%);
    border-radius: 50%;
    animation: iconPulse 2s ease-in-out infinite;
  }

  @keyframes iconPulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.6;
    }
    50% {
      transform: scale(1.3);
      opacity: 0.3;
    }
  }

  .garden-icon {
    color: #5d7c6f;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 0 4px rgba(93, 124, 111, 0.5));
  }

  .header-info h1 {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0 0 4px;
    color: var(--text-primary);
  }

  .header-meta {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .plot-count {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .elder-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    padding: 2px 8px;
    background: rgba(201, 169, 89, 0.15);
    border-radius: 10px;
    color: var(--color-gold);
  }

  .header-actions {
    display: flex;
    gap: 8px;
    position: relative;
    z-index: 1;
  }

  .expand-btn,
  .elder-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .expand-btn {
    background: var(--bg-card);
    color: var(--text-primary);
  }

  .expand-btn:hover {
    border-color: #5d7c6f;
    color: #5d7c6f;
  }

  .elder-btn {
    background: rgba(201, 169, 89, 0.1);
    border-color: rgba(201, 169, 89, 0.3);
    color: var(--color-gold);
  }

  .elder-btn:hover {
    background: rgba(201, 169, 89, 0.2);
  }

  /* Tab 样式 */
  .garden-tabs {
    margin-top: 10px;
    padding: 0 12px;
  }

  .garden-tabs :deep(.n-tabs-rail) {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 4px;
  }

  .garden-tabs :deep(.n-tabs-capsule) {
    background: rgba(93, 124, 111, 0.2);
    border-radius: 6px;
  }

  .garden-tabs :deep(.n-tabs-tab) {
    padding: 8px 12px;
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .garden-tabs :deep(.n-tabs-tab:hover) {
    color: var(--text-primary);
  }

  .garden-tabs :deep(.n-tabs-tab--active) {
    color: #5d7c6f !important;
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

  /* 事件警告 */
  .events-alert {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(250, 173, 20, 0.1);
    border: 1px solid rgba(250, 173, 20, 0.3);
    border-radius: 6px;
    margin-bottom: 16px;
    color: #faad14;
    font-size: 0.85rem;
    animation: alertPulse 2s ease-in-out infinite;
    position: relative;
    overflow: hidden;
  }

  .events-alert::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(250, 173, 20, 0.2), transparent);
    animation: alertShine 3s ease-in-out infinite;
  }

  @keyframes alertPulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(250, 173, 20, 0.3);
    }
    50% {
      box-shadow: 0 0 12px 2px rgba(250, 173, 20, 0.2);
    }
  }

  @keyframes alertShine {
    0% {
      left: -100%;
    }
    50%, 100% {
      left: 100%;
    }
  }

  /* 灵田区块 */
  .plot-section {
    margin-bottom: 24px;
    position: relative;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px;
    padding-left: 12px;
    position: relative;
  }

  .section-title::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 70%;
    background: linear-gradient(180deg, #5d7c6f, rgba(93, 124, 111, 0.3));
    border-radius: 2px;
  }

  .section-title svg {
    color: #5d7c6f;
    filter: drop-shadow(0 0 3px rgba(93, 124, 111, 0.4));
  }

  .section-count {
    font-weight: 400;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .locked-hint {
    font-weight: 400;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .elder-section {
    position: relative;
    padding: 16px;
    margin: 0 -4px;
    background: linear-gradient(135deg, rgba(201, 169, 89, 0.05) 0%, transparent 100%);
    border: 1px solid rgba(201, 169, 89, 0.15);
    border-radius: 12px;
  }

  .elder-section .section-title::before {
    background: linear-gradient(180deg, #c9a959, rgba(201, 169, 89, 0.3));
  }

  .elder-section .section-title svg {
    color: #c9a959;
    filter: drop-shadow(0 0 3px rgba(201, 169, 89, 0.5));
  }

  .elder-section.locked {
    opacity: 0.6;
  }

  .plots-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  @media (max-width: 480px) {
    .plots-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* 种子列表 */
  .seeds-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .seed-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 14px;
    transition: all 0.2s ease;
  }

  .seed-card.no-stock {
    opacity: 0.5;
  }

  .seed-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .seed-name {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .seed-count {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .seed-desc {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin: 0 0 10px;
  }

  .seed-info {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .info-item.elder-only {
    color: var(--color-gold);
  }

  .no-seeds {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px 20px;
    color: var(--text-muted);
    text-align: center;
  }

  .no-seeds p {
    margin: 0;
    font-size: 0.85rem;
  }

  /* 探索区域 */
  .explore-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
  }

  .explore-info h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 8px;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .explore-info p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .explore-limit {
    font-size: 0.85rem;
    color: var(--color-gold);
  }

  .explore-plots h4 {
    margin: 0 0 12px;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .explore-plot-list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .explore-plot-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .explore-plot-item:hover:not(.disabled) {
    border-color: #5d7c6f;
    transform: translateY(-2px);
  }

  .explore-plot-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .explore-plot-icon {
    color: #5d7c6f;
  }

  .explore-plot-info {
    text-align: center;
  }

  .explore-plot-name {
    display: block;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
    margin-bottom: 2px;
  }

  .explore-plot-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* 弹窗样式 */
  .modal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #5d7c6f;
  }

  .plant-modal-content {
    max-height: 400px;
    overflow-y: auto;
  }

  .plant-hint {
    margin: 0 0 16px;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .seed-select-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .seed-select-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .seed-select-item:hover:not(.disabled) {
    border-color: #5d7c6f;
  }

  .seed-select-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .seed-select-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .seed-select-name {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .seed-select-time {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .seed-select-count {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .no-available-seeds {
    text-align: center;
    padding: 20px;
    color: var(--text-muted);
  }

  /* 扩建弹窗 */
  .expand-modal-content {
    text-align: center;
  }

  .expand-modal-content strong {
    color: var(--color-gold);
  }

  .expand-hint {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  /* 长老弹窗 */
  .elder-modal-content {
    text-align: left;
  }

  .elder-benefits {
    margin-bottom: 16px;
  }

  .elder-benefits h4 {
    margin: 0 0 8px;
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  .elder-benefits ul {
    margin: 0;
    padding-left: 20px;
    color: var(--text-secondary);
  }

  .elder-benefits li {
    margin-bottom: 4px;
    font-size: 0.85rem;
  }

  .elder-cost {
    padding: 12px;
    background: rgba(201, 169, 89, 0.1);
    border-radius: 6px;
    text-align: center;
  }

  .elder-cost p {
    margin: 0;
  }

  .elder-cost strong {
    color: var(--color-gold);
  }

  .requirement-hint {
    margin-top: 8px !important;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  /* 探索结果弹窗 */
  .explore-result-content {
    text-align: center;
  }

  .result-message {
    font-size: 0.95rem;
    color: var(--text-primary);
    margin: 0 0 16px;
  }

  .encounter-monster {
    padding: 20px;
    background: rgba(250, 173, 20, 0.1);
    border-radius: 8px;
  }

  .monster-alert {
    color: #faad14;
    margin-bottom: 8px;
  }

  .encounter-monster p {
    margin: 0 0 12px;
  }

  .encounter-monster strong {
    color: #f5222d;
  }

  .direct-rewards {
    text-align: left;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
  }

  .direct-rewards h4 {
    margin: 0 0 12px;
    font-size: 0.9rem;
    color: #52c41a;
  }

  .reward-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .reward-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
    color: var(--color-gold);
  }

  /* 战斗面板 */
  .combat-panel {
    margin-top: 16px;
  }
</style>
