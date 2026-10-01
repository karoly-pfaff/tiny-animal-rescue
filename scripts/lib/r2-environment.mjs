function requiredValue(env, name) {
  const value = env[name];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment ${name}.`);
  }
  return value.trim();
}

function normalizedEndpoint(value, bucket) {
  const endpoint = new URL(value);
  const bucketPath = `/${bucket}`;
  if ([bucketPath, `${bucketPath}/`].includes(endpoint.pathname)) endpoint.pathname = '/';
  if (
    endpoint.protocol !== 'https:' ||
    endpoint.username.length > 0 ||
    endpoint.password.length > 0 ||
    endpoint.search.length > 0 ||
    endpoint.hash.length > 0 ||
    !['', '/'].includes(endpoint.pathname)
  ) {
    throw new Error('R2_ENDPOINT must be a credential-free HTTPS origin or bucket-scoped URL.');
  }
  return new URL(endpoint.origin);
}

function endpointValue(env, accountId) {
  const override = env.R2_ENDPOINT;
  return typeof override === 'string' && override.trim().length > 0
    ? override.trim()
    : `https://${accountId}.r2.cloudflarestorage.com`;
}

export function r2MaterializationEnvironment(env = process.env) {
  const accountId = requiredValue(env, 'R2_ACCOUNT_ID');
  if (!/^[a-f0-9]{32}$/u.test(accountId)) throw new Error('R2_ACCOUNT_ID is invalid.');
  const bucket = requiredValue(env, 'R2_BUCKET');
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u.test(bucket)) {
    throw new Error('R2_BUCKET is invalid.');
  }
  return {
    accountId,
    bucket,
    credentials: {
      accessKeyId: requiredValue(env, 'R2_ACCESS_KEY_ID'),
      secretAccessKey: requiredValue(env, 'R2_SECRET_ACCESS_KEY'),
    },
    endpoint: normalizedEndpoint(endpointValue(env, accountId), bucket),
  };
}
