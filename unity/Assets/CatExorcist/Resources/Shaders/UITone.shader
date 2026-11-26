// Перекраска (как SpriteTone) для интерфейса: поддерживает обрезку RectMask2D и трафарет Mask,
// чтобы призраки в прокручиваемых списках не вылезали за край. _Flash = 1 даёт сплошной силуэт цвета Image.color.
Shader "CatExorcist/UITone"
{
    Properties
    {
        [PerRendererData] _MainTex ("Sprite", 2D) = "white" {}
        _Color ("Tint", Color) = (1,1,1,1)
        _Hue ("Hue (deg)", Float) = 0
        _Sat ("Saturation", Float) = 1
        _Bri ("Brightness", Float) = 1
        _Mul ("Multiply", Color) = (1,1,1,1)
        _Flash ("Flash", Range(0,1)) = 0
        _StencilComp ("Stencil Comparison", Float) = 8
        _Stencil ("Stencil ID", Float) = 0
        _StencilOp ("Stencil Operation", Float) = 0
        _StencilWriteMask ("Stencil Write Mask", Float) = 255
        _StencilReadMask ("Stencil Read Mask", Float) = 255
        _ColorMask ("Color Mask", Float) = 15
    }
    SubShader
    {
        Tags { "Queue"="Transparent" "IgnoreProjector"="True" "RenderType"="Transparent" "PreviewType"="Plane" "CanUseSpriteAtlas"="True" }
        Stencil { Ref [_Stencil] Comp [_StencilComp] Pass [_StencilOp] ReadMask [_StencilReadMask] WriteMask [_StencilWriteMask] }
        Cull Off Lighting Off ZWrite Off ZTest [unity_GUIZTestMode]
        Blend SrcAlpha OneMinusSrcAlpha
        ColorMask [_ColorMask]
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_local _ UNITY_UI_CLIP_RECT
            #include "UnityCG.cginc"
            #include "UnityUI.cginc"
            sampler2D _MainTex;
            fixed4 _Color, _Mul;
            float _Hue, _Sat, _Bri, _Flash;
            float4 _ClipRect;
            struct appdata { float4 vertex : POSITION; float2 uv : TEXCOORD0; fixed4 color : COLOR; };
            struct v2f { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; fixed4 color : COLOR; float4 world : TEXCOORD1; };
            v2f vert (appdata v) { v2f o; o.world = v.vertex; o.pos = UnityObjectToClipPos(v.vertex); o.uv = v.uv; o.color = v.color * _Color; return o; }
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
                fixed4 o = fixed4(c * i.color.rgb, t.a * i.color.a);
                #ifdef UNITY_UI_CLIP_RECT
                o.a *= UnityGet2DClipping(i.world.xy, _ClipRect);
                #endif
                return o;
            }
            ENDCG
        }
    }
}
