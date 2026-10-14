package com.loverspace.app;

import com.getcapacitor.BridgeActivity;
import android.graphics.Color;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import org.json.JSONObject;
import cn.jpush.android.api.JPushInterface;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // 把 WebView 画布底色设为与启动图一致的粉色，避免系统启动画面淡出后
    // 在 HTML 粉色启动图绘制出来之前闪一下白色
    if (getBridge() != null && getBridge().getWebView() != null) {
      getBridge().getWebView().setBackgroundColor(0xFFffa3c0);
    }
    // 初始化极光 JPush（推送长连接 + 厂商通道）。缺 AppKey 时初始化会静默失败，不影响主流程。
    try {
      JPushInterface.setDebugMode(false);
      JPushInterface.init(getApplicationContext());
    } catch (Throwable t) {}
    // 给前端网页暴露原生桥，用于设置别名 / 读取通知点击类型
    if (getBridge() != null && getBridge().getWebView() != null) {
      getBridge().getWebView().addJavascriptInterface(new LsNative(getApplicationContext()), "LoverspaceNative");
    }
  }

  // 前端通过 window.LoverspaceNative 调用的原生方法（同步，无回调）
  public static class LsNative {
    private final Context ctx;
    LsNative(Context c) { ctx = c; }
    @JavascriptInterface
    public void setAlias(String alias) {
      try { JPushInterface.setAlias(ctx, (int)(System.currentTimeMillis() & 0xffff), alias); } catch (Throwable t) {}
    }
    @JavascriptInterface
    public void clearAlias() {
      try { JPushInterface.deleteAlias(ctx, (int)(System.currentTimeMillis() & 0xffff)); } catch (Throwable t) {}
    }
    @JavascriptInterface
    public String getRegId() {
      try {
        String rid = JPushInterface.getRegistrationID(ctx);
        // 同步兜底保存一份，便于诊断读取
        if (rid != null && !rid.isEmpty()) {
          SharedPreferences sp = ctx.getSharedPreferences("ls_push", Context.MODE_PRIVATE);
          sp.edit().putString("jpush_rid", rid).apply();
        }
        return rid;
      } catch (Throwable t) { return ""; }
    }
    // 推送底层诊断：返回 AppKey、RegistrationID、最近错误码、推送是否被停止等，用于定位“拿不到 ID”的根因。
    @JavascriptInterface
    public String getPushDiag() {
      JSONObject o = new JSONObject();
      try {
        SharedPreferences sp = ctx.getSharedPreferences("ls_push", Context.MODE_PRIVATE);
        o.put("rid", JPushInterface.getRegistrationID(ctx));
        o.put("lastRid", sp.getString("jpush_rid", ""));
        o.put("errCode", sp.getInt("jpush_err", -1));
        o.put("regTs", sp.getLong("jpush_ts", 0));
        o.put("appkey", getManifestAppKey(ctx));
        o.put("stopped", JPushInterface.isPushStopped(ctx));
        o.put("ts", System.currentTimeMillis());
      } catch (Throwable t) {
        try { o.put("ex", String.valueOf(t)); } catch (Throwable ignore) {}
      }
      return o.toString();
    }
    private static String getManifestAppKey(Context ctx) {
      try {
        ApplicationInfo ai = ctx.getPackageManager().getApplicationInfo(
            ctx.getPackageName(), PackageManager.GET_META_DATA);
        if (ai.metaData != null) {
          Object v = ai.metaData.get("JPUSH_APPKEY");
          return v == null ? "" : String.valueOf(v);
        }
      } catch (Throwable t) {}
      return "";
    }
    // 读取并清除“上次通知点击的类型”（msg / urge），供前端跳转到聊天或自拍页
    @JavascriptInterface
    public String getLastPush() {
      try {
        SharedPreferences sp = ctx.getSharedPreferences("ls_push", Context.MODE_PRIVATE);
        String t = sp.getString("lastPushType", "");
        if (t != null && !t.isEmpty()) sp.edit().remove("lastPushType").apply();
        return t == null ? "" : t;
      } catch (Throwable t) { return ""; }
    }
  }
}
