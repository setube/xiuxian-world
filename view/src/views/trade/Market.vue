<template>
  <div class="market-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-icon">
        <Store :size="24" />
      </div>
      <div class="header-info">
        <h1>万宝楼</h1>
        <p>天南第一楼，宝换有缘人</p>
      </div>
    </div>

    <!-- Tab 导航 -->
    <NTabs v-model:value="activeTab" type="segment" animated class="market-tabs">
      <!-- 逛市场 Tab -->
      <NTabPane name="browse">
        <template #tab>
          <div class="tab-label">
            <Search :size="14" />
            <span>逛市场</span>
          </div>
        </template>
        <div class="tab-content">
          <!-- 搜索和筛选 -->
          <div class="filter-bar">
            <NInput v-model:value="searchInput" placeholder="搜索物品..." clearable @keyup.enter="handleSearch">
              <template #prefix>
                <Search :size="14" />
              </template>
            </NInput>
            <NSelect
              v-model:value="filterTypeValue"
              :options="typeOptions"
              placeholder="类型"
              clearable
              style="width: 100px"
              @update:value="handleFilterType"
            />
          </div>

          <!-- 加载状态 -->
          <div v-if="marketStore.loading" class="loading-state">
            <Loader2 :size="24" class="spinning" />
            <span>正在加载...</span>
          </div>

          <!-- 空状态 -->
          <div v-else-if="marketStore.isEmpty" class="empty-state">
            <Package :size="48" />
            <span>暂无在售物品</span>
          </div>

          <!-- 挂单列表 -->
          <div v-else class="listings-grid">
            <div
              v-for="listing in marketStore.listings"
              :key="listing.id"
              class="listing-card"
              :style="{ '--quality-color': getQualityColor(listing.itemTemplate.quality) }"
              @click="openPurchaseModal(listing)"
            >
              <div class="listing-header">
                <span class="item-name" :style="{ color: getQualityColor(listing.itemTemplate.quality) }">
                  {{ listing.itemTemplate.name }}
                </span>
                <span v-if="listing.isBundle" class="bundle-tag">捆绑</span>
              </div>
              <div class="listing-quantity">
                <Package :size="12" />
                <span>{{ listing.remainingQuantity }} / {{ listing.quantity }}</span>
              </div>
              <div class="listing-price">
                <Coins :size="12" />
                <span>{{ formatPriceShort(listing) }}</span>
              </div>
              <div class="listing-seller">
                <User :size="12" />
                <span>{{ listing.sellerName }}</span>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="marketStore.pagination.totalPages > 1" class="pagination">
            <button
              class="page-btn"
              :disabled="marketStore.pagination.page === 1"
              @click="marketStore.changePage(marketStore.pagination.page - 1)"
            >
              <ChevronLeft :size="16" />
            </button>
            <span class="page-info">{{ marketStore.pagination.page }} / {{ marketStore.pagination.totalPages }}</span>
            <button
              class="page-btn"
              :disabled="marketStore.pagination.page >= marketStore.pagination.totalPages"
              @click="marketStore.changePage(marketStore.pagination.page + 1)"
            >
              <ChevronRight :size="16" />
            </button>
          </div>
        </div>
      </NTabPane>

      <!-- 我的货摊 Tab -->
      <NTabPane name="my-listings">
        <template #tab>
          <div class="tab-label">
            <ShoppingBag :size="14" />
            <span>我的货摊</span>
          </div>
        </template>
        <div class="tab-content">
          <!-- 加载状态 -->
          <div v-if="marketStore.myListingsLoading" class="loading-state">
            <Loader2 :size="24" class="spinning" />
            <span>正在加载...</span>
          </div>

          <!-- 空状态 -->
          <div v-else-if="!marketStore.hasMyListings" class="empty-state">
            <ShoppingBag :size="48" />
            <span>你还没有上架任何物品</span>
            <button class="action-btn" @click="activeTab = 'list'">
              <Plus :size="16" />
              <span>上架物品</span>
            </button>
          </div>

          <!-- 我的挂单列表 -->
          <div v-else class="my-listings">
            <div
              v-for="listing in marketStore.myListings"
              :key="listing.id"
              class="my-listing-card"
              :style="{ '--quality-color': getQualityColor(listing.itemTemplate.quality) }"
            >
              <div class="listing-main">
                <div class="listing-info">
                  <span class="item-name" :style="{ color: getQualityColor(listing.itemTemplate.quality) }">
                    {{ listing.itemTemplate.name }}
                  </span>
                  <span v-if="listing.isBundle" class="bundle-tag small">捆绑</span>
                </div>
                <div class="listing-meta">
                  <span class="meta-item">
                    <Package :size="12" />
                    剩余 {{ listing.remainingQuantity }} / {{ listing.quantity }}
                  </span>
                  <span class="meta-item">
                    <Coins :size="12" />
                    {{ marketStore.formatPriceWithTemplates(listing.priceWithTemplates) }}
                  </span>
                </div>
              </div>
              <button class="cancel-btn" @click="handleCancelListing(listing.id)">
                <X :size="16" />
                下架
              </button>
            </div>
          </div>
        </div>
      </NTabPane>

      <!-- 上架物品 Tab -->
      <NTabPane name="list">
        <template #tab>
          <div class="tab-label">
            <Plus :size="14" />
            <span>上架物品</span>
          </div>
        </template>
        <div class="tab-content">
          <!-- 上架表单 -->
          <div class="list-form">
            <!-- 选择物品 -->
            <div class="form-section">
              <label class="form-label">选择物品</label>
              <div class="item-selector">
                <div
                  v-if="selectedItem"
                  class="selected-item"
                  :style="{ '--quality-color': getQualityColor(selectedItem.template?.quality || 'common') }"
                  @click="showItemPicker = true"
                >
                  <span class="item-name" :style="{ color: getQualityColor(selectedItem.template?.quality || 'common') }">
                    {{ selectedItem.template?.name }}
                  </span>
                  <span class="item-count">x{{ selectedItem.quantity }}</span>
                  <Edit3 :size="14" class="edit-icon" />
                </div>
                <button v-else class="select-btn" @click="showItemPicker = true">
                  <Plus :size="18" />
                  <span>选择要上架的物品</span>
                </button>
              </div>
            </div>

            <!-- 上架数量 -->
            <div v-if="selectedItem" class="form-section">
              <label class="form-label">上架数量</label>
              <NInputNumber v-model:value="listQuantity" :min="1" :max="selectedItem.quantity" placeholder="输入数量" />
              <span class="form-hint">最多可上架 {{ selectedItem.quantity }} 个</span>
            </div>

            <!-- 交换价格 -->
            <div v-if="selectedItem" class="form-section">
              <label class="form-label">交换价格</label>
              <div class="price-list">
                <div v-for="(price, index) in priceItems" :key="index" class="price-item">
                  <NSelect v-model:value="price.itemId" :options="priceItemOptions" placeholder="选择物品" filterable style="flex: 1" />
                  <NInputNumber v-model:value="price.quantity" :min="1" placeholder="数量" style="width: 100px" />
                  <button v-if="priceItems.length > 1" class="remove-price-btn" @click="removePriceItem(index)">
                    <X :size="14" />
                  </button>
                </div>
                <button class="add-price-btn" @click="addPriceItem">
                  <Plus :size="14" />
                  <span>添加价格物品</span>
                </button>
              </div>
            </div>

            <!-- 销售类型预览 -->
            <div v-if="selectedItem && listQuantity && priceItems[0]?.itemId" class="listing-preview">
              <div class="preview-header">
                <Eye :size="14" />
                <span>挂单预览</span>
              </div>
              <div class="preview-content">
                <div class="preview-row">
                  <span class="preview-label">销售类型</span>
                  <span class="preview-value" :class="previewListingType">
                    {{ previewListingType === 'per_item' ? '按件出售' : '捆绑出售' }}
                  </span>
                </div>
                <div v-if="previewListingType === 'per_item'" class="preview-row">
                  <span class="preview-label">单价</span>
                  <span class="preview-value">{{ previewUnitPrice }}</span>
                </div>
              </div>
            </div>

            <!-- 提交按钮 -->
            <button v-if="selectedItem" class="submit-btn" :disabled="!canSubmit || submitting" @click="handleCreateListing">
              <Loader2 v-if="submitting" :size="16" class="spinning" />
              <Upload v-else :size="16" />
              <span>{{ submitting ? '上架中...' : '确认上架' }}</span>
            </button>
          </div>
        </div>
      </NTabPane>
    </NTabs>

    <!-- 物品选择器弹窗 -->
    <NModal v-model:show="showItemPicker" preset="card" style="width: 90%; max-width: 400px">
      <template #header>
        <div class="modal-header">
          <Package :size="18" />
          <span>选择物品</span>
        </div>
      </template>
      <div class="item-picker-content">
        <div v-if="tradeableItems.length === 0" class="empty-picker">
          <Package :size="32" />
          <span>没有可交易的物品</span>
        </div>
        <div v-else class="picker-list">
          <div
            v-for="item in tradeableItems"
            :key="item.id"
            class="picker-item"
            :class="{ selected: selectedItem?.id === item.id }"
            :style="{ '--quality-color': getQualityColor(item.template?.quality || 'common') }"
            @click="selectItem(item)"
          >
            <span class="picker-item-name" :style="{ color: getQualityColor(item.template?.quality || 'common') }">
              {{ item.template?.name }}
            </span>
            <span class="picker-item-count">x{{ item.quantity }}</span>
          </div>
        </div>
      </div>
    </NModal>

    <!-- 购买弹窗 -->
    <NModal v-model:show="showPurchaseModal" preset="card" style="width: 90%; max-width: 400px">
      <template #header>
        <div class="modal-header">
          <ShoppingCart :size="18" />
          <span>购买物品</span>
        </div>
      </template>
      <div v-if="purchaseListing" class="purchase-content">
        <!-- 物品信息 -->
        <div class="purchase-item-info">
          <div class="purchase-item-name" :style="{ color: getQualityColor(purchaseListing.itemTemplate.quality) }">
            {{ purchaseListing.itemTemplate.name }}
          </div>
          <div class="purchase-item-desc">{{ purchaseListing.itemTemplate.description }}</div>
        </div>

        <!-- 卖家信息 -->
        <div class="purchase-seller">
          <User :size="14" />
          <span>{{ purchaseListing.sellerName }}</span>
        </div>

        <!-- 购买数量（按件销售） -->
        <div v-if="!purchaseListing.isBundle" class="purchase-quantity">
          <label>购买数量</label>
          <NInputNumber v-model:value="purchaseQuantity" :min="1" :max="purchaseListing.remainingQuantity" />
          <span class="quantity-hint">剩余 {{ purchaseListing.remainingQuantity }} 件</span>
        </div>

        <!-- 捆绑销售提示 -->
        <div v-else class="bundle-notice">
          <AlertCircle :size="16" />
          <span>捆绑销售，需购买全部 {{ purchaseListing.remainingQuantity }} 件</span>
        </div>

        <!-- 费用预览 -->
        <div class="purchase-cost">
          <div class="cost-header">
            <Coins :size="14" />
            <span>需要支付</span>
          </div>
          <div class="cost-list">
            <div v-for="(cost, index) in purchaseCost" :key="index" class="cost-item">
              <span class="cost-name">{{ getItemName(cost.itemId) }}</span>
              <span class="cost-quantity">x{{ cost.quantity }}</span>
            </div>
          </div>
        </div>

        <!-- 购买按钮 -->
        <button class="purchase-btn" :disabled="purchasing" @click="handlePurchase">
          <Loader2 v-if="purchasing" :size="16" class="spinning" />
          <ShoppingCart v-else :size="16" />
          <span>{{ purchasing ? '购买中...' : '确认购买' }}</span>
        </button>
      </div>
    </NModal>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue'
  import { NTabs, NTabPane, NInput, NSelect, NInputNumber, NModal, useMessage } from 'naive-ui'
  import { useMarketStore, type MarketListing } from '@/stores/market'
  import { useInventoryStore } from '@/stores/inventory'
  import { getItemTemplate, ITEMS, type ItemType } from '@/game/constants/items'
  import { extractErrorMessage } from '@/api'
  import {
    Store,
    Search,
    Package,
    Coins,
    User,
    ChevronLeft,
    ChevronRight,
    Loader2,
    ShoppingBag,
    Plus,
    X,
    Edit3,
    Eye,
    Upload,
    ShoppingCart,
    AlertCircle
  } from 'lucide-vue-next'

  const message = useMessage()
  const marketStore = useMarketStore()
  const inventoryStore = useInventoryStore()

  // Tab状态
  const activeTab = ref('browse')

  // 搜索和筛选
  const searchInput = ref('')
  const filterTypeValue = ref<ItemType | null>(null)

  const typeOptions = [
    { label: '丹药', value: 'consumable' },
    { label: '材料', value: 'material' },
    { label: '种子', value: 'seed' },
    { label: '图纸', value: 'recipe' },
    { label: '法宝', value: 'equipment' },
    { label: '珍奇', value: 'special' }
  ]

  // 物品选择器
  const showItemPicker = ref(false)
  const selectedItem = ref<{ id: string; itemId: string; quantity: number; template?: ReturnType<typeof getItemTemplate> } | null>(null)

  // 上架表单
  const listQuantity = ref<number | null>(null)
  const priceItems = ref<{ itemId: string | null; quantity: number | null }[]>([{ itemId: null, quantity: null }])
  const submitting = ref(false)

  // 购买弹窗
  const showPurchaseModal = ref(false)
  const purchaseListing = ref<MarketListing | null>(null)
  const purchaseQuantity = ref(1)
  const purchasing = ref(false)

  // 可交易物品
  const tradeableItems = computed(() => {
    return inventoryStore.items.filter(item => {
      const template = item.template || getItemTemplate(item.itemId)
      return template?.tradeable && !item.isBound
    })
  })

  // 价格物品选项（用于上架时选择）
  const priceItemOptions = computed(() => {
    return Object.values(ITEMS)
      .filter(item => item.tradeable)
      .map(item => ({
        label: item.name,
        value: item.id
      }))
  })

  // 预览销售类型
  const previewListingType = computed(() => {
    if (!listQuantity.value || priceItems.value.length === 0) return 'bundle'
    const validPrices = priceItems.value.filter(p => p.itemId && p.quantity && p.quantity > 0)
    if (validPrices.length === 0) return 'bundle'
    const isDivisible = validPrices.every(p => (p.quantity || 0) % (listQuantity.value || 1) === 0)
    return isDivisible ? 'per_item' : 'bundle'
  })

  // 预览单价
  const previewUnitPrice = computed(() => {
    if (previewListingType.value !== 'per_item' || !listQuantity.value) return ''
    const validPrices = priceItems.value.filter(p => p.itemId && p.quantity && p.quantity > 0)
    return validPrices
      .map(p => {
        const template = getItemTemplate(p.itemId!)
        const unitQty = Math.floor((p.quantity || 0) / (listQuantity.value || 1))
        return `${template?.name || p.itemId}×${unitQty}`
      })
      .join('、')
  })

  // 是否可以提交上架
  const canSubmit = computed(() => {
    if (!selectedItem.value) return false
    if (!listQuantity.value || listQuantity.value <= 0) return false
    const validPrices = priceItems.value.filter(p => p.itemId && p.quantity && p.quantity > 0)
    return validPrices.length > 0
  })

  // 购买费用预览
  const purchaseCost = computed(() => {
    if (!purchaseListing.value) return []
    const qty = purchaseListing.value.isBundle ? purchaseListing.value.remainingQuantity : purchaseQuantity.value
    return marketStore.calculateCost(purchaseListing.value, qty)
  })

  // 品质颜色
  const getQualityColor = (quality: string | undefined): string => {
    const colors: { [key: string]: string } = {
      common: '#a8a090',
      uncommon: '#6b8e7a',
      rare: '#6b9fc9',
      epic: '#9b7ab8',
      legendary: '#c9a959',
      mythic: '#c96a5a'
    }
    return colors[quality || 'common'] || '#a8a090'
  }

  // 获取物品名称
  const getItemName = (itemId: string): string => {
    const template = getItemTemplate(itemId)
    return template?.name || itemId
  }

  // 格式化价格（简短）
  const formatPriceShort = (listing: MarketListing): string => {
    if (!listing.priceWithTemplates || listing.priceWithTemplates.length === 0) return '免费'
    const first = listing.priceWithTemplates[0]
    if (!first) return '免费'
    let text = `${first.template.name}×${first.quantity}`
    if (listing.priceWithTemplates.length > 1) {
      text += ` +${listing.priceWithTemplates.length - 1}种`
    }
    return text
  }

  // 搜索
  const handleSearch = () => {
    marketStore.search(searchInput.value)
  }

  // 筛选类型
  const handleFilterType = (type: ItemType | null) => {
    marketStore.filterByType(type || '')
  }

  // 选择物品
  const selectItem = (item: (typeof tradeableItems.value)[0]) => {
    selectedItem.value = {
      id: item.id,
      itemId: item.itemId,
      quantity: item.quantity,
      template: item.template || getItemTemplate(item.itemId)
    }
    listQuantity.value = 1
    showItemPicker.value = false
  }

  // 添加价格物品
  const addPriceItem = () => {
    priceItems.value.push({ itemId: null, quantity: null })
  }

  // 移除价格物品
  const removePriceItem = (index: number) => {
    priceItems.value.splice(index, 1)
  }

  // 创建挂单
  const handleCreateListing = async () => {
    if (!selectedItem.value || !listQuantity.value) return

    const validPrices = priceItems.value
      .filter(p => p.itemId && p.quantity && p.quantity > 0)
      .map(p => ({ itemId: p.itemId!, quantity: p.quantity! }))

    if (validPrices.length === 0) {
      message.warning('请设置交换价格')
      return
    }

    submitting.value = true
    try {
      const result = await marketStore.createListing({
        itemId: selectedItem.value.itemId,
        quantity: listQuantity.value,
        price: validPrices
      })
      message.success(result.message || '上架成功')

      // 重置表单
      selectedItem.value = null
      listQuantity.value = null
      priceItems.value = [{ itemId: null, quantity: null }]

      // 刷新背包
      await inventoryStore.fetchInventory()

      // 切换到我的货摊
      activeTab.value = 'my-listings'
    } catch (error) {
      message.error(extractErrorMessage(error, '上架失败'))
    } finally {
      submitting.value = false
    }
  }

  // 取消挂单
  const handleCancelListing = async (listingId: string) => {
    try {
      const result = await marketStore.cancelListing(listingId)
      message.success(result.message || '下架成功')

      // 刷新背包
      await inventoryStore.fetchInventory()
    } catch (error) {
      message.error(extractErrorMessage(error, '下架失败'))
    }
  }

  // 打开购买弹窗
  const openPurchaseModal = (listing: MarketListing) => {
    purchaseListing.value = listing
    purchaseQuantity.value = 1
    showPurchaseModal.value = true
  }

  // 购买
  const handlePurchase = async () => {
    if (!purchaseListing.value) return

    purchasing.value = true
    try {
      const qty = purchaseListing.value.isBundle ? undefined : purchaseQuantity.value
      const result = await marketStore.purchase(purchaseListing.value.id, qty)
      message.success(result.message || '购买成功')
      showPurchaseModal.value = false

      // 刷新背包
      await inventoryStore.fetchInventory()
    } catch (error) {
      message.error(extractErrorMessage(error, '购买失败'))
    } finally {
      purchasing.value = false
    }
  }

  // 监听Tab切换
  watch(activeTab, async tab => {
    if (tab === 'browse') {
      await marketStore.fetchListings()
    } else if (tab === 'my-listings') {
      await marketStore.fetchMyListings()
    } else if (tab === 'list') {
      // 刷新背包以获取最新可交易物品
      await inventoryStore.fetchInventory()
    }
  })

  onMounted(async () => {
    // 初始加载
    await Promise.all([marketStore.fetchListings(), inventoryStore.fetchInventory()])
  })
