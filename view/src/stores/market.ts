import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { marketApi } from '@/api'
import { getItemTemplate, type ItemTemplate, type ItemType } from '@/game/constants/items'

// 价格项
interface PriceItem {
  itemId: string
  quantity: number
}

// 价格项（带模板）
interface PriceItemWithTemplate extends PriceItem {
  template: ItemTemplate
}

// 挂单信息
export interface MarketListing {
  id: string
  sellerId: string
  sellerName: string
  itemId: string
  itemTemplate: ItemTemplate
  quantity: number
  soldQuantity: number
  remainingQuantity: number
  listingType: 'per_item' | 'bundle'
  price: PriceItem[]
  priceWithTemplates: PriceItemWithTemplate[]
  unitPrice: PriceItem[] | null
  isBundle: boolean
  status: string
  createdAt: string
}

// 分页信息
interface Pagination {
  page: number
  total: number
  totalPages: number
}

// 创建挂单参数
export interface CreateListingParams {
  itemId: string
  quantity: number
  price: PriceItem[]
}

export const useMarketStore = defineStore('market', () => {
  // 状态
  const listings = ref<MarketListing[]>([])
  const myListings = ref<MarketListing[]>([])
  const pagination = ref<Pagination>({ page: 1, total: 0, totalPages: 0 })
  const loading = ref(false)
  const myListingsLoading = ref(false)
  const searchKeyword = ref('')
  const filterType = ref<ItemType | ''>('')

  // 计算属性
  const isEmpty = computed(() => listings.value.length === 0)
  const hasMyListings = computed(() => myListings.value.length > 0)

  // 获取市场挂单列表
  const fetchListings = async (options?: {
    page?: number
    pageSize?: number
    search?: string
    itemType?: ItemType | ''
  }) => {
    loading.value = true
    try {
      const params: Record<string, unknown> = {
        page: options?.page || 1,
        pageSize: options?.pageSize || 20
      }
      if (options?.search) {
        params.search = options.search
        searchKeyword.value = options.search
      }
      if (options?.itemType) {
        params.itemType = options.itemType
        filterType.value = options.itemType
      }

      const { data } = await marketApi.getListings(params as Parameters<typeof marketApi.getListings>[0])
      listings.value = data.listings || []
      pagination.value = {
        page: data.page,
        total: data.total,
        totalPages: data.totalPages
      }
      return data
    } finally {
      loading.value = false
    }
  }

  // 获取我的挂单
  const fetchMyListings = async () => {
    myListingsLoading.value = true
    try {
      const { data } = await marketApi.getMyListings()
      myListings.value = data.listings || []
      return data
    } finally {
      myListingsLoading.value = false
    }
  }

  // 获取挂单详情
  const getListingDetail = async (listingId: string): Promise<MarketListing | null> => {
    try {
      const { data } = await marketApi.getListingDetail(listingId)
      return data
    } catch {
      return null
    }
  }

  // 创建挂单（上架物品）
  const createListing = async (params: CreateListingParams) => {
    const { data } = await marketApi.createListing(params)
    // 刷新我的挂单
    await fetchMyListings()
    return data
  }

  // 取消挂单（下架物品）
  const cancelListing = async (listingId: string) => {
    const { data } = await marketApi.cancelListing(listingId)
    // 刷新我的挂单和市场列表
    await Promise.all([fetchMyListings(), fetchListings()])
    return data
  }

  // 购买物品
  const purchase = async (listingId: string, quantity?: number) => {
    const { data } = await marketApi.purchase(listingId, quantity)
    // 刷新市场列表
    await fetchListings({
      page: pagination.value.page,
      search: searchKeyword.value || undefined,
      itemType: filterType.value || undefined
    })
    return data
  }

  // 计算购买费用（前端预览用）
  const calculateCost = (listing: MarketListing, purchaseQty: number): PriceItem[] => {
    if (listing.listingType === 'bundle') {
      // 捆绑销售：返回总价
      return listing.price
    }

    // 按件销售：计算单价 × 数量
    return listing.price.map(p => ({
      itemId: p.itemId,
      quantity: Math.floor(p.quantity / listing.quantity) * purchaseQty
    }))
  }

  // 格式化价格显示
  const formatPrice = (price: PriceItem[]): string => {
    return price.map(p => {
      const template = getItemTemplate(p.itemId)
      return `${template?.name || p.itemId}×${p.quantity}`
    }).join('、')
  }

  // 格式化价格显示（带模板）
  const formatPriceWithTemplates = (priceWithTemplates: PriceItemWithTemplate[]): string => {
    return priceWithTemplates.map(p => `${p.template.name}×${p.quantity}`).join('、')
  }

  // 切换页面
  const changePage = async (page: number) => {
    await fetchListings({
      page,
      search: searchKeyword.value || undefined,
      itemType: filterType.value || undefined
    })
  }

  // 搜索
  const search = async (keyword: string) => {
    searchKeyword.value = keyword
    await fetchListings({
      page: 1,
      search: keyword || undefined,
      itemType: filterType.value || undefined
    })
  }

  // 筛选类型
  const filterByType = async (type: ItemType | '') => {
    filterType.value = type
    await fetchListings({
      page: 1,
      search: searchKeyword.value || undefined,
      itemType: type || undefined
    })
  }

  // 重置筛选
  const resetFilters = async () => {
    searchKeyword.value = ''
    filterType.value = ''
    await fetchListings({ page: 1 })
  }

  // 清空状态
  const clear = () => {
    listings.value = []
    myListings.value = []
    pagination.value = { page: 1, total: 0, totalPages: 0 }
    searchKeyword.value = ''
    filterType.value = ''
  }

  return {
    // 状态
    listings,
    myListings,
    pagination,
    loading,
    myListingsLoading,
    searchKeyword,
    filterType,

    // 计算属性
    isEmpty,
    hasMyListings,

    // 方法
    fetchListings,
    fetchMyListings,
    getListingDetail,
    createListing,
    cancelListing,
    purchase,
    calculateCost,
    formatPrice,
    formatPriceWithTemplates,
    changePage,
    search,
    filterByType,
    resetFilters,
    clear
  }
})
