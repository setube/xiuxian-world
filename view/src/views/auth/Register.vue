<template>
  <div class="register-container">
    <!-- 时空穿梭过渡效果 - 传送到 body 层级 -->
    <Teleport to="body">
      <Transition name="warp">
        <div v-if="isWarping" class="warp-overlay">
          <!-- 星空背景 -->
          <div class="star-field">
            <span v-for="i in 100" :key="i" class="star" :style="getStarStyle(i)" />
          </div>

          <!-- 速度线条 -->
          <div class="speed-lines">
            <span v-for="i in 40" :key="i" class="speed-line" :style="getSpeedLineStyle(i)" />
          </div>

          <!-- 中心光圈 -->
          <div class="warp-center">
            <div class="warp-ring ring-1" />
            <div class="warp-ring ring-2" />
            <div class="warp-ring ring-3" />
            <div class="warp-core" />
          </div>

          <!-- 文字提示 -->
          <div class="warp-text">
            <p class="warp-title">踏入修仙之门</p>
            <p class="warp-subtitle">仙缘已定，请取道号...</p>
          </div>
        </div>
      </Transition>
    </Teleport>

    <div class="register-form" :class="{ 'fade-out': isWarping }">
      <h2 class="form-title">注册账号</h2>

      <n-form>
        <n-form-item>
          <n-input v-model:value="formData.username" placeholder="用户名 (2-20个字符)" size="large" :disabled="loading || isWarping">
            <template #prefix>
              <User :size="18" class="input-icon" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item>
          <n-input v-model:value="formData.email" placeholder="邮箱地址" size="large" :disabled="loading || isWarping">
            <template #prefix>
              <Mail :size="18" class="input-icon" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item>
          <n-input
            v-model:value="formData.password"
            type="password"
            placeholder="密码 (至少6位)"
            size="large"
            show-password-on="click"
            :disabled="loading || isWarping"
          >
            <template #prefix>
              <Lock :size="18" class="input-icon" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item>
          <n-input
            v-model:value="formData.confirmPassword"
            type="password"
            placeholder="确认密码"
            size="large"
            show-password-on="click"
            :disabled="loading || isWarping"
            @keyup.enter="handleRegister"
          >
            <template #prefix>
              <ShieldCheck :size="18" class="input-icon" />
            </template>
          </n-input>
        </n-form-item>

        <n-button type="primary" block size="large" :loading="loading" :disabled="isWarping" class="submit-btn" @click="handleRegister">
          开启修仙之旅
        </n-button>
      </n-form>

      <div class="form-footer">
        <span class="footer-text">已有账号？</span>
        <n-button text type="primary" :disabled="isWarping" @click="router.push('/auth/login')">立即登录</n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMessage } from 'naive-ui'
  import { useAuthStore } from '@/stores/auth'
  import { extractErrorMessage } from '@/api'
  import { User, Mail, Lock, ShieldCheck } from 'lucide-vue-next'

  const router = useRouter()
  const authStore = useAuthStore()

  const formData = ref({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const loading = ref(false)
  const isWarping = ref(false)
  const message = useMessage()

  const handleRegister = async () => {
    if (!formData.value.username || !formData.value.email || !formData.value.password) {
      message.warning('请填写所有字段')
      return
    }

    if (formData.value.password !== formData.value.confirmPassword) {
      message.warning('两次密码输入不一致')
      return
    }

    if (formData.value.password.length < 6) {
      message.warning('密码长度至少6位')
      return
    }

    loading.value = true
    try {
      await authStore.register(formData.value.username, formData.value.email, formData.value.password)
      message.success('注册成功')

      // 开始时空穿梭动画
      loading.value = false
      isWarping.value = true

      // 3秒后跳转
      setTimeout(() => {
        router.push('/create-character')
      }, 3000)
    } catch (error: unknown) {
      message.error(extractErrorMessage(error, '注册失败'))
      loading.value = false
    }
  }

  // 星星样式生成
  const getStarStyle = (index: number) => {
    const angle = (index / 100) * 360
    const distance = 20 + Math.random() * 80
    const size = 1 + Math.random() * 2
    const delay = Math.random() * 0.5
    const duration = 0.8 + Math.random() * 0.4
    return {
      '--angle': `${angle}deg`,
      '--distance': `${distance}%`,
      '--size': `${size}px`,
      '--delay': `${delay}s`,
      '--duration': `${duration}s`
    }
  }

  // 速度线样式生成
  const getSpeedLineStyle = (index: number) => {
    const angle = (index / 40) * 360
    const length = 100 + Math.random() * 200
    const delay = Math.random() * 0.3
    return {
      '--angle': `${angle}deg`,
      '--length': `${length}px`,
      '--delay': `${delay}s`
    }
  }
</script>

<style scoped>
  .register-container {
    width: 100%;
    position: relative;
  }

  .register-form {
    width: 100%;
    transition: opacity 0.5s ease, transform 0.5s ease;
  }

  .register-form.fade-out {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
    pointer-events: none;
  }

  .form-title {
    font-size: 1.5rem;
    font-weight: 600;
    text-align: center;
    margin: 0 0 24px;
    color: var(--text-primary);
    letter-spacing: 4px;
  }

  .input-icon {
    color: var(--text-muted);
  }

  .submit-btn {
    margin-top: 8px;
    height: 44px;
    font-size: 1rem;
    letter-spacing: 2px;
  }

  .form-footer {
    margin-top: 20px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .footer-text {
    color: var(--text-secondary);
  }

  :deep(.n-input) {
    --n-border-radius: 4px !important;
    --n-border: 1px solid var(--border-color) !important;
    --n-border-focus: 1px solid var(--color-gold) !important;
    --n-box-shadow-focus: 0 0 0 2px rgba(201, 169, 89, 0.1) !important;
  }
</style>

<!-- 时空穿梭效果 - 全局样式（因为使用了 Teleport） -->
<style>
  .warp-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: radial-gradient(ellipse at center, #1a1812 0%, #000 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* 星空背景 */
  .warp-overlay .star-field {
    position: absolute;
    inset: 0;
    perspective: 500px;
  }

  .warp-overlay .star {
    position: absolute;
    width: var(--size);
    height: var(--size);
    background: #fff;
    border-radius: 50%;
    left: 50%;
    top: 50%;
    transform-origin: center;
    animation: star-warp var(--duration) ease-in infinite;
    animation-delay: var(--delay);
    box-shadow: 0 0 6px 2px rgba(201, 169, 89, 0.6);
  }

  @keyframes star-warp {
    0% {
      transform: rotate(var(--angle)) translateY(0) scale(0);
      opacity: 0;
    }
    10% {
      opacity: 1;
      transform: rotate(var(--angle)) translateY(10px) scale(1);
    }
    100% {
      transform: rotate(var(--angle)) translateY(calc(var(--distance) * 5)) scale(2);
      opacity: 0;
    }
  }

  /* 速度线条 */
  .warp-overlay .speed-lines {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .warp-overlay .speed-line {
    position: absolute;
    width: 2px;
    height: var(--length);
    background: linear-gradient(
      to bottom,
      transparent,
      rgba(201, 169, 89, 0.8),
      rgba(255, 255, 255, 0.9),
      rgba(201, 169, 89, 0.8),
      transparent
    );
    left: 50%;
    top: 50%;
    transform-origin: top center;
    transform: rotate(var(--angle)) translateY(60px);
    animation: speed-line-appear 0.5s ease-out forwards, speed-line-extend 2s ease-in forwards;
    animation-delay: var(--delay), calc(var(--delay) + 0.3s);
    opacity: 0;
  }

  @keyframes speed-line-appear {
    0% {
      opacity: 0;
      height: 0;
    }
    100% {
      opacity: 1;
      height: var(--length);
    }
  }

  @keyframes speed-line-extend {
    0% {
      transform: rotate(var(--angle)) translateY(60px) scaleY(1);
    }
    100% {
      transform: rotate(var(--angle)) translateY(200px) scaleY(3);
    }
  }

  /* 中心光圈 */
  .warp-overlay .warp-center {
    position: absolute;
    width: 200px;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .warp-overlay .warp-ring {
    position: absolute;
    border: 2px solid rgba(201, 169, 89, 0.6);
    border-radius: 50%;
    animation: ring-pulse 1.5s ease-in-out infinite;
  }

  .warp-overlay .ring-1 {
    width: 100%;
    height: 100%;
    animation-delay: 0s;
  }

  .warp-overlay .ring-2 {
    width: 70%;
    height: 70%;
    animation-delay: 0.3s;
  }

  .warp-overlay .ring-3 {
    width: 40%;
    height: 40%;
    animation-delay: 0.6s;
  }

  @keyframes ring-pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.6;
      border-color: rgba(201, 169, 89, 0.6);
    }
    50% {
      transform: scale(1.1);
      opacity: 1;
      border-color: rgba(201, 169, 89, 1);
    }
  }

  .warp-overlay .warp-core {
    width: 30px;
    height: 30px;
    background: radial-gradient(circle, #fff 0%, rgba(201, 169, 89, 0.8) 50%, transparent 100%);
    border-radius: 50%;
    animation: core-glow 0.5s ease-in-out infinite alternate;
    box-shadow: 0 0 40px 20px rgba(201, 169, 89, 0.5);
  }

  @keyframes core-glow {
    0% {
      transform: scale(1);
      box-shadow: 0 0 40px 20px rgba(201, 169, 89, 0.5);
    }
    100% {
      transform: scale(1.2);
      box-shadow: 0 0 60px 30px rgba(201, 169, 89, 0.8);
    }
  }

  /* 文字提示 */
  .warp-overlay .warp-text {
    position: absolute;
    bottom: 25%;
    text-align: center;
    z-index: 10;
    animation: text-fade-in 0.8s ease-out 0.5s forwards;
    opacity: 0;
  }

  @keyframes text-fade-in {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .warp-overlay .warp-title {
    font-size: 2rem;
    font-weight: 700;
    color: #c9a959;
    margin: 0 0 12px;
    letter-spacing: 8px;
    text-shadow: 0 0 30px rgba(201, 169, 89, 0.8);
  }

  .warp-overlay .warp-subtitle {
    font-size: 1rem;
    color: #a0a0a0;
    margin: 0;
    letter-spacing: 4px;
    animation: subtitle-pulse 1s ease-in-out infinite;
  }

  @keyframes subtitle-pulse {
    0%,
    100% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
    }
  }

  /* 过渡动画 */
  .warp-enter-active {
    animation: warp-in 0.5s ease-out;
  }

  .warp-leave-active {
    animation: warp-out 0.3s ease-in;
  }

  @keyframes warp-in {
    0% {
      opacity: 0;
      transform: scale(0.8);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes warp-out {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
</style>
