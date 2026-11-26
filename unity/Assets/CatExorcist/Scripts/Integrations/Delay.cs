using System;
using UnityEngine;

namespace CatExorcist.Integrations
{
    /// <summary>Отложенный вызов без корутин в чужих объектах (повторная загрузка рекламы и т. п.).</summary>
    sealed class Delay : MonoBehaviour
    {
        static Delay inst;
        public static void Run(float secs, Action a)
        {
            if (inst == null) { var go = new GameObject("ce-delay"); DontDestroyOnLoad(go); inst = go.AddComponent<Delay>(); }
            inst.StartCoroutine(inst.Wait(secs, a));
        }
        System.Collections.IEnumerator Wait(float s, Action a) { yield return new WaitForSecondsRealtime(s); a?.Invoke(); }

        /// <summary>Повтор загрузки с паузой 2, 4 … 64 с.</summary>
        public static void Retry(ref int attempt, Action load)
        {
            attempt = Math.Min(attempt + 1, 6);
            Run((float)Math.Pow(2, attempt), load);
        }
    }
}
