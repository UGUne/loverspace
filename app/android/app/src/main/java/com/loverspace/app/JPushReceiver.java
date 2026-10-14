package com.loverspace.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import cn.jpush.android.api.JPushMessage;
import cn.jpush.android.api.NotificationMessage;
import cn.jpush.android.service.JPushMessageReceiver;
import org.json.JSONObject;

// 处理极光推送通知被点击：记录消息类型（msg / urge），交由 SDK 默认行为打开应用主页。
// 若本接收器因 intent-filter 不匹配而未触发，JPush 仍会以默认方式展示并打开通知，仅丢失“自动跳转”这一增强体验。
public class JPushReceiver extends JPushMessageReceiver {
  // 抓取 JPush 注册结果：成功时拿到 RegistrationID，失败时拿到 errorCode（如 1005=AppKey 错误，6001/1008=网络）。
  // 前端 getPushDiag() 会读取这些字段，用于精确定位“拿不到 ID”的根因。
  @Override
  public void onRegister(Context context, JPushMessage message) {
    try {
      SharedPreferences sp = context.getSharedPreferences("ls_push", Context.MODE_PRIVATE);
      if (message != null) {
        String rid = message.getRegistrationID();
        int code = message.getErrorCode();
        sp.edit()
          .putString("jpush_rid", rid == null ? "" : rid)
          .putInt("jpush_err", code)
          .putLong("jpush_ts", System.currentTimeMillis())
          .apply();
      }
    } catch (Throwable t) {}
    try { super.onRegister(context, message); } catch (Throwable t) {}
  }

  @Override
  public void onNotifyMessageOpened(Context context, NotificationMessage message) {
    String type = "";
    try {
      String extras = message.notificationExtras;
      if (extras != null && !extras.isEmpty()) {
        JSONObject j = new JSONObject(extras);
        type = j.optString("type", "");
      }
    } catch (Throwable t) {}
    try {
      SharedPreferences sp = context.getSharedPreferences("ls_push", Context.MODE_PRIVATE);
      if (type != null && !type.isEmpty()) sp.edit().putString("lastPushType", type).apply();
    } catch (Throwable t) {}
    try {
      super.onNotifyMessageOpened(context, message); // SDK 默认：清理通知并打开应用主页（MainActivity）
    } catch (Throwable t) {}
  }
}
