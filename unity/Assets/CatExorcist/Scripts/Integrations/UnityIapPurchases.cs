// Покупки через Unity IAP 5 (Google Play Billing 7+ и StoreKit 2). Включается символом CE_IAP.
// Товары и id — Core/Products.cs, их же нужно завести в консолях (docs/store/IAP_PRODUCTS.md).
// Проверка чеков Google Play на устройстве: Services → In-App Purchasing → Receipt Validation Obfuscator,
// затем символ CE_IAP_VALIDATE. Транзакции App Store (StoreKit 2) подписаны и проверяются самим StoreKit.
#if CE_IAP
using System;
using System.Collections.Generic;
using CatExorcist.Core;
using Unity.Services.Core;
using Unity.Services.Core.Environments;
using UnityEngine;
using UnityEngine.Purchasing;
#if CE_IAP_VALIDATE
using UnityEngine.Purchasing.Security;
#endif

namespace CatExorcist.Integrations
{
    public sealed class UnityIapPurchases : IPurchaseService
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Register() => Services.Purchases = new UnityIapPurchases();

        const string GrantedKey = "ce_iap_granted";

        StoreController store;
        readonly List<ProductDefinition> defs = new List<ProductDefinition>();
        Action<string> onRestored;
        string pendingId;
        Action<bool> pendingDone;
        bool initStarted, productsReady;

        public bool Ready => store != null && productsReady;

        public async void Init(IEnumerable<ProductDef> products, Action<string> onRestoredOrDeferred)
        {
            if (initStarted) return;
            initStarted = true;
            onRestored = onRestoredOrDeferred;
            foreach (var p in products) defs.Add(new ProductDefinition(p.Id, p.Kind == ProductKind.Consumable ? ProductType.Consumable : ProductType.NonConsumable));
            try { await UnityServices.InitializeAsync(new InitializationOptions().SetEnvironmentName("production")); }
            catch (Exception e) { Debug.LogWarning("Unity Services: " + e.Message); }

            store = UnityIAPServices.StoreController();
            store.OnStoreConnected += () => store.FetchProducts(defs);
            store.OnStoreDisconnected += d => Debug.LogWarning("IAP store disconnected: " + d.message);
            store.OnProductsFetched += list => { productsReady = true; CatExorcist.Hud.Dirty(); store.FetchPurchases(); };
            store.OnProductsFetchFailed += f => Debug.LogWarning("IAP products fetch failed (" + f.FailedFetchProducts.Count + "): " + f.FailureReason);
            store.OnPurchasesFetched += OnPurchasesFetched;
            store.OnPurchasesFetchFailed += f => Debug.LogWarning("IAP purchases fetch failed: " + f.message);
            store.OnPurchasePending += OnPurchasePending;
            store.OnPurchaseConfirmed += o => { if (o is FailedOrder f) Debug.LogWarning("IAP confirm failed: " + IdOf(o) + " " + f.FailureReason + " " + f.Details); };
            store.OnPurchaseFailed += o => { Debug.Log("IAP failed: " + IdOf(o) + " " + o.FailureReason + " " + o.Details); Finish(IdOf(o), false); };
            // «Спросить родителей» / отложенная оплата: товар придёт позже через OnPurchasePending
            store.OnPurchaseDeferred += o => { Debug.Log("IAP deferred: " + IdOf(o)); Finish(IdOf(o), false); };
            try { await store.Connect(); }
            catch (Exception e) { Debug.LogWarning("IAP connect: " + e.Message); }
        }

        public string LocalizedPrice(string productId)
        {
            var p = Ready ? store.GetProductById(productId) : null;
            return p != null && p.availableToPurchase ? p.metadata.localizedPriceString : null;
        }

        public void Buy(string productId, Action<bool> onDone)
        {
            var p = Ready ? store.GetProductById(productId) : null;
            if (p == null || !p.availableToPurchase || pendingDone != null) { onDone(false); return; }
            pendingId = productId; pendingDone = onDone;
            store.PurchaseProduct(p);
        }

        // Восстановленные покупки приходят в OnPurchasesFetched (IAP сам вызывает FetchPurchases после восстановления)
        public void Restore(Action<bool> onDone)
        {
            if (store == null) { onDone(false); return; }
            store.RestoreTransactions((ok, err) => { if (!ok) Debug.Log("IAP restore: " + err); onDone(ok); });
        }

        // ---------------- события магазина
        void OnPurchasePending(PendingOrder order)
        {
            var id = IdOf(order);
            if (id == null) { store.ConfirmPurchase(order); return; }
            if (!Valid(order)) { Finish(id, false); store.ConfirmPurchase(order); return; }
            var tx = order.Info.TransactionID;
            bool fresh = MarkGranted(tx); // одна транзакция — одна выдача, даже если магазин прислал её повторно
            var product = FirstProduct(order);
            if (id == pendingId && pendingDone != null)
            {
                if (fresh) Report(product, order);
                Finish(id, fresh);
            }
            else if (fresh)
            {
                // оплата, прерванная прошлым запуском, или отложенная («Спросить родителей»)
                if (product != null && product.definition.type == ProductType.Consumable) Report(product, order);
                onRestored?.Invoke(id);
            }
            store.ConfirmPurchase(order);
        }

        void OnPurchasesFetched(Orders orders)
        {
            // вечные покупки после переустановки или «Восстановить покупки»; повторная выдача безопасна (GrantProduct)
            foreach (var o in orders.ConfirmedOrders)
            {
                var p = FirstProduct(o);
                if (p != null && p.definition.type == ProductType.NonConsumable && Valid(o)) onRestored?.Invoke(p.definition.id);
            }
        }

        void Finish(string id, bool ok)
        {
            if (id == null || id != pendingId) return;
            var cb = pendingDone; pendingDone = null; pendingId = null;
            cb?.Invoke(ok);
        }

        static Product FirstProduct(Order o)
        {
            var items = o?.CartOrdered?.Items();
            return items != null && items.Count > 0 ? items[0].Product : null;
        }

        static string IdOf(Order o) => FirstProduct(o)?.definition.id;

        static bool MarkGranted(string tx)
        {
            if (string.IsNullOrEmpty(tx)) return true;
            var list = new List<string>(PlayerPrefs.GetString(GrantedKey, "").Split(new[] { '\n' }, StringSplitOptions.RemoveEmptyEntries));
            if (list.Contains(tx)) return false;
            list.Add(tx);
            if (list.Count > 100) list.RemoveRange(0, list.Count - 100);
            PlayerPrefs.SetString(GrantedKey, string.Join("\n", list));
            PlayerPrefs.Save();
            return true;
        }

        static void Report(Product p, Order o)
        {
            if (p == null) return;
            double price = (double)p.metadata.localizedPrice;
            foreach (var a in Services.Analytics)
                try { a.Purchase(p.definition.id, price, p.metadata.isoCurrencyCode, o.Info.Receipt); } catch (Exception e) { Debug.LogException(e); }
        }

        static bool Valid(Order o)
        {
#if CE_IAP_VALIDATE && UNITY_ANDROID && !UNITY_EDITOR
            try
            {
                new CrossPlatformValidator(GooglePlayTangle.Data(), Application.identifier).Validate(o.Info.Receipt);
                return true;
            }
            catch (IAPSecurityException e) { Debug.LogWarning("Receipt invalid: " + e.Message); return false; }
#else
            return true;
#endif
        }
    }
}
#endif
