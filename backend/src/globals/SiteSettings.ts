import type { GlobalConfig } from 'payload'
import { anyone, isEditor } from '../access'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  admin: { group: 'System' },
  access: { read: anyone, update: isEditor },
  fields: [
    { name: 'siteTitle', type: 'text' },
    { name: 'contactEmail', type: 'text' },
    { name: 'instagram', type: 'text' },
    { name: 'facebook', type: 'text' },
    {
      name: 'ticker',
      type: 'array',
      admin: { description: 'Short lines for the homepage ticker.' },
      fields: [{ name: 'text', type: 'text' }],
    },
    { name: 'newsletterUrl', type: 'text' },
    { name: 'announcement', type: 'text' },
  ],
}