</script>

<style scoped>
  .market-page {
    padding: 16px;
    padding-bottom: 100px;
  }

  /* 页面标题 */
  .page-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
  }

  .header-icon {
    width: 48px;
    height: 48px;
    background: rgba(201, 169, 89, 0.15);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-gold);
  }

  .header-info h1 {
    margin: 0 0 4px;
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .header-info p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  /* Tab样式 */
  .market-tabs {
    margin-top: 10px;
  }

  .market-tabs :deep(.n-tabs-rail) {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 4px;
  }

  .market-tabs :deep(.n-tabs-capsule) {
    background: rgba(201, 169, 89, 0.2);
    border-radius: 6px;
  }

  .market-tabs :deep(.n-tabs-tab) {
    padding: 8px 12px;
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .market-tabs :deep(.n-tabs-tab--active) {
    color: var(--color-gold) !important;
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

  /* 筛选栏 */
  .filter-bar {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
  }

  /* 加载和空状态 */
  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 60px 20px;
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

  .action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    border: none;
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 8px;
  }

  /* 挂单网格 */
  .listings-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .listing-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-left: 3px solid var(--quality-color);
    border-radius: 8px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .listing-card:hover {
    border-color: var(--quality-color);
    transform: translateY(-2px);
  }

  .listing-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .item-name {
    font-weight: 600;
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bundle-tag {
    font-size: 0.65rem;
    padding: 2px 6px;
    background: rgba(201, 106, 90, 0.15);
    border-radius: 3px;
    color: #c96a5a;
    flex-shrink: 0;
  }

  .bundle-tag.small {
    font-size: 0.6rem;
    padding: 1px 4px;
  }

  .listing-quantity,
  .listing-price,
  .listing-seller {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  .listing-price {
    color: var(--color-gold);
  }

  /* 分页 */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-top: 20px;
    padding: 12px 0;
  }

  .page-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .page-btn:hover:not(:disabled) {
    border-color: var(--color-gold);
    color: var(--color-gold);
  }

  .page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-info {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  /* 我的挂单 */
  .my-listings {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .my-listing-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-left: 3px solid var(--quality-color);
    border-radius: 8px;
  }

  .listing-main {
    flex: 1;
    min-width: 0;
  }

  .listing-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .listing-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .cancel-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: transparent;
    border: 1px solid rgba(201, 106, 90, 0.3);
    border-radius: 4px;
    color: #c96a5a;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .cancel-btn:hover {
    background: rgba(201, 106, 90, 0.1);
  }

  /* 上架表单 */
  .list-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .form-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .form-hint {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .item-selector {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
  }

  .selected-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .selected-item:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .item-count {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .edit-icon {
    margin-left: auto;
    color: var(--text-muted);
  }

  .select-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 20px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .select-btn:hover {
    background: rgba(255, 255, 255, 0.02);
    color: var(--text-primary);
  }

  /* 价格列表 */
  .price-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .price-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .remove-price-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: 1px solid rgba(201, 106, 90, 0.3);
    border-radius: 4px;
    color: #c96a5a;
    cursor: pointer;
  }

  .add-price-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    background: var(--bg-card);
    border: 1px dashed var(--border-color);
    border-radius: 6px;
    color: var(--text-muted);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .add-price-btn:hover {
    border-color: var(--color-gold);
    color: var(--color-gold);
  }

  /* 挂单预览 */
  .listing-preview {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
  }

  .preview-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(201, 169, 89, 0.1);
    font-size: 0.85rem;
    color: var(--color-gold);
  }

  .preview-content {
    padding: 12px 14px;
  }

  .preview-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
  }

  .preview-label {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .preview-value {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .preview-value.per_item {
    color: #6b8e7a;
  }

  .preview-value.bundle {
    color: #c96a5a;
  }

  /* 提交按钮 */
  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 20px;
    background: linear-gradient(135deg, #c9a959 0%, #a08040 100%);
    border: none;
    border-radius: 6px;
    color: #1a1812;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(201, 169, 89, 0.3);
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 物品选择器弹窗 */
  .modal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-gold);
  }

  .item-picker-content {
    max-height: 400px;
    overflow-y: auto;
  }

  .empty-picker {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 40px 20px;
    color: var(--text-muted);
  }

  .picker-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .picker-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-left: 3px solid var(--quality-color);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .picker-item:hover {
    border-color: var(--quality-color);
  }

  .picker-item.selected {
    border-color: var(--color-gold);
    background: rgba(201, 169, 89, 0.1);
  }

  .picker-item-name {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .picker-item-count {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  /* 购买弹窗 */
  .purchase-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .purchase-item-info {
    text-align: center;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
  }

  .purchase-item-name {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .purchase-item-desc {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .purchase-seller {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .purchase-quantity {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .purchase-quantity label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .quantity-hint {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .bundle-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: rgba(201, 106, 90, 0.1);
    border-radius: 6px;
    font-size: 0.85rem;
    color: #c96a5a;
  }

  .purchase-cost {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 14px;
  }

  .cost-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-gold);
    margin-bottom: 10px;
  }

  .cost-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .cost-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
  }

  .cost-name {
    color: var(--text-primary);
  }

  .cost-quantity {
    color: var(--text-muted);
  }

  .purchase-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 20px;
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    border: none;
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .purchase-btn:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .purchase-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
