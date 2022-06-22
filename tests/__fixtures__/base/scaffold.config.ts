import {defineTemplate} from '../../../mod.ts'

export default defineTemplate({
  getVariables({}) {
    return {
      name: 'scaffold',
      description: 'A scaffold for Deno',
    }
  },
  getPermissions() {
    return { env: ['git', 'pnpm'] }
  },
  getInstallCommand() {
    return () => {
      console.log('awesome!')
    }
  },
});
