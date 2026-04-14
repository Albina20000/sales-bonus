/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const discountDecimal = purchase.discount / 100;
    const revenue = purchase.sale_price * purchase.quantity * (1 - discountDecimal);
    return Math.round(revenue * 100) / 100;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    let percent;
    if (index === 0) {
        percent = 15;
    } else if (index === 1 || index === 2) {
        percent = 10;
    } else if (index === total - 1) {
        percent = 0;
    } else {
        percent = 5;
    }
    // Возвращаем сумму бонуса в рублях, а не проценты
    return (seller.profit * percent) / 100;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверки
    if (!data || !options) {
        throw new Error('Некорректные входные данные');
    }
    
    const { calculateRevenue, calculateBonus } = options;
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Чего-то не хватает');
    }
    
    const { sellers, products, purchase_records } = data;
    if (!Array.isArray(sellers) || sellers.length === 0 ||
        !Array.isArray(products) || products.length === 0 ||
        !Array.isArray(purchase_records) || purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }
    
    // Индексы
    const productMap = new Map();
    products.forEach(p => productMap.set(p.sku, p));
    
    // Статистика продавцов (в копейках)
    const stats = sellers.map(s => ({
        seller_id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        revenue_kop: 0,
        profit_kop: 0,
        sales_count: 0,
        products_sold: {},
        total_cost_kop: 0
    }));
    const sellerMap = new Map();
    stats.forEach(s => sellerMap.set(s.seller_id, s));
    
    // Обработка чеков (всё в копейках)
    for (const receipt of purchase_records) {
        const seller = sellerMap.get(receipt.seller_id);
        if (!seller) continue;
        seller.sales_count++;
        
        for (const item of receipt.items) {
            const product = productMap.get(item.sku);
            if (!product) continue;
            
            // Получаем выручку в рублях, переводим в копейки
            const revenue_rub = calculateRevenue(item, product);
            const revenue_kop = Math.round(revenue_rub * 100);
            
            // Себестоимость в копейках
            const cost_kop = Math.round(product.purchase_price * item.quantity * 100);
            
            seller.revenue_kop += revenue_kop;
            seller.total_cost_kop += cost_kop;
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        }
    }
    
    // Расчёт прибыли в копейках
    for (const seller of stats) {
        seller.profit_kop = seller.revenue_kop - seller.total_cost_kop;
    }
    
    // Сортировка по прибыли (в копейках)
    stats.sort((a, b) => b.profit_kop - a.profit_kop);
    
    // Формирование результата
    const total = stats.length;
    return stats.map((seller, index) => {
        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        // Переводим копейки в рубли для передачи в calculateBonus
        const sellerForBonus = {
            ...seller,
            profit: seller.profit_kop / 100
        };
        const bonus_rub = calculateBonus(index, total, sellerForBonus);
        const bonus_kop = Math.round(bonus_rub * 100);
        
        return {
            seller_id: seller.seller_id,
            name: seller.name,
            revenue: seller.revenue_kop / 100,
            profit: seller.profit_kop / 100,
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: bonus_kop / 100
        };
    });
}
