import { Helmet } from 'react-helmet-async';

interface SEOMetaTagsProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
}

/**
 * SEO meta tags component for better search engine visibility and social sharing
 * Implements Open Graph and Twitter Card protocols
 */
export function SEOMetaTags({
  title,
  description,
  image,
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  tags,
  twitterCard = 'summary_large_image',
  twitterSite = '@thehouseofjugnu',
  twitterCreator
}: SEOMetaTagsProps) {
  const siteName = 'The House of JUGNU';
  const defaultImage = 'https://thehouseofjugnu.com/og.png';
  const fullTitle = `${title} | ${siteName}`;
  const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const imageUrl = image || defaultImage;

  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph meta tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />
      
      {/* Article specific Open Graph tags */}
      {type === 'article' && (
        <>
          {author && <meta property="article:author" content={author} />}
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {tags && tags.map(tag => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}
      
      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:site" content={twitterSite} />
      {twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}
      
      {/* Additional SEO tags */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
      
      {/* Schema.org structured data */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': type === 'profile' ? 'Person' : type === 'article' ? 'Article' : 'WebPage',
          name: title,
          description: description,
          url: canonicalUrl,
          image: imageUrl,
          ...(type === 'article' && {
            author: {
              '@type': 'Person',
              name: author
            },
            datePublished: publishedTime,
            dateModified: modifiedTime,
            keywords: tags?.join(', ')
          })
        })}
      </script>
    </Helmet>
  );
}

/**
 * Community-specific SEO meta tags
 */
export function CommunitySEOTags({
  community,
  baseUrl = 'https://thehouseofjugnu.com'
}: {
  community: {
    name: string;
    description: string;
    slug: string;
    imageUrl?: string;
    coverUrl?: string;
    totalMembers?: number;
    category?: string;
  };
  baseUrl?: string;
}) {
  const title = `${community.name} Community`;
  const description = community.description || `Join the ${community.name} community on The House of JUGNU`;
  const url = `${baseUrl}/communities/${community.slug}`;
  const image = community.coverUrl || community.imageUrl;
  
  return (
    <SEOMetaTags
      title={title}
      description={description}
      url={url}
      image={image}
      type="website"
      tags={community.category ? [community.category] : undefined}
    />
  );
}

/**
 * Event/Post SEO meta tags
 */
export function PostSEOTags({
  post,
  community,
  baseUrl = 'https://thehouseofjugnu.com'
}: {
  post: {
    id: string;
    title: string;
    content: string;
    imageUrl?: string;
    authorName: string;
    createdAt: string;
    updatedAt?: string;
    tags?: string[];
  };
  community: {
    name: string;
    slug: string;
  };
  baseUrl?: string;
}) {
  const title = post.title;
  const description = post.content.slice(0, 160).replace(/\n/g, ' ').trim() + '...';
  const url = `${baseUrl}/communities/${community.slug}/posts/${post.id}`;
  
  return (
    <SEOMetaTags
      title={title}
      description={description}
      url={url}
      image={post.imageUrl}
      type="article"
      author={post.authorName}
      publishedTime={post.createdAt}
      modifiedTime={post.updatedAt}
      tags={post.tags}
    />
  );
}