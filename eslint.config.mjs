import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
	eslint.configs.recommended,
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				ecmaVersion: 2020,
				sourceType: 'module'
			},
			globals: {
				console: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly'
			}
		},
		plugins: {
			'@typescript-eslint': tseslint
		},
		rules: {
			...tseslint.configs.recommended.rules,
			'@typescript-eslint/naming-convention': [
				'warn',
				{
					selector: 'classProperty',
					modifiers: ['static', 'readonly'],
					format: ['UPPER_CASE', 'camelCase']
				},
				{
					selector: 'enumMember',
					format: ['UPPER_CASE']
				}
			],
			'@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
			'@typescript-eslint/no-explicit-any': 'off', // Allow any for telemetry data
			'curly': 'warn',
			'eqeqeq': 'warn',
			'no-throw-literal': 'warn',
			'no-useless-escape': 'warn'
		}
	}
];
