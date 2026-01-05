<template>
  <div class="alchemy-page">
    <!-- 标题区域 -->
    <div class="page-header">
      <div class="header-info">
        <Flame :size="24" />
        <div>
          <h1>炼丹炉</h1>
          <p>炼制丹药法宝，需先学习配方</p>
        </div>
      </div>
      <router-link to="/inventory" class="inventory-link">
        <Package :size="16" />
        <span>储物袋</span>
      </router-link>
    </div>

    <!-- Tab 导航 -->
    <div class="recipe-tabs">
      <button class="recipe-tab" :class="{ active: currentTab === 'learned' }" @click="currentTab = 'learned'">
        <BookOpen :size="14" />
        <span>已学配方</span>
        <span class="tab-badge" v-if="inventoryStore.learnedRecipes.length">{{ inventoryStore.learnedRecipes.length }}</span>
      </button>
      <button class="recipe-tab" :class="{ active: currentTab === 'all' }" @click="currentTab = 'all'">
        <Scroll :size="14" />
        <span>全部配方</span>
      </button>
    </div>

    <!-- 配方列表 -->
    <div class="recipe-list" v-if="displayRecipes.length > 0">
      <div
        v-for="recipe in displayRecipes"
        :key="recipe.id"
        class="recipe-card"
        :class="{ disabled: !recipe.learned, selected: selectedRecipe?.id === recipe.id }"
        @click="selectRecipe(recipe)"
      >
        <div class="recipe-icon" :style="{ borderColor: getQualityColor(recipe.quality) }">
          <component :is="getRecipeIcon(recipe.type)" :size="22" />
        </div>
        <div class="recipe-info">
          <div class="recipe-name" :style="{ color: getQualityColor(recipe.quality) }">
            {{ recipe.name }}
          </div>
          <div class="recipe-type">{{ getRecipeTypeName(recipe.type) }}</div>
        </div>
        <div class="recipe-status">
          <span v-if="recipe.learned" class="status-learned">
            <Check :size="14" />
          </span>
          <span v-else class="status-locked">
            <Lock :size="14" />
          </span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else>
      <Flame :size="48" />
      <span v-if="currentTab === 'learned'">尚未学习任何配方</span>
      <span v-else>暂无可用配方</span>
      <router-link to="/inventory" class="go-inventory" v-if="currentTab === 'learned'">前往储物袋学习配方</router-link>
    </div>

    <!-- 炼制详情弹窗 -->
    <NModal v-model:show="showCraftModal" preset="card" style="width: 90%; max-width: 420px">
      <template #header>
        <div class="craft-header" :style="{ color: getQualityColor(selectedRecipe?.quality) }">
          {{ selectedRecipe?.name }}
        </div>
      </template>

      <div class="craft-content" v-if="selectedRecipe">
        <!-- 配方信息 -->
        <div class="craft-info-grid">
          <div class="info-item">
            <span class="info-label">类型</span>
            <span class="info-value">{{ getRecipeTypeName(selectedRecipe.type) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">品质</span>
            <span class="info-value" :style="{ color: getQualityColor(selectedRecipe.quality) }">
              {{ getQualityName(selectedRecipe.quality) }}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">成功率</span>
            <span class="info-value">{{ selectedRecipe.successRate }}%</span>
          </div>
          <div class="info-item">
            <span class="info-label">产出</span>
            <span class="info-value">
              {{ selectedRecipe.outputQuantity }}
              <span v-if="selectedRecipe.outputQuantityBonus">
                ~{{ selectedRecipe.outputQuantity + selectedRecipe.outputQuantityBonus }}
              </span>
            </span>
          </div>
        </div>

        <!-- 配方描述 -->
        <div class="craft-desc">{{ selectedRecipe.description }}</div>

        <!-- 材料需求 -->
        <div class="materials-section">
          <h3>
            <Package :size="16" />
            <span>所需材料</span>
          </h3>
          <div class="materials-list">
            <div
              v-for="material in craftCheckResult?.materials || []"
              :key="material.itemId"
              class="material-item"
              :class="{ lacking: !material.enough }"
            >
              <span class="material-name">{{ material.itemName }}</span>
              <span class="material-count" :class="{ enough: material.enough }">{{ material.owned }} / {{ material.required }}</span>
            </div>
          </div>
          <div class="spirit-stone-cost" v-if="selectedRecipe.spiritStoneCost">
            <Coins :size="14" />
            <span>消耗灵石: {{ selectedRecipe.spiritStoneCost * craftTimes }}</span>
          </div>
        </div>

        <!-- 炼制次数 -->
        <div class="craft-times">
          <span>炼制次数</span>
          <div class="times-control">
            <button @click="craftTimes = Math.max(1, craftTimes - 1)">-</button>
            <NInputNumber v-model:value="craftTimes" :min="1" :max="craftCheckResult?.maxTimes || 1" size="small" />
            <button @click="craftTimes = Math.min(craftCheckResult?.maxTimes || 1, craftTimes + 1)">+</button>
            <button class="max-btn" @click="craftTimes = craftCheckResult?.maxTimes || 1">最大</button>
          </div>
        </div>

        <!-- 炼制按钮 -->
        <button
          class="craft-btn"
          :class="{ disabled: !craftCheckResult?.canCraft }"
          :disabled="!craftCheckResult?.canCraft || inventoryStore.craftLoading"
          @click="handleCraft"
        >
          <Flame :size="16" v-if="!inventoryStore.craftLoading" />
          <Loader :size="16" class="spinning" v-else />
          <span>{{ craftCheckResult?.canCraft ? '开始炼制' : craftCheckResult?.reason || '无法炼制' }}</span>
        </button>
      </div>
    </NModal>

    <!-- 炼制结果弹窗 -->
    <NModal v-model:show="showResultModal" preset="card" style="width: 90%; max-width: 360px">
      <template #header>
        <div class="result-header" :class="{ success: craftResult?.success, failed: !craftResult?.success }">
          {{ craftResult?.success ? '炼制完成' : '炼制失败' }}
        </div>
      </template>

      <div class="result-content" v-if="craftResult">
        <div class="result-message">{{ craftResult.message }}</div>

        <!-- 炼制详情 -->
        <div class="result-details" v-if="craftResult.craftResults?.length > 1">
          <div v-for="(result, index) in craftResult.craftResults" :key="index" class="result-item" :class="{ success: result.success }">
            <span>第 {{ index + 1 }} 次</span>
            <span v-if="result.success" class="success-text">成功 +{{ result.quantity }}</span>
            <span v-else class="fail-text">失败</span>
          </div>
        </div>

        <button class="close-result-btn" @click="showResultModal = false">确定</button>
      </div>
    </NModal>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue'
  import { useInventoryStore } from '@/stores/inventory'
  import { NModal, NInputNumber } from 'naive-ui'
  import { Flame, Package, BookOpen, Scroll, Check, Lock, Coins, Sword, Loader } from 'lucide-vue-next'
  import type { Recipe, RecipeType } from '@/game/constants/recipes'
  import type { ItemQuality } from '@/game/constants/items'

  const inventoryStore = useInventoryStore()

  // 当前标签
  const currentTab = ref<'learned' | 'all'>('learned')

  // 选中的配方
  const selectedRecipe = ref<(Recipe & { learned?: boolean }) | null>(null)
  const showCraftModal = ref(false)
  const craftTimes = ref(1)
  const craftCheckResult = ref<{
    canCraft: boolean
    reason?: string
    maxTimes: number
    materials: { itemId: string; itemName: string; required: number; owned: number; enough: boolean }[]
  } | null>(null)

  // 炼制结果
  const showResultModal = ref(false)
  const craftResult = ref<{
    success: boolean
    message: string
    outputQuantity: number
    craftResults: { success: boolean; quantity: number }[]
  } | null>(null)

  // 显示的配方
  const displayRecipes = computed(() => {
    if (currentTab.value === 'learned') {
      return inventoryStore.learnedRecipes.map(r => ({ ...r, learned: true }))
    }
    return inventoryStore.allRecipes
  })

  // 品质颜色
  const getQualityColor = (quality?: ItemQuality) => {
    const colors: Record<ItemQuality, string> = {
      common: '#9d9d9d',
      uncommon: '#1eff00',
      rare: '#0070dd',
      epic: '#a335ee',
      legendary: '#ff8000'
    }
    return colors[quality || 'common']
  }

  // 品质名称
  const getQualityName = (quality?: ItemQuality) => {
    const names: Record<ItemQuality, string> = {
      common: '普通',
      uncommon: '优秀',
      rare: '稀有',
      epic: '史诗',
      legendary: '传说'
    }
    return names[quality || 'common']
  }

  // 配方类型名称
  const getRecipeTypeName = (type?: RecipeType) => {
    const names: Record<RecipeType, string> = {
      alchemy: '炼丹',
      crafting: '炼器'
    }
    return names[type || 'alchemy']
  }

  // 配方图标
  const getRecipeIcon = (type?: RecipeType) => {
    const icons: Record<RecipeType, unknown> = {
      alchemy: Flame,
      crafting: Sword
    }
    return icons[type || 'alchemy']
  }

  // 选择配方
  const selectRecipe = async (recipe: Recipe & { learned?: boolean }) => {
    if (!recipe.learned) return

    selectedRecipe.value = recipe
    craftTimes.value = 1
    showCraftModal.value = true

    // 检查是否可炼制
    await checkCanCraft()
  }

  // 检查是否可炼制
  const checkCanCraft = async () => {
    if (!selectedRecipe.value) return

    try {
      const result = await inventoryStore.checkCanCraft(selectedRecipe.value.id, craftTimes.value)
      craftCheckResult.value = result
    } catch {
      craftCheckResult.value = { canCraft: false, reason: '检查失败', maxTimes: 0, materials: [] }
    }
  }

  // 监听炼制次数变化
  watch(craftTimes, () => {
    checkCanCraft()
  })

  // 开始炼制
  const handleCraft = async () => {
    if (!selectedRecipe.value || !craftCheckResult.value?.canCraft) return

    try {
      const result = await inventoryStore.craft(selectedRecipe.value.id, craftTimes.value)
      craftResult.value = result
      showCraftModal.value = false
      showResultModal.value = true

      // 刷新配方检查
      await checkCanCraft()
    } catch (error: unknown) {
      craftResult.value = {
        success: false,
        message: (error as Error).message || '炼制失败',
        outputQuantity: 0,
        craftResults: []
      }
      showResultModal.value = true
    }
  }

  onMounted(() => {
    inventoryStore.fetchRecipes()
    inventoryStore.fetchInventory()
  })
</script>

<style scoped>
  .alchemy-page {
    padding: 16px;
    padding-bottom: 100px;
  }

  /* 标题区域 */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .header-info {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--color-gold);
  }

  .header-info h1 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .header-info p {
    margin: 2px 0 0;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .inventory-link {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.85rem;
    transition: all 0.2s ease;
  }

  .inventory-link:hover {
    border-color: var(--color-gold);
    color: var(--color-gold);
  }

  /* Tab 导航 */
  .recipe-tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
  }

  .recipe-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-muted);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .recipe-tab:hover {
    border-color: var(--text-secondary);
    color: var(--text-secondary);
  }

  .recipe-tab.active {
    background: rgba(201, 169, 89, 0.1);
    border-color: var(--color-gold);
    color: var(--color-gold);
  }

  .tab-badge {
    min-width: 18px;
    height: 18px;
    padding: 0 6px;
    background: var(--color-gold);
    border-radius: 9px;
    font-size: 0.7rem;
    font-weight: 600;
    color: #1a1812;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* 配方列表 */
  .recipe-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .recipe-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .recipe-card:hover:not(.disabled) {
    border-color: var(--color-gold);
    transform: translateX(4px);
  }

  .recipe-card.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .recipe-card.selected {
    border-color: var(--color-gold);
    background: rgba(201, 169, 89, 0.1);
  }

  .recipe-icon {
    width: 48px;
    height: 48px;
    background: rgba(0, 0, 0, 0.2);
    border: 2px solid;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .recipe-info {
    flex: 1;
  }

  .recipe-name {
    font-weight: 600;
    font-size: 1rem;
    margin-bottom: 4px;
  }

  .recipe-type {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .recipe-status {
    flex-shrink: 0;
  }

  .status-learned {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: rgba(107, 142, 122, 0.2);
    border-radius: 50%;
    color: #7cb88a;
  }

  .status-locked {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 50%;
    color: var(--text-muted);
  }

  /* 空状态 */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 60px 20px;
    color: var(--text-muted);
  }

  .go-inventory {
    padding: 10px 20px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--color-gold);
    text-decoration: none;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .go-inventory:hover {
    border-color: var(--color-gold);
  }

  /* 炼制弹窗 */
  .craft-header {
    font-weight: 700;
    font-size: 1.1rem;
  }

  .craft-content {
    padding: 8px 0;
  }

  .craft-info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    background: var(--bg-secondary);
    border-radius: 6px;
  }

  .info-label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .info-value {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .craft-desc {
    padding: 12px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 6px;
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.5;
    margin-bottom: 16px;
  }

  /* 材料区域 */
  .materials-section {
    margin-bottom: 16px;
  }

  .materials-section h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0 0 12px;
    color: var(--text-primary);
  }

  .materials-list {
    background: var(--bg-secondary);
    border-radius: 6px;
    overflow: hidden;
  }

  .material-item {
    display: flex;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-color);
  }

  .material-item:last-child {
    border-bottom: none;
  }

  .material-item.lacking {
    background: rgba(201, 106, 90, 0.05);
  }

  .material-name {
    font-size: 0.9rem;
  }

  .material-count {
    font-size: 0.9rem;
    font-weight: 500;
    color: #c96a5a;
  }

  .material-count.enough {
    color: #7cb88a;
  }

  .spirit-stone-cost {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    padding: 10px 12px;
    background: rgba(201, 169, 89, 0.1);
    border-radius: 6px;
    font-size: 0.9rem;
    color: var(--color-gold);
  }

  /* 炼制次数 */
  .craft-times {
    margin-bottom: 16px;
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 6px;
  }

  .craft-times > span {
    display: block;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .times-control {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .times-control button {
    width: 32px;
    height: 32px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  .times-control button:hover {
    border-color: var(--color-gold);
    color: var(--text-primary);
  }

  .times-control .max-btn {
    width: auto;
    padding: 0 12px;
    font-size: 0.8rem;
  }

  .times-control :deep(.n-input-number) {
    width: 80px;
  }

  /* 炼制按钮 */
  .craft-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 20px;
    background: linear-gradient(135deg, #c9a959 0%, #a08040 100%);
    border: none;
    border-radius: 8px;
    color: #1a1812;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .craft-btn:hover:not(.disabled):not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(201, 169, 89, 0.3);
  }

  .craft-btn.disabled,
  .craft-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--bg-secondary);
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

  /* 结果弹窗 */
  .result-header {
    font-weight: 700;
    font-size: 1.1rem;
  }

  .result-header.success {
    color: #7cb88a;
  }

  .result-header.failed {
    color: #c96a5a;
  }

  .result-content {
    padding: 8px 0;
  }

  .result-message {
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 6px;
    font-size: 0.95rem;
    text-align: center;
    margin-bottom: 16px;
  }

  .result-details {
    margin-bottom: 16px;
  }

  .result-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--bg-secondary);
    border-radius: 4px;
    margin-bottom: 6px;
    font-size: 0.85rem;
  }

  .result-item.success {
    background: rgba(107, 142, 122, 0.1);
  }

  .success-text {
    color: #7cb88a;
    font-weight: 500;
  }

  .fail-text {
    color: #c96a5a;
  }

  .close-result-btn {
    width: 100%;
    padding: 12px 20px;
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    border: none;
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .close-result-btn:hover {
    transform: translateY(-2px);
  }
</style>
