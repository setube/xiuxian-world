<template>
  <div class="my-sect-page">
    <!-- 无宗门状态 -->
    <div v-if="!sectStore.hasSect" class="no-sect">
      <div class="no-sect-icon">
        <Building2 :size="64" />
      </div>
      <h2>尚未拜入宗门</h2>
      <p>散修之路艰辛，拜入宗门方有依仗</p>
      <router-link to="/sect/list" class="join-link">
        <UserPlus :size="18" />
        <span>前往拜入宗门</span>
      </router-link>
    </div>

    <!-- 有宗门状态 -->
    <template v-else>
      <!-- 宗门头部 -->
      <div class="sect-banner" :style="{ '--sect-color': sectStore.currentSect?.color }">
        <div class="banner-bg" />
        <div class="banner-content">
          <div class="sect-emblem">
            <component :is="getIcon(sectStore.currentSect?.icon || '')" :size="40" />
          </div>
          <div class="sect-info">
            <h1 class="sect-name">{{ sectStore.currentSect?.name }}</h1>
            <div class="sect-meta">
              <span class="alignment-tag" :class="sectStore.currentSect?.alignment">
                {{ getAlignmentLabel(sectStore.currentSect?.alignment || '') }}
              </span>
              <span class="rank-tag">
                <Crown :size="12" />
                {{ sectStore.currentRankInfo?.name }}
              </span>
            </div>
          </div>
          <button class="feature-btn" @click="showFeatures = true" title="宗门特性">
            <Sparkles :size="16" />
          </button>
          <button class="leave-btn-small" @click="showLeaveConfirm = true" title="叛出宗门">
            <LogOut :size="16" />
          </button>
        </div>
      </div>

      <!-- Tab 导航 -->
      <NTabs v-model:value="activeTab" type="segment" animated class="sect-tabs">
        <!-- 门务 Tab -->
        <NTabPane name="overview">
          <template #tab>
            <div class="tab-label">
              <CalendarCheck :size="14" />
              <span>门务</span>
            </div>
          </template>
          <div class="tab-content">
            <!-- 每日任务卡片 -->
            <div class="daily-cards">
              <div class="daily-card checkin-card">
                <div class="daily-header">
                  <CalendarCheck :size="18" />
                  <span>点卯</span>
                  <span class="streak-badge">
                    <Flame :size="12" />
                    {{ sectStore.mySect?.checkInStreak || 0 }}天
                  </span>
                </div>
                <button
                  class="daily-btn"
                  :class="{ disabled: !sectStore.canCheckIn }"
                  :disabled="!sectStore.canCheckIn"
                  @click="handleCheckIn"
                >
                  {{ sectStore.canCheckIn ? '立即点卯' : '已点卯' }}
                </button>
              </div>

              <div class="daily-card salary-card">
                <div class="daily-header">
                  <Coins :size="18" />
                  <span>俸禄</span>
                  <span class="salary-amount">{{ sectStore.dailySalary }}灵石</span>
                </div>
                <button
                  class="daily-btn"
                  :class="{ disabled: !sectStore.canClaimSalary }"
                  :disabled="!sectStore.canClaimSalary"
                  @click="handleClaimSalary"
                >
                  {{ sectStore.canClaimSalary ? '领取' : '已领取' }}
                </button>
              </div>

              <div class="daily-card teach-card">
                <div class="daily-header">
                  <BookOpen :size="18" />
                  <span>传功</span>
                  <span class="teach-count-badge">{{ sectStore.remainingTeachCount }}/3</span>
                </div>
                <button class="daily-btn" :class="{ disabled: !sectStore.canTeach }" :disabled="!sectStore.canTeach" @click="handleTeach">
                  {{ sectStore.canTeach ? '传功' : '已用完' }}
                </button>
              </div>
            </div>

            <!-- 身份与贡献 -->
            <div class="status-row">
              <div class="status-card">
                <div class="status-label">门派身份</div>
                <div class="status-value rank-value">{{ sectStore.currentRankInfo?.name }}</div>
                <div class="status-sub">入门 {{ formatDate(sectStore.mySect?.joinedAt) }}</div>
              </div>
              <div class="status-card">
                <div class="status-label">宗门贡献</div>
                <div class="status-value contrib-value">{{ sectStore.mySect?.contribution || 0 }}</div>
                <div class="status-sub" v-if="sectStore.nextRankInfo">晋升需 {{ sectStore.nextRankInfo.contributionRequired }}</div>
              </div>
            </div>

            <!-- 晋升进度 -->
            <div class="promotion-card" v-if="sectStore.nextRankInfo">
              <div class="promotion-header">
                <span>晋升进度</span>
                <span class="progress-text">{{ sectStore.mySect?.contribution }} / {{ sectStore.nextRankInfo.contributionRequired }}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: promotionProgress + '%' }" />
              </div>
              <button
                class="promote-btn"
                :class="{ disabled: !sectStore.canPromote }"
                :disabled="!sectStore.canPromote"
                @click="handlePromote"
              >
                <TrendingUp :size="16" />
                <span>晋升为{{ sectStore.nextRankInfo.name }}</span>
              </button>
            </div>
            <div v-else class="max-rank-card">
              <Star :size="20" />
              <span>已达最高职位</span>
            </div>
            <!-- 黄枫谷专属功能入口 -->
            <div v-if="isHuangFeng" class="sect-special-feature">
              <router-link to="/garden" class="special-feature-link garden-link">
                <div class="feature-icon">
                  <Sprout :size="24" />
                </div>
                <div class="feature-info">
                  <span class="feature-name">药园</span>
                  <span class="feature-desc">种植灵草、采收药材</span>
                </div>
                <ChevronRight :size="18" class="feature-arrow" />
              </router-link>
            </div>

            <!-- 太一门专属功能入口 -->
            <div v-if="isTaiyi" class="sect-special-feature">
              <router-link to="/taiyi" class="special-feature-link taiyi-link">
                <div class="feature-icon taiyi-icon">
                  <Sparkles :size="24" />
                </div>
                <div class="feature-info">
                  <span class="feature-name">神识与引道</span>
                  <span class="feature-desc">参悟五行大道、锻炼神识</span>
                </div>
                <ChevronRight :size="18" class="feature-arrow" />
              </router-link>
            </div>

            <!-- 黑煞教专属功能入口 -->
            <div v-if="isHeisha" class="sect-special-feature">
              <router-link to="/heisha" class="special-feature-link heisha-link">
                <div class="feature-icon heisha-icon">
                  <Skull :size="24" />
                </div>
                <div class="feature-info">
                  <span class="feature-name">魔道禁术</span>
                  <span class="feature-desc">夺舍魔功、魔染红尘、煞气淬体</span>
                </div>
                <ChevronRight :size="18" class="feature-arrow" />
              </router-link>
            </div>

            <!-- 万灵宗专属功能入口 -->
            <div v-if="isWanling" class="sect-special-feature">
              <router-link to="/wanling" class="special-feature-link wanling-link">
                <div class="feature-icon wanling-icon">
                  <Rabbit :size="24" />
                </div>
                <div class="feature-info">
                  <span class="feature-name">万灵秘术</span>
                  <span class="feature-desc">灵兽养成、寻觅灵兽、灵兽偷菜</span>
                </div>
                <ChevronRight :size="18" class="feature-arrow" />
              </router-link>
            </div>

            <!-- 合欢宗专属功能入口 -->
            <div v-if="isHehuan" class="sect-special-feature">
              <router-link to="/hehuan" class="special-feature-link hehuan-link">
                <div class="feature-icon hehuan-icon">
                  <Heart :size="24" />
                </div>
                <div class="feature-info">
                  <span class="feature-name">情缘三境</span>
                  <span class="feature-desc">闭关双修、缔结同参、种下心印</span>
                </div>
                <ChevronRight :size="18" class="feature-arrow" />
              </router-link>
            </div>
          </div>
        </NTabPane>

        <!-- 同门 Tab -->
        <NTabPane name="members">
          <template #tab>
            <div class="tab-label">
              <Users :size="14" />
              <span>同门</span>
            </div>
          </template>
          <div class="tab-content">
            <div class="section-header">
              <span class="member-count">共 {{ sectStore.totalMembers }} 位同门</span>
              <button class="refresh-btn" @click="loadMembers(memberPage)" :disabled="sectStore.loading">
                <RefreshCw :size="16" :class="{ spinning: sectStore.loading }" />
              </button>
            </div>
            <div class="members-list">
              <div v-for="member in sectStore.sectMembers" :key="member.id" class="member-item">
                <div class="member-avatar">
                  <User :size="20" />
                  <span class="online-dot" :class="{ online: member.isOnline }" />
                </div>
                <div class="member-info">
                  <span class="member-name">{{ member.name }}</span>
                  <span class="member-rank">{{ getRankName(member.rank) }}</span>
                </div>
                <div class="member-realm">
                  {{ getRealmName(member.realmTier) }}
                </div>
              </div>
              <div v-if="sectStore.sectMembers.length === 0" class="no-members">
                <Users :size="32" />
                <span>暂无同门数据</span>
              </div>
            </div>
            <!-- 分页 -->
            <div v-if="totalMemberPages > 1" class="pagination">
              <button class="page-btn" :disabled="memberPage === 1" @click="memberPage--">
                <ChevronLeft :size="16" />
              </button>
              <span class="page-info">{{ memberPage }} / {{ totalMemberPages }}</span>
              <button class="page-btn" :disabled="memberPage === totalMemberPages" @click="memberPage++">
                <ChevronRight :size="16" />
              </button>
            </div>
          </div>
        </NTabPane>

        <!-- 悬赏 Tab -->
        <NTabPane name="bounties">
          <template #tab>
            <div class="tab-label">
              <Target :size="14" />
              <span>悬赏</span>
            </div>
          </template>
          <div class="tab-content">
            <!-- 进行中的悬赏 -->
            <div v-if="sectStore.getActiveBounties().length > 0" class="active-bounties">
              <h3 class="bounty-subtitle">
                <Clock :size="16" />
                <span>进行中</span>
              </h3>
              <div class="bounty-list">
                <div v-for="bounty in sectStore.getActiveBounties()" :key="bounty.id" class="bounty-item active">
                  <div class="bounty-header">
                    <span class="bounty-type" :class="bounty.type">
                      {{ sectStore.getBountyTypeName(bounty.type) }}
                    </span>
                    <span class="bounty-difficulty" :style="{ color: sectStore.getBountyDifficultyColor(bounty.difficulty) }">
                      {{ sectStore.getBountyDifficultyName(bounty.difficulty) }}
                    </span>
                  </div>
                  <h4 class="bounty-name">{{ bounty.name }}</h4>
                  <p class="bounty-desc">{{ bounty.description }}</p>
                  <div class="bounty-progress">
                    <div class="progress-bar">
                      <div class="progress-fill" :style="{ width: (bounty.progress / bounty.requirement.amount) * 100 + '%' }" />
                    </div>
                    <span class="progress-text">{{ bounty.progress }} / {{ bounty.requirement.amount }}</span>
                  </div>
                  <div class="bounty-rewards">
                    <span class="reward-item">
                      <Award :size="14" />
                      {{ bounty.rewards.contribution }} 贡献
                    </span>
                    <span v-if="bounty.rewards.spiritStones" class="reward-item">
                      <Coins :size="14" />
                      {{ bounty.rewards.spiritStones }} 灵石
                    </span>
                  </div>
                  <button class="abandon-btn" @click="handleAbandonBounty(bounty.id)">
                    <X :size="14" />
                    放弃
                  </button>
                </div>
              </div>
            </div>

            <!-- 可接受的悬赏 -->
            <h3 class="bounty-subtitle">
              <Target :size="16" />
              <span>可接取</span>
            </h3>
            <div class="bounty-list">
              <div
                v-for="bounty in sectStore.getAvailableBounties().filter(b => !b.isActive && !b.isCompleted)"
                :key="bounty.id"
                class="bounty-item"
                :class="{ disabled: !bounty.canAccept }"
              >
                <div class="bounty-header">
                  <span class="bounty-type" :class="bounty.type">
                    {{ sectStore.getBountyTypeName(bounty.type) }}
                  </span>
                  <span class="bounty-difficulty" :style="{ color: sectStore.getBountyDifficultyColor(bounty.difficulty) }">
                    {{ sectStore.getBountyDifficultyName(bounty.difficulty) }}
                  </span>
                </div>
                <h4 class="bounty-name">{{ bounty.name }}</h4>
                <p class="bounty-desc">{{ bounty.description }}</p>
                <div class="bounty-rewards">
                  <span class="reward-item">
                    <Award :size="14" />
                    {{ bounty.rewards.contribution }} 贡献
                  </span>
                  <span v-if="bounty.rewards.spiritStones" class="reward-item">
                    <Coins :size="14" />
                    {{ bounty.rewards.spiritStones }} 灵石
                  </span>
                </div>
                <button class="accept-btn" :disabled="!bounty.canAccept" @click="handleAcceptBounty(bounty.id)">
                  <template v-if="bounty.canAccept">
                    <Check :size="14" />
                    接取
                  </template>
                  <template v-else>
                    {{ bounty.reason }}
                  </template>
                </button>
              </div>

              <!-- 已完成的悬赏 -->
              <div
                v-for="bounty in sectStore.getAvailableBounties().filter(b => b.isCompleted)"
                :key="bounty.id + '-completed'"
                class="bounty-item completed"
              >
                <div class="bounty-header">
                  <span class="bounty-type" :class="bounty.type">
                    {{ sectStore.getBountyTypeName(bounty.type) }}
                  </span>
                  <span class="completed-tag">
                    <Check :size="12" />
                    已完成
                  </span>
                </div>
                <h4 class="bounty-name">{{ bounty.name }}</h4>
                <p class="bounty-desc">{{ bounty.description }}</p>
              </div>
            </div>

            <div v-if="sectStore.getAvailableBounties().length === 0 && sectStore.getActiveBounties().length === 0" class="no-bounties">
              <Target :size="32" />
              <span>暂无可接取的悬赏</span>
            </div>
          </div>
        </NTabPane>

        <!-- 宝库 Tab -->
        <NTabPane name="treasury">
          <template #tab>
            <div class="tab-label">
              <Package :size="14" />
              <span>宝库</span>
            </div>
          </template>
          <div class="tab-content">
            <!-- 宗门捐献 -->
            <div class="donate-card">
              <div class="donate-header">
                <HandCoins :size="18" />
                <span>宗门捐献</span>
              </div>
              <p class="donate-hint">捐献灵石可获得宗门贡献（10灵石 = 1贡献）</p>
              <div class="donate-input-row">
                <NInputNumber
                  v-model:value="donateAmount"
                  :min="10"
                  :max="Number(playerStore.character?.spiritStones || 0)"
                  :step="10"
                  placeholder="输入捐献数量"
                  style="flex: 1"
                />
                <button class="quick-btn" @click="donateAmount = 100">100</button>
                <button class="quick-btn" @click="donateAmount = 500">500</button>
                <button class="quick-btn" @click="donateAmount = 1000">1000</button>
              </div>
              <div class="donate-preview" v-if="donateAmount && donateAmount > 0">
                捐献 {{ donateAmount }} 灵石，可获得 {{ sectStore.calculateDonationContribution(donateAmount) }} 贡献
              </div>
              <button
                class="donate-btn"
                :disabled="!donateAmount || donateAmount < 10 || donateAmount > Number(playerStore.character?.spiritStones || 0)"
                @click="handleDonate"
              >
                <HandCoins :size="16" />
                <span>确认捐献</span>
              </button>
            </div>

            <!-- 宝库物品 -->
            <div class="treasury-section">
              <h3 class="treasury-title">
                <Package :size="18" />
                <span>宝库物品</span>
              </h3>
              <div class="treasury-list">
                <div
                  v-for="item in sectStore.getTreasuryItems()"
                  :key="item.id"
                  class="treasury-item-compact"
                  :class="{ disabled: !sectStore.canBuyItem(item).canBuy }"
                  :style="{ '--quality-color': sectStore.getQualityColor(item.quality) }"
                >
                  <div class="item-left">
                    <div
                      class="item-icon"
                      :style="{
                        background: `${sectStore.getQualityColor(item.quality)}15`,
                        color: sectStore.getQualityColor(item.quality)
                      }"
                    >
                      <Sparkles :size="18" />
                    </div>
                    <div class="item-main">
                      <div class="item-name-row">
                        <span class="item-name" :style="{ color: sectStore.getQualityColor(item.quality) }">{{ item.name }}</span>
                        <span class="item-quality-dot" :style="{ background: sectStore.getQualityColor(item.quality) }" />
                      </div>
                      <p class="item-desc-compact">{{ item.description }}</p>
                      <div class="item-tags">
                        <span v-if="item.effect" class="item-effect-tag">{{ item.effect }}</span>
                        <span v-if="item.limitPerDay" class="item-limit-tag">日限{{ item.limitPerDay }}</span>
                        <span v-if="item.limitTotal" class="item-limit-tag">限{{ item.limitTotal }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="item-right">
                    <div class="item-cost-compact">
                      <Award :size="12" />
                      <span>{{ item.contributionCost }}</span>
                    </div>
                    <button class="buy-btn-compact" :disabled="!sectStore.canBuyItem(item).canBuy" @click="handlePurchase(item.id)">
                      {{ sectStore.canBuyItem(item).canBuy ? '兑换' : sectStore.canBuyItem(item).reason }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </NTabPane>

        <!-- 外交 Tab -->
        <NTabPane name="diplomacy">
          <template #tab>
            <div class="tab-label">
              <Globe :size="14" />
              <span>外交</span>
            </div>
          </template>
          <div class="tab-content">
            <DiplomacyPanel />
          </div>
        </NTabPane>
      </NTabs>
    </template>

    <!-- 宗门特性弹窗 -->
    <NModal v-model:show="showFeatures" preset="card" style="width: 90%; max-width: 400px">
      <template #header>
        <div class="features-modal-header">
          <Sparkles :size="18" />
          <span>{{ sectStore.currentSect?.name }} · 宗门特性</span>
        </div>
      </template>
      <div class="features-modal-content">
        <div v-for="(feature, index) in sectStore.currentSect?.features" :key="index" class="feature-modal-item">
          <div class="feature-modal-name">{{ feature.name }}</div>
          <div class="feature-modal-desc">{{ feature.description }}</div>
        </div>
      </div>
    </NModal>

    <!-- 叛出确认弹窗 -->
    <NModal v-model:show="showLeaveConfirm" preset="dialog" type="warning">
      <template #header>
        <span>确认叛出</span>
      </template>
      <div class="leave-confirm-content">
        <p>
          确定要叛出
          <strong>{{ sectStore.currentSect?.name }}</strong>
          吗？
        </p>
        <div class="penalties">
          <h4>叛出代价：</h4>
          <ul>
            <li>清空所有宗门贡献</li>
            <li v-if="specialPenalty">{{ specialPenalty }}</li>
            <li>进入4小时叛门冷却期</li>
          </ul>
        </div>
      </div>
      <template #action>
        <NButton @click="showLeaveConfirm = false">取消</NButton>
        <NButton type="error" :loading="sectStore.loading" @click="handleLeave">确认叛出</NButton>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useSectStore } from '@/stores/sect'
  import { SECT_LEAVE_PENALTY, type SectRank } from '@/game/constants/sects'
  import { usePlayerStore } from '@/stores/player'
  import { NModal, NButton, NInputNumber, NTabs, NTabPane, useMessage } from 'naive-ui'
  import {
    Building2,
    UserPlus,
    Crown,
    Award,
    Coins,
    Sparkles,
    Users,
    User,
    RefreshCw,
    LogOut,
    TrendingUp,
    Star,
    CalendarCheck,
    BookOpen,
    Flame,
    Package,
    HandCoins,
    Target,
    Check,
    X,
    Clock,
    ChevronLeft,
    ChevronRight,
    Globe,
    // 宗门图标
    Leaf,
    Sword,
    Heart,
    Sun,
    Skull,
    Rabbit,
    Sprout
  } from 'lucide-vue-next'
  import DiplomacyPanel from './components/DiplomacyPanel.vue'

  const router = useRouter()
  const sectStore = useSectStore()
  const playerStore = usePlayerStore()
  const message = useMessage()

  const showLeaveConfirm = ref(false)
  const showFeatures = ref(false)
  const activeTab = ref('overview')
  const donateAmount = ref<number | null>(null)
  const memberPage = ref(1)
  const MEMBERS_PER_PAGE = 10

  // 总页数（使用后端返回的总数）
  const totalMemberPages = computed(() => {
    return Math.ceil(sectStore.totalMembers / MEMBERS_PER_PAGE) || 1
  })

  // 晋升进度
  const promotionProgress = computed(() => {
    if (!sectStore.mySect || !sectStore.nextRankInfo) return 0
    const current = sectStore.mySect.contribution
    const required = sectStore.nextRankInfo.contributionRequired
    return Math.min(100, (current / required) * 100)
  })

  // 专属惩罚
  const specialPenalty = computed(() => {
    if (!sectStore.mySect) return null
    return SECT_LEAVE_PENALTY.specialPenalties[sectStore.mySect.sectId] || null
  })

  // 是否黄枫谷弟子
  const isHuangFeng = computed(() => {
    return sectStore.mySect?.sectId === 'huangfeng'
  })

  // 是否太一门弟子
  const isTaiyi = computed(() => {
    return sectStore.mySect?.sectId === 'taiyi'
  })

  // 是否黑煞教弟子
  const isHeisha = computed(() => {
    return sectStore.mySect?.sectId === 'heisha'
  })

  // 是否万灵宗弟子
  const isWanling = computed(() => {
    return sectStore.mySect?.sectId === 'wanling'
  })

  // 是否合欢宗弟子
  const isHehuan = computed(() => {
    return sectStore.mySect?.sectId === 'hehuan'
  })

  // 获取图标组件
  const getIcon = (iconName: string) => {
    const icons: Record<string, unknown> = {
      Leaf,
      Eye: Sun,
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
      6: '炼虚期',
      7: '合体期',
      8: '大乘期',
      9: '渡劫期'
    }
    return names[tier] || '未知'
  }

  // 获取职位名称
  const getRankName = (rank: SectRank): string => {
    const rankInfo = sectStore.SECT_RANKS.find(r => r.id === rank)
    return rankInfo?.name || rank
  }

  // 格式化日期
  const formatDate = (timestamp: number | undefined): string => {
    if (!timestamp) return '未知'
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)

    if (diffDays === 0) return '今日'
    if (diffDays === 1) return '昨日'
    if (diffDays < 30) return `${diffDays}天前`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`
    return `${Math.floor(diffDays / 365)}年前`
  }

  // 加载同门（分页）
  const loadMembers = (page: number = 1) => {
    sectStore.loadSectMembers(page, MEMBERS_PER_PAGE)
  }

  // 监听页码变化，重新加载数据
  watch(memberPage, newPage => {
    loadMembers(newPage)
  })

  // 领取俸禄
  const handleClaimSalary = async () => {
    const result = await sectStore.claimSalary()
    if (result.success) {
      message.success(result.message)
    } else {
      message.warning(result.message)
    }
  }

  // 宗门点卯
  const handleCheckIn = async () => {
    const result = await sectStore.checkIn()
    if (result.success) {
      message.success(result.message)
      if (result.bonus) {
        message.info(`额外奖励：${result.bonus.description}`)
      }
    } else {
      message.warning(result.message)
    }
  }

  // 宗门传功
  const handleTeach = async () => {
    const result = await sectStore.teach()
    if (result.success) {
      message.success(result.message)
    } else {
      message.warning(result.message)
    }
  }

  // 购买宝库物品
  const handlePurchase = async (itemId: string) => {
    const result = await sectStore.purchaseTreasuryItem(itemId)
    if (result.success) {
      message.success(result.message)
    } else {
      message.error(result.message)
    }
  }

  // 捐献灵石
  const handleDonate = async () => {
    if (!donateAmount.value || donateAmount.value < 10) {
      message.warning('捐献数量至少为10灵石')
      return
    }

    const result = await sectStore.donate(donateAmount.value)
    if (result.success) {
      message.success(result.message)
      donateAmount.value = null
    } else {
      message.error(result.message)
    }
  }

  // 接受悬赏
  const handleAcceptBounty = async (bountyId: string) => {
    const result = await sectStore.acceptBounty(bountyId)
    if (result.success) {
      message.success(result.message)
    } else {
      message.error(result.message)
    }
  }

  // 放弃悬赏
  const handleAbandonBounty = async (bountyId: string) => {
    const result = await sectStore.abandonBounty(bountyId)
    if (result.success) {
      message.success(result.message)
    } else {
      message.error(result.message)
    }
  }

  // 晋升
  const handlePromote = async () => {
    const result = await sectStore.promote()
    if (result.success) {
      message.success(result.message)
    } else {
      message.error(result.message)
    }
  }

  // 叛出宗门
  const handleLeave = async () => {
    const result = await sectStore.leaveSect()
    if (result.success) {
      showLeaveConfirm.value = false
      message.success(result.message)
      if (result.penalties) {
        result.penalties.forEach(p => message.warning(p))
      }
      sectStore.saveCooldown()
      router.push('/sect/list')
    } else {
      message.error(result.message)
    }
  }

  onMounted(async () => {
    // 先从后端加载宗门状态
    await sectStore.init()
    // 如果有宗门，加载同门列表
    if (sectStore.hasSect) {
      loadMembers()
    }
  })
</script>

<style scoped>
  .my-sect-page {
    padding-bottom: 100px;
  }

  /* 无宗门状态 */
  .no-sect {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    padding: 40px 20px;
  }

  .no-sect-icon {
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

  .no-sect h2 {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0 0 8px;
    color: var(--text-primary);
  }

  .no-sect p {
    color: var(--text-muted);
    margin: 0 0 24px;
  }

  .join-link {
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

  .join-link:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(93, 124, 111, 0.3);
  }

  /* 宗门横幅 - 紧凑版 */
  .sect-banner {
    position: relative;
    padding: 16px;
    overflow: hidden;
  }

  .banner-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, var(--sect-color) 0%, transparent 100%);
    opacity: 0.15;
  }

  .banner-content {
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .sect-emblem {
    width: 56px;
    height: 56px;
    background: var(--sect-color);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    flex-shrink: 0;
  }

  .sect-info {
    flex: 1;
    min-width: 0;
  }

  .sect-name {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0 0 6px;
    color: var(--text-primary);
  }

  .sect-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .alignment-tag {
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 2px;
  }

  .alignment-tag.righteous {
    background: rgba(107, 142, 122, 0.2);
    color: #7cb88a;
  }

  .alignment-tag.neutral {
    background: rgba(201, 169, 89, 0.2);
    color: #c9a959;
  }

  .alignment-tag.demonic {
    background: rgba(201, 106, 90, 0.2);
    color: #c96a5a;
  }

  .rank-tag {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: var(--color-gold);
  }

  .leave-btn-small {
    padding: 8px;
    background: transparent;
    border: 1px solid rgba(201, 106, 90, 0.3);
    border-radius: 4px;
    color: #c96a5a;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .leave-btn-small:hover {
    background: rgba(201, 106, 90, 0.1);
  }

  .feature-btn {
    padding: 8px;
    background: transparent;
    border: 1px solid rgba(201, 169, 89, 0.3);
    border-radius: 4px;
    color: var(--color-gold);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .feature-btn:hover {
    background: rgba(201, 169, 89, 0.1);
  }

  /* 宗门特性弹窗 */
  .features-modal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-gold);
  }

  .features-modal-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .feature-modal-item {
    padding: 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
  }

  .feature-modal-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--color-gold);
    margin-bottom: 4px;
  }

  .feature-modal-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  /* Tab 样式 */
  .sect-tabs {
    margin-top: 10px;
    padding: 0 12px;
  }

  .sect-tabs :deep(.n-tabs-rail) {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 4px;
  }

  .sect-tabs :deep(.n-tabs-capsule) {
    background: rgba(201, 169, 89, 0.2);
    border-radius: 6px;
  }

  .sect-tabs :deep(.n-tabs-tab) {
    padding: 8px 12px;
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .sect-tabs :deep(.n-tabs-tab:hover) {
    color: var(--text-primary);
  }

  .sect-tabs :deep(.n-tabs-tab--active) {
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

  /* 分页样式 */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-top: 16px;
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

  /* 每日任务卡片 */
  .daily-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 16px;
  }

  .daily-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px;
    text-align: center;
  }

  .daily-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    margin-bottom: 10px;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .streak-badge,
  .salary-amount,
  .teach-count-badge {
    font-size: 0.7rem;
    padding: 2px 6px;
    background: rgba(201, 169, 89, 0.15);
    border-radius: 10px;
    color: var(--color-gold);
  }

  .daily-btn {
    width: 100%;
    padding: 8px 12px;
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    border: none;
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .daily-btn:hover:not(.disabled) {
    transform: translateY(-1px);
  }

  .daily-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--bg-secondary);
  }

  /* 状态行 */
  .status-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .status-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 14px;
    text-align: center;
  }

  .status-label {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 6px;
  }

  .status-value {
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .rank-value {
    color: var(--color-gold);
  }

  .contrib-value {
    color: var(--text-primary);
  }

  .status-sub {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* 晋升卡片 */
  .promotion-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 16px;
  }

  .promotion-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .progress-bar {
    height: 6px;
    background: rgba(93, 124, 111, 0.1);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 12px;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #5d7c6f, #7a9e8e);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .promote-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 12px;
    background: linear-gradient(135deg, #c9a959 0%, #a08040 100%);
    border: none;
    border-radius: 4px;
    color: #1a1812;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .promote-btn:hover:not(.disabled) {
    transform: translateY(-2px);
  }

  .promote-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .max-rank-card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px;
    background: rgba(201, 169, 89, 0.1);
    border-radius: 8px;
    color: var(--color-gold);
    font-size: 0.9rem;
    margin-bottom: 16px;
  }

  /* 区块标题 */
  .section-block {
    margin-bottom: 16px;
  }

  .section-block-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0 0 12px;
    color: var(--text-primary);
  }

  /* 紧凑特性列表 */
  .features-compact {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
  }

  .feature-item-compact {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border-color);
  }

  .feature-item-compact:last-child {
    border-bottom: none;
  }

  .feature-icon-small {
    color: var(--color-gold);
    flex-shrink: 0;
  }

  .feature-name-small {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
  }

  .feature-desc-small {
    font-size: 0.8rem;
    color: var(--text-muted);
    flex: 1;
    text-align: right;
  }

  /* 同门列表头部 */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .member-count {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .refresh-btn {
    padding: 6px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover:not(:disabled) {
    border-color: var(--color-gold);
    color: var(--text-primary);
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

  /* 同门列表 */
  .members-list {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
  }

  .member-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border-color);
  }

  .member-item:last-child {
    border-bottom: none;
  }

  .member-avatar {
    position: relative;
    width: 40px;
    height: 40px;
    background: rgba(93, 124, 111, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }

  .online-dot {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 10px;
    height: 10px;
    background: #6b6560;
    border: 2px solid var(--bg-card);
    border-radius: 50%;
  }

  .online-dot.online {
    background: #7cb88a;
  }

  .member-info {
    flex: 1;
  }

  .member-name {
    display: block;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 2px;
  }

  .member-rank {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .member-realm {
    font-size: 0.85rem;
    color: var(--color-gold);
  }

  .no-members {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px 20px;
    color: var(--text-muted);
  }

  /* 叛出宗门 */
  .leave-section {
    padding: 20px 16px;
    text-align: center;
  }

  .leave-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 24px;
    background: transparent;
    border: 1px solid rgba(201, 106, 90, 0.3);
    border-radius: 4px;
    color: #c96a5a;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .leave-btn:hover {
    background: rgba(201, 106, 90, 0.1);
  }

  .leave-hint {
    margin: 8px 0 0;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  /* 叛出确认弹窗 */
  .leave-confirm-content {
    text-align: center;
  }

  .leave-confirm-content p {
    margin: 0 0 16px;
  }

  .leave-confirm-content strong {
    color: var(--color-gold);
  }

  .penalties {
    text-align: left;
    padding: 16px;
    background: rgba(201, 106, 90, 0.1);
    border-radius: 4px;
  }

  .penalties h4 {
    margin: 0 0 8px;
    color: #c96a5a;
  }

  .penalties ul {
    margin: 0;
    padding-left: 20px;
    color: var(--text-secondary);
  }

  .penalties li {
    margin-bottom: 4px;
  }

  /* 宝库区域 */
  .toggle-btn {
    padding: 6px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-muted);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toggle-btn:hover {
    border-color: var(--color-gold);
    color: var(--text-primary);
  }

  /* 宝库物品列表 - 紧凑布局 */
  .treasury-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .treasury-item-compact {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    border-left: 3px solid var(--quality-color);
    transition: all 0.2s ease;
  }

  .treasury-item-compact:hover:not(.disabled) {
    border-color: var(--quality-color);
    background: rgba(255, 255, 255, 0.02);
  }

  .treasury-item-compact.disabled {
    opacity: 0.5;
  }

  .item-left {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  .item-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .item-main {
    flex: 1;
    min-width: 0;
  }

  .item-name-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
  }

  .item-name {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .item-quality-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .item-desc-compact {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
  }

  .item-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }

  .item-effect-tag {
    font-size: 0.65rem;
    padding: 1px 6px;
    background: rgba(201, 169, 89, 0.15);
    border-radius: 3px;
    color: var(--color-gold);
  }

  .item-limit-tag {
    font-size: 0.65rem;
    padding: 1px 6px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
    color: var(--text-muted);
  }

  .item-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    flex-shrink: 0;
  }

  .item-cost-compact {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-gold);
  }

  .buy-btn-compact {
    padding: 5px 14px;
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    border: none;
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .buy-btn-compact:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(93, 124, 111, 0.3);
  }

  .buy-btn-compact:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--bg-secondary);
    font-size: 0.65rem;
  }

  /* 捐献区域 */
  .donate-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
  }

  .donate-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 10px;
  }

  .donate-hint {
    margin: 0 0 12px;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  /* 宝库区块 */
  .treasury-section {
    margin-top: 16px;
  }

  .treasury-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px;
  }

  .donate-input-row {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .quick-btn {
    padding: 8px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-secondary);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .quick-btn:hover {
    border-color: var(--color-gold);
    color: var(--text-primary);
  }

  .donate-preview {
    margin-bottom: 12px;
    padding: 10px;
    background: rgba(201, 169, 89, 0.1);
    border-radius: 4px;
    font-size: 0.85rem;
    color: var(--color-gold);
    text-align: center;
  }

  .donate-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 16px;
    background: linear-gradient(135deg, #c9a959 0%, #a08040 100%);
    border: none;
    border-radius: 4px;
    color: #1a1812;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .donate-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(201, 169, 89, 0.3);
  }

  .donate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 悬赏区域 */
  .bounty-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 16px;
  }

  .active-bounties {
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .bounty-subtitle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0 0 12px;
  }

  .bounty-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .bounty-item {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 14px;
    position: relative;
    transition: all 0.2s ease;
  }

  .bounty-item:hover:not(.disabled):not(.completed) {
    border-color: var(--color-gold);
  }

  .bounty-item.active {
    border-color: rgba(107, 142, 124, 0.5);
    background: rgba(107, 142, 124, 0.05);
  }

  .bounty-item.disabled {
    opacity: 0.6;
  }

  .bounty-item.completed {
    opacity: 0.5;
    background: rgba(0, 0, 0, 0.1);
  }

  .bounty-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .bounty-type {
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;
  }

  .bounty-type.daily {
    background: rgba(82, 196, 26, 0.15);
    color: #52c41a;
  }

  .bounty-type.weekly {
    background: rgba(24, 144, 255, 0.15);
    color: #1890ff;
  }

  .bounty-type.special {
    background: rgba(245, 34, 45, 0.15);
    color: #f5222d;
  }

  .bounty-difficulty {
    font-size: 0.75rem;
    font-weight: 500;
  }

  .completed-tag {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: #52c41a;
  }

  .bounty-name {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0 0 4px;
    color: var(--text-primary);
  }

  .bounty-desc {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin: 0 0 10px;
  }

  .bounty-progress {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .bounty-progress .progress-bar {
    flex: 1;
    height: 6px;
    background: rgba(93, 124, 111, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .bounty-progress .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #5d7c6f, #7a9e8e);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .bounty-progress .progress-text {
    font-size: 0.75rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .bounty-rewards {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 12px;
  }

  .reward-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--color-gold);
  }

  .accept-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 16px;
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    border: none;
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .accept-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .accept-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    font-size: 0.75rem;
  }

  .abandon-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: transparent;
    border: 1px solid rgba(201, 106, 90, 0.3);
    border-radius: 4px;
    color: #c96a5a;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .abandon-btn:hover {
    background: rgba(201, 106, 90, 0.1);
  }

  .no-bounties {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px 20px;
    color: var(--text-muted);
  }

  /* 宗门专属功能入口 */
  .sect-special-feature {
    margin-top: 16px;
  }

  .special-feature-link {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .special-feature-link:hover {
    border-color: rgba(93, 124, 111, 0.5);
    transform: translateY(-2px);
  }

  .garden-link .feature-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(93, 124, 111, 0.1);
    border-radius: 10px;
    color: #5d7c6f;
  }

  .taiyi-link .feature-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(139, 92, 246, 0.1);
    border-radius: 10px;
    color: #8b5cf6;
  }

  .taiyi-link:hover {
    border-color: rgba(139, 92, 246, 0.5);
  }

  .heisha-link .feature-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(220, 38, 38, 0.1);
    border-radius: 10px;
    color: #dc2626;
  }

  .heisha-link:hover {
    border-color: rgba(220, 38, 38, 0.5);
  }

  .wanling-link .feature-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(8, 145, 178, 0.1);
    border-radius: 10px;
    color: #0891b2;
  }

  .wanling-link:hover {
    border-color: rgba(8, 145, 178, 0.5);
  }

  .hehuan-link .feature-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(236, 72, 153, 0.1);
    border-radius: 10px;
    color: #ec4899;
  }

  .hehuan-link:hover {
    border-color: rgba(236, 72, 153, 0.5);
  }

  .feature-info {
    flex: 1;
  }

  .feature-name {
    display: block;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .feature-desc {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .feature-arrow {
    color: var(--text-muted);
  }

  @media (min-width: 640px) {
    .features-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .bounty-list {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
