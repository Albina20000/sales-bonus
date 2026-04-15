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
    if (!sellers?.length || !products?.length || !purchase_records?.length) {
        throw new Error('Некорректные входные данные');
    }
    
    const productMap = new Map(products.map(p => [p.sku, p]));
    const stats = new Map();
    
    for (const seller of sellers) {
        stats.set(seller.id, {
            seller_id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {},
            total_cost: 0
        });
    }
    
    for (const receipt of purchase_records) {
        const seller = stats.get(receipt.seller_id);
        if (!seller) continue;
        seller.sales_count++;
        
        for (const item of receipt.items) {
            const product = productMap.get(item.sku);
            if (!product) continue;
            
            seller.revenue += calculateRevenue(item, product);
            seller.total_cost += product.purchase_price * item.quantity;
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        }
    }
    
    const result = [];
    for (const seller of stats.values()) {
        seller.profit = seller.revenue - seller.total_cost;
        result.push(seller);
    }
    
    result.sort((a, b) => b.profit - a.profit);
    
    const total = result.length;
    return result.map((seller, i) => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: Number(seller.revenue.toFixed(2)),
        profit: Number(seller.profit.toFixed(2)),
        sales_count: seller.sales_count,
        top_products: Object.entries(seller.products_sold)
            .map(([sku, q]) => ({ sku, quantity: q }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10),
        bonus: Number(calculateBonus(i, total, seller).toFixed(2))
    }));
}

function calculateSimpleRevenue(purchase, _product) {
    return purchase.sale_price * purchase.quantity * (1 - purchase.discount / 100);
}

function calculateBonusByProfit(index, total, seller) {
    const percent = index === 0 ? 0.15 : (index === 1 || index === 2) ? 0.10 : (index === total - 1) ? 0 : 0.05;
    return seller.profit * percent;
}
