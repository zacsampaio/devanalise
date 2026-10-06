import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['testes/**/*.test.ts'],
    // fuso fixo: o mapa de calor e as semanas dependem da hora local
    env: { TZ: 'America/Sao_Paulo' },
    // nenhum teste pode depender dos tokens reais do .env
    unstubEnvs: true,
    restoreMocks: true,
  },
})
