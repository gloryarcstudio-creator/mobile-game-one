// Заглушки API сторонних SDK — ТОЛЬКО для проверки синтаксиса Scripts/Integrations без Unity и без SDK.
// Повторяют публичные сигнатуры, которые используем; настоящая проверка — компиляция в Unity с установленными SDK.
#pragma warning disable
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public static class MaxSdkCallbacks
{
    public static event Action<MaxSdkBase.SdkConfiguration> OnSdkInitializedEvent;
    public static class Rewarded
    {
        public static event Action<string, MaxSdkBase.AdInfo> OnAdLoadedEvent, OnAdHiddenEvent, OnAdRevenuePaidEvent;
        public static event Action<string, MaxSdkBase.ErrorInfo> OnAdLoadFailedEvent;
        public static event Action<string, MaxSdkBase.ErrorInfo, MaxSdkBase.AdInfo> OnAdDisplayFailedEvent;
        public static event Action<string, MaxSdkBase.Reward, MaxSdkBase.AdInfo> OnAdReceivedRewardEvent;
    }
    public static class Interstitial
    {
        public static event Action<string, MaxSdkBase.AdInfo> OnAdLoadedEvent, OnAdHiddenEvent, OnAdRevenuePaidEvent;
        public static event Action<string, MaxSdkBase.ErrorInfo> OnAdLoadFailedEvent;
        public static event Action<string, MaxSdkBase.ErrorInfo, MaxSdkBase.AdInfo> OnAdDisplayFailedEvent;
    }
}
public class MaxSdkBase
{
    public enum ConsentFlowUserGeography { Unknown, Gdpr, Other }
    public class SdkConfiguration { public ConsentFlowUserGeography ConsentFlowUserGeography; }
    public class AdInfo { public string AdUnitIdentifier, NetworkName, Placement; public double Revenue; }
    public class ErrorInfo { public string Message; }
    public struct Reward { public string Label; public int Amount; }
}
public class MaxCmpError { public string Message; }
public class MaxCmpService { public void ShowCmpForExistingUser(Action<MaxCmpError> onCompleted) { } }
public class MaxSdk : MaxSdkBase
{
    public static MaxCmpService CmpService = new MaxCmpService();
    public static void InitializeSdk() { }
    public static SdkConfiguration GetSdkConfiguration() => null;
    public static void LoadRewardedAd(string id) { }
    public static bool IsRewardedAdReady(string id) => false;
    public static void ShowRewardedAd(string id, string placement = null) { }
    public static void LoadInterstitial(string id) { }
    public static bool IsInterstitialReady(string id) => false;
    public static void ShowInterstitial(string id, string placement = null) { }
}

namespace Unity.Services.Core { public static class UnityServices { public static Task InitializeAsync(InitializationOptions o = null) => Task.CompletedTask; } public class InitializationOptions { } }
namespace Unity.Services.Core.Environments { public static class Ext { public static Unity.Services.Core.InitializationOptions SetEnvironmentName(this Unity.Services.Core.InitializationOptions o, string n) => o; } }
// Unity IAP 5.5: подписи сверены с исходниками пакета com.unity.purchasing 5.5.0
namespace UnityEngine.Purchasing
{
    public enum ProductType { Consumable, NonConsumable, Subscription }
    public enum PurchaseFailureReason { PurchasingUnavailable, ExistingPurchasePending, ProductUnavailable, SignatureInvalid, UserCancelled, PaymentDeclined, DuplicateTransaction, ValidationFailure, Unknown }
    public class ProductDefinition { public ProductDefinition(string id, ProductType type) { this.id = id; this.type = type; } public string id { get; private set; } public ProductType type { get; private set; } }
    public class ProductMetadata { public decimal localizedPrice { get; } public string localizedPriceString { get; } public string isoCurrencyCode { get; } }
    public class Product { public ProductDefinition definition => null; public ProductMetadata metadata => null; public bool availableToPurchase => false; }
    public class CartItem { public Product Product { get; } }
    public interface ICart { IReadOnlyList<CartItem> Items(); }
    public interface IOrderInfo { string Receipt { get; } string TransactionID { get; } }
    public abstract class Order { public ICart CartOrdered { get; internal set; } public IOrderInfo Info { get; } }
    public class PendingOrder : Order { }
    public class ConfirmedOrder : Order { }
    public class DeferredOrder : Order { }
    public class FailedOrder : Order { public PurchaseFailureReason FailureReason => default; public string Details => null; }
    public class Orders { public IReadOnlyList<ConfirmedOrder> ConfirmedOrders { get; } public IReadOnlyList<PendingOrder> PendingOrders { get; } public IReadOnlyList<DeferredOrder> DeferredOrders { get; } }
    public class StoreConnectionFailureDescription { public string message; }
    public class ProductFetchFailed { public List<ProductDefinition> FailedFetchProducts { get; } public string FailureReason { get; } }
    public class PurchasesFetchFailureDescription { public string message; }
    public interface IRetryPolicy { }
    public class StoreController
    {
        public event Action<StoreConnectionFailureDescription> OnStoreDisconnected;
        public event Action OnStoreConnected;
        public event Action<PendingOrder> OnPurchasePending;
        public event Action<Order> OnPurchaseConfirmed;
        public event Action<FailedOrder> OnPurchaseFailed;
        public event Action<DeferredOrder> OnPurchaseDeferred;
        public event Action<Orders> OnPurchasesFetched;
        public event Action<PurchasesFetchFailureDescription> OnPurchasesFetchFailed;
        public event Action<List<Product>> OnProductsFetched;
        public event Action<ProductFetchFailed> OnProductsFetchFailed;
        public Task Connect() => Task.CompletedTask;
        public void FetchProducts(List<ProductDefinition> productDefinitions, IRetryPolicy retryPolicy = null) { }
        public Product GetProductById(string catalogListingId) => null;
        public void PurchaseProduct(Product product) { }
        public void ConfirmPurchase(PendingOrder order) { }
        public void FetchPurchases() { }
        public void RestoreTransactions(Action<bool, string> callback) { }
    }
    public static class UnityIAPServices { public static StoreController StoreController(string storeName = null) => null; }
}
namespace UnityEngine.Purchasing.Security
{
    public interface IPurchaseReceipt { }
    public class IAPSecurityException : Exception { }
    public class CrossPlatformValidator { public CrossPlatformValidator(byte[] googlePublicKey, string googleBundleId) { } public IPurchaseReceipt[] Validate(string unityIAPReceipt) => null; }
    public class GooglePlayTangle { public static byte[] Data() => null; }
}

