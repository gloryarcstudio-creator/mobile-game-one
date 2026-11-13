// Импорт арта: спрайты без мип-карт и обрезки сетки (FullRect — нужен для вырезок Art.CropPx и 9-slice),
// пол и стены повторяются (Repeat), шрифт с запасными системными шрифтами для японского, корейского и китайского.
using UnityEditor;
using UnityEngine;

namespace CatExorcist.EditorTools
{
    public sealed class ArtImport : AssetPostprocessor
    {
        void OnPreprocessTexture()
        {
            var p = assetPath.Replace('\\', '/');
            if (!p.Contains("/CatExorcist/Resources/Art/") && !p.Contains("/CatExorcist/Branding/")) return;
            var ti = (TextureImporter)assetImporter;
            var name = System.IO.Path.GetFileNameWithoutExtension(p);
            bool branding = p.Contains("/Branding/");
            ti.textureType = branding ? TextureImporterType.Default : TextureImporterType.Sprite;
            ti.mipmapEnabled = false;
            ti.alphaIsTransparency = true;
            ti.npotScale = TextureImporterNPOTScale.None;
            ti.wrapMode = name.StartsWith("floor-") || name.StartsWith("wall-") ? TextureWrapMode.Repeat : TextureWrapMode.Clamp;
            ti.filterMode = FilterMode.Bilinear;
            ti.maxTextureSize = 2048;
            ti.textureCompression = TextureImporterCompression.Compressed;
            if (!branding)
            {
                ti.spriteImportMode = SpriteImportMode.Single;
                var s = new TextureImporterSettings();
                ti.ReadTextureSettings(s);
                s.spriteMeshType = SpriteMeshType.FullRect;
                s.spriteGenerateFallbackPhysicsShape = false;
                ti.SetTextureSettings(s);
            }
            foreach (var platform in new[] { "Android", "iPhone" })
            {
                var o = ti.GetPlatformTextureSettings(platform);
                o.overridden = true;
                o.maxTextureSize = 2048;
                o.format = TextureImporterFormat.ASTC_6x6;
                ti.SetPlatformTextureSettings(o);
            }
        }

        void OnPreprocessAsset()
        {
            if (!assetPath.EndsWith(".ttf") || !assetPath.Contains("/CatExorcist/")) return;
            var fi = assetImporter as TrueTypeFontImporter;
            if (fi == null) return;
            fi.fontTextureCase = FontTextureCase.Dynamic;
            fi.fontNames = new[] { "Nunito", "Noto Sans CJK JP", "Noto Sans CJK KR", "Noto Sans CJK SC", "Hiragino Sans", "PingFang SC", "Apple SD Gothic Neo", "Droid Sans Fallback", "Roboto" };
        }
    }
}
