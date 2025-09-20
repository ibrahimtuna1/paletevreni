// eslint.config.mjs
import next from 'eslint-config-next';

export default [
  ...next(),
  {
    rules: {
      // Senin derlemeyi kıran kuralların net ayarı:
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];
