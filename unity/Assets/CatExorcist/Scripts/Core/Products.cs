// Каталог покупок. Идентификаторы одинаковые для Google Play и App Store (их нужно завести в консолях, см. docs/store/IAP_PRODUCTS.md).
using System.Collections.Generic;

namespace CatExorcist.Core
{
    public enum ProductKind { Consumable, NonConsumable }

    public sealed class ProductDef
    {
        public string Id, Title, Price;
        public double Usd;
        public ProductKind Kind;
    }

    public static class Products
    {
        public const string Prefix = "com.gloryarc.catexorcist.";
        public static readonly List<ProductDef> All = new List<ProductDef>();
        static readonly Dictionary<string, ProductDef> byId = new Dictionary<string, ProductDef>();

        static void Add(string id, string title, double usd, ProductKind kind)
        {
            var p = new ProductDef { Id = Prefix + id, Title = title, Usd = usd, Price = "$" + usd.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture), Kind = kind };
            All.Add(p);
            byId[p.Id] = p;
        }

        static Products()
        {
            Add("gems100", "100 кристаллов", 0.99, ProductKind.Consumable);
            Add("gems550", "550 кристаллов", 4.99, ProductKind.Consumable);
            Add("gems1200", "1200 кристаллов", 9.99, ProductKind.Consumable);
            Add("gems2600", "2600 кристаллов", 19.99, ProductKind.Consumable);
            Add("gems7000", "7000 кристаллов", 49.99, ProductKind.Consumable);
            Add("starter", "Стартовый набор", 1.99, ProductKind.NonConsumable);
            Add("vip7", "VIP на 7 дней", 6.99, ProductKind.Consumable);
            Add("noads", "Без рекламы", 4.99, ProductKind.NonConsumable);
            Add("weekly", "Набор недели", 14.99, ProductKind.Consumable);
            Add("autoup", "Автопрокачка навсегда", 2.99, ProductKind.NonConsumable);
            Add("automerge", "Автослияние навсегда", 2.99, ProductKind.NonConsumable);
            Add("autobundle", "Автоматизация навсегда", 4.99, ProductKind.NonConsumable);
            Add("pass", "Призрачный пропуск (сезон)", 4.99, ProductKind.Consumable);
            Add("moonboost", "Лунный ускоритель", 2.99, ProductKind.Consumable);
            foreach (var sk in new[] { "vampire:2.99", "devil:3.99", "angel:3.99", "santa:4.99", "golden:9.99", "robot:3.99", "dragon:4.99", "phantom:12.99" })
            {
                var p = sk.Split(':');
                Add("skin_" + p[0], "Скин", double.Parse(p[1], System.Globalization.CultureInfo.InvariantCulture), ProductKind.NonConsumable);
            }
        }

        public static ProductDef Get(string id) => byId.TryGetValue(id, out var p) ? p : null;
        public static string Id(string shortId) => Prefix + shortId;
        public static string Short(string id) => id.StartsWith(Prefix) ? id.Substring(Prefix.Length) : id;
        public static string GemsId(int amount) => Prefix + "gems" + amount;
    }
}
