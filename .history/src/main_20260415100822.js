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
    // ===== ПРОВЕРКИ =====
    if (!data
        || !Array.isArray(data.sellers)
        || data.sellers.length === 0
        || !Array.isArray(data.products)
        || data.products.length === 0
        || !Array.isArray(data.purchase_records)
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }
    
    const { calculateRevenue, calculateBonus } = options || {};
    
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Чего-то не хватает');
    }
    
    // ===== ПОДГОТОВКА ПРОМЕЖУТОЧНЫХ ДАННЫХ =====
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
        total_cost: 0
    }));
    
    // ===== ИНДЕКСЫ =====
    const sellerIndex = Object.fromEntries(
        sellerStats.map(stat => [stat.seller_id, stat])
    );
    
    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );
    
    // ===== ОБРАБОТКА ЧЕКОВ =====
    for (const record of data.purchase_records) {
        const seller = sellerIndex[record.seller_id];
        if (!seller) continue;
        
        seller.sales_count++;
        
        for (const item of record.items) {
            const product = productIndex[item.sku];
            if (!product) continue;
            
            // КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: округляем КАЖДУЮ операцию умножения
            const cost = Math.round(product.purchase_price * item.quantity * 100) / 100;
            const revenue = Math.round(calculateRevenue(item, product) * 100) / 100;
            
            seller.revenue += revenue;
            seller.total_cost += cost;
            
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        }
    }
    
    // ===== РАСЧЁТ ПРИБЫЛИ =====
    for (const seller of sellerStats) {
        seller.profit = seller.revenue - seller.total_cost;
    }
    
    // ===== СОРТИРОВКА =====
    sellerStats.sort((a, b) => b.profit - a.profit);
    
    // ===== ФОРМИРОВАНИЕ РЕЗУЛЬТАТА =====
    const total = sellerStats.length;
    
    for (let i = 0; i < sellerStats.length; i++) {
        const seller = sellerStats[i];
        seller.bonus = calculateBonus(i, total, seller);
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    }
    
    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}
