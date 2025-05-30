import AsyncStorage from '@react-native-async-storage/async-storage';
import './storybook.requires';

const StorybookUIRoot = view.getStorybookUI({
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
  enableWebsockets: true,
  host: 'localhost',
  port: 7007,
  onDeviceUI: true,
});

export default StorybookUIRoot;