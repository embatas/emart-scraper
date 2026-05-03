const cheerio = require('cheerio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url || !url.includes('emart.bg')) {
    return res.status(400).json({ error: 'Невалиден URL' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'bg-BG,bg;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    // Заглавие
    const title = $('h1.product-title, h1[itemprop="name"], h1').first().text().trim();

    // Цена
    let priceText = $('[itemprop="price"]').attr('content') 
      || $('.price .amount, .product-price, .price-box .price').first().text().trim();
    let price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'));
    let finalPrice = Math.round(price * 1.20 * 100) / 100;

    // Описание
    const description = $('[itemprop="description"], .product-description, #product-description').html() 
      || $('[itemprop="description"], .product-description').text().trim();

    // Снимки
    const images = [];
    $('img[itemprop="image"], .product-images img, .gallery img, .swiper-slide img').each((i, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy');
      if (src && !src.includes('placeholder') && !src.includes('loading')) {
        if (src.startsWith('//')) src = 'https:' + src;
        if (src.startsWith('/')) src = 'https://www.emart.bg' + src;
        if (!images.includes(src)) images.push(src);
      }
    });

    if (!title) return res.status(422).json({ error: 'Не можах да намеря продукта' });

    res.json({ title, description, images, originalPrice: price, finalPrice });
  } catch (err) {
    res.status(500).json({ error: 'Грешка при зареждане: ' + err.message });
  }
};
