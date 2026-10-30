import * as cheerio from 'cheerio';

export interface ExtractedHtml {
  title: string;
  cleanedText: string;
  headings: string[];
  links: string[];
  metaDescription?: string;
}

export function extractCleanHtml(html: string, baseUrl: string): ExtractedHtml {
  const $ = cheerio.load(html);

  // Remove unnecessary noise and boilerplate (keep form containers because ASP.NET government portals wrap entire pages in <form>)
  $(
    'script, style, noscript, svg, iframe, nav, footer, header, ' +
    'input[type="hidden"], .cookie-banner, .cookie-notice, #cookieNotice, ' +
    '.breadcrumb, .advertisement'
  ).remove();

  const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled Document';
  const metaDescription = $('meta[name="description"]').attr('content') || undefined;

  const headings: string[] = [];
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 3) headings.push(text);
  });

  const links: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      try {
        const absolute = new URL(href, baseUrl).toString();
        links.push(absolute);
      } catch {
        // ignore invalid URL
      }
    }
  });

  // Extract clean visible text
  const bodyText = $('body')
    .text()
    .replace(/\s+/g, ' ')
    .trim();

  return {
    title,
    cleanedText: bodyText,
    headings,
    links: Array.from(new Set(links)),
    metaDescription,
  };
}
