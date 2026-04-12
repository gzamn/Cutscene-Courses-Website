import { defineConfig } from 'sanity';
import { deskTool } from 'sanity/desk';
import { schemaTypes } from './src/sanity/schemas';

export default defineConfig({
  name: 'default',
  title: 'Cutscene Academy CMS',

  projectId: import.meta.env.VITE_SANITY_PROJECT_ID || 'tkastbt7',
  dataset: import.meta.env.VITE_SANITY_DATASET || 'production',

  plugins: [deskTool()],

  schema: {
    types: schemaTypes,
  },
});
