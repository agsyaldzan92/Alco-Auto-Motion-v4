import { VisualIntent } from '../types';

export interface StockCatalogItem {
  id: string;
  keywords: string[];
  title: string;
  intent: VisualIntent;
  url: string;
  thumb: string;
  type: 'video' | 'image';
  suggestedFraming: 'full' | 'pip' | 'split';
  category: 'business' | 'tech' | 'emotion' | 'finance' | 'lifestyle' | 'ecommerce' | 'education';
  badgeTag: string;
}

export const EXTENDED_STOCK_CATALOG: StockCatalogItem[] = [
  {
    id: 'proof-analytics-dashboard',
    keywords: ['sales', 'growth', 'chart', 'melesat', 'ctr', 'roas', 'traffic', 'profit', 'omset', 'grafik', 'roas 5x', 'hasil', 'bukti', 'dashboard', 'analytics', 'metrik', 'statistik', 'konversi'],
    title: 'Live Real-Time Sales Growth Dashboard (ROAS & CTR Spike)',
    intent: 'proof',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumb: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
    type: 'video',
    suggestedFraming: 'full',
    category: 'finance',
    badgeTag: 'PROOF METRIC',
  },
  {
    id: 'proof-revenue-metrics',
    keywords: ['omset 10 juta', 'omset', 'penjualan', 'profit', 'rekening', 'cuan', 'saldo', 'growth', 'bukti transfer'],
    title: 'Financial Revenue & Conversion Spike Visual',
    intent: 'proof',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumb: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
    type: 'video',
    suggestedFraming: 'full',
    category: 'finance',
    badgeTag: 'PROOF DATA',
  },
  {
    id: 'metaphor-frustration-burnout',
    keywords: ['frustrated', 'problem', 'salah', 'headache', 'confused', 'pusing', 'swipe', 'bakar uang', 'rugi', 'stuck', 'gagal', 'lelah', 'stres', 'bingung', 'boncos', 'overthinking'],
    title: 'Creator Frustrated Staring at Laptop Screen (Pain Metaphor)',
    intent: 'metaphor',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumb: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80',
    type: 'video',
    suggestedFraming: 'pip',
    category: 'emotion',
    badgeTag: 'PAIN METAPHOR',
  },
  {
    id: 'metaphor-burning-money',
    keywords: ['bakar uang', 'boncos', 'buang budget', 'budget iklan', 'sia-sia', 'rugi', 'buang uang', 'wasted'],
    title: 'Lost Budget & Ad Spend Drain Metaphor',
    intent: 'metaphor',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumb: 'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=600&auto=format&fit=crop&q=80',
    type: 'video',
    suggestedFraming: 'pip',
    category: 'emotion',
    badgeTag: 'BUDGET DRAIN',
  },
  {
    id: 'process-market-validation',
    keywords: ['market research', 'laptop', 'researching', 'demand', 'data', 'analisis', 'riset', 'pasar', 'komputer', 'validasi', 'formulir', 'survey', 'framework', 'langkah', 'metode'],
    title: 'Target Audience Research & Market Validation Workflow',
    intent: 'process',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumb: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80',
    type: 'video',
    suggestedFraming: 'pip',
    category: 'business',
    badgeTag: 'PROCESS WORKFLOW',
  },
  {
    id: 'process-funnel-blueprint',
    keywords: ['modul', 'blueprint', 'template', 'rumus', 'step by step', 'tahapan', 'sistem', 'arsitektur', 'alur'],
    title: 'Step-by-Step Strategic Framework & Blueprint',
    intent: 'process',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumb: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&auto=format&fit=crop&q=80',
    type: 'video',
    suggestedFraming: 'split',
    category: 'education',
    badgeTag: 'STRATEGY MAP',
  },
  {
    id: 'product-digital-course',
    keywords: ['digital creator', 'product', 'coding', 'software', 'laptop', 'buat produk', 'modul', 'kursus', 'online', 'ebook', 'membership', 'template digital'],
    title: 'Creator Building High-Value Digital Product & Course UI',
    intent: 'product',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumb: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=80',
    type: 'video',
    suggestedFraming: 'pip',
    category: 'tech',
    badgeTag: 'PRODUCT PREVIEW',
  },
  {
    id: 'product-mobile-tiktok-shop',
    keywords: ['phone', 'mobile', 'tiktok', 'reels', 'keranjang kuning', 'shop', 'ecommerce', 'checkout', 'affiliate', 'diskon', 'beli', 'produk fisik', 'gadget'],
    title: 'Mobile In-App Product Showcase & Keranjang Kuning Tap',
    intent: 'product',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumb: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=600&auto=format&fit=crop&q=80',
    type: 'video',
    suggestedFraming: 'pip',
    category: 'ecommerce',
    badgeTag: 'PRODUCT DEMO',
  },
  {
    id: 'urgency-cta-action',
    keywords: ['sekarang', 'klik', 'link di bio', 'terbatas', 'urgent', 'cepat', 'sebelum promo habis', 'cta', 'daftar', 'checkout', 'buruan', 'amankan', 'diskon 40%'],
    title: 'Direct Urgency Call to Action & Bio Link Prompt',
    intent: 'urgency',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumb: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
    type: 'video',
    suggestedFraming: 'pip',
    category: 'lifestyle',
    badgeTag: 'URGENCY ACTION',
  },
  {
    id: 'contrast-before-after',
    keywords: ['before after', 'perbandingan', 'kontras', 'transformasi', 'perbedaan', 'bandingkan', 'solusinya', 'dulu vs sekarang', 'cara lama'],
    title: 'Side-by-Side Old Way vs New High-Converting Way',
    intent: 'contrast',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumb: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
    type: 'video',
    suggestedFraming: 'split',
    category: 'education',
    badgeTag: 'CONTRAST MATRIX',
  },
  {
    id: 'result-success-breakthrough',
    keywords: ['success', 'solution', 'deal', 'closing', 'happy', 'solusi', 'berhasil', 'win', 'closing kilat', 'closingan', 'omset melesat', 'senang', 'growth'],
    title: 'Entrepreneur Celebrating Revenue Milestone & Conversion Success',
    intent: 'result',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumb: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
    type: 'video',
    suggestedFraming: 'full',
    category: 'business',
    badgeTag: 'RESULT WIN',
  }
];
