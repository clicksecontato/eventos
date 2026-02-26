import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Resolver warning sobre lockfiles múltiplos
  outputFileTracingRoot: path.join(__dirname),
  
  // Permitir que a build passe mesmo com warnings do ESLint
  eslint: {
    // Durante a build, ignorar warnings do ESLint (não falhar a build)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Durante a build, ignorar erros de tipo (não falhar a build)
    ignoreBuildErrors: false,
  },
  // Configurar pacotes que devem ser tratados como externos no servidor
  // Isso evita que o webpack tente processá-los no cliente
  serverExternalPackages: [
    'googleapis',
    'google-auth-library',
    'gcp-metadata',
    'gtoken',
    'googleapis-common',
    'puppeteer',
    'puppeteer-core',
    '@puppeteer/browsers',
    '@sparticuz/chromium',
    'firebase-admin',
    '@aws-sdk/client-s3',
    '@aws-sdk/s3-request-presigner',
  ],
  webpack: (config, { isServer }) => {
    // Otimizações para reduzir uso de memória durante o build
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
    };

    // Configurar para não fazer bundle de módulos Node.js no cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        crypto: false,
        os: false,
        path: false,
        https: false,
        http: false,
        http2: false,
        buffer: false,
        stream: false,
        util: false,
        url: false,
        zlib: false,
      };
      
      // Garantir que pacotes pesados sejam externos no cliente
      const clientExternals = [
        'googleapis',
        'google-auth-library',
        'gcp-metadata',
        'gtoken',
        'googleapis-common',
        'puppeteer',
        'puppeteer-core',
        '@puppeteer/browsers',
        '@sparticuz/chromium',
        'firebase-admin',
        '@aws-sdk/client-s3',
        '@aws-sdk/s3-request-presigner',
      ];

      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push(...clientExternals);
      } else if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = [originalExternals, ...clientExternals];
      } else {
        config.externals = [
          ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
          ...clientExternals,
        ];
      }
    } else {
      // No servidor, também marcar como externos para evitar problemas
      const serverExternals = [
        'googleapis',
        'google-auth-library',
        'gcp-metadata',
        'gtoken',
        'googleapis-common',
        'puppeteer',
        'puppeteer-core',
        '@puppeteer/browsers',
        '@sparticuz/chromium',
      ];

      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push(...serverExternals);
      }
    }
    return config;
  },
};

export default nextConfig;
