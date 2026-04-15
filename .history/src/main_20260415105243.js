function calculateSimpleRevenue(purchase, _product) {
    const discount = 1 - (purchase.discount / 100);
    return Math.round(purchase.sale_price * purchase.quantity * discount * 100) / 100;
}

function calculateBonusByProfit(index, total, seller) {
    const percent = index === 0 ? 0.15 : (index === 1 || index === 2) ? 0.10 : (index === total - 1) ? 0 : 0.05;
    return Math.round(seller.profit * percent * 100) / 100;
}

function analyzeSalesData(data, options) {
    // Проверки
    if (!data || !options) throw new Error('Ошибка');
    
    const { calculateRevenue, calculateBonus } = options;
    if (!calculateRevenue || !calculateBonus) throw new Error('Ошибка');
    
    const { sellers, products, purchase_records } = data;
    if (!sellers?.length || !products?.length || !purchase_records?.length) {
        throw new Error('Ошибка');
    }
    
    // Индексы
    const productMap = new Map(products.map(p => [p.sku, p]));
    const sellerMap = new Map();
    
    // Статистика
    const stats = sellers.map(s => {
        const stat = {
            seller_id: s.id,
            name: `${s.first_name} ${s.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {},
            total_cost: 0
        };
        sellerMap.set(s.id, stat);
        return stat;
    });
    
    // Обработка чеков
    for (const receipt of purchase_records) {
        const seller = sellerMap.get(receipt.seller_id);
        if (!seller) continue;
        
        seller.sales_count++;
        
        for (const item of receipt.items) {
            const product = productMap.get(item.sku);
            if (!product) continue;
            
            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            
            seller.revenue += revenue;
            seller.total_cost += cost;
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        }
    }
    
    // Расчёт прибыли
    for (const seller of stats) {
        seller.profit = seller.revenue - seller.total_cost;
    }
    
    // Сортировка
    stats.sort((a, b) => b.profit - a.profit);
    
    // Формирование результата
    const total = stats.length;
    return stats.map((seller, i) => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: Math.round(seller.revenue * 100) / 100,
        profit: Math.round(seller.profit * 100) / 100,
        sales_count: seller.sales_count,
        top_products: Object.entries(seller.products_sold)
            .map(([sku, q]) => ({ sku, quantity: q }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10),
        bonus: Math.round(calculateBonus(i, total, seller) * 100) / 100
    }));
}
