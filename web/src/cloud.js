import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk'

// 云服务公开配置：仅含可随前端分发的公开值，不含任何密钥。
const publicConfig = {
    endpoint: 'https://mp-api.app.workbuddy.host',
    oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
    publishableKey: 'wbpk_KH4zoJ66eAXucCxjhSCSgh_5Gb1OLdp1eifDc7Xvuw16G6RO5BcmTRM',
}

export const cloud = createWorkBuddyCloud({
    endpoint: publicConfig.endpoint,
    oauthRelayBaseUrl: publicConfig.oauthRelayBaseUrl,
    publishableKey: publicConfig.publishableKey,
})

export { publicConfig }
