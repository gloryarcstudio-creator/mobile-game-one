// Небольшой JSON без зависимостей: чтение в Dictionary/List/double/string/bool/null и запись обратно.
// Нужен ядру, которое не ссылается на UnityEngine (JsonUtility не умеет словари).
using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace CatExorcist.Core
{
    public static class Json
    {
        public static object Parse(string text)
        {
            if (text == null) return null;
            var p = new Parser(text);
            var v = p.Value();
            return v;
        }

        public static string Write(object value, bool pretty = false)
        {
            var sb = new StringBuilder();
            WriteValue(sb, value, pretty, 0);
            return sb.ToString();
        }

        sealed class Parser
        {
            readonly string s;
            int i;
            public Parser(string text) { s = text; }

            void Ws() { while (i < s.Length && char.IsWhiteSpace(s[i])) i++; }

            public object Value()
            {
                Ws();
                if (i >= s.Length) throw new FormatException("JSON: неожиданный конец");
                char c = s[i];
                if (c == '{') return Obj();
                if (c == '[') return Arr();
                if (c == '"') return Str();
                if (c == 't') { Expect("true"); return true; }
                if (c == 'f') { Expect("false"); return false; }
                if (c == 'n') { Expect("null"); return null; }
                return Num();
            }

            void Expect(string w)
            {
                if (string.CompareOrdinal(s, i, w, 0, w.Length) != 0) throw new FormatException("JSON: ожидалось " + w + " в " + i);
                i += w.Length;
            }

            Dictionary<string, object> Obj()
            {
                var d = new Dictionary<string, object>();
                i++;
                Ws();
                if (s[i] == '}') { i++; return d; }
                while (true)
                {
                    Ws();
                    string k = Str();
                    Ws();
                    if (s[i] != ':') throw new FormatException("JSON: ожидалось : в " + i);
                    i++;
                    d[k] = Value();
                    Ws();
                    if (s[i] == ',') { i++; continue; }
                    if (s[i] == '}') { i++; return d; }
                    throw new FormatException("JSON: ожидалось , или } в " + i);
                }
            }

            List<object> Arr()
            {
                var l = new List<object>();
                i++;
                Ws();
                if (s[i] == ']') { i++; return l; }
                while (true)
                {
                    l.Add(Value());
                    Ws();
                    if (s[i] == ',') { i++; continue; }
                    if (s[i] == ']') { i++; return l; }
                    throw new FormatException("JSON: ожидалось , или ] в " + i);
                }
            }

            string Str()
            {
                if (s[i] != '"') throw new FormatException("JSON: ожидалась строка в " + i);
                i++;
                var sb = new StringBuilder();
                while (true)
                {
                    char c = s[i++];
                    if (c == '"') return sb.ToString();
                    if (c != '\\') { sb.Append(c); continue; }
                    char e = s[i++];
                    switch (e)
                    {
                        case '"': sb.Append('"'); break;
                        case '\\': sb.Append('\\'); break;
                        case '/': sb.Append('/'); break;
                        case 'b': sb.Append('\b'); break;
                        case 'f': sb.Append('\f'); break;
                        case 'n': sb.Append('\n'); break;
                        case 'r': sb.Append('\r'); break;
                        case 't': sb.Append('\t'); break;
                        case 'u':
                            sb.Append((char)int.Parse(s.Substring(i, 4), NumberStyles.HexNumber, CultureInfo.InvariantCulture));
                            i += 4;
                            break;
                        default: throw new FormatException("JSON: плохой escape в " + i);
                    }
                }
            }

            object Num()
            {
                int st = i;
                while (i < s.Length && "+-0123456789.eE".IndexOf(s[i]) >= 0) i++;
                if (st == i) throw new FormatException("JSON: неожиданный символ '" + s[i] + "' в " + i);
                return double.Parse(s.Substring(st, i - st), NumberStyles.Float, CultureInfo.InvariantCulture);
            }
        }

        static void Indent(StringBuilder sb, bool pretty, int depth)
        {
            if (!pretty) return;
            sb.Append('\n');
            sb.Append(' ', depth * 1);
        }

        static void WriteValue(StringBuilder sb, object v, bool pretty, int depth)
        {
            switch (v)
            {
                case null: sb.Append("null"); return;
                case string str: WriteString(sb, str); return;
                case bool b: sb.Append(b ? "true" : "false"); return;
                case double d: WriteNumber(sb, d); return;
                case float f: WriteNumber(sb, f); return;
                case int n: sb.Append(n.ToString(CultureInfo.InvariantCulture)); return;
                case long n: sb.Append(n.ToString(CultureInfo.InvariantCulture)); return;
                case IDictionary dict:
                    {
                        sb.Append('{');
                        bool first = true;
                        foreach (DictionaryEntry kv in dict)
                        {
                            if (!first) sb.Append(',');
                            first = false;
                            Indent(sb, pretty, depth + 1);
                            WriteString(sb, kv.Key.ToString());
                            sb.Append(':');
                            WriteValue(sb, kv.Value, pretty, depth + 1);
                        }
                        if (!first) Indent(sb, pretty, depth);
                        sb.Append('}');
                        return;
                    }
                case IEnumerable list:
                    {
                        sb.Append('[');
                        bool first = true;
                        foreach (var item in list)
                        {
                            if (!first) sb.Append(',');
                            first = false;
                            WriteValue(sb, item, pretty, depth + 1);
                        }
                        sb.Append(']');
                        return;
                    }
                default:
                    WriteString(sb, Convert.ToString(v, CultureInfo.InvariantCulture));
                    return;
            }
        }

        static void WriteNumber(StringBuilder sb, double d)
        {
            if (double.IsNaN(d) || double.IsInfinity(d)) { sb.Append('0'); return; }
            if (Math.Abs(d) < 1e15 && d == Math.Floor(d)) sb.Append(((long)d).ToString(CultureInfo.InvariantCulture));
            else sb.Append(d.ToString("R", CultureInfo.InvariantCulture));
        }

        static void WriteString(StringBuilder sb, string str)
        {
            sb.Append('"');
            foreach (char c in str)
            {
                switch (c)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (c < 0x20) sb.Append("\\u").Append(((int)c).ToString("x4"));
                        else sb.Append(c);
                        break;
                }
            }
            sb.Append('"');
        }
    }

    /// <summary>Удобный доступ к разобранному JSON: J.Of(obj)["key"].Num().</summary>
    public readonly struct J
    {
        public readonly object V;
        public J(object v) { V = v; }
        public static J Of(object v) => new J(v);

        public bool IsNull => V == null;
        public J this[string key] => V is Dictionary<string, object> d && d.TryGetValue(key, out var x) ? new J(x) : new J(null);
        public J this[int idx] => V is List<object> l && idx >= 0 && idx < l.Count ? new J(l[idx]) : new J(null);
        public bool Has(string key) => V is Dictionary<string, object> d && d.ContainsKey(key);
        public int Count => V is List<object> l ? l.Count : V is Dictionary<string, object> d ? d.Count : 0;

        public double Num(double def = 0) => V is double d ? d : V is bool b ? (b ? 1 : 0) : def;
        public int Int(int def = 0) => V is double d ? (int)d : def;
        public long Long(long def = 0) => V is double d ? (long)d : def;
        public string Str(string def = null) => V is string s ? s : V is double d ? d.ToString(CultureInfo.InvariantCulture) : def;
        public bool Bool(bool def = false) => V is bool b ? b : V is double d ? d != 0 : def;

        public IEnumerable<J> Items()
        {
            if (V is List<object> l) foreach (var x in l) yield return new J(x);
        }

        public IEnumerable<KeyValuePair<string, J>> Pairs()
        {
            if (V is Dictionary<string, object> d) foreach (var kv in d) yield return new KeyValuePair<string, J>(kv.Key, new J(kv.Value));
        }

        public List<string> Strings()
        {
            var r = new List<string>();
            foreach (var x in Items()) r.Add(x.Str());
            return r;
        }

        public List<double> Nums()
        {
            var r = new List<double>();
            foreach (var x in Items()) r.Add(x.Num());
            return r;
        }
    }
}
