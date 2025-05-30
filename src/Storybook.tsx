import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import StorybookUIRoot from '../.rnstorybook';

const SHOW_STORYBOOK = __DEV__ && Platform.OS !== 'web';

const StorybookUI = () => {
  useEffect(() => {
    if (SHOW_STORYBOOK) {
      console.log('Storybook is running');
    }
  }, []);

  return <StorybookUIRoot />;
};

export default StorybookUI;