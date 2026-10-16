package com.loverspace.app;

import com.getcapacitor.BridgeActivity;
import android.graphics.Color;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import org.json.JSONObject;
import cn.jpush.android.api.JPushInterface;

public class MainActivity extends BridgeActivity {
  // 高重要性通知渠道：极光推送指定该渠道时以「顶部横幅」形式弹出（IMPORTANCE_DEFAULT 只在通知栏躺着）。
  // 服务端 /api/push/notify 的 notification.android.channel_id 必须与此一致。
  public static final String CHANNEL_MSG = "ls_message";
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // 把 WebView 画布底色设为与启动图一致的粉色，避免系统启动画面淡出后
    // 在 HTML 粉色启动图绘制出来之前闪一下白色
    if (getBridge() != null && getBridge().getWebView() != null) {
      getBridge().getWebView().setBackgroundColor(0xFFffa3c0);
    }
    // 初始化极光 JPush（推送长连接 + 厂商通道）。缺 AppKey 时初始化会静默失败，不影响主流程。
    // 开启 debug 日志：release 包里也能从 logcat 抓到 SDK 的注册错误详情（供 getPushLog 读取）。
    // init 若抛异常，记录到 prefs（getPushDiag 的 initEx 字段），因为"静默吞掉异常"正是无日志的常见原因。
    try {
      JPushInterface.setDebugMode(true);
      initJCoreSafely(getApplicationContext()); // 反射兜底：确保 JCore 先初始化（Provider 未合并时靠它）
      JPushInterface.init(getApplicationContext());
    } catch (Throwable t) {
      try {
        getSharedPreferences("ls_push", Context.MODE_PRIVATE)
            .edit().putString("init_ex", String.valueOf(t)).apply();
      } catch (Throwable ignore) {}
    }
    // 创建「新消息」高重要性渠道：极光默认渠道是 IMPORTANCE_DEFAULT（有声音但不弹顶部横幅），
    // 这里自建 IMPORTANCE_HIGH 渠道，服务端推送指定 channel_id=ls_message 即可悬浮提醒。
    ensureMessageChannel();
    // 恢复常驻保活：用户在设置里开启过（prefs 持久化），重启/杀进程后自动恢复
    try {
      if (KeepAliveService.isEnabled(getApplicationContext())) {
        KeepAliveService.start(getApplicationContext());
      }
    } catch (Throwable ignore) {}
    // 给前端网页暴露原生桥，用于设置别名 / 读取通知点击类型 / 保存备份文件
    if (getBridge() != null && getBridge().getWebView() != null) {
      getBridge().getWebView().addJavascriptInterface(new LsNative(getApplicationContext(), this), "LoverspaceNative");
    }
  }

  @Override
  public void onResume() {
    super.onResume();
    // 回到前台：只把桌面角标清零，不再清通知栏（用户还没读的通知应保留，
    // 之前在此处 clearAllNotifications 会误删刚到达、尚未查看的通知）。
    // 已读的通知由 JPushReceiver.onNotifyMessageOpened（用户真正点开时）负责清除。    try { JPushInterface.setBadgeNumber(getApplicationContext(), 0); } catch (Throwable t) {}
  }

  // 旧版设备（API 24-28）导出备份时的存储权限申请结果：引导用户再次点击导出
  @Override
  public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    if (requestCode == 9001) {
      boolean ok = grantResults.length > 0
          && grantResults[0] == android.content.pm.PackageManager.PERMISSION_GRANTED;
      toastUi(ok ? "存储权限已授予，请再次点击「导出备份文件」" : "没有存储权限，无法保存备份文件");
    }
  }
  private void toastUi(final String msg) {
    try {
      runOnUiThread(new Runnable() {
        @Override
        public void run() {
          android.widget.Toast.makeText(MainActivity.this, msg, android.widget.Toast.LENGTH_LONG).show();
        }
      });
    } catch (Throwable ignore) {}
  }

  // 前端通过 window.LoverspaceNative 调用的原生方法（同步，无回调）
  public static class LsNative {
    private final Context ctx;
    private final android.app.Activity act;
    LsNative(Context c, android.app.Activity a) { ctx = c; act = a; }
    // ===== 备份导出：WebView 不处理 <a download>，导出必须走原生写文件 =====
    // 返回 "ok:<路径>" / "need_perm" / "err:<原因>"
    @JavascriptInterface
    public String saveBackup(String name, String base64) {
      try {
        byte[] bytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
        return writeToDownloads(name, bytes);
      } catch (Throwable t) {
        return "err:" + t;
      }
    }
    private String writeToDownloads(String name, byte[] bytes) {
      // 防路径穿越：只保留安全字符
      String safe = (name == null ? "backup.json" : name).replaceAll("[^a-zA-Z0-9._\\-\\u4e00-\\u9fa5]", "_");
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
        // API 29+：MediaStore.Downloads 免存储权限，文件落在「下载/loverspace」
        try {
          android.content.ContentValues cv = new android.content.ContentValues();
          cv.put(android.provider.MediaStore.Downloads.DISPLAY_NAME, safe);
          cv.put(android.provider.MediaStore.Downloads.MIME_TYPE, "application/json");
          cv.put(android.provider.MediaStore.Downloads.RELATIVE_PATH, "Download/loverspace");
          cv.put(android.provider.MediaStore.Downloads.IS_PENDING, 1);
          android.net.Uri uri = act.getContentResolver().insert(
              android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
          if (uri == null) return "err:insert-failed";
          java.io.OutputStream os = act.getContentResolver().openOutputStream(uri);
          if (os == null) return "err:open-failed";
          os.write(bytes);
          os.close();
          cv.clear();
          cv.put(android.provider.MediaStore.Downloads.IS_PENDING, 0);
          act.getContentResolver().update(uri, cv, null, null);
          return "ok:Download/loverspace/" + safe;
        } catch (Throwable t) {
          return "err:" + t;
        }
      }
      // API 24-28：旧版直接写公共目录，需运行时存储权限
      try {
        if (act.checkSelfPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE)
            != android.content.pm.PackageManager.PERMISSION_GRANTED) {
          act.requestPermissions(new String[]{android.Manifest.permission.WRITE_EXTERNAL_STORAGE}, 9001);
          return "need_perm";
        }
        java.io.File dir = new java.io.File(
            android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS), "loverspace");
        if (!dir.exists() && !dir.mkdirs()) return "err:mkdir-failed";
        java.io.File f = new java.io.File(dir, safe);
        java.io.FileOutputStream fos = new java.io.FileOutputStream(f);
        fos.write(bytes);
        fos.close();
        android.media.MediaScannerConnection.scanFile(ctx, new String[]{f.getAbsolutePath()},
            new String[]{"application/json"}, null);
        return "ok:" + f.getAbsolutePath();
      } catch (Throwable t) {
        return "err:" + t;
      }
    }
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
    // 推送底层诊断：返回 AppKey、RegistrationID、注册回调是否触发过等，用于定位“拿不到 ID”的根因。
    @JavascriptInterface
    public String getPushDiag() {
      JSONObject o = new JSONObject();
      try {
        SharedPreferences sp = ctx.getSharedPreferences("ls_push", Context.MODE_PRIVATE);
        o.put("rid", JPushInterface.getRegistrationID(ctx));
        o.put("lastRid", sp.getString("jpush_rid", ""));
        o.put("regTs", sp.getLong("jpush_ts", 0));
        o.put("appkey", getManifestAppKey(ctx));
        o.put("pkg", ctx.getPackageName());
        o.put("stopped", JPushInterface.isPushStopped(ctx));
        o.put("initEx", sp.getString("init_ex", ""));
        o.put("providers", listJpushProviders(ctx));
        o.put("myServices", listMyServices(ctx));
        o.put("vivoMeta", getMetaData(ctx, "com.vivo.push.api_key") + "/" + getMetaData(ctx, "com.vivo.push.app_id"));
        o.put("connState", JPushInterface.getConnectionState(ctx));
        o.put("vivoReg", getVivoRegLine());
        o.put("ts", System.currentTimeMillis());
      } catch (Throwable t) {
        try { o.put("ex", String.valueOf(t)); } catch (Throwable ignore) {}
      }
      return o.toString();
    }
    // 重置推送：重新 init，用于注册失败后的手动恢复
    @JavascriptInterface
    public String reinitPush() {
      try {
        initJCoreSafely(ctx);
        JPushInterface.init(ctx);
      } catch (Throwable t) {}
      return getPushDiag();
    }
    // 抓取本机 logcat 中极光 SDK 的日志（JIGUANG/JPush/JCore/vivo 相关），
    // 用于在无法连接电脑调试时，直接在 App 里看到注册失败的底层错误。
    // 读取前先强制重新 init 并等待 3s，确保抓到“新鲜”的初始化日志（否则被 WebView 日志冲掉）。
    @JavascriptInterface
    public String getPushLog() {
      StringBuilder sb = new StringBuilder();
      java.io.BufferedReader r = null;
      try {
        try { JPushInterface.init(ctx); } catch (Throwable t) {}
        try { Thread.sleep(3000); } catch (Throwable ignore) {}
        // -d 导出已有缓冲；-t 8000 限制行数；-v time 带时间戳
        Process p = Runtime.getRuntime().exec(new String[]{
            "logcat", "-d", "-v", "time", "-t", "8000"});
        r = new java.io.BufferedReader(new java.io.InputStreamReader(p.getInputStream()), 8192);
        String line;
        int kept = 0;
        while ((line = r.readLine()) != null && kept < 200) {
          String low = line.toLowerCase();
          if (low.contains("jiguang") || low.contains("jpush") || low.contains("jcore")
              || low.contains("vivo") || low.contains("push") || low.contains("jg")) {
            sb.append(line).append('\n');
            kept++;
          }
        }
        p.destroy();
      } catch (Throwable t) {
        sb.append("logcat-ex:").append(t);
      } finally {
        try { if (r != null) r.close(); } catch (Throwable ignore) {}
      }
      if (sb.length() == 0) return "(无相关日志)";
      return sb.toString();
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
    // 常驻保活开关（设置页调用）：开启后 :pushcore 进程（极光长连接所在）以前台服务方式常驻，
    // vivo 划后台/一键清理不再杀它，长连接保持在线，杀后台也能秒收
    @JavascriptInterface
    public boolean getKeepAlive() {
      return KeepAliveService.isEnabled(ctx);
    }
    @JavascriptInterface
    public void setKeepAlive(boolean on) {
      KeepAliveService.setEnabled(ctx, on);
    }
  }
  // 枚举合并进 APK 的 jiguang/jpush/jcore 相关 Provider（JCore 自动初始化依赖它）。
  // 若返回空数组 → JCore 的自动初始化 Provider 没合并进来，SDK 就"类都在但不工作"，正是无日志+不注册的根因。
  private static String listJpushProviders(Context ctx) {
    try {
      org.json.JSONArray arr = new org.json.JSONArray();
      java.util.List<android.content.pm.ProviderInfo> list =
          ctx.getPackageManager().queryContentProviders(null, 0, 0);
      if (list != null) {
        for (android.content.pm.ProviderInfo pi : list) {
          String n = pi.packageName + "/" + pi.name;
          String low = n.toLowerCase();
          if (low.contains("jiguang") || low.contains("jpush") || low.contains("jcore")) {
            arr.put(n);
          }
        }
      }
      return arr.toString();
    } catch (Throwable t) { return "ex:" + t; }
  }
  // 抓取 logcat 中 vivo 通道注册结果行（判断厂商通道是否真正注册成功）
  private static String getVivoRegLine() {
    java.io.BufferedReader r = null;
    try {
      Process p = Runtime.getRuntime().exec(new String[]{
          "logcat", "-d", "-v", "time", "-t", "8000"});
      r = new java.io.BufferedReader(new java.io.InputStreamReader(p.getInputStream()), 8192);
      String line, last = "";
      while ((line = r.readLine()) != null) {
        String low = line.toLowerCase();
        if (low.contains("vivo") && (low.contains("regist") || low.contains("regid")
            || low.contains("reg_id") || low.contains("callback") || low.contains("code"))) {
          last = line;
        }
      }
      p.destroy();
      return last.isEmpty() ? "(未抓到vivo注册日志)" : last;
    } catch (Throwable t) {
      return "ex:" + t;
    } finally {
      try { if (r != null) r.close(); } catch (Throwable ignore) {}
    }
  }
  // 读取任意 meta-data 值（用于验证 vivo 密钥是否真正合并进 Manifest）
  private static String getMetaData(Context ctx, String name) {
    try {
      ApplicationInfo ai = ctx.getPackageManager().getApplicationInfo(
          ctx.getPackageName(), PackageManager.GET_META_DATA);
      if (ai.metaData != null) {
        Object v = ai.metaData.get(name);
        return v == null ? "空" : String.valueOf(v);
      }
    } catch (Throwable t) {}
    return "空";
  }
  // 枚举本应用 Manifest 里声明的 jiguang/jpush/jcore 相关 Service（JCore init 依赖 JCommonService）
  private static String listMyServices(Context ctx) {
    try {
      org.json.JSONArray arr = new org.json.JSONArray();
      android.content.pm.PackageInfo pi = ctx.getPackageManager().getPackageInfo(
          ctx.getPackageName(), android.content.pm.PackageManager.GET_SERVICES);
      if (pi.services != null) {
        for (android.content.pm.ServiceInfo si : pi.services) {
          String n = si.packageName + "/" + si.name;
          String low = n.toLowerCase();
          if (low.contains("jiguang") || low.contains("jpush") || low.contains("jcore")
              || low.contains("pushservice")) {
            arr.put(n);
          }
        }
      }
      return arr.toString();
    } catch (Throwable t) { return "ex:" + t; }
  }
  // 反射兜底初始化 JCore（不依赖具体类路径，编译不会挂）。若 JCore 已初始化则为无操作。
  private static void initJCoreSafely(Context ctx) {
    try {
      Class<?> c = Class.forName("cn.jiguang.jcore.JCoreInterface");
      java.lang.reflect.Method m = c.getMethod("init", Context.class);
      m.invoke(null, ctx.getApplicationContext());
    } catch (Throwable ignore) {}
  }

  // 创建高重要性「新消息」通知渠道（Android 8.0+）。渠道一旦创建，重要度即固定、
  // 后续只能由用户在系统设置里改，所以这里一次性建好 IMPORTANCE_HIGH。
  private void ensureMessageChannel() {
    try {
      if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O) return;
      NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
      if (nm == null) return;
      if (nm.getNotificationChannel(CHANNEL_MSG) != null) return; // 已存在不重复创建
      NotificationChannel ch = new NotificationChannel(
          CHANNEL_MSG, "新消息", NotificationManager.IMPORTANCE_HIGH);
      ch.setDescription("对方发来悄悄话 / 催自拍时提醒");
      ch.enableLights(true);
      ch.setLightColor(0xFFFF3B5C);
      ch.setShowBadge(true);
      nm.createNotificationChannel(ch);
    } catch (Throwable ignore) {}
  }
}
