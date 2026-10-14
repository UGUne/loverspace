package com.loverspace.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import cn.jpush.android.api.JPushInterface;
import cn.jpush.android.api.NotificationMessage;
import cn.jpush.android.service.JPushMessageReceiver;
import org.json.JSONObject;

// 处理极光推送通知被点击：记录消息类型（msg / urge），交由 SDK 默认行为打开应用主页。
// 若本接收器因 intent-filter 不匹配而未触发，JPush 仍会以默认方式展示并打开通知，仅丢失“自动跳转”这一增强体验。
public class JPushReceiver extends JPushMessageReceiver {
  // 抓取 JPush 注册结果：onRegister 第二参即为 RegistrationID 字符串（注册成功非空，失败为空串）。
  // 存到 SharedPreferences，前端 getPushDiag() / getRegId() 可读取，用于定位“拿不到 ID”的根因。
  @Override
  public void onRegister(Context context, String registrationId) {
    try {
      SharedPreferences sp = context.getSharedPreferences("ls_push", Context.MODE_PRIVATE);
      sp.edit()
        .putString("jpush_rid", registrationId == null ? "" : registrationId)
        .putLong("jpush_ts", System.currentTimeMillis())
        .apply();
    } catch (Throwable t) {}
    try { super.onRegister(context, registrationId); } catch (Throwable t) {}
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
    // 点开通知：清除该条通知并把桌面角标清零（Vivo 等 ROM 的角标不会自动消失）
    try {
      if (message != null && message.notificationId > 0) {
        JPushInterface.clearNotificationById(context, message.notificationId);
      } else {
        JPushInterface.clearAllNotifications(context);
      }
    } catch (Throwable t) {}
    try { JPushInterface.setBadgeNumber(context, 0); } catch (Throwable t) {}
    try {
      super.onNotifyMessageOpened(context, message); // SDK 默认：清理通知并打开应用主页（MainActivity）
    } catch (Throwable t) {}
  }
}
