const { listRecentActivities, listLocalSignups } = require('../../utils/data');
const { toDisplayActivity } = require('../../utils/format');

Page({
    data: {
        viewState: 'loading',
        activities: [],
        errorMessage: '',
        signedCount: 0,
    },

    onShow() {
        this.setData({ signedCount: listLocalSignups().length });
        this.loadActivities();
    },

    onPullDownRefresh() {
        this.loadActivities().then(() => {
            wx.stopPullDownRefresh();
        });
    },

    async loadActivities() {
        this.setData({ viewState: 'loading', errorMessage: '' });
        const { data, error } = await listRecentActivities(20);
        if (error) {
            this.setData({ viewState: 'error', errorMessage: error.message });
            return;
        }
        const activities = data.map(toDisplayActivity).filter(item => item !== null);
        this.setData({
            viewState: activities.length === 0 ? 'empty' : 'ready',
            activities,
        });
    },

    handleRetry() {
        this.loadActivities();
    },

    openDetail(event) {
        const activityId = event.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/detail/detail?activityId=${activityId}`,
            fail() {
                wx.showToast({ title: '页面打开失败', icon: 'none' });
            },
        });
    },

    openMine() {
        wx.navigateTo({
            url: '/pages/mine/mine',
            fail() {
                wx.showToast({ title: '页面打开失败', icon: 'none' });
            },
        });
    },
});
