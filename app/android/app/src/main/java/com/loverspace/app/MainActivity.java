package com.loverspace.app;

import com.getcapacitor.BridgeActivity;
import android.graphics.Color;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // 把 WebView 画布底色设为与启动图一致的粉色，避免系统启动画面淡出后
    // 在 HTML 粉色启动图绘制出来之前闪一下白色
    if (getBridge() != null && getBridge().getWebView() != null) {
      getBridge().getWebView().setBackgroundColor(0xFFffa3c0);
    }
  }
}
