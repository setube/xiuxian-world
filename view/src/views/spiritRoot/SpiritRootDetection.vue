<template>
  <div class="detection-page">
    <!-- 背景装饰 -->
    <div class="bg-effects">
      <div class="bg-orb bg-orb-1" />
      <div class="bg-orb bg-orb-2" />
      <div class="particles" v-if="stage === 'detecting'">
        <div class="particle" v-for="i in 20" :key="i" />
      </div>
    </div>

    <!-- 介绍阶段 -->
    <div v-if="stage === 'intro'" class="intro-stage">
      <div class="elder-avatar">
        <Eye :size="48" />
      </div>
      <h1 class="title">天机阁</h1>
      <p class="subtitle">灵根测试</p>

      <div class="dialog-box">
        <p class="dialog-text">「凡人若想踏入仙途，必先明晰自身根骨。」</p>
        <p class="dialog-text">「吾乃天机阁长老，可为你测定灵根资质。」</p>
        <p class="dialog-text highlight">「你可愿一试？」</p>
      </div>

      <button class="detect-btn" @click="startDetection">
        <Sparkles :size="20" />
        <span>开始测定</span>
      </button>
    </div>

    <!-- 检测中阶段 -->
    <div v-if="stage === 'detecting'" class="detecting-stage">
      <div class="detection-orb" :class="{ animating: isAnimating }">
        <div class="orb-core">
          <Sparkles :size="40" :style="{ color: displayRoot?.color || '#c9a959' }" />
        </div>
        <div class="orb-ring ring-1" />
        <div class="orb-ring ring-2" />
        <div class="orb-ring ring-3" />
      </div>

      <div class="detecting-text" v-if="isAnimating">
        <p>正在探查灵根...</p>
        <p class="temp-root" v-if="tempRoot" :style="{ color: tempRoot.color }">
          {{ tempRoot.name }}
        </p>
      </div>
    </div>

    <!-- 结果阶段 -->
    <div v-if="stage === 'result'" class="result-stage">
      <div class="result-card">
        <div class="card-header">
          <Scroll :size="24" />
          <span>灵根鉴定书</span>
        </div>

        <div class="dao-name-section">
          <span class="label">道号</span>
          <span class="dao-name">{{ daoName }}</span>
        </div>

        <div class="root-section">
          <div
            class="root-icon"
            :style="{
              background: `linear-gradient(135deg, ${detectedRoot?.color}30, ${detectedRoot?.color}10)`,
              borderColor: detectedRoot?.color
            }"
          >
            <Sparkles :size="32" :style="{ color: detectedRoot?.color }" />
          </div>
          <div class="root-info">
            <div class="root-name" :style="{ color: detectedRoot?.color }">
              {{ detectedRoot?.name }}
            </div>
            <div class="root-rarity" :style="{ color: rarityInfo?.color }">{{ rarityInfo?.label }}灵根</div>
          </div>
        </div>

        <div class="root-element">
          <span class="label">五行属性</span>
          <span class="value">{{ detectedRoot?.element }}</span>
        </div>

        <div class="root-desc">
          <p>「{{ detectedRoot?.description }}」</p>
        </div>

        <div class="root-bonus">
          <div class="bonus-item">
            <span class="bonus-label">修炼速度</span>
            <span class="bonus-value">+{{ detectedRoot?.cultivationBonus }}%</span>
          </div>
        </div>

        <div class="attributes" v-if="detectedRoot?.attributes">
          <div class="attr-item" v-for="(value, key) in detectedRoot.attributes" :key="key">
            <span class="attr-label">
              {{ key === 'attack' ? '攻击' : key === 'defense' ? '防御' : key === 'speed' ? '速度' : '幸运' }}
            </span>
            <span class="attr-value">+{{ value }}</span>
          </div>
        </div>

        <div class="realm-info">
          <span class="label">起始境界</span>
          <span class="realm">炼气期一层</span>
        </div>
      </div>

      <div class="elder-comment">
        <p v-if="detectedRoot?.rarity === 'mythic'">「天品灵根！！此乃万中无一之资质，前途不可限量！」</p>
        <p v-else-if="detectedRoot?.rarity === 'legendary'">「地品灵根！资质上佳，好生修炼必成大器。」</p>
        <p v-else-if="detectedRoot?.rarity === 'epic'">「玄品灵根，资质不俗，勤加修炼可有所成。」</p>
        <p v-else-if="detectedRoot?.rarity === 'rare'">「灵品灵根，资质尚可，需比常人更加努力。」</p>
        <p v-else>「凡品灵根，虽资质平平，但修道在于心诚，勿要气馁。」</p>
      </div>

      <button class="confirm-btn" @click="confirmAndStart">
        <span>踏入仙途</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMessage } from 'naive-ui'
  import { usePlayerStore } from '@/stores/player'
  import { extractErrorMessage } from '@/api'
  import { SPIRIT_ROOTS, RARITY_CONFIG, type SpiritRoot } from '@/game/constants/spiritRoots'
  import { Sparkles, Eye, Scroll } from 'lucide-vue-next'

  const router = useRouter()
  const playerStore = usePlayerStore()
  const message = useMessage()

  const stage = ref<'intro' | 'detecting' | 'result'>('intro')
  const detectedRoot = ref<SpiritRoot | null>(null)
  const daoName = ref('')
  const isAnimating = ref(false)

  // 检测动画中显示的临时灵根
  const tempRoot = ref<SpiritRoot | null>(null)
  let animationInterval: ReturnType<typeof setInterval> | null = null

  const startDetection = async () => {
    stage.value = 'detecting'
    isAnimating.value = true

    // 开始闪烁动画
    const roots = Object.values(SPIRIT_ROOTS)
    let count = 0
    const maxCount = 30 // 闪烁次数

    // 调用后端检测接口
    let result: { character: { name: string; spiritRootId: string }; spiritRoot: SpiritRoot } | null = null
    try {
      result = await playerStore.detectSpiritRoot()
    } catch (error: unknown) {
      if (animationInterval) clearInterval(animationInterval)
      isAnimating.value = false
      stage.value = 'intro'
      message.error(extractErrorMessage(error, '灵根检测失败'))
      return
    }

    animationInterval = setInterval(() => {
      tempRoot.value = roots[Math.floor(Math.random() * roots.length)] ?? null
      count++

      if (count >= maxCount) {
        // 停止动画，显示结果
        if (animationInterval) clearInterval(animationInterval)

        // 使用后端返回的结果
        detectedRoot.value = result!.spiritRoot
        daoName.value = result!.character.name
        tempRoot.value = detectedRoot.value
        isAnimating.value = false

        // 延迟显示结果页
        setTimeout(() => {
          stage.value = 'result'
        }, 500)
      }
    }, 100)
  }

  const confirmAndStart = () => {
    // 角色已在检测时创建，直接进入游戏
    router.push('/')
  }

  const rarityInfo = computed(() => {
    if (!detectedRoot.value) return null
    return RARITY_CONFIG[detectedRoot.value.rarity]
  })

  const displayRoot = computed(() => {
    return tempRoot.value || detectedRoot.value
  })
