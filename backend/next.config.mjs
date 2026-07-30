import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Payload admin is fully dynamic; no static export.
}

export default withPayload(nextConfig)
