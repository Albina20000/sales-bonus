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
    
    const productIndex = {};
    products.forEach(p => { productIndex[p.sku] = p; });
    
    const sellerStats = [];
    const sellerIndex = {};
    sellers.forEach(s => {
        const stat = {
            seller_id: s.id,
            name: `${s.first_name} ${s.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {},
            total_cost: 0
        };
        sellerStats.push(stat);
        sellerIndex[s.id] = stat;
    });
    
    for (const record of purchase_records) {
        const seller = sellerIndex[record.seller_id];
        if (!seller) continue;
        seller.sales_count++;
        
        for (const item of record.items) {
            const product = productIndex[item.sku];
            if (!product) continue;
            
            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            
            seller.revenue += revenue;
            seller.total_cost += cost;
            
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        }
    }
    
    for (const seller of sellerStats) {
        seller.profit = Math.round((seller.revenue - seller.total_cost) * 100) / 100;
    }
    
    sellerStats.sort((a, b) => b.profit - a.profit);
    
    const total = sellerStats.length;
    const result = [];
    
    for (let i = 0; i < sellerStats.length; i++) {
        const seller = sellerStats[i];
        const bonus = calculateBonus(i, total, seller);
        
        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        result.push({
            seller_id: seller.seller_id,
            name: seller.name,
            revenue: Math.round(seller.revenue * 100) / 100,
            profit: seller.profit,
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: Math.round(bonus * 100) / 100
        });
    }
    
    return result;
}