</script>

<style scoped>
  .detection-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    position: relative;
    overflow: hidden;
  }

  /* 背景效果 */
  .bg-effects {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .bg-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.3;
  }

  .bg-orb-1 {
    width: 300px;
    height: 300px;
    background: rgba(201, 169, 89, 0.3);
    top: -100px;
    right: -50px;
    animation: float 10s ease-in-out infinite;
  }

  .bg-orb-2 {
    width: 250px;
    height: 250px;
    background: rgba(93, 124, 111, 0.3);
    bottom: -50px;
    left: -50px;
    animation: float 12s ease-in-out infinite reverse;
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-30px);
    }
  }

  /* 粒子效果 */
  .particles {
    position: absolute;
    inset: 0;
  }

  .particle {
    position: absolute;
    width: 4px;
    height: 4px;
    background: var(--color-gold);
    border-radius: 50%;
    animation: particle-rise 2s ease-out infinite;
  }

  .particle:nth-child(1) {
    left: 10%;
    animation-delay: 0s;
  }
  .particle:nth-child(2) {
    left: 20%;
    animation-delay: 0.2s;
  }
  .particle:nth-child(3) {
    left: 30%;
    animation-delay: 0.4s;
  }
  .particle:nth-child(4) {
    left: 40%;
    animation-delay: 0.1s;
  }
  .particle:nth-child(5) {
    left: 50%;
    animation-delay: 0.3s;
  }
  .particle:nth-child(6) {
    left: 60%;
    animation-delay: 0.5s;
  }
  .particle:nth-child(7) {
    left: 70%;
    animation-delay: 0.15s;
  }
  .particle:nth-child(8) {
    left: 80%;
    animation-delay: 0.35s;
  }
  .particle:nth-child(9) {
    left: 90%;
    animation-delay: 0.25s;
  }
  .particle:nth-child(10) {
    left: 15%;
    animation-delay: 0.45s;
  }
  .particle:nth-child(11) {
    left: 25%;
    animation-delay: 0.55s;
  }
  .particle:nth-child(12) {
    left: 35%;
    animation-delay: 0.05s;
  }
  .particle:nth-child(13) {
    left: 45%;
    animation-delay: 0.65s;
  }
  .particle:nth-child(14) {
    left: 55%;
    animation-delay: 0.75s;
  }
  .particle:nth-child(15) {
    left: 65%;
    animation-delay: 0.85s;
  }
  .particle:nth-child(16) {
    left: 75%;
    animation-delay: 0.95s;
  }
  .particle:nth-child(17) {
    left: 85%;
    animation-delay: 0.12s;
  }
  .particle:nth-child(18) {
    left: 95%;
    animation-delay: 0.22s;
  }
  .particle:nth-child(19) {
    left: 5%;
    animation-delay: 0.32s;
  }
  .particle:nth-child(20) {
    left: 50%;
    animation-delay: 0.42s;
  }

  @keyframes particle-rise {
    0% {
      bottom: 0;
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    100% {
      bottom: 100%;
      opacity: 0;
    }
  }

  /* 介绍阶段 */
  .intro-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    z-index: 1;
  }

  .elder-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-gold);
    border: 2px solid var(--color-gold);
    margin-bottom: 20px;
    box-shadow: 0 0 30px rgba(201, 169, 89, 0.3);
  }

  .title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-gold);
    margin: 0 0 8px;
    letter-spacing: 8px;
  }

  .subtitle {
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin: 0 0 30px;
    letter-spacing: 4px;
  }

  .dialog-box {
    background: rgba(37, 33, 23, 0.9);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 24px;
    margin-bottom: 30px;
    max-width: 320px;
    position: relative;
  }

  .dialog-box::before {
    content: '';
    position: absolute;
    top: 0;
    left: 20px;
    right: 20px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--color-gold), transparent);
  }

  .dialog-text {
    margin: 0 0 12px;
    color: var(--text-secondary);
    line-height: 1.8;
    font-size: 0.95rem;
  }

  .dialog-text:last-child {
    margin-bottom: 0;
  }

  .dialog-text.highlight {
    color: var(--color-gold);
    font-weight: 600;
  }

  .detect-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 40px;
    background: linear-gradient(135deg, #5d7c6f 0%, #3d5a4f 100%);
    border: 1px solid var(--color-gold);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    letter-spacing: 2px;
  }

  .detect-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(201, 169, 89, 0.3);
  }

  /* 检测中阶段 */
  .detecting-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 1;
  }

  .detection-orb {
    position: relative;
    width: 180px;
    height: 180px;
    margin-bottom: 30px;
  }

  .orb-core {
    position: absolute;
    inset: 40px;
    background: rgba(37, 33, 23, 0.9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--color-gold);
    z-index: 2;
  }

  .orb-ring {
    position: absolute;
    border: 1px solid var(--color-gold);
    border-radius: 50%;
    opacity: 0.5;
  }

  .ring-1 {
    inset: 0;
    animation: ring-rotate 3s linear infinite;
  }

  .ring-2 {
    inset: 15px;
    animation: ring-rotate 4s linear infinite reverse;
  }

  .ring-3 {
    inset: 30px;
    animation: ring-rotate 5s linear infinite;
  }

  .detection-orb.animating .orb-core {
    animation: pulse 0.5s ease-in-out infinite;
  }

  .detection-orb.animating .orb-ring {
    animation-duration: 0.5s;
  }

  @keyframes ring-rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  .detecting-text {
    text-align: center;
  }

  .detecting-text p {
    margin: 0;
    color: var(--text-secondary);
  }

  .temp-root {
    font-size: 1.5rem;
    font-weight: 700;
    margin-top: 10px !important;
    transition: color 0.1s;
  }

  /* 结果阶段 */
  .result-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 1;
    width: 100%;
    max-width: 360px;
    animation: fadeIn 0.5s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .result-card {
    background: rgba(37, 33, 23, 0.95);
    border: 1px solid var(--color-gold);
    border-radius: 4px;
    padding: 24px;
    width: 100%;
    margin-bottom: 20px;
    position: relative;
  }

  .result-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--color-gold), #a08040, var(--color-gold));
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--color-gold);
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 20px;
    letter-spacing: 4px;
  }

  .dao-name-section {
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .dao-name-section .label {
    display: block;
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  .dao-name {
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: 4px;
  }

  .root-section {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }

  .root-icon {
    width: 64px;
    height: 64px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid;
  }

  .root-info {
    flex: 1;
  }

  .root-name {
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .root-rarity {
    font-size: 0.9rem;
    font-weight: 600;
  }

  .root-element {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    padding: 10px 12px;
    background: rgba(201, 169, 89, 0.1);
    border-radius: 4px;
  }

  .root-element .label {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .root-element .value {
    color: var(--color-gold);
    font-weight: 600;
  }

  .root-desc {
    margin-bottom: 16px;
    padding: 12px;
    background: rgba(93, 124, 111, 0.1);
    border-radius: 4px;
    border-left: 2px solid var(--color-primary);
  }

  .root-desc p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .root-bonus {
    margin-bottom: 12px;
  }

  .bonus-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(201, 169, 89, 0.08);
    border-radius: 4px;
  }

  .bonus-label {
    color: var(--text-secondary);
  }

  .bonus-value {
    color: var(--color-gold);
    font-weight: 600;
  }

  .attributes {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }

  .attr-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(93, 124, 111, 0.08);
    border-radius: 4px;
  }

  .attr-label {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .attr-value {
    color: #7cb88a;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .realm-info {
    display: flex;
    justify-content: space-between;
    padding: 12px;
    background: rgba(201, 169, 89, 0.1);
    border: 1px solid rgba(201, 169, 89, 0.3);
    border-radius: 4px;
  }

  .realm-info .label {
    color: var(--text-secondary);
  }

  .realm-info .realm {
    color: var(--color-gold);
    font-weight: 600;
  }

  .elder-comment {
    text-align: center;
    margin-bottom: 20px;
  }

  .elder-comment p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.6;
  }

  .confirm-btn {
    padding: 14px 60px;
    background: linear-gradient(135deg, #c9a959 0%, #a08040 100%);
    border: none;
    border-radius: 4px;
    color: #1a1812;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    letter-spacing: 4px;
  }

  .confirm-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(201, 169, 89, 0.4);
  }
</style>
