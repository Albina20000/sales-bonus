function calculateSimpleRevenue(purchase, _product) {
    const discount = 1 - (purchase.discount / 100);
    return purchase.sale_price * purchase.quantity * discount;
}

function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return seller.profit * 0.15;
    if (index === 1 || index === 2) return seller.profit * 0.10;
    if (index === total - 1) return 0;
    return seller.profit * 0.05;
}

function analyzeSalesData(data, options) {
    // Проверки
    if (!data) throw new Error('Ошибка: параметр data не передан или равен null/undefined');
    if (!options) throw new Error('Ошибка: параметр options не передан или равен null/undefined');
    
    const { calculateRevenue, calculateBonus } = options;
    if (!calculateRevenue || typeof calculateRevenue !== 'function') {
        throw new Error('Ошибка: в options не передана функция calculateRevenue или она не является функцией');
    }
    if (!calculateBonus || typeof calculateBonus !== 'function') {
        throw new Error('Ошибка: в options не передана функция calculateBonus или она не является функцией');
    }
    
    const { sellers, products, purchase_records } = data;
    if (!sellers || !Array.isArray(sellers) || sellers.length === 0) {
        throw new Error('Ошибка: в data отсутствует коллекция sellers или она пуста');
    }
    if (!products || !Array.isArray(products) || products.length === 0) {
        throw new Error('Ошибка: в data отсутствует коллекция products или она пуста');
    }
    if (!purchase_records || !Array.isArray(purchase_records) || purchase_records.length === 0) {
        throw new Error('Ошибка: в data отсутствует коллекция purchase_records или она пуста');
    }
    
    // Индексы
    const productIndex = Object.fromEntries(products.map(p => [p.sku, p]));
    const sellerStats = sellers.map(s => ({
        seller_id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
        total_cost: 0
    }));
    const sellerIndex = Object.fromEntries(sellerStats.map(s => [s.seller_id, s]));
    
    // Обработка чеков
    for (const record of purchase_records) {
        const seller = sellerIndex[record.seller_id];
        if (!seller) continue;
        seller.sales_count++;
        
        for (const item of record.items) {
            const product = productIndex[item.sku];
            if (!product) continue;
            
            const cost = product.purchase_price * item.quantity;
            const revenue = Math.round(calculateRevenue(item, product) * 100) / 100;
            
            seller.revenue = Math.round((seller.revenue + revenue) * 100) / 100;
            seller.total_cost = Math.round((seller.total_cost + cost) * 100) / 100;
            
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        }
    }
    
    // Расчёт прибыли
    for (const seller of sellerStats) {
        seller.profit = Math.round((seller.revenue - seller.total_cost) * 100) / 100;
    }
    
    // Сортировка
    sellerStats.sort((a, b) => b.profit - a.profit);
    
    // Формирование результата
    const total = sellerStats.length;
    return sellerStats.map((seller, i) => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: seller.revenue,
        profit: seller.profit,
        sales_count: seller.sales_count,
        top_products: Object.entries(seller.products_sold)
            .map(([sku, q]) => ({ sku, quantity: q }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10),
        bonus: Math.round(calculateBonus(i, total, seller) * 100) / 100
    }));
}
