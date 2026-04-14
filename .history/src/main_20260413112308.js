/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   // @TODO: Расчет выручки от операции
   const { discount, sale_price, quantity } = purchase;
    
    // Переводим скидку из процентов в десятичное число
    const discountDecimal = discount / 100;
    
    // Считаем полную стоимость без скидки
    const fullPrice = sale_price * quantity;
    
    // Считаем выручку с учетом скидки
    const revenue = fullPrice * (1 - discountDecimal);
    
    return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    const { profit } = seller;

     // Последнее место (индекс = total - 1) — бонус 0%
    if (index === total - 1) {
        return 0;
    }
    
    // Первое место — бонус 15%
    if (index === 0) {
        return 15;
    }
    
    // Второе и третье место — бонус 10%
    if (index === 1 || index === 2) {
        return 10;
    }
    
    // Все остальные (с 4-го места и до предпоследнего) — бонус 5%
    return 5;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // ===== ПРОВЕРКА 1: Существуют ли данные =====
    if (!data) {
        throw new Error('Ошибка: параметр data не передан или равен null/undefined');
    }
    
    // ===== ПРОВЕРКА 2: Существуют ли настройки =====
    if (!options) {
        throw new Error('Ошибка: параметр options не передан или равен null/undefined');
    }
    
    // ===== ПРОВЕРКА 3: Проверка наличия функций в options =====
    const { calculateRevenue, calculateBonus } = options;
    
    if (!calculateRevenue) {
        throw new Error('Ошибка: в options не передана функция calculateRevenue');
    }
    
    if (typeof calculateRevenue !== 'function') {
        throw new Error('Ошибка: calculateRevenue должна быть функцией');
    }
    
    if (!calculateBonus) {
        throw new Error('Ошибка: в options не передана функция calculateBonus');
    }
    
    if (typeof calculateBonus !== 'function') {
        throw new Error('Ошибка: calculateBonus должна быть функцией');
    }
    
    // ===== ПРОВЕРКА 4: Проверка наличия необходимых коллекций в data =====
    const { sellers, products, purchase_records } = data;
    
    if (!sellers) {
        throw new Error('Ошибка: в data отсутствует коллекция sellers');
    }
    
    if (!products) {
        throw new Error('Ошибка: в data отсутствует коллекция products');
    }
    
    if (!purchase_records) {
        throw new Error('Ошибка: в data отсутствует коллекция purchase_records');
    }
    
    // ===== ПРОВЕРКА 5: Проверка, что коллекции являются массивами =====
    if (!Array.isArray(sellers)) {
        throw new Error('Ошибка: sellers должен быть массивом');
    }
    
    if (!Array.isArray(products)) {
        throw new Error('Ошибка: products должен быть массивом');
    }
    
    if (!Array.isArray(purchase_records)) {
        throw new Error('Ошибка: purchase_records должен быть массивом');
    }
    
    // ===== ПРОВЕРКА 6: Проверка, что массивы не пустые =====
    if (sellers.length === 0) {
        throw new Error('Ошибка: массив sellers пуст');
    }
    
    if (products.length === 0) {
        throw new Error('Ошибка: массив products пуст');
    }
    
    if (purchase_records.length === 0) {
        throw new Error('Ошибка: массив purchase_records пуст');
    }
    
    // ===== ПРОВЕРКА 7: Проверка структуры каждого продавца =====
    for (let i = 0; i < sellers.length; i++) {
        const seller = sellers[i];
        if (!seller.id) {
            throw new Error(`Ошибка: у продавца с индексом ${i} отсутствует поле id`);
        }
        if (!seller.first_name || !seller.last_name) {
            throw new Error(`Ошибка: у продавца ${seller.id || i} отсутствует имя или фамилия`);
        }
    }
    
    // ===== ПРОВЕРКА 8: Проверка структуры каждого товара =====
    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        if (!product.sku) {
            throw new Error(`Ошибка: у товара с индексом ${i} отсутствует поле sku`);
        }
        if (typeof product.purchase_price !== 'number' || isNaN(product.purchase_price)) {
            throw new Error(`Ошибка: у товара ${product.sku || i} некорректная purchase_price`);
        }
    }
    
    // ===== ПРОВЕРКА 9: Проверка структуры чеков =====
    for (let i = 0; i < purchase_records.length; i++) {
        const receipt = purchase_records[i];
        if (!receipt.receipt_id) {
            throw new Error(`Ошибка: у чека с индексом ${i} отсутствует поле receipt_id`);
        }
        if (!receipt.seller_id) {
            throw new Error(`Ошибка: у чека ${receipt.receipt_id || i} отсутствует seller_id`);
        }
        if (!Array.isArray(receipt.items)) {
            throw new Error(`Ошибка: у чека ${receipt.receipt_id || i} items не является массивом`);
        }
        
        // Проверка каждого товара в чеке
        for (let j = 0; j < receipt.items.length; j++) {
            const item = receipt.items[j];
            if (!item.sku) {
                throw new Error(`Ошибка: в чеке ${receipt.receipt_id} у позиции ${j} отсутствует sku`);
            }
            if (typeof item.quantity !== 'number' || item.quantity <= 0) {
                throw new Error(`Ошибка: в чеке ${receipt.receipt_id} у товара ${item.sku} некорректное quantity`);
            }
            if (typeof item.discount !== 'number' || isNaN(item.discount)) {
                throw new Error(`Ошибка: в чеке ${receipt.receipt_id} у товара ${item.sku} некорректная discount`);
            }
            if (typeof item.sale_price !== 'number' || item.sale_price <= 0) {
                throw new Error(`Ошибка: в чеке ${receipt.receipt_id} у товара ${item.sku} некорректная sale_price`);
            }
        }
    }
    
    // ===== СОЗДАЁМ ИНДЕКСЫ ДЛЯ БЫСТРОГО ДОСТУПА =====
    const sellersMap = new Map();
    sellers.forEach(seller => {
        sellersMap.set(seller.id, seller);
    });
    
    const productsMap = new Map();
    products.forEach(product => {
        productsMap.set(product.sku, product);
    });
    
    // ===== СОЗДАЁМ ПРОМЕЖУТОЧНЫЕ ДАННЫЕ =====
    const sellersStats = new Map();
    
    sellers.forEach(seller => {
        sellersStats.set(seller.id, {
            id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {},
            total_cost: 0
        });
    });
    
    // ===== ОБРАБАТЫВАЕМ ЧЕКИ =====
    for (const receipt of purchase_records) {
        const sellerId = receipt.seller_id;
        const sellerStat = sellersStats.get(sellerId);
        
        // Если продавец не найден, пропускаем чек (но можно и выбросить ошибку)
        if (!sellerStat) {
            console.warn(`Предупреждение: продавец ${sellerId} не найден, чек ${receipt.receipt_id} пропущен`);
            continue;
        }
        
        sellerStat.sales_count++;
        
        for (const item of receipt.items) {
            const { sku, quantity, discount, sale_price } = item;
            
            const product = productsMap.get(sku);
            if (!product) {
                console.warn(`Предупреждение: товар ${sku} не найден, позиция в чеке ${receipt.receipt_id} пропущена`);
                continue;
            }
            
            // Рассчитываем выручку
            try {
                const revenue = calculateRevenue(item, product);
                if (typeof revenue !== 'number' || isNaN(revenue)) {
                    throw new Error(`Функция calculateRevenue вернула некорректное значение: ${revenue}`);
                }
                sellerStat.revenue += revenue;
            } catch (err) {
                throw new Error(`Ошибка при вызове calculateRevenue для товара ${sku}: ${err.message}`);
            }
            
            // Накопливаем количество товаров
            sellerStat.products_sold[sku] = (sellerStat.products_sold[sku] || 0) + quantity;
            
            // Накопливаем себестоимость
            sellerStat.total_cost += product.purchase_price * quantity;
        }
    }
    
    // ===== РАССЧИТЫВАЕМ ПРИБЫЛЬ =====
    for (const [sellerId, stat] of sellersStats) {
        stat.profit = stat.revenue - stat.total_cost;
    }
    
    // ===== ФОРМИРУЕМ ИТОГОВЫЙ ОТЧЁТ =====
    const sellersList = [];
    
    for (const [sellerId, stat] of sellersStats) {
        // Формируем топ-10 товаров
        const topProducts = Object.entries(stat.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        sellersList.push({
            seller_id: sellerId,
            name: stat.name,
            revenue: Math.round(stat.revenue * 100) / 100,
            profit: Math.round(stat.profit * 100) / 100,
            sales_count: stat.sales_count,
            top_products: topProducts,
            bonus: 0
        });
    }
    
    // ===== ПРОВЕРКА: Есть ли данные после обработки =====
    if (sellersList.length === 0) {
        throw new Error('Ошибка: после обработки данных не получено ни одного продавца');
    }
    
    // ===== СОРТИРУЕМ И РАССЧИТЫВАЕМ БОНУСЫ =====
    sellersList.sort((a, b) => b.profit - a.profit);
    
    const total = sellersList.length;
    sellersList.forEach((seller, index) => {
        try {
            const bonusPercent = calculateBonus(index, total, seller);
            if (typeof bonusPercent !== 'number' || isNaN(bonusPercent)) {
                throw new Error(`Функция calculateBonus вернула некорректное значение: ${bonusPercent}`);
            }
            seller.bonus = Math.round((seller.profit * bonusPercent / 100) * 100) / 100;
        } catch (err) {
            throw new Error(`Ошибка при вызове calculateBonus для продавца ${seller.seller_id}: ${err.message}`);
        }
    });
    
    return sellersList;
}
