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
    const title = $('div.title h1 span').first().text().trim()
      || $('div.title h1').first().text().trim();

    // Цена
// Вземи само основната цена в евро (първото число)
const priceRaw = $('div.price-inner').first().text().trim();
const priceMatch = priceRaw.match(/(\d+[.,]\d+)/);
const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;
const finalPrice = Math.round(price * 1.10 * 100) / 100;


    // Описание
    const description = $('div.description-wrap').html() || '';

    // Снимки - главна снимка
    const images = [];
    const mainImg = $('#gsnman').attr('src');
    if (mainImg) images.push(mainImg);

    // Допълнителни снимки от галерията
    $('div#cv_nan img, .image-gallery img').each((i, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src');
      if (src) {
        // Вземи голямата версия
        src = src.replace('/small/', '/big/').replace('/medium/', '/big/');
        if (src.startsWith('//')) src = 'https:' + src;
        if (!images.includes(src)) images.push(src);
      }
    });

    if (!title) {
      return res.status(422).json({ error: 'Не можах да намеря продукта. Проверете URL адреса.' });
    }

    res.json({ title, description, images, originalPrice: price, finalPrice });
  } catch (err) {
    res.status(500).json({ error: 'Грешка: ' + err.message });
  }
};
