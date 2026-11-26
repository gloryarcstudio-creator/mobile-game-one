// Локальные уведомления (Unity Mobile Notifications 2.4): офлайн-доход накоплен, духи вернулись из похода, награда дня.
// Включается символом CE_NOTIF. Разрешение спрашивается не на старте, а когда игрок дошёл до 3-го дома.
#if CE_NOTIF
using System;
using UnityEngine;
#if UNITY_ANDROID
using Unity.Notifications.Android;
#elif UNITY_IOS
using Unity.Notifications.iOS;
#endif

namespace CatExorcist.Integrations
{
    public sealed class LocalNotifications : INotificationService
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Register() => Services.Notifications = new LocalNotifications();

        const string Channel = "cat_exorcist";
#if UNITY_ANDROID
        PermissionRequest permission;
#elif UNITY_IOS
        AuthorizationRequest permission;
#endif

        public void Init()
        {
#if UNITY_ANDROID
            AndroidNotificationCenter.RegisterNotificationChannel(new AndroidNotificationChannel(Channel, "Cat Exorcist", "Rewards and expeditions", Importance.Default));
#endif
        }

        public void RequestPermission()
        {
#if UNITY_ANDROID
            permission = new PermissionRequest(); // Android 13+: системное окно; на старых версиях разрешено сразу
#elif UNITY_IOS
            permission = new AuthorizationRequest(AuthorizationOption.Alert | AuthorizationOption.Badge | AuthorizationOption.Sound, false);
#endif
        }

        public void CancelAll()
        {
#if UNITY_ANDROID
            AndroidNotificationCenter.CancelAllScheduledNotifications();
            AndroidNotificationCenter.CancelAllDisplayedNotifications();
#elif UNITY_IOS
            iOSNotificationCenter.RemoveAllScheduledNotifications();
            iOSNotificationCenter.RemoveAllDeliveredNotifications();
            iOSNotificationCenter.ApplicationBadge = 0;
#endif
        }

        public void Schedule(string id, string title, string body, DateTime when)
        {
            if (when <= DateTime.Now.AddMinutes(1)) return;
#if UNITY_ANDROID
            var n = new AndroidNotification(title, body, when); // свои иконки: Project Settings → Mobile Notifications, затем SmallIcon
            AndroidNotificationCenter.SendNotification(n, Channel);
#elif UNITY_IOS
            iOSNotificationCenter.ScheduleNotification(new iOSNotification
            {
                Identifier = id, Title = title, Body = body, ShowInForeground = false,
                Trigger = new iOSNotificationTimeIntervalTrigger { TimeInterval = when - DateTime.Now, Repeats = false },
            });
#endif
        }
    }
}
#endif
