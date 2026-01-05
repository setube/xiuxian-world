<template>
  <div class="create-page">
    <!-- 背景装饰 -->
    <div class="bg-effects">
      <div class="bg-orb bg-orb-1" />
      <div class="bg-orb bg-orb-2" />
      <div class="particles">
        <span v-for="i in 15" :key="i" class="particle" :style="getParticleStyle(i)" />
      </div>
    </div>

    <!-- 主内容 -->
    <div class="content-wrapper">
      <div class="elder-avatar">
        <Scroll :size="48" />
      </div>

      <h1 class="title">取定道号</h1>
      <p class="subtitle">踏入修仙之路</p>

      <div class="dialog-box">
        <p class="dialog-text">「道号乃修士立身之本，需慎重选择。」</p>
        <p class="dialog-text">「一朝定名，便是仙途之始。」</p>
      </div>

      <div class="form-card">
        <div class="card-header">
          <User :size="20" />
          <span>请输入道号</span>
        </div>

        <div class="input-wrapper">
          <n-input
            v-model:value="characterName"
            placeholder="2-12个字符"
            size="large"
            :maxlength="12"
            :disabled="loading"
            @keyup.enter="handleCreate"
          >
            <template #prefix>
              <Feather :size="18" class="input-icon" />
            </template>
          </n-input>
          <p class="input-hint">支持中文、字母、数字、下划线</p>
        </div>

        <button class="submit-btn" :disabled="loading" @click="handleCreate">
          <Sparkles v-if="!loading" :size="20" />
          <n-spin v-else :size="18" />
          <span>{{ loading ? '确认中...' : '确认道号' }}</span>
        </button>
      </div>

      <div class="bottom-decoration">
        <div class="deco-line" />
        <span class="deco-text">道法自然</span>
        <div class="deco-line" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMessage } from 'naive-ui'
  import { usePlayerStore } from '@/stores/player'
  import { extractErrorMessage } from '@/api'
  import { Scroll, User, Feather, Sparkles } from 'lucide-vue-next'

  const router = useRouter()
  const playerStore = usePlayerStore()

  const characterName = ref('')
  const loading = ref(false)
  const message = useMessage()

  const handleCreate = async () => {
    if (!characterName.value) {
      message.warning('请输入道号')
      return
    }

    if (characterName.value.length < 2 || characterName.value.length > 12) {
      message.warning('道号长度应为2-12个字符')
      return
    }

    loading.value = true
    try {
      await playerStore.setCharacterName(characterName.value)
      router.push('/spirit-root-detection')
    } catch (error: unknown) {
      message.error(extractErrorMessage(error, '设置失败'))
      loading.value = false
    }
  }

  // 粒子样式生成
  const getParticleStyle = (_index: number) => {
    const left = Math.random() * 100
    const delay = Math.random() * 6
    const duration = 8 + Math.random() * 4
    const size = 2 + Math.random() * 3
    return {
      '--left': `${left}%`,
      '--delay': `${delay}s`,
      '--duration': `${duration}s`,
      '--size': `${size}px`
    }
  }
</script>

<style scoped>
  .create-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #1a1812 0%, #252117 50%, #1a1812 100%);
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
    overflow: hidden;
  }

  .particle {
    position: absolute;
    width: var(--size);
    height: var(--size);
    background: radial-gradient(circle, rgba(201, 169, 89, 0.6) 0%, transparent 70%);
    border-radius: 50%;
    left: var(--left);
    bottom: -10px;
    animation: particle-rise var(--duration) ease-in-out infinite;
    animation-delay: var(--delay);
    opacity: 0;
  }

  @keyframes particle-rise {
    0% {
      transform: translateY(0) scale(0);
      opacity: 0;
    }
    10% {
      opacity: 0.8;
      transform: translateY(-10vh) scale(1);
    }
    90% {
      opacity: 0.4;
    }
    100% {
      transform: translateY(-100vh) scale(0.5);
      opacity: 0;
    }
  }

  /* 主内容 */
  .content-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    z-index: 1;
    width: 100%;
    max-width: 380px;
    animation: fadeIn 0.6s ease;
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
    animation: glow 3s ease-in-out infinite;
  }

  @keyframes glow {
    0%,
    100% {
      box-shadow: 0 0 20px rgba(201, 169, 89, 0.3);
    }
    50% {
      box-shadow: 0 0 40px rgba(201, 169, 89, 0.5);
    }
  }

  .title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-gold);
    margin: 0 0 8px;
    letter-spacing: 8px;
    text-shadow: 0 0 20px rgba(201, 169, 89, 0.3);
  }

  .subtitle {
    font-size: 1rem;
    color: var(--text-secondary);
    margin: 0 0 24px;
    letter-spacing: 4px;
  }

  .dialog-box {
    background: rgba(37, 33, 23, 0.9);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 20px 24px;
    margin-bottom: 24px;
    width: 100%;
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
    margin: 0 0 8px;
    color: var(--text-secondary);
    line-height: 1.8;
    font-size: 0.9rem;
  }

  .dialog-text:last-child {
    margin-bottom: 0;
  }

  /* 表单卡片 */
  .form-card {
    background: rgba(37, 33, 23, 0.95);
    border: 1px solid var(--color-gold);
    border-radius: 4px;
    padding: 24px;
    width: 100%;
    position: relative;
    margin-bottom: 24px;
  }

  .form-card::before {
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
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 20px;
    letter-spacing: 2px;
  }

  .input-wrapper {
    margin-bottom: 20px;
  }

  .input-icon {
    color: var(--text-muted);
  }

  .input-hint {
    margin: 8px 0 0;
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: left;
  }

  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 14px 24px;
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

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(201, 169, 89, 0.3);
  }

  .submit-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* 底部装饰 */
  .bottom-decoration {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    opacity: 0.5;
  }

  .deco-line {
    width: 60px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(201, 169, 89, 0.5), transparent);
  }

  .deco-text {
    font-size: 0.75rem;
    color: var(--color-gold);
    letter-spacing: 4px;
    font-weight: 500;
  }

  /* 输入框样式 */
  :deep(.n-input) {
    --n-border-radius: 4px !important;
    --n-border: 1px solid var(--border-color) !important;
    --n-border-focus: 1px solid var(--color-gold) !important;
    --n-box-shadow-focus: 0 0 0 2px rgba(201, 169, 89, 0.1) !important;
    --n-color: rgba(37, 33, 23, 0.9) !important;
    --n-color-focus: rgba(37, 33, 23, 0.95) !important;
  }

  :deep(.n-input__input-el) {
    font-size: 1.1rem !important;
    letter-spacing: 2px;
  }

  :deep(.n-input__placeholder) {
    letter-spacing: 1px;
  }
</style>
