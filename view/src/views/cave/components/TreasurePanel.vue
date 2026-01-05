<template>
  <div class="treasure-panel">
    <!-- 万宝阁说明 -->
    <div class="panel-header">
      <div class="header-icon">
        <Crown :size="20" />
      </div>
      <div class="header-info">
        <h3>万宝阁</h3>
        <p>展示你的珍贵宝物，让来访道友一睹风采</p>
      </div>
    </div>

    <!-- 展示台 -->
    <div class="display-slots">
      <div
        v-for="slot in 3"
        :key="slot"
        class="display-slot"
        :class="{ 'has-item': getSlotItem(slot - 1) }"
        @click="handleSlotClick(slot - 1)"
      >
        <div v-if="getSlotItem(slot - 1)" class="slot-item">
          <div class="item-icon">
            <Package :size="24" />
          </div>
          <span class="item-name">{{ getSlotItem(slot - 1)?.itemName }}</span>
          <NButton size="tiny" class="remove-btn" @click.stop="handleRemove(slot - 1)">取下</NButton>
        </div>
        <div v-else class="slot-empty">
          <Plus :size="24" />
          <span>点击放置</span>
        </div>
        <span class="slot-number">{{ slot }}号展台</span>
      </div>
    </div>

    <!-- 选择物品弹窗 -->
    <NModal v-model:show="showSelectModal" preset="card" style="width: 90%; max-width: 400px">
      <template #header>
        <div class="modal-header">
          <Package :size="18" />
          <span>选择展示物品</span>
        </div>
      </template>
      <div class="select-modal-content">
        <p class="select-hint">选择一件物品放置在 {{ selectedSlot + 1 }} 号展台：</p>
        <div v-if="loading" class="loading-items">
          <Loader :size="24" class="spinning" />
          <span>正在加载物品...</span>
        </div>
        <div v-else-if="availableItems.length === 0" class="no-items">
          <Package :size="32" />
          <span>背包中暂无可展示的物品</span>
        </div>
        <div v-else class="item-list">
          <div v-for="item in availableItems" :key="item.id" class="item-option" @click="handleSelectItem(item)">
            <div class="item-option-icon">
              <Package :size="20" />
            </div>
            <div class="item-option-info">
              <span class="item-option-name">{{ item.name }}</span>
              <span class="item-option-count">x{{ item.quantity }}</span>
            </div>
          </div>
        </div>
      </div>
    </NModal>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useCaveStore, type TreasureSlot } from '@/stores/cave'
  import { inventoryApi } from '@/api'
  import { NButton, NModal, useMessage } from 'naive-ui'
  import { Crown, Package, Plus, Loader } from 'lucide-vue-next'

  interface InventoryItem {
    id: string
    itemId: string
    name: string
    quantity: number
  }

  const caveStore = useCaveStore()
  const message = useMessage()

  const showSelectModal = ref(false)
  const selectedSlot = ref(0)
  const loading = ref(false)
  const inventoryItems = ref<InventoryItem[]>([])

  const treasureDisplay = computed(() => caveStore.treasureDisplay)

  const getSlotItem = (slot: number): TreasureSlot | undefined => {
    return treasureDisplay.value.find(t => t.slot === slot)
  }

  // 已展示的物品ID
  const displayedItemIds = computed(() => {
    return treasureDisplay.value.map(t => t.inventoryItemId)
  })

  // 可选物品（排除已展示的）
  const availableItems = computed(() => {
    return inventoryItems.value.filter(item => !displayedItemIds.value.includes(item.id))
  })

  const handleSlotClick = async (slot: number) => {
    if (getSlotItem(slot)) return // 已有物品，不处理

    selectedSlot.value = slot
    showSelectModal.value = true

    // 加载背包物品
    loading.value = true
    try {
      const { data } = await inventoryApi.getInventory({ pageSize: 100 })
      inventoryItems.value = data.items.map((item: { id: string; itemId: string; itemName: string; quantity: number }) => ({
        id: item.id,
        itemId: item.itemId,
        name: item.itemName,
        quantity: item.quantity
      }))
    } catch {
      message.error('加载背包失败')
    } finally {
      loading.value = false
    }
  }

  const handleSelectItem = async (item: InventoryItem) => {
    try {
      await caveStore.displayTreasure(item.id, selectedSlot.value)
      message.success(`已将 ${item.name} 放置在展台`)
      showSelectModal.value = false
    } catch (error) {
      message.error((error as Error).message || '放置失败')
    }
  }

  const handleRemove = async (slot: number) => {
    try {
      const result = await caveStore.removeTreasure(slot)
      message.success(`已取下 ${result.itemName}`)
    } catch (error) {
      message.error((error as Error).message || '取下失败')
    }
  }
</script>

<style scoped>
  .treasure-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
  }

  .header-icon {
    width: 44px;
    height: 44px;
    background: rgba(201, 169, 89, 0.15);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-gold);
    flex-shrink: 0;
  }

  .header-info h3 {
    margin: 0 0 4px;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .header-info p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .display-slots {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .display-slot {
    position: relative;
    aspect-ratio: 1;
    background: var(--bg-card);
    border: 2px dashed var(--border-color);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .display-slot:hover {
    border-color: var(--color-gold);
  }

  .display-slot.has-item {
    border-style: solid;
    border-color: rgba(201, 169, 89, 0.5);
    background: rgba(201, 169, 89, 0.05);
  }

  .slot-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px;
    text-align: center;
  }

  .item-icon {
    width: 48px;
    height: 48px;
    background: rgba(201, 169, 89, 0.15);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-gold);
  }

  .item-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-primary);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove-btn {
    margin-top: 4px;
  }

  .slot-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
  }

  .slot-empty span {
    font-size: 0.8rem;
  }

  .slot-number {
    position: absolute;
    bottom: 8px;
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  /* 弹窗样式 */
  .modal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-gold);
  }

  .select-modal-content {
    max-height: 400px;
    overflow-y: auto;
  }

  .select-hint {
    margin: 0 0 16px;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .loading-items,
  .no-items {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 40px 20px;
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

  .item-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .item-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .item-option:hover {
    border-color: var(--color-gold);
  }

  .item-option-icon {
    width: 40px;
    height: 40px;
    background: rgba(201, 169, 89, 0.1);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-gold);
  }

  .item-option-info {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .item-option-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .item-option-count {
    font-size: 0.85rem;
    color: var(--text-muted);
  }
</style>
