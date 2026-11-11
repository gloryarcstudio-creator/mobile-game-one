// Покупки через Unity IAP 4.12 (Google Play Billing и App Store). Включается символом CE_IAP.
// Товары и id — Core/Products.cs, их же нужно завести в консолях (docs/store/IAP_PRODUCTS.md).
// Проверка чеков на устройстве: Services → In-App Purchasing → Receipt Validation Obfuscator, затем символ CE_IAP_VALIDATE.
#if CE_IAP
using System;
using System.Collections.Generic;
using CatExorcist.Core;
using Unity.Services.Core;
using Unity.Services.Core.Environments;
using UnityEngine;
using UnityEngine.Purchasing;
using UnityEngine.Purchasing.Extension;
#if CE_IAP_VALIDATE
using UnityEngine.Purchasing.Security;
#endif

namespace CatExorcist.Integrations
{
    public sealed class UnityIapPurchases : IPurchaseService, IDetailedStoreListener
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Register() => Services.Purchases = new UnityIapPurchases();

        IStoreController store;
        IExtensionProvider ext;
        Action<string> onRestored;
        string pendingId;
        Action<bool> pendingDone;
        bool initStarted;

        public bool Ready => store != null;

        public async void Init(IEnumerable<ProductDef> products, Action<string> onRestoredOrDeferred)
        {
            if (initStarted) return;
            initStarted = true;
            onRestored = onRestoredOrDeferred;
            try { await UnityServices.InitializeAsync(new InitializationOptions().SetEnvironmentName("production")); }
            catch (Exception e) { Debug.LogWarning("Unity Services: " + e.Message); }
            var b = ConfigurationBuilder.Instance(StandardPurchasingModule.Instance());
            foreach (var p in products) b.AddProduct(p.Id, p.Kind == ProductKind.Consumable ? ProductType.Consumable : ProductType.NonConsumable);
            UnityPurchasing.Initialize(this, b);
        }

        public string LocalizedPrice(string productId)
        {
            var p = store?.products.WithID(productId);
            return p != null && p.availableToPurchase ? p.metadata.localizedPriceString : null;
        }

        public void Buy(string productId, Action<bool> onDone)
        {
            var p = store?.products.WithID(productId);
            if (p == null || !p.availableToPurchase || pendingDone != null) { onDone(false); return; }
            pendingId = productId; pendingDone = onDone;
            store.InitiatePurchase(p);
        }

        public void Restore(Action<bool> onDone)
        {
            if (ext == null) { onDone(false); return; }
#if UNITY_IOS
            ext.GetExtension<IAppleExtensions>().RestoreTransactions((ok, err) => onDone(ok));
#else
            ext.GetExtension<IGooglePlayStoreExtensions>().RestoreTransactions((ok, err) => onDone(ok));
#endif
        }

        // ---------------- IStoreListener
        public void OnInitialized(IStoreController controller, IExtensionProvider extensions) { store = controller; ext = extensions; CatExorcist.Hud.Dirty(); }
        public void OnInitializeFailed(InitializationFailureReason error) => Debug.LogWarning("IAP init failed: " + error);
        public void OnInitializeFailed(InitializationFailureReason error, string message) => Debug.LogWarning("IAP init failed: " + error + " " + message);

        public PurchaseProcessingResult ProcessPurchase(PurchaseEventArgs args)
        {
            var p = args.purchasedProduct;
            var id = p.definition.id;
            if (!Valid(p)) { Finish(id, false); return PurchaseProcessingResult.Complete; }
            if (id == pendingId && pendingDone != null)
            {
                Report(p);
                Finish(id, true);
            }
            else
            {
                // восстановление вечных покупок или оплата, прерванная прошлым запуском
                if (p.definition.type == ProductType.Consumable) Report(p);
                onRestored?.Invoke(id);
            }
            return PurchaseProcessingResult.Complete;
        }

        public void OnPurchaseFailed(Product product, PurchaseFailureReason reason) => Fail(product, reason.ToString());
        public void OnPurchaseFailed(Product product, PurchaseFailureDescription d) => Fail(product, d.reason + " " + d.message);

        void Fail(Product product, string why)
        {
            Debug.Log("IAP failed: " + product?.definition.id + " " + why);
            Finish(product?.definition.id, false);
        }

        void Finish(string id, bool ok)
        {
            if (id != pendingId) return;
            var cb = pendingDone; pendingDone = null; pendingId = null;
            cb?.Invoke(ok);
        }

        static void Report(Product p)
        {
            double price = (double)p.metadata.localizedPrice;
            foreach (var a in Services.Analytics)
                try { a.Purchase(p.definition.id, price, p.metadata.isoCurrencyCode, p.receipt); } catch (Exception e) { Debug.LogException(e); }
        }

        static bool Valid(Product p)
        {
#if CE_IAP_VALIDATE && !UNITY_EDITOR
            try
            {
                var v = new CrossPlatformValidator(GooglePlayTangle.Data(), AppleTangle.Data(), Application.identifier);
                v.Validate(p.receipt);
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
