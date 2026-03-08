#!/usr/bin/env tsx

/**
 * Sitemap自動生成スクリプト
 *
 * microCMS APIから全作品データを取得し、静的ページ + 動的作品ページを含む
 * sitemap.xmlを生成する。
 *
 * 実行方法:
 *   npx tsx scripts/generate-sitemap.ts
 *
 * ビルド時に自動実行:
 *   npm run build
 *
 * 出力先: dist/sitemap.xml
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const API_ENDPOINT =
  process.env.VITE_MICROCMS_API_ENDPOINT || process.env.MICROCMS_API_ENDPOINT;
const API_KEY =
  process.env.VITE_MICROCMS_API_KEY || process.env.MICROCMS_API_KEY;

const hasMicroCMSConfig = Boolean(API_ENDPOINT && API_KEY);

const BASE_URL = 'https://www.yamashitamana.to';

// microCMS APIレスポンス型
interface MicroCMSMeta {
  id: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

interface CategoryData extends MicroCMSMeta {
  name: string;
  nameEn?: string;
}

interface CreativeData extends MicroCMSMeta {
  majorCategory: CategoryData;
  title: string;
  thumbnail: { url: string; width?: number; height?: number };
}

interface MicroCMSListResponse<T> {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
}

// microCMS APIベースURLを正規化（/api/v1 を保証）
function normalizeEndpoint(endpoint: string): string {
  const base = endpoint.replace(/\/+$/, '');
  return base.includes('/api/v1') ? base : `${base}/api/v1`;
}

// microCMS APIからデータ取得
async function fetchCreatives(): Promise<CreativeData[]> {
  const baseUrl = normalizeEndpoint(API_ENDPOINT as string);
  const url = `${baseUrl}/creatives?limit=100&depth=1`;
  const response = await fetch(url, {
    headers: {
      'X-MICROCMS-API-KEY': API_KEY as string,
    },
  });

  if (!response.ok) {
    throw new Error(`microCMS API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as MicroCMSListResponse<CreativeData>;
  return data.contents;
}

// カテゴリIDをURL用スラッグとして使用
function getCategorySlug(creative: CreativeData): string {
  return creative.majorCategory.id;
}

// ISO 8601日付形式に変換
function formatDate(dateStr: string): string {
  return dateStr.split('T')[0] || dateStr;
}

// 今日の日付をISO形式で取得
function today(): string {
  return new Date().toISOString().split('T')[0]!;
}

// XML特殊文字エスケープ
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// hreflangリンクを生成
function hreflangLinks(url: string): string {
  return [
    `        <xhtml:link rel="alternate" hreflang="ja" href="${url}" />`,
    `        <xhtml:link rel="alternate" hreflang="en" href="${url}" />`,
    `        <xhtml:link rel="alternate" hreflang="x-default" href="${url}" />`,
  ].join('\n');
}

// 静的ページ定義
interface StaticPage {
  path: string;
  changefreq: string;
  priority: string;
  image?: { loc: string; caption: string; title: string };
}

const staticPages: StaticPage[] = [
  {
    path: '/',
    changefreq: 'weekly',
    priority: '1.0',
    image: {
      loc: `${BASE_URL}/ogp.webp`,
      caption: 'yamashitamana.to | 山下マナト（山下真和都）webポートフォリオ',
      title: '山下マナト Portfolio',
    },
  },
  {
    path: '/about',
    changefreq: 'monthly',
    priority: '0.9',
    image: {
      loc: `${BASE_URL}/${encodeURIComponent('山下真和都(マナト)')}.webp`,
      caption: '山下真和都（マナト）プロフィール写真',
      title: 'About Manato Yamashita',
    },
  },
  {
    path: '/creatives',
    changefreq: 'monthly',
    priority: '0.9',
    image: {
      loc: `${BASE_URL}/ogp.webp`,
      caption: '山下マナト クリエイティブ作品集',
      title: 'Creatives Portfolio',
    },
  },
  {
    path: '/contact',
    changefreq: 'yearly',
    priority: '0.7',
  },
];

// sitemap.xml生成
async function generateSitemap(): Promise<void> {
  let creatives: CreativeData[] = [];
  if (hasMicroCMSConfig) {
    console.log('Fetching creatives from microCMS...');
    creatives = await fetchCreatives();
    console.log(`Fetched ${creatives.length} creatives.`);
  } else {
    console.warn('Warning: microCMS API credentials not found. Generating sitemap with static pages only.');
  }

  const todayDate = today();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

  // 静的ページ
  for (const page of staticPages) {
    const url = `${BASE_URL}${page.path}`;
    xml += `    <!-- ${page.path === '/' ? 'Home' : page.path.slice(1).charAt(0).toUpperCase() + page.path.slice(2)} Page -->
    <url>
        <loc>${url}</loc>
        <lastmod>${todayDate}</lastmod>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
${hreflangLinks(url)}
`;
    if (page.image) {
      xml += `        <image:image>
            <image:loc>${escapeXml(page.image.loc)}</image:loc>
            <image:caption>${escapeXml(page.image.caption)}</image:caption>
            <image:title>${escapeXml(page.image.title)}</image:title>
        </image:image>
`;
    }
    xml += `    </url>\n\n`;
  }

  // 動的作品ページ
  for (const creative of creatives) {
    const categorySlug = getCategorySlug(creative);
    const url = `${BASE_URL}/creatives/${categorySlug}/${creative.id}`;
    const lastmod = formatDate(creative.updatedAt);
    const thumbnailUrl = creative.thumbnail?.url;

    xml += `    <url>
        <loc>${url}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
${hreflangLinks(url)}
`;
    if (thumbnailUrl) {
      xml += `        <image:image>
            <image:loc>${escapeXml(thumbnailUrl)}</image:loc>
            <image:caption>${escapeXml(creative.title)}</image:caption>
            <image:title>${escapeXml(creative.title)}</image:title>
        </image:image>
`;
    }
    xml += `    </url>\n`;
  }

  xml += `</urlset>\n`;

  // dist/sitemap.xmlに出力
  const distDir = path.join(projectRoot, 'dist');
  if (!fs.existsSync(distDir)) {
    console.warn('Warning: dist/ directory not found. Creating it...');
    fs.mkdirSync(distDir, { recursive: true });
  }

  const outputPath = path.join(distDir, 'sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf-8');
  console.log(`Sitemap generated: ${outputPath}`);
  console.log(`  Static pages: ${staticPages.length}`);
  console.log(`  Dynamic pages: ${creatives.length}`);
  console.log(`  Total URLs: ${staticPages.length + creatives.length}`);
}

generateSitemap().catch((err) => {
  console.error('Failed to generate sitemap:', err);
  process.exit(1);
});
