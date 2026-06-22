import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // LINE LIFF の iframe 埋め込みを許可
  async headers() {
    return [
      {
        source: '/(liff)/(.*)',
        headers: [{ key: 'X-Frame-Options', value: 'ALLOWALL' }],
      },
    ]
  },
}

export default nextConfig
