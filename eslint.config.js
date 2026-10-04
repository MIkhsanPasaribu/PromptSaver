// Konfigurasi ESLint flat (v9). Aturan dasar dari typescript-eslint recommended
// tanpa type-checking supaya lint cepat; aturan tipe aktif lewat `pnpm typecheck`.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src-tauri/target', 'src-tauri/gen'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    // AGENTS.md Bagian 5 mewajibkan nama fungsi berbahasa Indonesia, sedangkan
    // react-hooks/rules-of-hooks hanya mengenali awalan "use". Aturan ini tetap aktif
    // untuk komponen; hanya folder hooks yang dikecualikan karena seluruh isinya memang hook.
    files: ['src/**/hooks/**/*.ts', 'src/**/hooks/**/*.tsx'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
);