namespace Firebase
{
    public enum DependencyStatus { Available, UnavailableOther }
    public class FirebaseApp { public static Task<DependencyStatus> CheckAndFixDependenciesAsync() => Task.FromResult(DependencyStatus.Available); }
}
namespace Firebase.Extensions { public static class TaskExtension { public static Task ContinueWithOnMainThread<T>(this Task<T> t, Action<Task<T>> a) => t; public static Task ContinueWithOnMainThread(this Task t, Action<Task> a) => t; } }
namespace Firebase.Analytics
{
    public enum ConsentType { AdStorage, AnalyticsStorage, AdUserData, AdPersonalization }
    public enum ConsentStatus { Granted, Denied }
    public class Parameter { public Parameter(string n, string v) { } public Parameter(string n, long v) { } public Parameter(string n, double v) { } }
    public static class FirebaseAnalytics { public static void LogEvent(string n, params Parameter[] p) { } public static void SetConsent(IDictionary<ConsentType, ConsentStatus> c) { } }
}
namespace Firebase.Crashlytics { public static class Crashlytics { public static bool ReportUncaughtExceptionsAsFatal { get; set; } } }
namespace Firebase.RemoteConfig
{
    public enum ValueSource { StaticValue, DefaultValue, RemoteValue }
    public struct ConfigValue { public double DoubleValue; public bool BooleanValue; public string StringValue; public ValueSource Source; }
    public class FirebaseRemoteConfig
    {
        public static FirebaseRemoteConfig DefaultInstance;
        public Task SetDefaultsAsync(IDictionary<string, object> d) => Task.CompletedTask;
        public Task<bool> FetchAndActivateAsync() => Task.FromResult(true);
        public ConfigValue GetValue(string k) => default;
    }
}
namespace GameAnalyticsSDK
{
    public enum GAProgressionStatus { Start, Complete, Fail }
    public enum GAAdAction { Clicked, Show, FailedShow, RewardReceived }
    public enum GAAdType { Video, RewardedVideo, Playable, Interstitial, OfferWall, Banner }
    public static class GameAnalytics
    {
        public static void Initialize() { }
        public static void NewDesignEvent(string id) { }
        public static void NewDesignEvent(string id, float v) { }
        public static void NewProgressionEvent(GAProgressionStatus s, string p1, string p2) { }
        public static void NewAdEvent(GAAdAction a, GAAdType t, string sdk, string placement) { }
        public static void NewBusinessEvent(string currency, int amount, string itemType, string itemId, string cartType) { }
    }
}
public enum AppStoreType { googleplay, amazon, other }
public abstract class BaseTenjin
{
    public abstract void Connect();
    public abstract void OptIn();
    public abstract void OptOut();
    public abstract void SetAppStoreType(AppStoreType t);
    public abstract void SendEvent(string e);
    public abstract void Transaction(string productId, string currencyCode, int quantity, double unitPrice, string transactionId, string receipt, string signature);
    public abstract void SubscribeAppLovinImpressions();
}
public static class Tenjin { public static BaseTenjin getInstance(string key) => null; }
namespace Unity.Notifications.Android
{
    public enum Importance { None, Low, Default, High }
    public class AndroidNotificationChannel { public AndroidNotificationChannel(string id, string name, string desc, Importance i) { } }
    public struct AndroidNotification { public AndroidNotification(string t, string b, DateTime f) { SmallIcon = LargeIcon = null; } public string SmallIcon, LargeIcon; }
    public static class AndroidNotificationCenter
    {
        public static void RegisterNotificationChannel(AndroidNotificationChannel c) { }
        public static int SendNotification(AndroidNotification n, string ch) => 0;
        public static void CancelAllScheduledNotifications() { }
        public static void CancelAllDisplayedNotifications() { }
    }
    public class PermissionRequest { }
}
namespace Unity.Notifications.iOS
{
    [Flags] public enum AuthorizationOption { None = 0, Badge = 1, Sound = 2, Alert = 4 }
    public class AuthorizationRequest : IDisposable { public AuthorizationRequest(AuthorizationOption o, bool reg) { } public void Dispose() { } }
    public class iOSNotificationTimeIntervalTrigger { public TimeSpan TimeInterval; public bool Repeats; }
    public class iOSNotification { public string Identifier, Title, Body; public bool ShowInForeground; public iOSNotificationTimeIntervalTrigger Trigger; }
    public static class iOSNotificationCenter
    {
        public static void ScheduleNotification(iOSNotification n) { }
        public static void RemoveAllScheduledNotifications() { }
        public static void RemoveAllDeliveredNotifications() { }
        public static int ApplicationBadge { get; set; }
    }
}
