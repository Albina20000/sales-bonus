/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const discountDecimal = 1 - (purchase.discount / 100);
    const revenue = purchase.sale_price * purchase.quantity * discountDecimal;
    // Возвращаем с округлением до 2 знаков
    return +revenue.toFixed(2);
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
    if (index === 0) percent = 15;
    else if (index === 1 || index === 2) percent = 10;
    else if (index === total - 1) percent = 0;
    else percent = 5;
    
    // Возвращаем сумму бонуса, округлённую до 2 знаков
    return +((seller.profit * percent) / 100).toFixed(2);
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
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
        total_cost: 0,
        sales_count: 0,
        products_sold: {}
    }));
    
    // ===== СОЗДАНИЕ ИНДЕКСОВ =====
    const sellerIndex = Object.fromEntries(
        sellerStats.map(stat => [stat.seller_id, stat])
    );
    
    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );
    
    // ===== ДВОЙНОЙ ЦИКЛ ПЕРЕБОРА ЧЕКОВ И ПОКУПОК =====
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        
        if (!seller) {
            return;
        }
        
        seller.sales_count++;
        
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            
            if (!product) {
                return;
            }
            
            // Расчёт выручки через переданную функцию (уже округлена)
            const revenue = calculateRevenue(item, product);
            seller.revenue += revenue;
            
            // Расчёт себестоимости с округлением
            const cost = +(product.purchase_price * item.quantity).toFixed(2);
            seller.total_cost += cost;
            
            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });
    
    // ===== РАСЧЁТ ПРИБЫЛИ С ОКРУГЛЕНИЕМ =====
    sellerStats.forEach(seller => {
        seller.profit = +(seller.revenue - seller.total_cost).toFixed(2);
    });
    
    // ===== СОРТИРОВКА ПРОДАВЦОВ ПО ПРИБЫЛИ =====
    const sortedSellerStats = [...sellerStats].sort((a, b) => b.profit - a.profit);
    
    // ===== ФОРМИРОВАНИЕ ИТОГОВОГО ОТЧЁТА =====
    const total = sortedSellerStats.length;
    
    return sortedSellerStats.map((seller, index) => {
        // Расчёт бонуса (calculateBonus возвращает сумму в рублях)
        const bonusAmount = calculateBonus(index, total, {
            profit: seller.profit,
            seller_id: seller.seller_id,
            name: seller.name
        });
        
        // Формирование топ-10 продуктов
        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        // Возврат отформатированного результата
        return {
            seller_id: seller.seller_id,
            name: seller.name,
            revenue: +seller.revenue.toFixed(2),
            profit: +seller.profit.toFixed(2),
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: +bonusAmount.toFixed(2)
        };
    });
}