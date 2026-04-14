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
    if (index === 0) return 15;
    if (index === 1 || index === 2) return 10;
    if (index === total - 1) return 0;
    return 5;
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
    
    // ===== ПОДГОТОВКА ПРОМЕЖУТОЧНЫХ ДАННЫХ (в копейках) =====
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue_kop: 0,  // в копейках (целое число)
        profit_kop: 0,
        total_cost_kop: 0,
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
            
            // Получаем выручку в рублях и переводим в копейки
            const revenue_rub = calculateRevenue(item, product);
            const revenue_kop = Math.round(revenue_rub * 100);
            
            // Себестоимость в копейках
            const cost_kop = Math.round(product.purchase_price * item.quantity * 100);
            
            // Накопление в копейках (целые числа, нет погрешности)
            seller.revenue_kop += revenue_kop;
            seller.total_cost_kop += cost_kop;
            
            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });
    
    // ===== РАСЧЁТ ПРИБЫЛИ В КОПЕЙКАХ =====
    sellerStats.forEach(seller => {
        seller.profit_kop = seller.revenue_kop - seller.total_cost_kop;
    });
    
    // ===== СОРТИРОВКА ПРОДАВЦОВ ПО ПРИБЫЛИ =====
    const sortedSellerStats = [...sellerStats].sort((a, b) => b.profit_kop - a.profit_kop);
    
    // ===== ФОРМИРОВАНИЕ ИТОГОВОГО ОТЧЁТА =====
    const total = sortedSellerStats.length;
    
    return sortedSellerStats.map((seller, index) => {
        // Переводим из копеек в рубли для передачи в calculateBonus
        const sellerForBonus = {
            profit: seller.profit_kop / 100,
            seller_id: seller.seller_id,
            name: seller.name
        };
        
        // Расчёт бонуса в рублях, затем в копейки
        const bonus_rub = calculateBonus(index, total, sellerForBonus);
        const bonus_kop = Math.round(bonus_rub * 100);
        
        // Формирование топ-10 продуктов
        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        // Возврат результата (переводим копейки обратно в рубли)
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
