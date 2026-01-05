<template>
  <div class="inventory-page">
    <!-- 容量信息 -->
    <div class="capacity-bar">
      <div class="capacity-info">
        <Package :size="18" />
        <span>储物袋</span>
        <span class="capacity-text">{{ inventoryStore.capacity.used }} / {{ inventoryStore.capacity.total }}</span>
      </div>
      <div class="capacity-progress">
        <div
          class="capacity-fill"
          :style="{ width: inventoryStore.capacity.percentage + '%' }"
          :class="{ warning: inventoryStore.capacity.percentage > 80, full: inventoryStore.isFull }"
        />
      </div>
    </div>

    <!-- 筛选 Tab -->
    <NTabs v-model:value="currentFilter" type="segment" animated class="filter-tabs">
      <NTab v-for="tab in filterTabs" :key="tab.value" :name="tab.value">
        <div class="tab-label">
          <component :is="tab.icon" :size="14" />
          <span>{{ tab.label }}</span>
          <span class="tab-count" v-if="getTypeCount(tab.value) > 0">{{ getTypeCount(tab.value) }}</span>
        </div>
      </NTab>
    </NTabs>

    <!-- 物品列表 -->
    <div class="items-grid" v-if="filteredItems.length > 0">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="item-card"
        :class="{ selected: selectedItem?.id === item.id }"
        @click="selectItem(item)"
      >
        <div class="item-icon" :style="{ borderColor: getQualityColor(item.template?.quality) }">
          <component :is="getItemIcon(item.template?.type)" :size="20" />
          <span class="item-quantity" v-if="item.quantity > 1">{{ item.quantity }}</span>
        </div>
        <div class="item-info">
          <div class="item-name" :style="{ color: getQualityColor(item.template?.quality) }">
            {{ item.template?.name || item.itemId }}
          </div>
          <div class="item-type">{{ getTypeName(item.template?.type) }}</div>
        </div>
        <div class="item-bound" v-if="item.isBound">
          <Lock :size="12" />
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else>
      <PackageOpen :size="48" />
      <span>{{ currentFilter === 'all' ? '储物袋空空如也' : '没有该类型的物品' }}</span>
    </div>

    <!-- 物品详情弹窗 -->
    <NModal v-model:show="showDetail" preset="card" style="width: 90%; max-width: 400px">
      <template #header>
        <div class="detail-header" :style="{ color: getQualityColor(selectedItem?.template?.quality) }">
          {{ selectedItem?.template?.name }}
        </div>
      </template>

      <div class="detail-content" v-if="selectedItem">
        <!-- 物品信息 -->
        <div class="detail-row">
          <span class="detail-label">品质</span>
          <span class="detail-value" :style="{ color: getQualityColor(selectedItem.template?.quality) }">
            {{ getQualityName(selectedItem.template?.quality) }}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">类型</span>
          <span class="detail-value">{{ getTypeName(selectedItem.template?.type) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">数量</span>
          <span class="detail-value">{{ selectedItem.quantity }}</span>
        </div>
        <div class="detail-row" v-if="selectedItem.isBound">
          <span class="detail-label">绑定</span>
          <span class="detail-value bound">已绑定</span>
        </div>

        <!-- 物品描述 -->
        <div class="detail-desc" v-if="selectedItem.template?.description">
          {{ selectedItem.template.description }}
        </div>

        <!-- 使用效果 -->
        <div class="detail-effect" v-if="selectedItem.template?.useEffect">
          <Sparkles :size="14" />
          <span>{{ getEffectDescription(selectedItem.template.useEffect) }}</span>
        </div>

        <!-- 操作数量 -->
        <div class="action-quantity" v-if="selectedItem.quantity > 1">
          <span>操作数量</span>
          <div class="quantity-control">
            <button @click="actionQuantity = Math.max(1, actionQuantity - 1)">-</button>
            <NInputNumber v-model:value="actionQuantity" :min="1" :max="selectedItem.quantity" size="small" />
            <button @click="actionQuantity = Math.min(selectedItem.quantity, actionQuantity + 1)">+</button>
            <button class="max-btn" @click="actionQuantity = selectedItem.quantity">最大</button>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <button v-if="selectedItem.template?.usable" class="action-btn use-btn" :disabled="actionLoading" @click="handleUseItem">
            <Zap :size="14" />
            <span>使用</span>
          </button>
          <button
            v-if="selectedItem.template?.type === 'recipe'"
            class="action-btn learn-btn"
            :disabled="actionLoading"
            @click="handleLearnRecipe"
          >
            <BookOpen :size="14" />
            <span>学习</span>
          </button>
          <button
            v-if="selectedItem.template?.tradeable && !selectedItem.isBound"
            class="action-btn gift-btn"
            @click="showGiftModal = true"
          >
            <Gift :size="14" />
            <span>赠送</span>
          </button>
          <button class="action-btn discard-btn" :disabled="actionLoading" @click="handleDiscardItem">
            <Trash2 :size="14" />
            <span>丢弃</span>
          </button>
        </div>
      </div>
    </NModal>

    <!-- 赠送弹窗 -->
    <NModal v-model:show="showGiftModal" preset="card" style="width: 90%; max-width: 360px">
      <template #header>
        <div class="gift-header">
          <Gift :size="18" />
          <span>赠送物品</span>
        </div>
      </template>

      <div class="gift-content">
        <div class="gift-item-info">
          <span>{{ selectedItem?.template?.name }}</span>
          <span class="gift-quantity">x{{ actionQuantity }}</span>
        </div>

        <div class="gift-target">
          <NInput v-model:value="giftTargetName" placeholder="输入道友名称" />
        </div>

        <div class="gift-actions">
          <NButton @click="showGiftModal = false">取消</NButton>
          <NButton type="primary" :loading="actionLoading" :disabled="!giftTargetName" @click="handleGiftItem">确认赠送</NButton>
        </div>
      </div>
    </NModal>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue'
  import { useInventoryStore } from '@/stores/inventory'
  import { NModal, NInputNumber, NInput, NButton, NTabs, NTab, useMessage } from 'naive-ui'
  import {
    Package,
    PackageOpen,
    Lock,
    Sparkles,
    Zap,
    BookOpen,
    Gift,
    Trash2,
    Flame,
    Sword,
    Scroll,
    Box,
    Sprout
  } from 'lucide-vue-next'
  import type { ItemType, ItemQuality, ItemEffect } from '@/game/constants/items'

  const inventoryStore = useInventoryStore()
  const message = useMessage()

  // 当前筛选类型
  const currentFilter = ref<ItemType | 'all'>('all')

  // 选中的物品
  const selectedItem = ref<(typeof inventoryStore.items)[0] | null>(null)
  const showDetail = ref(false)
  const actionQuantity = ref(1)
  const actionLoading = ref(false)

  // 赠送相关
  const showGiftModal = ref(false)
  const giftTargetName = ref('')

  // 筛选标签
  const filterTabs = [
    { value: 'all' as const, label: '全部', icon: Package },
    { value: 'consumable' as const, label: '丹药', icon: Flame },
    { value: 'material' as const, label: '材料', icon: Package },
    { value: 'recipe' as const, label: '配方', icon: Scroll },
    { value: 'equipment' as const, label: '装备', icon: Sword },
    { value: 'special' as const, label: '特殊', icon: Box }
  ]

  // 筛选后的物品
  const filteredItems = computed(() => {
    if (currentFilter.value === 'all') {
      return inventoryStore.items
    }
    return inventoryStore.itemsByType[currentFilter.value] || []
  })

  // 获取类型数量
  const getTypeCount = (type: ItemType | 'all') => {
    if (type === 'all') {
      return inventoryStore.items.length
    }
    return inventoryStore.itemsByType[type]?.length || 0
  }

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

  // 类型名称
  const getTypeName = (type?: ItemType) => {
    const names: Record<ItemType, string> = {
      consumable: '消耗品',
      material: '材料',
      seed: '种子',
      recipe: '配方',
      equipment: '装备',
      special: '特殊'
    }
    return names[type || 'consumable']
  }

  // 类型图标
  const getItemIcon = (type?: ItemType) => {
    const icons: Record<ItemType, unknown> = {
      consumable: Flame,
      material: Package,
      seed: Sprout,
      recipe: Scroll,
      equipment: Sword,
      special: Box
    }
    return icons[type || 'consumable']
  }

  // 效果描述
  const getEffectDescription = (effect: ItemEffect) => {
    const effectDescriptions: Record<string, (v: number) => string> = {
      add_experience: v => `获得 ${v} 修为`,
      add_hp: v => `恢复 ${v} 生命`,
      add_mp: v => `恢复 ${v} 灵力`,
      add_hp_percent: v => `恢复 ${v}% 生命`,
      add_mp_percent: v => `恢复 ${v}% 灵力`,
      clear_poison: v => `清除 ${v}% 丹毒`,
      breakthrough_bonus: v => `突破成功率 +${v}%`,
      expand_inventory: v => `储物袋容量 +${v}`
    }
    return effectDescriptions[effect.type]?.(effect.value) || effect.type
  }

  // 选择物品
  const selectItem = (item: (typeof inventoryStore.items)[0]) => {
    selectedItem.value = item
    actionQuantity.value = 1
    showDetail.value = true
  }

  // 使用物品
  const handleUseItem = async () => {
    if (!selectedItem.value) return

    actionLoading.value = true
    try {
      const result = await inventoryStore.useItem(selectedItem.value.id, actionQuantity.value)
      message.success(result.message || '使用成功')
      showDetail.value = false
      selectedItem.value = null
    } catch (error: unknown) {
      message.error((error as Error).message || '使用失败')
    } finally {
      actionLoading.value = false
    }
  }

  // 学习配方
  const handleLearnRecipe = async () => {
    if (!selectedItem.value) return

    actionLoading.value = true
    try {
      const result = await inventoryStore.learnRecipe(selectedItem.value.id)
      message.success(`成功学会 ${result.recipeName}`)
      showDetail.value = false
      selectedItem.value = null
    } catch (error: unknown) {
      message.error((error as Error).message || '学习失败')
    } finally {
      actionLoading.value = false
    }
  }

  // 丢弃物品
  const handleDiscardItem = async () => {
    if (!selectedItem.value) return

    actionLoading.value = true
    try {
      await inventoryStore.discardItem(selectedItem.value.id, actionQuantity.value)
      message.success(`丢弃了 ${actionQuantity.value} 个物品`)
      showDetail.value = false
      selectedItem.value = null
    } catch (error: unknown) {
      message.error((error as Error).message || '丢弃失败')
    } finally {
      actionLoading.value = false
    }
  }

  // 赠送物品
  const handleGiftItem = async () => {
    if (!selectedItem.value || !giftTargetName.value) return

    actionLoading.value = true
    try {
      const result = await inventoryStore.giftItem(selectedItem.value.id, { name: giftTargetName.value }, actionQuantity.value)
      message.success(`成功赠送给 ${result.targetName}`)
      showGiftModal.value = false
      showDetail.value = false
      selectedItem.value = null
      giftTargetName.value = ''
    } catch (error: unknown) {
      message.error((error as Error).message || '赠送失败')
    } finally {
      actionLoading.value = false
    }
  }

  // 监听详情关闭
  watch(showDetail, val => {
    if (!val) {
      actionQuantity.value = 1
    }
  })

  onMounted(() => {
    inventoryStore.fetchInventory()
  })
</script>

<style scoped>
  .inventory-page {
    padding: 16px;
    padding-bottom: 100px;
  }

  /* 容量条 */
  .capacity-bar {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 16px;
  }

  .capacity-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .capacity-text {
    margin-left: auto;
    font-weight: 600;
    color: var(--text-primary);
  }

  .capacity-progress {
    height: 6px;
    background: rgba(93, 124, 111, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .capacity-fill {
    height: 100%;
    background: linear-gradient(90deg, #5d7c6f, #7a9e8e);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .capacity-fill.warning {
    background: linear-gradient(90deg, #c9a959, #a08040);
  }

  .capacity-fill.full {
    background: linear-gradient(90deg, #c96a5a, #a05040);
  }

  /* 筛选标签 */
  .filter-tabs {
    margin-bottom: 16px;
  }

  .filter-tabs :deep(.n-tabs-rail) {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 4px;
  }

  .filter-tabs :deep(.n-tabs-capsule) {
    background: rgba(201, 169, 89, 0.2);
    border-radius: 6px;
  }

  .filter-tabs :deep(.n-tabs-tab) {
    padding: 6px 10px;
    font-size: 0.85rem;
  }

  .filter-tabs :deep(.n-tabs-tab--active) {
    color: var(--color-gold);
  }

  .tab-label {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }

  .tab-count {
    font-size: 0.7rem;
    padding: 1px 5px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    margin-left: 2px;
  }

  /* 物品网格 */
  .items-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .item-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }

  .item-card:hover {
    border-color: var(--color-gold);
    transform: translateY(-2px);
  }

  .item-card.selected {
    border-color: var(--color-gold);
    background: rgba(201, 169, 89, 0.1);
  }

  .item-icon {
    position: relative;
    width: 44px;
    height: 44px;
    background: rgba(0, 0, 0, 0.2);
    border: 2px solid;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .item-quantity {
    position: absolute;
    bottom: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 9px;
    font-size: 0.7rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }

  .item-info {
    flex: 1;
    min-width: 0;
  }

  .item-name {
    font-weight: 600;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-type {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .item-bound {
    position: absolute;
    top: 6px;
    right: 6px;
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

  /* 详情弹窗 */
  .detail-header {
    font-weight: 700;
    font-size: 1.1rem;
  }

  .detail-content {
    padding: 8px 0;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-color);
  }

  .detail-label {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .detail-value {
    font-weight: 500;
    font-size: 0.9rem;
  }

  .detail-value.bound {
    color: #c96a5a;
  }

  .detail-desc {
    margin: 16px 0;
    padding: 12px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 6px;
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .detail-effect {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: rgba(201, 169, 89, 0.1);
    border-radius: 6px;
    color: var(--color-gold);
    font-size: 0.9rem;
    margin-bottom: 16px;
  }

  /* 操作数量 */
  .action-quantity {
    margin: 16px 0;
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 6px;
  }

  .action-quantity > span {
    display: block;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .quantity-control {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .quantity-control button {
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

  .quantity-control button:hover {
    border-color: var(--color-gold);
    color: var(--text-primary);
  }

  .quantity-control .max-btn {
    width: auto;
    padding: 0 12px;
    font-size: 0.8rem;
  }

  .quantity-control :deep(.n-input-number) {
    width: 80px;
  }

  /* 操作按钮 */
  .action-buttons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-top: 16px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 16px;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .use-btn {
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    color: var(--text-primary);
  }

  .learn-btn {
    background: linear-gradient(135deg, #c9a959 0%, #a08040 100%);
    color: #1a1812;
  }

  .gift-btn {
    background: linear-gradient(135deg, #6b8eb0 0%, #4a6a8a 100%);
    color: var(--text-primary);
  }

  .discard-btn {
    background: transparent;
    border: 1px solid rgba(201, 106, 90, 0.3);
    color: #c96a5a;
  }

  .discard-btn:hover:not(:disabled) {
    background: rgba(201, 106, 90, 0.1);
  }

  /* 赠送弹窗 */
  .gift-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-gold);
  }

  .gift-content {
    padding: 8px 0;
  }

  .gift-item-info {
    display: flex;
    justify-content: space-between;
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .gift-quantity {
    color: var(--color-gold);
    font-weight: 600;
  }

  .gift-target {
    margin-bottom: 16px;
  }

  .gift-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  @media (min-width: 480px) {
    .items-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (min-width: 640px) {
    .items-grid {
      grid-template-columns: repeat(4, 1fr);
    }

    .action-buttons {
      grid-template-columns: repeat(4, 1fr);
    }
  }
</style>
