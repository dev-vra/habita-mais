// Config ESLint (flat) compartilhada — padrão GeoGis. TS estrito, sem `any`.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // ── Trava do design system (web/.tsx) ──
    // Quebra o lint (e o CI) se alguém: (a) usar hex arbitrário em className em vez de um token
    // semântico — no Habita+ isso importa mais que no irmão, porque azul significa "veio do
    // Regulariza+" e âmbar significa ação: hex solto apaga essa convenção; (b) chamar
    // confirm()/alert() nativos em vez de <Dialog>. Hex em dados/style (paint do MapLibre,
    // paleta de gráfico) não casa o padrão `-[#…]` e segue permitido.
    files: ['**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/-\\[#[0-9a-fA-F]{3,8}\\]/]',
          message:
            'Hex arbitrário em className (ex.: text-[#97620F]) é proibido. Use um token (text-primary, bg-institucional, text-vinculo-reurb…) ou adicione um em globals.css (@theme).',
        },
        {
          selector: 'TemplateElement[value.cooked=/-\\[#[0-9a-fA-F]{3,8}\\]/]',
          message:
            'Hex arbitrário em className é proibido. Use um token de cor ou adicione um em globals.css (@theme).',
        },
        {
          selector: 'CallExpression[callee.name=/^(confirm|alert)$/]',
          message:
            'confirm()/alert() nativos são proibidos (quebram a a11y e o tom do produto). Use <Dialog> com microcopy de lib/copy.ts.',
        },
        {
          selector:
            "CallExpression[callee.object.name='window'][callee.property.name=/^(confirm|alert)$/]",
          message: 'window.confirm/alert nativos são proibidos. Use <Dialog>.',
        },
      ],
    },
  },
  {
    // Arquivos de config em CommonJS (ex.: jest.config.js de pacote sem "type":"module").
    files: ['**/jest.config.js', '**/*.config.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'writable',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
      },
    },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    ignores: ['**/dist/**', '**/.next/**', '**/coverage/**', '**/node_modules/**'],
  },
);
