<script setup>
import { onUnmounted, ref } from 'vue'
import { cloud } from '../cloud'

const props = defineProps({
    bootError: { type: String, default: '' },
})
const emit = defineEmits(['signed-in'])

const email = ref('')
const code = ref('')
const sending = ref(false)
const submitting = ref(false)
const codeSent = ref(false)
const countdown = ref(0)
const errorMessage = ref(props.bootError)
const oauthBusy = ref('')

// 验证码凭据保存在事件之外，提交时不再重复发送验证码。
let pendingOtp = null
let timer = null

function startCountdown() {
    countdown.value = 60
    clearInterval(timer)
    timer = setInterval(() => {
        countdown.value -= 1
        if (countdown.value <= 0) clearInterval(timer)
    }, 1000)
}

onUnmounted(() => clearInterval(timer))

async function sendCode() {
    if (sending.value || countdown.value > 0) return
    const value = email.value.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errorMessage.value = '请输入正确的邮箱地址'
        return
    }
    errorMessage.value = ''
    sending.value = true
    const sent = await cloud.auth.sendOtp({ email: value })
    sending.value = false
    if (sent.error) {
        errorMessage.value = sent.error.message || '验证码发送失败，请稍后重试'
        return
    }
    pendingOtp = {
        email: value,
        verificationId: sent.data.verificationId,
        isExistingUser: sent.data.isExistingUser,
    }
    codeSent.value = true
    startCountdown()
}

async function submitCode() {
    if (submitting.value) return
    const value = email.value.trim()
    const pending = pendingOtp
    if (!pending || pending.email !== value) {
        errorMessage.value = '请先获取当前邮箱的验证码'
        return
    }
    if (!code.value.trim()) {
        errorMessage.value = '请输入邮箱收到的验证码'
        return
    }
    errorMessage.value = ''
    submitting.value = true
    const completed = await cloud.auth.verifyOtp({
        email: pending.email,
        verificationId: pending.verificationId,
        isExistingUser: pending.isExistingUser,
        token: code.value.trim(),
    })
    submitting.value = false
    if (completed.error) {
        errorMessage.value = completed.error.message || '验证码校验失败，请重试'
        return
    }
    pendingOtp = null
    emit('signed-in')
}

async function signInWith(provider) {
    if (oauthBusy.value) return
    errorMessage.value = ''
    oauthBusy.value = provider
    const { data, error } = await cloud.auth.signInWithOAuth({
        provider,
        // 回调必须落在站点根路径，静态站点没有 history 回退。
        redirectTo: location.origin,
    })
    if (error) {
        errorMessage.value = error.message || '发起授权失败，请稍后重试'
        oauthBusy.value = ''
        return
    }
    if (!data || !data.url) {
        errorMessage.value = '没有拿到授权地址，请稍后重试'
        oauthBusy.value = ''
        return
    }
    // 必须在当前标签页跳转，PKCE 证明存在本标签页。
    location.assign(data.url)
}
</script>

<template>
    <div class="auth-screen">
        <div class="auth-card">
            <div class="auth-brand">
                <span class="auth-mark">活</span>
                <h1 class="auth-title">活动组织台</h1>
            </div>
            <p class="auth-desc">登录后编辑活动、生成活动卡，并查看好友提交的报名信息。</p>

            <div v-if="errorMessage" class="auth-error">{{ errorMessage }}</div>

            <form @submit.prevent="submitCode">
                <div class="field">
                    <label class="label" for="login-email">邮箱</label>
                    <input
                        id="login-email"
                        v-model="email"
                        class="input"
                        type="email"
                        autocomplete="email"
                        placeholder="例如 you@163.com"
                    />
                </div>

                <div class="field">
                    <label class="label" for="login-code">验证码</label>
                    <div class="code-row">
                        <input
                            id="login-code"
                            v-model="code"
                            class="input"
                            inputmode="numeric"
                            autocomplete="one-time-code"
                            placeholder="6 位验证码"
                        />
                        <button
                            type="button"
                            class="btn btn-outline"
                            :disabled="sending || countdown > 0"
                            @click="sendCode"
                        >
                            {{ countdown > 0 ? `${countdown}s 后重发` : sending ? '发送中' : codeSent ? '重新获取' : '获取验证码' }}
                        </button>
                    </div>
                    <p class="hint">新邮箱验证后会自动创建账号，无需设置密码。</p>
                </div>

                <button class="btn btn-primary btn-block" type="submit" :disabled="submitting">
                    {{ submitting ? '登录中…' : '登录 / 注册' }}
                </button>
            </form>

            <div class="auth-divider">或使用以下方式</div>

            <div class="auth-alt">
                <button class="btn btn-outline btn-block" :disabled="!!oauthBusy" @click="signInWith('workbuddy')">
                    {{ oauthBusy === 'workbuddy' ? '正在跳转…' : '使用 WorkBuddy 登录' }}
                </button>
                <button class="btn btn-outline btn-block" :disabled="!!oauthBusy" @click="signInWith('wechat')">
                    {{ oauthBusy === 'wechat' ? '正在跳转…' : '微信扫码登录' }}
                </button>
            </div>

            <p class="auth-note">
                微信与 WorkBuddy 登录需要走线上域名的授权回调，本地调试请用邮箱验证码；发布到线上后三种方式都可用。
            </p>
        </div>
    </div>
</template>
