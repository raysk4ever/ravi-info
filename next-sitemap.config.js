/** @type {import('next-sitemap').IConfig} */
const config = {
  siteUrl: 'https://www.socialamigo.in', // Replace with your site's URL
  generateRobotsTxt: true, // (Optional) Generate robots.txt file
  changefreq: 'daily',
  priority: 0.7,
  sitemapSize: 5000,
  exclude: ['/admin/*', '/login', '/register'], // Add any paths you want to exclude
  // Additional options...
  additionalPaths: async (config) => {
    return [
      await config.transform(config, 'https://budget.socialamigo.in'),
      await config.transform(config, 'https://base64.socialamigo.in'),
      await config.transform(config, 'https://xpense.socialamigo.in'),
      await config.transform(config, 'https://play.google.com/store/apps/details?id=com.quickdialapp&hl=en_US'),
      await config.transform(config, 'https://play.google.com/store/apps/details?id=com.shail.raysk.emergencycall&hl=en_US'),
      await config.transform(config, 'https://easy-resume-builder-web.web.app'),
      await config.transform(config, 'https://www.linkedin.com/in/ravi-ksingh/'),
      await config.transform(config, 'https://github.com/raysk4ever/'),
      await config.transform(config, 'https://engx.space/global/en/blog/how-to-enhance-website-performance-with-next-js'),
      await config.transform(config, 'https://kissmi.medium.com/'),
      await config.transform(config, 'https://stackoverflow.com/users/11216915/ravi-singh'),
      // Add more static pages here as needed
    ]
  },
  // for custom dynamic paths
  // transform: async (config, path) => {
  //   // Default transformation
  //   let transformed = {
  //     loc: path, // The url of the page
  //     changefreq: config.changefreq,
  //     priority: config.priority,
  //     lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
  //     alternateRefs: config.alternateRefs ?? [],
  //   };

  //   // Add custom logic for dynamic routes
  //   if (path === '/blog/[slug]') {
  //     const response = await fetch('https://api.yourdomain.com/posts'); // Replace with your API
  //     const posts = await response.json();

  //     return posts.map(post => ({
  //       loc: `${config.siteUrl}/blog/${post.slug}`,
  //       changefreq: 'daily',
  //       priority: 0.7,
  //       lastmod: post.updatedAt, // Assuming each post has an updatedAt field
  //     }));
  //   }

  //   return transformed;
  // }
}

module.exports = config;
