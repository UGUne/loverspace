package com.loverspace.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * 保活复活接收器：由 KeepAliveService 挂的 10 分钟重复闹钟触发。
 *
 * vivo/OriginOS 等激进 ROM"一键清理"后，FGS 被杀、通知被清，START_STICKY 也不触发。
 * 本接收器在 App 进程可能已死的情况下被系统拉起：只要用户没关保活开关，就尝试
 * 重新启动前台服务。即使 FGS 因 Android 12+ 后台启动限制被拒，进程被唤醒本身就会
 * 让 JCore ContentProvider 自动初始化、极光长连接重连，TTL 内的离线消息随后补发。
 *
 * 必须在清单中静态注册（不能 context-register），否则进程死后收不到广播。
 */
public class KeepAliveReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null) return;
    if (!KeepAliveService.ACTION_RESURRECT.equals(intent.getAction())) return;
    try {
      if (KeepAliveService.isEnabled(context)) {
        KeepAliveService.start(context); // 内部会刷新下一次闹钟
      } else {
        KeepAliveService.cancelResurrection(context);
      }
    } catch (Throwable ignore) {}
  }
}
