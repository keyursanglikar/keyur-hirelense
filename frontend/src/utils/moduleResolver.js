// frontend/src/utils/moduleResolver.js

/**
 * Resolves the correct module URL based on the current environment (local vs production).
 * This prevents the local dashboard from redirecting to production Vercel URLs,
 * and allows for running modules on different ports locally.
 */

// Define mapping for all known modules. Add new ones here.
const moduleConfig = {
  'hirelens': {
    local: import.meta.env.VITE_HIRELENS_LOCAL_URL,
    production: import.meta.env.VITE_HIRELENS_PROD_URL,
  },
  'fee-estimation': {
    local: import.meta.env.VITE_FEE_ESTIMATION_LOCAL_URL,
    production: import.meta.env.VITE_FEE_ESTIMATION_PROD_URL,
  },
  'ca-tool': {
    local: import.meta.env.VITE_CA_TOOL_LOCAL_URL,
    production: import.meta.env.VITE_CA_TOOL_PROD_URL,
  }
};

export const getModuleUrl = (slug) => {
  // Convert slug to format like "fee-estimation" -> "FEE_ESTIMATION"
  const envName = slug.toUpperCase().replace(/-/g, '_');
  
  // Also support dynamic fallback using the naming convention directly if not in moduleConfig
  const dynamicLocal = import.meta.env[`VITE_${envName}_LOCAL_URL`];
  const dynamicProd = import.meta.env[`VITE_${envName}_PROD_URL`];

  const config = moduleConfig[slug] || {
    local: dynamicLocal,
    production: dynamicProd,
  };

  const isProduction = import.meta.env.PROD;
  const url = isProduction ? config.production : config.local;

  if (!url) {
    throw new Error(
      `Module URL is not configured for "${slug}" in the current environment. ` +
      `Please set VITE_${envName}_${isProduction ? 'PROD' : 'LOCAL'}_URL in your .env file.`
    );
  }

  return url;
};
