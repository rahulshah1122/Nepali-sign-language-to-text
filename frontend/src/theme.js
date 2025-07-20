import { theme } from 'antd';

export const customTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#00b96b',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    borderRadius: 8,
    wireframe: false,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    lineHeight: 1.5714,
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
  },
  components: {
    Card: {
      borderRadiusLG: 16,
      boxShadowTertiary: '0 8px 32px rgba(0, 0, 0, 0.1)',
    },
    Button: {
      borderRadius: 8,
      controlHeight: 40,
      fontSize: 14,
      fontWeight: 600,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Progress: {
      borderRadius: 10,
    },
    Tag: {
      borderRadius: 20,
      fontSize: 14,
    },
    Badge: {
      colorBgContainer: '#00b96b',
      colorText: '#ffffff',
    },
  },
}; 