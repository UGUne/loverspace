package com.loverspace.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.SystemClock;

import androidx.core.app.NotificationCompat;

/**
 * 常驻保活前台服务（用户在设置页「常驻保活」里开关，状态存 SharedPreferences）。
 *
 * 作用：把 App 主进程升级为前台服务。多数 ROM（含 vivo/OriginOS）在划后台、
 * 一键清理时不会杀带前台服务的进程，极光/vivo 推送通道得以保持在线，
 * 缓解"清了后台就收不到消息"。
 *
 * 注意：
 * - targetSdk 36（Android 16）强制要求声明 foregroundServiceType，推送保活用
 *   remoteMessaging 语义最贴切（需 FOREGROUND_SERVICE_REMOTE_MESSAGING 普通权限，
 *   安装时自动授予）。
 * - 常驻通知走 IMPORTANCE_MIN 通道：无声音、无震动、不标角标，尽量不打扰。
 * - 若用户在系统里"强行停止"，前台服务同样会被杀——这是 Android 系统级限制，
 *   任何 App 都无法绕过；重启 App 后会依据 prefs 自动恢复保活。
 */
public class KeepAliveService extends Service {
  public static final String PREF = "ls_push";
  public static final String KEY = "keep_alive";
  private static final String CHANNEL_ID = "ls_keepalive";
  private static final int NOTI_ID = 8801;
  /** 闹钟复活广播的 Action（KeepAliveReceiver 接收） */
  public static final String ACTION_RESURRECT = "com.loverspace.app.action.KEEPALIVE_RESURRECT";
  /** 复活间隔：10 分钟。太短耗电，太长则断连窗口久 */
  private static final long RESURRECT_INTERVAL_MS = 10 * 60 * 1000L;

  @Override
  public void onCreate() {
    super.onCreate();
    ensureChannel(this);
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    Notification n = buildNotification(this);
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(NOTI_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING);
      } else {
        startForeground(NOTI_ID, n);
      }
    } catch (Throwable t) {
      // 个别 ROM 可能拒绝指定 type 的 startForeground：退化为无参版本再试一次
      try { startForeground(NOTI_ID, n); } catch (Throwable ignore) {}
    }
    // 每次启动都刷新复活闹钟（被杀后靠它定期把服务拉回来）
    scheduleResurrection(this);
    // 被系统杀掉后尽量自动重启（用户主动"强行停止"除外，系统不会重启）
    return START_STICKY;
  }

  @Override
  public IBinder onBind(Intent intent) { return null; }

  /** 当前是否开启了常驻保活 */
  public static boolean isEnabled(Context ctx) {
    try {
      return ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE).getBoolean(KEY, false);
    } catch (Throwable t) { return false; }
  }

  /** 设置开关：持久化到 prefs（杀进程后不丢），并立即启动/停止服务 */
  public static void setEnabled(Context ctx, boolean on) {
    try {
      ctx.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit().putBoolean(KEY, on).apply();
    } catch (Throwable ignore) {}
    if (on) {
      start(ctx);
      scheduleResurrection(ctx); // 服务可能启动失败（后台限制），闹钟先挂上兜底
    } else {
      cancelResurrection(ctx);
      stop(ctx);
    }
  }

  public static void start(Context ctx) {
    try {
      Intent i = new Intent(ctx, KeepAliveService.class);
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ctx.startForegroundService(i);
      } else {
        ctx.startService(i);
      }
    } catch (Throwable t) {
      // Android 12+ 后台启动 FGS 会抛异常：此时仅在失败时静默降级（无保活）
      try { ctx.startService(new Intent(ctx, KeepAliveService.class)); } catch (Throwable ignore) {}
    }
  }

  public static void stop(Context ctx) {
    try { ctx.stopService(new Intent(ctx, KeepAliveService.class)); } catch (Throwable ignore) {}
  }

  // ===== 闹钟复活机制 =====
  // vivo/OriginOS 等 ROM 的"一键清理/划掉后台"接近强制停止：FGS 被杀、通知被清、
  // 连 START_STICKY 都不触发。挂一个每 10 分钟的不精确重复闹钟，被杀后定期尝试重启。
  // 即便 FGS 启动被 Android 12+ 后台限制拒绝，进程被闹钟唤醒本身就会让 JCore 的
  // ContentProvider 自动初始化、极光长连接重连，TTL 内的离线消息随后补发到通知栏。
  private static PendingIntent resurrectPI(Context ctx) {
    Intent i = new Intent(ctx, KeepAliveReceiver.class).setAction(ACTION_RESURRECT);
    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
    return PendingIntent.getBroadcast(ctx, 0, i, flags);
  }

  /** 挂上/刷新复活闹钟（重复调用安全，同一 PendingIntent 会被更新） */
  public static void scheduleResurrection(Context ctx) {
    try {
      AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
      if (am == null) return;
      am.setInexactRepeating(AlarmManager.ELAPSED_REALTIME_WAKEUP,
          SystemClock.elapsedRealtime() + RESURRECT_INTERVAL_MS,
          RESURRECT_INTERVAL_MS, resurrectPI(ctx));
    } catch (Throwable ignore) {}
  }

  /** 取消复活闹钟（用户关闭保活开关时调用，避免空转耗电） */
  public static void cancelResurrection(Context ctx) {
    try {
      AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
      if (am != null) am.cancel(resurrectPI(ctx));
    } catch (Throwable ignore) {}
  }

  private static void ensureChannel(Context ctx) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
    try {
      NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
      if (nm != null && nm.getNotificationChannel(CHANNEL_ID) == null) {
        NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "消息守护",
            NotificationManager.IMPORTANCE_MIN);
        ch.setDescription("保持推送在线，不错过 TA 的消息");
        ch.setShowBadge(false);
        ch.setSound(null, null);
        ch.enableVibration(false);
        nm.createNotificationChannel(ch);
      }
    } catch (Throwable ignore) {}
  }

  private static Notification buildNotification(Context ctx) {
    ensureChannel(ctx);
    PendingIntent pi = null;
    try {
      Intent open = new Intent(ctx, MainActivity.class);
      int flags = PendingIntent.FLAG_UPDATE_CURRENT;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
      pi = PendingIntent.getActivity(ctx, 0, open, flags);
    } catch (Throwable ignore) {}
    NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL_ID)
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle("恋人空间 · 消息守护中")
        .setContentText("保持推送在线，不错过 TA 的每条消息")
        .setOngoing(true)
        .setSilent(true)
        .setPriority(NotificationCompat.PRIORITY_MIN)
        .setCategory(NotificationCompat.CATEGORY_SERVICE);
    if (pi != null) b.setContentIntent(pi);
    return b.build();
  }
}
