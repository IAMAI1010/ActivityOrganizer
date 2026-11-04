const { fetchActivity, listSignupBriefs, isSignedUp } = require('../../utils/data');
const { toDisplayActivity } = require('../../utils/format');
const { pageTheme } = require('../../utils/theme');
const { buildPoster } = require('../../utils/poster');

function toSignupView(row) {
    const name = (row && row.nickname) ? String(row.nickname) : '微信好友';
    return {
        id: row.id,
        name,
        initial: name.slice(0, 1),
        avatar_url: (row && row.avatar_url) ? row.avatar_url : '',
    };
}

Page({
    data: {
        activityId: '',
        viewState: 'loading',
        activity: null,
        poster: null,
        signups: [],
        signupCount: 0,
        signedUp: false,
        submittedTip: false,
        errorMessage: '',
        theme: 'light',
    },

    onLoad(query) {
        const options = query || {};
        const activityId = options.activityId ? String(options.activityId) : '';
        if (!activityId) {
            this.setData({
                viewState: 'error',
                errorMessage: '缺少活动编号，请从活动卡片或活动列表重新打开。',
            });
            return;
        }
        this.setData({
            activityId,
            submittedTip: options.submitted === '1',
        });
        this.loadActivity();
    },

    onShow() {
        this.setData({ theme: pageTheme() });
        if (!this.data.activityId) return;
        this.setData({ signedUp: isSignedUp(this.data.activityId) });
    },

    async loadActivity() {
        this.setData({ viewState: 'loading', errorMessage: '' });
        const { data, error } = await fetchActivity(this.data.activityId);
        if (error) {
            this.setData({ viewState: 'error', errorMessage: error.message });
            return;
        }
        if (!data) {
            this.setData({
                viewState: 'error',
                errorMessage: '活动不存在或已被删除。',
            });
            return;
        }
        const activity = toDisplayActivity(data);
        this.setData({
            viewState: 'ready',
            activity,
            poster: buildPoster(activity.cover_spec),
            signedUp: isSignedUp(activity.id),
        });
        this.loadSignups();
    },

    async loadSignups() {
        const { data, error } = await listSignupBriefs(this.data.activityId);
        if (error) return;
        this.setData({
            signups: data.map(toSignupView),
            signupCount: data.length,
        });
    },

    handleRetry() {
        if (!this.data.activityId) {
            wx.reLaunch({ url: '/pages/index/index' });
            return;
        }
        this.loadActivity();
    },

    goSignup() {
        if (this.data.activity && this.data.activity.closed) {
            wx.showToast({ title: '活动已结束，不再接受报名', icon: 'none' });
            return;
        }
        if (this.data.signedUp) {
            wx.showToast({ title: '你已报名这场活动', icon: 'none' });
            return;
        }
        wx.navigateTo({
            url: `/pages/signup/signup?activityId=${this.data.activityId}`,
            fail() {
                wx.showToast({ title: '页面打开失败', icon: 'none' });
            },
        });
    },

    goMine() {
        wx.navigateTo({
            url: '/pages/mine/mine',
            fail() {
                wx.showToast({ title: '页面打开失败', icon: 'none' });
            },
        });
    },

    onShareAppMessage() {
        const activity = this.data.activity;
        if (!activity) {
            return {
                title: '活动报名',
                path: '/pages/index/index',
            };
        }
        return {
            title: `${activity.title}｜邀请你报名`,
            path: `/pages/detail/detail?activityId=${activity.id}`,
            imageUrl: activity.cover_url || undefined,
        };
    },

    onShareTimeline() {
        const activity = this.data.activity;
        if (!activity) {
            return { title: '活动报名' };
        }
        return {
            title: `${activity.title}｜邀请你报名`,
            query: `activityId=${activity.id}`,
            imageUrl: activity.cover_url || undefined,
        };
    },
});
