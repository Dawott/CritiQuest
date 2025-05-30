/*mport type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;*/
import { withBackgrounds } from '@storybook/addon-ondevice-backgrounds';

export const decorators = [withBackgrounds];

export const parameters = {
  backgrounds: {
    default: 'dark',
    values: [
      { name: 'dark', value: '#111827' },
      { name: 'darker', value: '#030712' },
      { name: 'light', value: '#F3F4F6' },
    ],
  },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
