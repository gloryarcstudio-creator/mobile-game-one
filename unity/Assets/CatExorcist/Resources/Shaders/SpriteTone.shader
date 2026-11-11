// Перекраска спрайта для районов 9–20, пока у них нет своего арта: как CSS hue-rotate + saturate + brightness + multiply в веб-версии.
// _Flash — белая вспышка при попадании.
Shader "CatExorcist/SpriteTone"
{
    Properties
    {
        [PerRendererData] _MainTex ("Sprite", 2D) = "white" {}
        _Hue ("Hue (deg)", Float) = 0
        _Sat ("Saturation", Float) = 1
        _Bri ("Brightness", Float) = 1
        _Mul ("Multiply", Color) = (1,1,1,1)
        _Flash ("Flash", Range(0,1)) = 0
    }
    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" "PreviewType"="Plane" "CanUseSpriteAtlas"="True" }
        Cull Off ZWrite Off Lighting Off
        Blend SrcAlpha OneMinusSrcAlpha
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            sampler2D _MainTex;
            float _Hue, _Sat, _Bri, _Flash;
            fixed4 _Mul;
            struct appdata { float4 vertex : POSITION; float2 uv : TEXCOORD0; fixed4 color : COLOR; };
            struct v2f { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; fixed4 color : COLOR; };
            v2f vert (appdata v) { v2f o; o.pos = UnityObjectToClipPos(v.vertex); o.uv = v.uv; o.color = v.color; return o; }
            // матрицы как у CSS-фильтров (W3C Filter Effects)
            float3 hueRotate(float3 c, float deg)
            {
                float a = radians(deg), cs = cos(a), sn = sin(a);
                float3x3 m = float3x3(
                    0.213 + cs * 0.787 - sn * 0.213, 0.715 - cs * 0.715 - sn * 0.715, 0.072 - cs * 0.072 + sn * 0.928,
                    0.213 - cs * 0.213 + sn * 0.143, 0.715 + cs * 0.285 + sn * 0.140, 0.072 - cs * 0.072 - sn * 0.283,
                    0.213 - cs * 0.213 - sn * 0.787, 0.715 - cs * 0.715 + sn * 0.715, 0.072 + cs * 0.928 + sn * 0.072);
                return mul(m, c);
            }
            float3 saturate3(float3 c, float s)
            {
                float3x3 m = float3x3(
                    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
                    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
                    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s);
                return mul(m, c);
            }
            fixed4 frag (v2f i) : SV_Target
            {
                fixed4 t = tex2D(_MainTex, i.uv);
                float3 c = saturate(saturate3(hueRotate(t.rgb, _Hue), _Sat) * _Bri) * _Mul.rgb;
                c = lerp(c, float3(1, 1, 1), _Flash);
                return fixed4(c * i.color.rgb, t.a * i.color.a);
            }
            ENDCG
        }
    }
}
