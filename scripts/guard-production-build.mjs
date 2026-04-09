const env = process.env.VERCEL_ENV;
const ref = process.env.VERCEL_GIT_COMMIT_REF;

// Only enforce on Vercel production builds.
if (env === 'production') {
  if (ref && ref !== 'master') {
    console.error(`Blocked production build from branch: ${ref}. Allowed branch: master`);
    process.exit(1);
  }
}

console.log(`Build guard passed (VERCEL_ENV=${env || 'n/a'}, VERCEL_GIT_COMMIT_REF=${ref || 'n/a'})`);
